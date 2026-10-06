from collections.abc import Iterator

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


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
