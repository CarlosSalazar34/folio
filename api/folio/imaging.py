"""Procesado de imagen y PDF con Pillow.

Todas las funciones respetan la orientación EXIF y devuelven JPEG (calidad 85), salvo `build_pdf`.
"""
from __future__ import annotations

import io
import math

from PIL import Image, ImageFilter, ImageOps

from folio.ai import Corners

JPEG_QUALITY = 85
MIN_CONFIDENCE = 0.6
MIN_AREA_RATIO = 0.1  # el documento debe ocupar al menos el 10 % de la foto
MIN_SIDE_PX = 32


def open_rgb(image: bytes) -> Image.Image:
    """Abre la imagen, aplica la orientación EXIF y la pasa a RGB (la transparencia se compone sobre blanco)."""
    with Image.open(io.BytesIO(image)) as raw:
        img = ImageOps.exif_transpose(raw)
        img.load()
    if img.mode == "RGB":
        return img
    if img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return img.convert("RGB")


def to_jpeg(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


def _quad_is_sane(pts: list[tuple[float, float]], width: int, height: int) -> bool:
    """Cuadrilátero convexo (sin autointersección) y con área razonable. `pts` en orden TL, TR, BR, BL."""
    crosses = []
    for i in range(4):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % 4]
        cx, cy = pts[(i + 2) % 4]
        crosses.append((bx - ax) * (cy - by) - (by - ay) * (cx - bx))
    # Con y hacia abajo, el orden TL→TR→BR→BL de un cuadrilátero convexo gira siempre en sentido positivo;
    # un signo negativo indica esquinas intercambiadas (resultado en espejo) y uno mixto, no convexo.
    if not all(c > 0 for c in crosses):
        return False
    # Fórmula del área de Gauss (shoelace).
    area = abs(sum(pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1] for i in range(4))) / 2
    return area >= MIN_AREA_RATIO * width * height


def correct_perspective(image: bytes, corners: Corners | None, confidence: float) -> bytes:
    """Recorta y endereza el documento; si no hay esquinas fiables devuelve la imagen tal cual (JPEG)."""
    img = open_rgb(image)
    if corners is None or confidence < MIN_CONFIDENCE:
        return to_jpeg(img)

    w, h = img.size
    pts = [
        (min(max(p.x, 0.0), 1.0) * w, min(max(p.y, 0.0), 1.0) * h)
        for p in (corners.top_left, corners.top_right, corners.bottom_right, corners.bottom_left)
    ]
    if not _quad_is_sane(pts, w, h):
        return to_jpeg(img)

    tl, tr, br, bl = pts
    out_w = round(max(math.dist(tl, tr), math.dist(bl, br)))
    out_h = round(max(math.dist(tl, bl), math.dist(tr, br)))
    if out_w < MIN_SIDE_PX or out_h < MIN_SIDE_PX:
        return to_jpeg(img)

    # QUAD: esquinas origen en orden superior-izq., inferior-izq., inferior-der., superior-der.
    quad = (*tl, *bl, *br, *tr)
    warped = img.transform((out_w, out_h), Image.Transform.QUAD, quad, resample=Image.Resampling.BICUBIC)
    return to_jpeg(warped)


def enhance(image: bytes) -> bytes:
    """Mejora para lectura (autocontraste, nitidez). Devuelve JPEG."""
    img = open_rgb(image)
    img = ImageOps.autocontrast(img, cutoff=1, preserve_tone=True)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
    return to_jpeg(img)


def make_thumbnail(image: bytes, max_size: int = 480) -> bytes:
    img = open_rgb(image)
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return to_jpeg(img)


def image_size(image: bytes) -> tuple[int, int]:
    """(ancho, alto) tras aplicar la orientación EXIF."""
    with Image.open(io.BytesIO(image)) as img:
        w, h = img.size
        orientation = img.getexif().get(0x0112, 1)
    return (h, w) if orientation in (5, 6, 7, 8) else (w, h)


def build_pdf(pages: list[bytes]) -> bytes:
    if not pages:
        raise ValueError("build_pdf necesita al menos una página")
    images = [open_rgb(p) for p in pages]
    buf = io.BytesIO()
    images[0].save(buf, "PDF", save_all=True, append_images=images[1:], resolution=150.0)
    return buf.getvalue()
