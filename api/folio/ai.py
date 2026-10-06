"""Análisis de documentos con OpenAI.

Interfaz compartida; la implementación la hace la unidad "IA e imagen".
"""
from pydantic import BaseModel, Field

from folio.schemas import Category, KeyField


class Point(BaseModel):
    """Coordenadas normalizadas 0–1 respecto a la imagen original."""

    x: float
    y: float


class Corners(BaseModel):
    top_left: Point
    top_right: Point
    bottom_right: Point
    bottom_left: Point


class PageAnalysis(BaseModel):
    corners: Corners | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class DocumentAnalysis(BaseModel):
    title: str
    category: Category
    summary: str
    text: str
    key_fields: list[KeyField]
    pages: list[PageAnalysis]


def analyze_pages(images: list[bytes]) -> DocumentAnalysis:
    """Analiza las páginas (JPEG/PNG, en orden). `pages` tiene un elemento por imagen."""
    raise NotImplementedError
