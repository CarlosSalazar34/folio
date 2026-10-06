"""Estadísticas agregadas de la biblioteca (perfil del usuario)."""
from datetime import UTC, datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, col, select

from folio.db import get_session
from folio.models import Document, Page
from folio.schemas import CATEGORIES, Category

router = APIRouter(prefix="/stats", tags=["stats"])

SessionDep = Annotated[Session, Depends(get_session)]


class LibraryStatsOut(BaseModel):
    document_count: int
    page_count: int
    categories: dict[Category, int]
    last_scan_at: datetime | None


@router.get("", response_model=LibraryStatsOut)
def get_stats(session: SessionDep) -> LibraryStatsOut:
    page_count = session.exec(select(func.count(col(Page.id)))).one()

    # Una sola consulta agrupada: los totales salen de sumar los grupos.
    rows = session.exec(
        select(
            col(Document.category),
            func.count(col(Document.id)),
            func.max(col(Document.created_at)),
        ).group_by(col(Document.category))
    ).all()

    categories: dict[Category, int] = {}
    document_count = 0
    last_scan_at: datetime | None = None
    for category, count, newest in rows:
        # Igual que en /documents: una categoría desconocida cuenta como "otro".
        key = cast(Category, category if category in CATEGORIES else "otro")
        categories[key] = categories.get(key, 0) + count
        document_count += count
        if newest is not None and (last_scan_at is None or newest > last_scan_at):
            last_scan_at = newest

    # SQLite pierde la zona horaria al leer; las fechas se guardan siempre en UTC.
    if last_scan_at is not None and last_scan_at.tzinfo is None:
        last_scan_at = last_scan_at.replace(tzinfo=UTC)

    return LibraryStatsOut(
        document_count=document_count,
        page_count=page_count,
        categories=categories,
        last_scan_at=last_scan_at,
    )
