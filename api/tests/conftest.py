import os
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))


@pytest.fixture(autouse=True, scope="session")
def _test_env(tmp_path_factory: pytest.TempPathFactory):
    tmp = tmp_path_factory.mktemp("folio")
    # Antes de importar folio: BD y almacenamiento temporales, nunca S3 ni la key real.
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp / 'test.db'}"
    os.environ["LOCAL_STORAGE_DIR"] = str(tmp / "storage")
    os.environ["S3_BUCKET"] = ""
    os.environ["OPENAI_APIKEY"] = "test"
    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from folio.main import app

    with TestClient(app) as c:
        yield c
