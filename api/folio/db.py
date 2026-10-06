from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from folio.config import get_settings

_settings = get_settings()
_connect_args = {"check_same_thread": False} if _settings.database_url.startswith("sqlite") else {}
engine = create_engine(_settings.database_url, connect_args=_connect_args)


def create_db_and_tables() -> None:
    from folio import models  # noqa: F401  (registra las tablas)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
