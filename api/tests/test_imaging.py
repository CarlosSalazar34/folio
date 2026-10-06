import io

import pytest
from PIL import Image, ImageDraw

from folio.ai import Corners, Point
from folio.imaging import build_pdf, correct_perspective, enhance, image_size, make_thumbnail


def _jpeg(img: Image.Image, **kwargs) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "JPEG", **kwargs)
    return buf.getvalue()


def _open(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def _corners(tl, tr, br, bl) -> Corners:
    return Corners(
        top_left=Point(x=tl[0], y=tl[1]),
        top_right=Point(x=tr[0], y=tr[1]),
        bottom_right=Point(x=br[0], y=br[1]),
        bottom_left=Point(x=bl[0], y=bl[1]),
    )


@pytest.fixture
def scene() -> bytes:
    """Foto 1000x800: fondo oscuro con una hoja blanca vertical (400x600) en (300,100)."""
    img = Image.new("RGB", (1000, 800), (40, 40, 40))
    draw = ImageDraw.Draw(img)
    draw.rectangle((300, 100, 699, 699), fill="white")
    draw.rectangle((300, 100, 699, 149), fill=(200, 0, 0))  # cabecera roja arriba
    return _jpeg(img, quality=95)


def test_perspective_crops_to_quad(scene):
    corners = _corners((0.3, 0.125), (0.7, 0.125), (0.7, 0.875), (0.3, 0.875))
    out = _open(correct_perspective(scene, corners, 0.9))
    assert out.format == "JPEG"
    assert abs(out.width - 400) <= 2 and abs(out.height - 600) <= 2
    # Cabecera roja arriba, papel blanco abajo y en los lados: orientación conservada, sin fondo.
    r, g, _ = out.getpixel((out.width // 2, 10))
    assert r > 150 and g < 80
    assert min(out.getpixel((out.width // 2, out.height - 10))) > 200
    assert min(out.getpixel((5, out.height // 2))) > 200


def test_perspective_straightens_skewed_quad(scene):
    # Trapecio (perspectiva): el lado superior es más corto que el inferior.
    corners = _corners((0.35, 0.125), (0.65, 0.125), (0.7, 0.875), (0.3, 0.875))
    out = _open(correct_perspective(scene, corners, 0.8))
    assert abs(out.width - 400) <= 2
    assert out.height > out.width


@pytest.mark.parametrize("confidence", [0.0, 0.3, 0.59])
def test_low_confidence_passthrough(scene, confidence):
    corners = _corners((0.3, 0.125), (0.7, 0.125), (0.7, 0.875), (0.3, 0.875))
    out = _open(correct_perspective(scene, corners, confidence))
    assert out.size == (1000, 800)


def test_none_corners_passthrough(scene):
    assert _open(correct_perspective(scene, None, 1.0)).size == (1000, 800)


def test_insane_quads_passthrough(scene):
    crossed = _corners((0.3, 0.1), (0.7, 0.9), (0.7, 0.1), (0.3, 0.9))  # autointersección
    tiny = _corners((0.5, 0.5), (0.52, 0.5), (0.52, 0.52), (0.5, 0.52))  # área diminuta
    mirrored = _corners((0.7, 0.125), (0.3, 0.125), (0.3, 0.875), (0.7, 0.875))  # TL/TR intercambiadas
    for c in (crossed, tiny, mirrored):
        assert _open(correct_perspective(scene, c, 0.95)).size == (1000, 800)


def test_exif_orientation_is_respected():
    img = Image.new("RGB", (300, 200), "white")
    exif = Image.Exif()
    exif[0x0112] = 6  # rotar 90°
    data = _jpeg(img, exif=exif)
    assert image_size(data) == (200, 300)
    assert _open(correct_perspective(data, None, 0)).size == (200, 300)
    assert _open(enhance(data)).size == (200, 300)
    assert _open(make_thumbnail(data, max_size=150)).size == (100, 150)


def test_enhance_keeps_color_and_size(scene):
    out = _open(enhance(scene))
    assert out.format == "JPEG" and out.mode == "RGB"
    assert out.size == (1000, 800)


def test_thumbnail_bounds(scene):
    assert _open(make_thumbnail(scene)).size == (480, 384)
    assert max(_open(make_thumbnail(scene, max_size=100)).size) <= 100


def test_image_size(scene):
    assert image_size(scene) == (1000, 800)


def test_build_pdf(scene):
    rgba = io.BytesIO()
    Image.new("RGBA", (200, 300), (0, 0, 255, 128)).save(rgba, "PNG")
    pdf = build_pdf([scene, rgba.getvalue(), scene])
    assert pdf.startswith(b"%PDF")
    assert pdf.count(b"/Type /Page") - pdf.count(b"/Type /Pages") == 3


def test_transparency_composited_on_white():
    buf = io.BytesIO()
    Image.new("RGBA", (50, 50), (0, 0, 0, 0)).save(buf, "PNG")
    out = _open(make_thumbnail(buf.getvalue()))
    assert min(out.getpixel((25, 25))) > 245


def test_build_pdf_requires_pages():
    with pytest.raises(ValueError):
        build_pdf([])
