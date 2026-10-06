from collections.abc import Iterator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from folio.config import get_settings


def _normalize_url(url: str) -> str:
    """Railway entrega `postgres(ql)://`; usamos el driver psycopg 3 instalado."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url.removeprefix(prefix)
    return url


_settings = get_settings()
_database_url = _normalize_url(_settings.database_url)
_connect_args = {"check_same_thread": False} if _database_url.startswith("sqlite") else {}
engine = create_engine(_database_url, connect_args=_connect_args, pool_pre_ping=True)


def create_db_and_tables() -> None:
    from folio import models  # noqa: F401  (registra las tablas)

    SQLModel.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    """Migraciones mínimas para bases creadas antes de un cambio (create_all no añade columnas)."""
    columns = {c["name"] for c in inspect(engine).get_columns("document")}
    if "user_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE document ADD COLUMN user_id VARCHAR"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_user_id ON document (user_id)"))


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
