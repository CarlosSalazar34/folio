"""Almacenamiento de imágenes: S3 si S3_BUCKET está definido, si no, disco local.

Interfaz compartida; la implementación la hace la unidad "Almacenamiento S3 + local".
"""
from typing import Protocol


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...

    def get(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...

    def url(self, key: str, expires_in: int = 3600) -> str:
        """URL que la app puede descargar directamente (prefirmada en S3)."""
        ...


def get_storage() -> Storage:
    raise NotImplementedError
