"""Análisis de documentos con OpenAI (visión + salida estructurada).

Una sola llamada a la Responses API con todas las páginas como imágenes base64;
la respuesta se valida contra un esquema Pydantic (`client.responses.parse`).
"""
from __future__ import annotations

import base64
from collections.abc import Callable
from typing import Any

from PIL import Image
from pydantic import BaseModel, Field

from folio.config import get_settings
from folio.schemas import Category, KeyField

MAX_SIDE = 1600


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


class AnalysisError(Exception):
    """El análisis con IA falló (error de API, respuesta vacía o inválida). Mapear a HTTP 502."""


# --- Esquema de salida estructurada (modo estricto: todos los campos obligatorios, sin defaults) ---


class _LLMPage(BaseModel):
    page_index: int = Field(description="Índice de la página, empezando en 0, en el orden recibido.")
    corners: Corners | None = Field(
        description=(
            "Las 4 esquinas de la hoja de papel del documento en coordenadas normalizadas 0–1 "
            "(x hacia la derecha, y hacia abajo) respecto a la imagen tal como se ve. "
            "null si no se distingue el borde del documento."
        )
    )
    confidence: float = Field(description="Confianza 0–1 en las esquinas detectadas.")


class _LLMField(BaseModel):
    label: str = Field(description="Nombre del dato en español, p. ej. 'Fecha de emisión', 'Total'.")
    value: str = Field(description="Valor tal como aparece en el documento.")


class _LLMDocument(BaseModel):
    title: str = Field(description="Título corto en español, p. ej. 'Factura de luz — septiembre'.")
    category: Category
    summary: str = Field(description="Resumen en español de 1 a 3 frases.")
    text: str = Field(
        description=(
            "Transcripción OCR completa y literal de todas las páginas en orden de lectura; "
            "páginas separadas por una línea en blanco."
        )
    )
    key_fields: list[_LLMField]
    pages: list[_LLMPage]


INSTRUCTIONS = """\
Eres el motor de análisis de Folio, una app que escanea documentos en papel con la cámara del móvil.
Recibirás una o varias fotos, una por página y en orden. Devuelve:

- title: título corto y descriptivo en español (máx. ~60 caracteres), p. ej. "Factura de luz — septiembre", \
"Contrato de alquiler — Calle Mayor 3", "Receta médica — Dr. López".
- category: una de recibo, factura, contrato, identidad, medico, academico, otro.
  (recibo = ticket de compra o justificante de pago; factura = factura formal con datos fiscales; \
identidad = DNI, pasaporte, carné; medico = informes, recetas, analíticas; academico = títulos, notas, certificados.)
- summary: 1–3 frases en español explicando qué es el documento y lo más relevante.
- text: transcripción OCR completa y literal de todo el texto de todas las páginas, en orden de lectura, \
respetando el idioma original y los saltos de línea. Separa cada página con una línea en blanco. No inventes texto ilegible.
- key_fields: datos clave como pares etiqueta/valor (fechas, importes y totales, nombres, NIF/CIF/DNI, \
números de factura o referencia, direcciones, vencimientos…). Etiquetas en español. Lista vacía si no hay.
- pages: exactamente un elemento por imagen recibida, con page_index (0, 1, …) y las 4 esquinas de la hoja de \
papel (top_left, top_right, bottom_right, bottom_left según la orientación de lectura del documento) en \
coordenadas normalizadas 0–1 sobre la imagen (x = horizontal desde la izquierda, y = vertical desde arriba), \
más confidence 0–1. Si la hoja ocupa toda la imagen o no se ve su borde, usa corners null y confidence baja.
"""


ClientFactory = Callable[[], Any]


def _default_client_factory() -> Any:
    from openai import OpenAI

    settings = get_settings()
    if not settings.openai_api_key:
        raise AnalysisError("Falta OPENAI_APIKEY / OPENAI_API_KEY en la configuración.")
    return OpenAI(api_key=settings.openai_api_key, timeout=90.0, max_retries=1)


# Reemplazable en tests: `folio.ai.client_factory = lambda: FakeClient()`.
client_factory: ClientFactory = _default_client_factory


def _prepare_image(data: bytes) -> str:
    """Corrige orientación EXIF, reduce a MAX_SIDE y codifica como data URL JPEG."""
    from folio.imaging import open_rgb, to_jpeg  # import diferido: imaging importa Corners de este módulo

    try:
        img = open_rgb(data)
    except Exception as exc:  # noqa: BLE001 - Pillow lanza varios tipos
        raise AnalysisError(f"Imagen no válida: {exc}") from exc
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    return "data:image/jpeg;base64," + base64.b64encode(to_jpeg(img)).decode("ascii")


def _clamp(v: float) -> float:
    return min(1.0, max(0.0, v))


def _to_page(p: _LLMPage | None) -> PageAnalysis:
    if p is None or p.corners is None:
        return PageAnalysis(corners=None, confidence=0.0)
    c = p.corners
    corners = Corners(
        **{
            name: Point(x=_clamp(pt.x), y=_clamp(pt.y))
            for name, pt in (
                ("top_left", c.top_left),
                ("top_right", c.top_right),
                ("bottom_right", c.bottom_right),
                ("bottom_left", c.bottom_left),
            )
        }
    )
    return PageAnalysis(corners=corners, confidence=_clamp(p.confidence))


def analyze_pages(images: list[bytes]) -> DocumentAnalysis:
    """Analiza las páginas (JPEG/PNG, en orden). `pages` tiene un elemento por imagen.

    Lanza `AnalysisError` si la llamada a OpenAI falla o la respuesta no es utilizable.
    """
    if not images:
        raise AnalysisError("No se recibieron páginas.")

    content: list[dict[str, Any]] = [
        {
            "type": "input_text",
            "text": f"Documento de {len(images)} página(s). Analízalo según las instrucciones.",
        }
    ]
    for i, data in enumerate(images):
        content.append({"type": "input_text", "text": f"Página {i + 1} (page_index {i}):"})
        content.append({"type": "input_image", "image_url": _prepare_image(data), "detail": "high"})

    try:
        client = client_factory()
        response = client.responses.parse(
            model=get_settings().openai_model,
            instructions=INSTRUCTIONS,
            input=[{"role": "user", "content": content}],
            text_format=_LLMDocument,
        )
    except AnalysisError:
        raise
    except Exception as exc:  # noqa: BLE001 - openai.APIError, validación, red…
        raise AnalysisError(f"Error al analizar con OpenAI: {type(exc).__name__}") from exc

    parsed: _LLMDocument | None = getattr(response, "output_parsed", None)
    if parsed is None:
        raise AnalysisError("OpenAI no devolvió un análisis estructurado (respuesta vacía o rechazada).")

    # Se usa page_index si es válido y no está repetido; si no, la posición en la lista.
    by_index: dict[int, _LLMPage] = {}
    for pos, p in enumerate(parsed.pages):
        idx = p.page_index if 0 <= p.page_index < len(images) and p.page_index not in by_index else pos
        by_index.setdefault(idx, p)

    return DocumentAnalysis(
        title=parsed.title.strip() or "Documento sin título",
        category=parsed.category,
        summary=parsed.summary.strip(),
        text=parsed.text.strip(),
        key_fields=[
            KeyField(label=f.label.strip(), value=f.value.strip())
            for f in parsed.key_fields
            if f.label.strip() and f.value.strip()
        ],
        pages=[_to_page(by_index.get(i)) for i in range(len(images))],
    )
