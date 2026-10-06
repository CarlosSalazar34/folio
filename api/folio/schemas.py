from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Category = Literal["recibo", "factura", "contrato", "identidad", "medico", "academico", "otro"]
CATEGORIES: tuple[str, ...] = ("recibo", "factura", "contrato", "identidad", "medico", "academico", "otro")


class KeyField(BaseModel):
    label: str
    value: str


class PageOut(BaseModel):
    index: int
    url: str
    width: int
    height: int


class DocumentSummaryOut(BaseModel):
    id: str
    title: str
    category: Category
    page_count: int
    created_at: datetime
    thumbnail_url: str | None


class DocumentDetailOut(DocumentSummaryOut):
    summary: str
    text: str
    key_fields: list[KeyField]
    pages: list[PageOut]
    # URL directa del PDF (prefirmada en S3); None si aún no se ha generado.
    pdf_url: str | None = None
