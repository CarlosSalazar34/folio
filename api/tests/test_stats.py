from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest


def _wipe() -> None:
    from sqlmodel import Session, delete

    from folio.db import engine
    from folio.models import Document, Page

    with Session(engine) as session:
        session.exec(delete(Page))  # type: ignore[call-overload]
        session.exec(delete(Document))  # type: ignore[call-overload]
        session.commit()


@pytest.fixture
def empty_db(client) -> Iterator[None]:
    """La BD de tests se comparte en la sesión: la vaciamos antes y después."""
    _wipe()
    yield
    _wipe()


def _add(category: str, pages: int, created_at: datetime) -> None:
    from sqlmodel import Session

    from folio.db import engine
    from folio.models import Document, Page

    with Session(engine) as session:
        doc = Document(title=f"Doc {category}", category=category, created_at=created_at)
        for i in range(pages):
            doc.pages.append(
                Page(
                    document_id=doc.id,
                    index=i,
                    image_key=f"{doc.id}/{i}.jpg",
                    original_key=f"{doc.id}/{i}-o.jpg",
                    thumbnail_key=f"{doc.id}/{i}-t.jpg",
                    width=10,
                    height=10,
                )
            )
        session.add(doc)
        session.commit()


def test_stats_empty(client, empty_db):
    res = client.get("/stats")
    assert res.status_code == 200
    assert res.json() == {"document_count": 0, "page_count": 0, "categories": {}, "last_scan_at": None}


def test_stats_counts(client, empty_db):
    newest = datetime(2026, 10, 5, 9, 12, tzinfo=UTC)
    _add("factura", 2, newest - timedelta(days=3))
    _add("factura", 1, newest - timedelta(days=1))
    _add("recibo", 3, newest)
    _add("contrato", 1, newest - timedelta(days=10))
    _add("desconocida", 1, newest - timedelta(days=20))

    res = client.get("/stats")
    assert res.status_code == 200
    body = res.json()
    assert body["document_count"] == 5
    assert body["page_count"] == 8
    assert body["categories"] == {"factura": 2, "recibo": 1, "contrato": 1, "otro": 1}
    last = datetime.fromisoformat(body["last_scan_at"])
    assert last.tzinfo is not None
    assert last == newest
