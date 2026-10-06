import base64
import io
from types import SimpleNamespace

import pytest
from PIL import Image

from folio import ai


def _jpeg(size=(2400, 3200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "white").save(buf, "JPEG")
    return buf.getvalue()


class FakeResponses:
    def __init__(self, parsed=None, exc: Exception | None = None):
        self.parsed = parsed
        self.exc = exc
        self.calls: list[dict] = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if self.exc:
            raise self.exc
        return SimpleNamespace(output_parsed=self.parsed)


@pytest.fixture
def fake(monkeypatch):
    def install(parsed=None, exc=None) -> FakeResponses:
        responses = FakeResponses(parsed, exc)
        monkeypatch.setattr(ai, "client_factory", lambda: SimpleNamespace(responses=responses))
        return responses

    return install


def _parsed(pages):
    return ai._LLMDocument(
        title=" Factura de luz — septiembre ",
        category="factura",
        summary="Factura eléctrica de septiembre por 45,30 €.",
        text="FACTURA\nEléctrica Sol S.L.\nTotal: 45,30 €\n\nPágina 2",
        key_fields=[
            ai._LLMField(label="Total", value="45,30 €"),
            ai._LLMField(label=" ", value="vacío"),
        ],
        pages=pages,
    )


def _corners(off=0.1):
    p = ai.Point
    return ai.Corners(
        top_left=p(x=off, y=off),
        top_right=p(x=1 - off, y=off),
        bottom_right=p(x=1.2, y=1 - off),  # fuera de rango: se recorta a 1
        bottom_left=p(x=off, y=1 - off),
    )


def test_analyze_pages_maps_structured_output(fake):
    pages = [
        ai._LLMPage(page_index=1, corners=None, confidence=0.2),
        ai._LLMPage(page_index=0, corners=_corners(), confidence=0.93),
    ]
    responses = fake(_parsed(pages))
    result = ai.analyze_pages([_jpeg(), _jpeg((800, 600))])

    assert isinstance(result, ai.DocumentAnalysis)
    assert result.title == "Factura de luz — septiembre"
    assert result.category == "factura"
    assert "FACTURA" in result.text
    assert [(f.label, f.value) for f in result.key_fields] == [("Total", "45,30 €")]
    assert len(result.pages) == 2
    assert result.pages[0].confidence == pytest.approx(0.93)
    assert result.pages[0].corners is not None
    assert result.pages[0].corners.bottom_right.x == 1.0
    assert result.pages[1].corners is None

    (call,) = responses.calls
    assert call["model"] == ai.get_settings().openai_model
    assert call["text_format"] is ai._LLMDocument
    images = [c for c in call["input"][0]["content"] if c["type"] == "input_image"]
    assert len(images) == 2
    assert all(c["image_url"].startswith("data:image/jpeg;base64,") for c in images)


def test_images_are_downscaled():
    url = ai._prepare_image(_jpeg((2400, 3200)))
    img = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1])))
    assert max(img.size) == ai.MAX_SIDE


def test_missing_pages_are_filled(fake):
    fake(_parsed([]))
    result = ai.analyze_pages([_jpeg((100, 100)), _jpeg((100, 100))])
    assert [p.corners for p in result.pages] == [None, None]
    assert [p.confidence for p in result.pages] == [0.0, 0.0]


def test_duplicate_page_index_falls_back_to_position(fake):
    pages = [
        ai._LLMPage(page_index=0, corners=None, confidence=0.1),
        ai._LLMPage(page_index=0, corners=_corners(), confidence=0.9),
    ]
    fake(_parsed(pages))
    result = ai.analyze_pages([_jpeg((100, 100)), _jpeg((100, 100))])
    assert result.pages[0].corners is None
    assert result.pages[1].corners is not None


def test_client_construction_error_is_wrapped(monkeypatch):
    def boom():
        raise TypeError("bad client")

    monkeypatch.setattr(ai, "client_factory", boom)
    with pytest.raises(ai.AnalysisError):
        ai.analyze_pages([_jpeg((100, 100))])


def test_api_error_raises_analysis_error(fake):
    fake(exc=RuntimeError("boom"))
    with pytest.raises(ai.AnalysisError):
        ai.analyze_pages([_jpeg((100, 100))])


def test_refusal_raises_analysis_error(fake):
    fake(parsed=None)
    with pytest.raises(ai.AnalysisError):
        ai.analyze_pages([_jpeg((100, 100))])


def test_invalid_input(fake):
    fake(_parsed([]))
    with pytest.raises(ai.AnalysisError):
        ai.analyze_pages([])
    with pytest.raises(ai.AnalysisError):
        ai.analyze_pages([b"not an image"])


def test_default_model_is_set():
    assert ai.get_settings().openai_model
