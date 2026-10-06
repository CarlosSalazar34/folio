import uuid

import pytest
from sqlmodel import Session, delete

PASSWORD = "contraseña-segura"


@pytest.fixture(autouse=True)
def _clean_db(client):
    from folio.db import engine
    from folio.models import Document, Page, User

    def wipe() -> None:
        with Session(engine) as session:
            session.exec(delete(Page))  # type: ignore[call-overload]
            session.exec(delete(Document))  # type: ignore[call-overload]
            session.exec(delete(User))  # type: ignore[call-overload]
            session.commit()

    wipe()
    yield
    wipe()


def _email() -> str:
    return f"user-{uuid.uuid4().hex[:8]}@folio.app"


def _add_document(user_id: str | None, title: str = "Factura") -> str:
    from folio.db import engine
    from folio.models import Document

    with Session(engine) as session:
        doc = Document(title=title, category="factura", user_id=user_id)
        session.add(doc)
        session.commit()
        return doc.id


def _register(client, email: str | None = None, name: str = "Carlos"):
    return client.post("/auth/register", json={"email": email or _email(), "password": PASSWORD, "name": name})


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_returns_token_and_user(client):
    response = _register(client, email="  Carlos@Folio.APP ", name=" Carlos ")
    assert response.status_code == 201
    body = response.json()
    assert body["token"]
    assert body["user"]["email"] == "carlos@folio.app"
    assert body["user"]["name"] == "Carlos"
    assert "password" not in str(body["user"]).lower()


def test_register_duplicate_email_is_409(client):
    email = _email()
    assert _register(client, email=email).status_code == 201
    response = _register(client, email=email.upper())
    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "no-es-un-correo", "password": PASSWORD},
        {"email": "a@b.co", "password": "corta"},
    ],
)
def test_register_validation(client, payload):
    assert client.post("/auth/register", json=payload).status_code == 422


def test_login_and_me(client):
    email = _email()
    _register(client, email=email)
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200
    token = response.json()["token"]

    me = client.get("/auth/me", headers=_auth(token))
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_wrong_password_or_unknown_email_is_401(client):
    email = _email()
    _register(client, email=email)
    wrong = client.post("/auth/login", json={"email": email, "password": "otra-contraseña"})
    unknown = client.post("/auth/login", json={"email": _email(), "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["detail"] == unknown.json()["detail"]


def test_me_requires_valid_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers=_auth("token-falso")).status_code == 401
    # Un token inválido en rutas públicas también es un 401 (no se trata como invitado).
    assert client.get("/documents", headers=_auth("token-falso")).status_code == 401


def test_guest_documents_move_to_account_on_register(client):
    guest_doc = _add_document(None, "Recibo de invitado")
    token = _register(client).json()["token"]

    mine = client.get("/documents", headers=_auth(token)).json()
    assert [d["id"] for d in mine] == [guest_doc]
    assert client.get("/documents").json() == []


def test_guest_documents_move_to_account_on_login(client):
    email = _email()
    _register(client, email=email)
    guest_doc = _add_document(None)
    token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()["token"]
    assert [d["id"] for d in client.get("/documents", headers=_auth(token)).json()] == [guest_doc]


def test_accounts_are_isolated(client):
    alice = _register(client, name="Alice").json()
    bob = _register(client, name="Bob").json()
    alice_doc = _add_document(alice["user"]["id"], "Contrato de Alice")

    assert client.get("/documents", headers=_auth(bob["token"])).json() == []
    assert client.get(f"/documents/{alice_doc}", headers=_auth(bob["token"])).status_code == 404
    assert client.delete(f"/documents/{alice_doc}", headers=_auth(bob["token"])).status_code == 404
    assert client.get(f"/documents/{alice_doc}").status_code == 404  # invitado

    assert client.get("/stats", headers=_auth(bob["token"])).json()["document_count"] == 0
    assert client.get("/stats", headers=_auth(alice["token"])).json()["document_count"] == 1
