"""Procesado de imagen y PDF con Pillow.

Interfaz compartida; la implementación la hace la unidad "IA e imagen".
"""
from folio.ai import Corners


def correct_perspective(image: bytes, corners: Corners | None, confidence: float) -> bytes:
    """Recorta y endereza el documento; si no hay esquinas fiables devuelve la imagen tal cual (JPEG)."""
    raise NotImplementedError


def enhance(image: bytes) -> bytes:
    """Mejora para lectura (autocontraste, nitidez). Devuelve JPEG."""
    raise NotImplementedError


def make_thumbnail(image: bytes, max_size: int = 480) -> bytes:
    raise NotImplementedError


def image_size(image: bytes) -> tuple[int, int]:
    raise NotImplementedError


def build_pdf(pages: list[bytes]) -> bytes:
    raise NotImplementedError
