import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel


def _uuid() -> str:
    return uuid.uuid4().hex


class Document(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    title: str
    category: str = "otro"
    summary: str = ""
    text: str = ""
    key_fields: list[dict[str, str]] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)

    pages: list["Page"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"order_by": "Page.index", "cascade": "all, delete-orphan"},
    )


class Page(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    document_id: str = Field(foreign_key="document.id", index=True)
    index: int
    # Claves en el almacenamiento (S3 o local)
    image_key: str
    original_key: str
    thumbnail_key: str
    width: int
    height: int

    document: Document | None = Relationship(back_populates="pages")
