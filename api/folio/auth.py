"""Cuentas con correo y contraseña: hash (Argon2), tokens de sesión (JWT) y dependencias."""
import logging
import os
import secrets
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlmodel import Session

from folio.config import API_DIR, get_settings
from folio.db import get_session
from folio.models import User

logger = logging.getLogger(__name__)

_ALGORITHM = "HS256"
_hasher = PasswordHash.recommended()
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


@lru_cache
def _dummy_hash() -> str:
    return _hasher.hash(secrets.token_urlsafe(16))


def verify_dummy() -> None:
    """Gasta lo mismo que una verificación real cuando el correo no existe (evita adivinar cuentas por tiempo)."""
    _hasher.verify("x", _dummy_hash())


@lru_cache
def _secret() -> str:
    configured = get_settings().jwt_secret
    if configured:
        return configured
    path = API_DIR / ".jwt_secret"
    if path.exists():
        return path.read_text().strip()
    secret = secrets.token_urlsafe(48)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(secret)
    logger.warning("JWT_SECRET no definido: se generó uno local en %s (defínelo en producción)", path)
    return secret


def create_token(user_id: str) -> str:
    now = datetime.now(UTC)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(days=get_settings().jwt_expire_days)}
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


_INVALID = HTTPException(
    status.HTTP_401_UNAUTHORIZED,
    "Tu sesión no es válida o ha caducado. Vuelve a iniciar sesión.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[Session, Depends(get_session)],
) -> User | None:
    """Usuario de la sesión, o None si es un invitado. Un token inválido es un 401, no un invitado."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, _secret(), algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        raise _INVALID from None
    user = session.get(User, payload.get("sub"))
    if user is None:
        raise _INVALID
    return user


def require_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise _INVALID
    return user


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentUser = Annotated[User, Depends(require_user)]
