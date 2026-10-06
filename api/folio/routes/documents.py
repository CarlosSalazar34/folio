"""Rutas de documentos: listar, buscar, crear (escaneo + IA), ver, borrar y exportar a PDF."""
import io
import logging
import re
import unicodedata
from datetime import UTC
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, or_, select

from folio import ai, imaging
from folio import storage as storage_module
from folio.ai import Corners, DocumentAnalysis, PageAnalysis
from folio.auth import OptionalUser
from folio.db import get_session
from folio.models import Document, Page, User
from folio.schemas import CATEGORIES, Category, DocumentDetailOut, DocumentSummaryOut, KeyField, PageOut
from folio.storage import LocalStorage, S3Storage, Storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_PAGES = 30
MAX_PAGE_BYTES = 15 * 1024 * 1024
JPEG = "image/jpeg"
PDF = "application/pdf"


# --- Dependencias (sobrescribibles en tests) ---------------------------------------------------


def get_storage() -> Storage:
    return storage_module.get_storage()


Analyzer = Callable[[list[bytes]], DocumentAnalysis]


def get_analyzer() -> Analyzer:
    # Se resuelve en cada llamada para no capturar la función del módulo al importar.
    return lambda images: ai.analyze_pages(images)


@dataclass(frozen=True)
class Imaging:
    correct_perspective: Callable[[bytes, Corners | None, float], bytes]
    enhance: Callable[[bytes], bytes]
    make_thumbnail: Callable[[bytes], bytes]
    image_size: Callable[[bytes], tuple[int, int]]
    build_pdf: Callable[[list[bytes]], bytes]


def get_imaging() -> Imaging:
    return Imaging(
        correct_perspective=lambda img, corners, conf: imaging.correct_perspective(img, corners, conf),
        enhance=lambda img: imaging.enhance(img),
        make_thumbnail=lambda img: imaging.make_thumbnail(img),
        image_size=lambda img: imaging.image_size(img),
        build_pdf=lambda pages: imaging.build_pdf(pages),
    )


SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated[Storage, Depends(get_storage)]
AnalyzerDep = Annotated[Analyzer, Depends(get_analyzer)]
ImagingDep = Annotated[Imaging, Depends(get_imaging)]


# --- Serialización ------------------------------------------------------------------------------


def _category(value: str) -> Category:
    return cast(Category, value if value in CATEGORIES else "otro")


def _summary(doc: Document, storage: Storage) -> DocumentSummaryOut:
    first = doc.pages[0] if doc.pages else None
    return DocumentSummaryOut(
        id=doc.id,
        title=doc.title,
        category=_category(doc.category),
        page_count=len(doc.pages),
        # SQLite pierde la zona horaria al leer; las fechas se guardan siempre en UTC.
        created_at=doc.created_at if doc.created_at.tzinfo else doc.created_at.replace(tzinfo=UTC),
        thumbnail_url=storage.url(first.thumbnail_key) if first else None,
    )


def _detail(doc: Document, storage: Storage, pdf_url: str | None = None) -> DocumentDetailOut:
    summary = _summary(doc, storage)
    key_fields: list[KeyField] = []
    for field in doc.key_fields or []:
        try:
            key_fields.append(KeyField.model_validate(field))
        except ValueError:
            continue
    return DocumentDetailOut(
        **summary.model_dump(),
        summary=doc.summary,
        text=doc.text,
        key_fields=key_fields,
        pages=[
            PageOut(index=p.index, url=storage.url(p.image_key), width=p.width, height=p.height)
            for p in doc.pages
        ],
        pdf_url=pdf_url,
    )


def _owner_id(user: User | None) -> str | None:
    return user.id if user else None


def _owned_by(user: User | None):
    """Filtro: los documentos de la cuenta, o los de invitado si no hay sesión."""
    return col(Document.user_id) == user.id if user else col(Document.user_id).is_(None)


def _get_document(session: Session, document_id: str, user: User | None) -> Document:
    doc = session.get(Document, document_id)
    # Un documento ajeno responde igual que uno inexistente.
    if doc is None or doc.user_id != _owner_id(user):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado.")
    return doc


def _slugify(title: str) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_title).strip("-").lower()
    return slug[:80].strip("-") or "documento"


def _read_page(upload: UploadFile, position: int) -> bytes:
    data = upload.file.read(MAX_PAGE_BYTES + 1)
    if len(data) > MAX_PAGE_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"La página {position} supera el límite de {MAX_PAGE_BYTES // (1024 * 1024)} MB.",
        )
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"La página {position} no es una imagen válida.",
        ) from None
    return data


def _pdf_key(document_id: str) -> str:
    """Clave determinista del PDF: no hace falta columna en la BD."""
    return f"documents/{document_id}/document.pdf"


def _exists(storage: Storage, key: str) -> bool:
    """Comprueba si existe una clave sin descargarla (HEAD en S3, stat en disco)."""
    if isinstance(storage, LocalStorage):
        return (storage.root / key).is_file()
    if isinstance(storage, S3Storage):
        from botocore.exceptions import ClientError

        try:
            storage.client.head_object(Bucket=storage.bucket, Key=storage.prefix + key)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return False
            raise
        return True
    # Otros almacenamientos (p. ej. los falsos de los tests): descarga de prueba.
    try:
        storage.get(key)
    except Exception:
        return False
    return True


def _store_pdf(doc: Document, storage: Storage, img: Imaging) -> bytes:
    pdf = img.build_pdf([storage.get(p.image_key) for p in doc.pages])
    storage.put(_pdf_key(doc.id), pdf, PDF)
    return pdf


def _ensure_pdf(doc: Document, storage: Storage, img: Imaging) -> str | None:
    """URL directa del PDF guardado; lo genera una sola vez para documentos antiguos.

    Devuelve None si no hay páginas o si falla la generación (la app usa entonces `/pdf`).
    """
    if not doc.pages:
        return None
    key = _pdf_key(doc.id)
    try:
        if not _exists(storage, key):
            _store_pdf(doc, storage, img)
        return storage.url(key)
    except Exception:
        logger.exception("No se pudo preparar el PDF de %s", doc.id)
        return None


def _delete_keys(storage: Storage, keys: list[str]) -> None:
    for key in keys:
        try:
            storage.delete(key)
        except Exception:
            logger.warning("No se pudo borrar %s del almacenamiento", key, exc_info=True)


# --- Rutas --------------------------------------------------------------------------------------
# Los endpoints son síncronos: FastAPI los ejecuta en un threadpool, así que la IA, Pillow y S3
# (bloqueantes) no frenan el event loop.


@router.get("", response_model=list[DocumentSummaryOut])
def list_documents(
    session: SessionDep,
    storage: StorageDep,
    user: OptionalUser,
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[DocumentSummaryOut]:
    stmt = (
        select(Document)
        .where(_owned_by(user))
        .options(selectinload(Document.pages))  # type: ignore[arg-type]
        .order_by(col(Document.created_at).desc(), col(Document.id).desc())
    )
    term = (q or "").strip()
    if term:
        stmt = stmt.where(
            or_(
                col(Document.title).icontains(term, autoescape=True),
                col(Document.text).icontains(term, autoescape=True),
            )
        )
    return [_summary(doc, storage) for doc in session.exec(stmt).all()]


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_document(
    document_id: str, session: SessionDep, storage: StorageDep, img: ImagingDep, user: OptionalUser
) -> DocumentDetailOut:
    doc = _get_document(session, document_id, user)
    return _detail(doc, storage, _ensure_pdf(doc, storage, img))


@router.post("", response_model=DocumentDetailOut, status_code=status.HTTP_201_CREATED)
def create_document(
    session: SessionDep,
    storage: StorageDep,
    analyze: AnalyzerDep,
    img: ImagingDep,
    user: OptionalUser,
    pages: Annotated[list[UploadFile], File(description="Imágenes de las páginas, en orden")],
    enhance: Annotated[bool, Form()] = True,
) -> DocumentDetailOut:
    if not pages:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envía al menos una página.")
    if len(pages) > MAX_PAGES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"Máximo {MAX_PAGES} páginas por documento."
        )
    images = [_read_page(upload, i + 1) for i, upload in enumerate(pages)]

    try:
        analysis = analyze(images)
    except Exception:
        logger.exception("Fallo al analizar el documento con IA")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "No se pudo analizar el documento con IA. Inténtalo de nuevo en unos minutos.",
        ) from None

    page_analyses = list(analysis.pages[: len(images)])
    page_analyses += [PageAnalysis() for _ in range(len(images) - len(page_analyses))]

    doc = Document(
        user_id=_owner_id(user),
        title=analysis.title.strip() or "Documento sin título",
        category=_category(analysis.category),
        summary=analysis.summary,
        text=analysis.text,
        key_fields=[kf.model_dump() for kf in analysis.key_fields],
    )

    stored: list[str] = []
    pdf_key = _pdf_key(doc.id)
    pdf_url: str | None = None
    try:
        processed_pages: list[bytes] = []
        for index, (original, pa) in enumerate(zip(images, page_analyses, strict=True)):
            processed = img.correct_perspective(original, pa.corners, pa.confidence)
            if enhance:
                processed = img.enhance(processed)
            thumbnail = img.make_thumbnail(processed)
            width, height = img.image_size(processed)
            processed_pages.append(processed)

            base = f"documents/{doc.id}/{index}"
            keys = {
                "original": f"{base}-original.jpg",
                "page": f"{base}-page.jpg",
                "thumb": f"{base}-thumb.jpg",
            }
            for kind, data in (("original", original), ("page", processed), ("thumb", thumbnail)):
                storage.put(keys[kind], data, JPEG)
                stored.append(keys[kind])

            doc.pages.append(
                Page(
                    document_id=doc.id,
                    index=index,
                    image_key=keys["page"],
                    original_key=keys["original"],
                    thumbnail_key=keys["thumb"],
                    width=width,
                    height=height,
                )
            )

        # El PDF se genera una sola vez aquí; después la app lo descarga directo del almacenamiento.
        # Si falla no se pierde el documento: se generará bajo demanda (detalle o `/pdf`).
        try:
            pdf_bytes = img.build_pdf(processed_pages)
            stored.append(pdf_key)
            storage.put(pdf_key, pdf_bytes, PDF)
            pdf_url = storage.url(pdf_key)
        except Exception:
            logger.exception("No se pudo generar el PDF al crear %s; se generará después", doc.id)
        del processed_pages

        session.add(doc)
        session.commit()
    except Exception:
        session.rollback()
        _delete_keys(storage, stored)
        logger.exception("Fallo al guardar el documento")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "No se pudo guardar el documento. Inténtalo de nuevo.",
        ) from None

    session.refresh(doc)
    return _detail(doc, storage, pdf_url)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str, session: SessionDep, storage: StorageDep, user: OptionalUser
) -> Response:
    doc = _get_document(session, document_id, user)
    keys = [k for p in doc.pages for k in (p.original_key, p.image_key, p.thumbnail_key)]
    keys.append(_pdf_key(doc.id))
    session.delete(doc)
    session.commit()
    # Primero la BD: si falla el borrado de algún archivo solo queda basura, nunca filas rotas.
    _delete_keys(storage, keys)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{document_id}/pdf",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def export_pdf(
    document_id: str, session: SessionDep, storage: StorageDep, img: ImagingDep, user: OptionalUser
) -> Response:
    doc = _get_document(session, document_id, user)
    if not doc.pages:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El documento no tiene páginas.")
    # Compatibilidad: la app ahora descarga `pdf_url` directamente; esta ruta sirve el PDF guardado
    # (o lo genera y guarda una vez si el documento es anterior al cambio).
    try:
        try:
            pdf = storage.get(_pdf_key(doc.id))
        except Exception:
            pdf = img.build_pdf([storage.get(p.image_key) for p in doc.pages])
            try:
                storage.put(_pdf_key(doc.id), pdf, PDF)
            except Exception:
                # El PDF ya está en memoria: se sirve igualmente aunque no se haya podido guardar.
                logger.warning("No se pudo guardar el PDF de %s", document_id, exc_info=True)
    except Exception:
        logger.exception("Fallo al generar el PDF de %s", document_id)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "No se pudo generar el PDF."
        ) from None
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_slugify(doc.title)}.pdf"'},
    )
