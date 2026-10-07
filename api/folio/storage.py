"""Almacenamiento de imágenes: S3 si S3_BUCKET está definido, si no, disco local.

- `S3Storage`: boto3; `url` devuelve una URL GET prefirmada. Funciona con AWS S3 y con
  servicios compatibles como Cloudflare R2 (definiendo `S3_ENDPOINT_URL`).
- `LocalStorage`: archivos bajo `LOCAL_STORAGE_DIR`, servidos por FastAPI en `/files`
  (ver `mount_local_files`).
"""
import os
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import quote

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from folio.config import Settings, get_settings

LOCAL_FILES_PATH = "/files"


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...

    def get(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...

    def url(self, key: str, expires_in: int = 3600) -> str:
        """URL que la app puede descargar directamente (prefirmada en S3)."""
        ...


class StorageKeyError(ValueError):
    """Clave inválida (vacía, absoluta o que sale del directorio de almacenamiento)."""


def _validate_key(key: str) -> str:
    if not key or key.startswith("/") or "\\" in key or "\x00" in key:
        raise StorageKeyError(f"Clave de almacenamiento inválida: {key!r}")
    if any(part in ("", ".", "..") for part in key.split("/")):
        raise StorageKeyError(f"Clave de almacenamiento inválida: {key!r}")
    return key


class LocalStorage:
    def __init__(self, root: Path, public_base_url: str) -> None:
        self.root = Path(root).resolve()
        self.public_base_url = public_base_url.rstrip("/")

    def _path(self, key: str) -> Path:
        _validate_key(key)
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise StorageKeyError(f"Clave de almacenamiento inválida: {key!r}")
        return path

    def put(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Escritura atómica con un temporal de nombre único (no adivinable, sin colisiones).
        fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
        tmp = Path(tmp_name)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
            tmp.replace(path)
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def url(self, key: str, expires_in: int = 3600) -> str:
        _validate_key(key)
        return f"{self.public_base_url}{LOCAL_FILES_PATH}/{quote(key, safe='/')}"


class S3Storage:
    def __init__(self, bucket: str, prefix: str = "", client: Any | None = None) -> None:
        self.bucket = bucket
        self.prefix = f"{prefix.strip('/')}/" if prefix.strip("/") else ""
        self.client = client if client is not None else _make_s3_client(get_settings())

    def _key(self, key: str) -> str:
        return self.prefix + _validate_key(key)

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.client.put_object(Bucket=self.bucket, Key=self._key(key), Body=data, ContentType=content_type)

    def get(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=self._key(key))
        return response["Body"].read()

    def delete(self, key: str) -> None:
        # S3 no falla si el objeto no existe: delete es idempotente.
        self.client.delete_object(Bucket=self.bucket, Key=self._key(key))

    def url(self, key: str, expires_in: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": self._key(key)},
            ExpiresIn=expires_in,
        )


def _make_s3_client(settings: Settings) -> Any:
    import boto3
    from botocore.config import Config

    kwargs: dict[str, Any] = {}
    config = Config(signature_version="s3v4")
    region = settings.aws_region
    if settings.s3_endpoint_url:
        # Servicio compatible con S3 (Cloudflare R2): endpoint propio, región "auto",
        # bucket en la ruta de la URL y checksums solo cuando la operación los exige
        # (boto3 los envía por defecto y no todos los servicios compatibles los aceptan).
        kwargs["endpoint_url"] = settings.s3_endpoint_url.rstrip("/")
        region = region or "auto"
        config = config.merge(Config(
            s3={"addressing_style": "path"},
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ))
    kwargs["config"] = config
    if region:
        kwargs["region_name"] = region
    # Sin keys explícitas, boto3 usa su cadena de credenciales por defecto (env, perfil, rol IAM).
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


@lru_cache
def get_storage() -> Storage:
    settings = get_settings()
    if settings.s3_bucket:
        return S3Storage(settings.s3_bucket, settings.s3_prefix)
    return LocalStorage(settings.local_storage_dir, settings.public_base_url)


def mount_local_files(app: FastAPI) -> None:
    """Sirve el almacenamiento local en `/files` (no hace nada si se usa S3)."""
    storage = get_storage()
    if isinstance(storage, LocalStorage):
        storage.root.mkdir(parents=True, exist_ok=True)
        app.mount(LOCAL_FILES_PATH, StaticFiles(directory=storage.root), name="files")
