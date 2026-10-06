"""Registro e inicio de sesión con correo y contraseña."""
import logging
import re
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select, update

from folio.auth import CurrentUser, create_token, hash_password, verify_dummy, verify_password
from folio.db import get_session
from folio.models import Document, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

SessionDep = Annotated[Session, Depends(get_session)]

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not _EMAIL_RE.match(email):
        raise ValueError("Introduce un correo válido.")
    return email


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=80)

    _email = field_validator("email")(_normalize_email)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        return value.strip()


class LoginIn(BaseModel):
    email: str
    password: str = Field(max_length=128)

    _email = field_validator("email")(_normalize_email)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime


class AuthOut(BaseModel):
    token: str
    user: UserOut


def _user_out(user: User) -> UserOut:
    created = user.created_at
    if created.tzinfo is None:  # SQLite pierde la zona horaria; se guarda siempre en UTC
        created = created.replace(tzinfo=UTC)
    return UserOut(id=user.id, email=user.email, name=user.name, created_at=created)


def _claim_guest_documents(session: Session, user: User) -> None:
    """Los documentos escaneados como invitado pasan a la cuenta al registrarse o iniciar sesión."""
    session.exec(  # type: ignore[call-overload]
        update(Document).where(col(Document.user_id).is_(None)).values(user_id=user.id)
    )


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, session: SessionDep) -> AuthOut:
    if session.exec(select(User).where(User.email == body.email)).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.")
    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    session.add(user)
    try:
        session.flush()
        _claim_guest_documents(session, user)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.") from None
    session.refresh(user)
    return AuthOut(token=create_token(user.id), user=_user_out(user))


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, session: SessionDep) -> AuthOut:
    user = session.exec(select(User).where(User.email == body.email)).first()
    if user is None:
        verify_dummy()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    _claim_guest_documents(session, user)
    session.commit()
    return AuthOut(token=create_token(user.id), user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return _user_out(user)
