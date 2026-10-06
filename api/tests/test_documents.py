import io

import pytest
from PIL import Image


class FakeStorage:
    def __init__(self, fail_on_put: int | None = None) -> None:
        self.files: dict[str, bytes] = {}
        self.puts = 0
        self.fail_on_put = fail_on_put

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.puts += 1
        if self.fail_on_put is not None and self.puts >= self.fail_on_put:
            raise RuntimeError("S3 caído")
        self.files[key] = data

    def get(self, key: str) -> bytes:
        return self.files[key]

    def delete(self, key: str) -> None:
        self.files.pop(key, None)

    def url(self, key: str, expires_in: int = 3600) -> str:
        return f"https://files.test/{key}"


def _jpeg(color: str = "white", size: tuple[int, int] = (60, 80)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "JPEG")
    return buf.getvalue()


def _analysis(n_pages: int, category: str = "factura"):
    from folio.ai import DocumentAnalysis, PageAnalysis
    from folio.schemas import KeyField

    return DocumentAnalysis.model_construct(
        title="Factura Luz Octubre",
        category=category,
        summary="Factura de electricidad.",
        text="Compañía Eléctrica Zafiro. Total a pagar: 42,10 EUR",
        key_fields=[KeyField(label="Total", value="42,10 EUR")],
        pages=[PageAnalysis() for _ in range(n_pages)],
    )


@pytest.fixture
def fakes(client):
    from folio.main import app
    from folio.routes import documents as routes

    storage = FakeStorage()
    calls: dict[str, int] = {"enhance": 0}

    def analyzer(images: list[bytes]):
        return _analysis(len(images))

    def enhance(img: bytes) -> bytes:
        calls["enhance"] += 1
        return img

    imaging = routes.Imaging(
        correct_perspective=lambda img, corners, conf: img,
        enhance=enhance,
        make_thumbnail=lambda img: img[:10],
        image_size=lambda img: Image.open(io.BytesIO(img)).size,
        build_pdf=lambda pages: b"%PDF-fake",
    )
    app.dependency_overrides[routes.get_storage] = lambda: storage
    app.dependency_overrides[routes.get_analyzer] = lambda: analyzer
    app.dependency_overrides[routes.get_imaging] = lambda: imaging
    yield {"storage": storage, "calls": calls, "app": app, "routes": routes}
    app.dependency_overrides.clear()


def _upload(client, *images: bytes, enhance: bool = True):
    files = [("pages", (f"p{i}.jpg", data, "image/jpeg")) for i, data in enumerate(images)]
    return client.post("/documents", files=files, data={"enhance": str(enhance).lower()})


def test_full_lifecycle(client, fakes):
    storage: FakeStorage = fakes["storage"]

    res = _upload(client, _jpeg(), _jpeg("gray", (100, 50)))
    assert res.status_code == 201, res.text
    doc = res.json()
    assert doc["title"] == "Factura Luz Octubre"
    assert doc["category"] == "factura"
    assert doc["page_count"] == 2
    assert doc["key_fields"] == [{"label": "Total", "value": "42,10 EUR"}]
    assert [p["index"] for p in doc["pages"]] == [0, 1]
    assert doc["pages"][1]["width"] == 100 and doc["pages"][1]["height"] == 50
    doc_id = doc["id"]
    assert doc["pages"][0]["url"] == f"https://files.test/documents/{doc_id}/0-page.jpg"
    assert doc["thumbnail_url"] == f"https://files.test/documents/{doc_id}/0-thumb.jpg"
    assert len(storage.files) == 6
    assert fakes["calls"]["enhance"] == 2

    listed = client.get("/documents").json()
    assert doc_id in [d["id"] for d in listed]
    summary = next(d for d in listed if d["id"] == doc_id)
    assert set(summary) == {"id", "title", "category", "page_count", "created_at", "thumbnail_url"}

    # Búsqueda sin distinguir mayúsculas en título y texto OCR
    assert doc_id in [d["id"] for d in client.get("/documents", params={"q": "luz"}).json()]
    assert doc_id in [d["id"] for d in client.get("/documents", params={"q": "ZAFIRO"}).json()]
    assert client.get("/documents", params={"q": "inexistente-xyz"}).json() == []
    assert client.get("/documents", params={"q": "100%"}).json() == []

    detail = client.get(f"/documents/{doc_id}")
    assert detail.status_code == 200
    assert detail.json()["text"].startswith("Compañía")

    pdf = client.get(f"/documents/{doc_id}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.headers["content-disposition"] == 'attachment; filename="factura-luz-octubre.pdf"'
    assert pdf.content == b"%PDF-fake"

    assert client.delete(f"/documents/{doc_id}").status_code == 204
    assert storage.files == {}
    assert client.get(f"/documents/{doc_id}").status_code == 404
    assert client.get(f"/documents/{doc_id}/pdf").status_code == 404
    assert client.delete(f"/documents/{doc_id}").status_code == 404


def test_newest_first_and_no_enhance(client, fakes):
    first = _upload(client, _jpeg(), enhance=False).json()
    second = _upload(client, _jpeg()).json()
    assert fakes["calls"]["enhance"] == 1
    ids = [d["id"] for d in client.get("/documents").json()]
    assert ids.index(second["id"]) < ids.index(first["id"])


def test_invalid_category_falls_back_to_otro(client, fakes):
    from folio.main import app

    app.dependency_overrides[fakes["routes"].get_analyzer] = lambda: (
        lambda images: _analysis(len(images), category="desconocida")
    )
    res = _upload(client, _jpeg())
    assert res.status_code == 201
    assert res.json()["category"] == "otro"


def test_requires_pages(client, fakes):
    assert client.post("/documents", data={"enhance": "true"}).status_code == 422


def test_rejects_non_image(client, fakes):
    res = client.post(
        "/documents", files=[("pages", ("nota.txt", b"hola mundo", "text/plain"))]
    )
    assert res.status_code == 415
    assert fakes["storage"].files == {}


def test_rejects_too_many_pages(client, fakes):
    res = _upload(client, *[_jpeg()] * 31)
    assert res.status_code == 422


def test_ai_failure_returns_502(client, fakes):
    from folio.main import app

    def broken(images: list[bytes]):
        raise RuntimeError("OpenAI no responde")

    app.dependency_overrides[fakes["routes"].get_analyzer] = lambda: broken
    res = _upload(client, _jpeg())
    assert res.status_code == 502
    assert "IA" in res.json()["detail"]
    assert fakes["storage"].files == {}


def test_storage_failure_cleans_up(client, fakes):
    from folio.main import app

    storage = FakeStorage(fail_on_put=4)
    app.dependency_overrides[fakes["routes"].get_storage] = lambda: storage
    before = len(client.get("/documents").json())
    res = _upload(client, _jpeg(), _jpeg())
    assert res.status_code == 500
    assert storage.files == {}
    assert len(client.get("/documents").json()) == before
