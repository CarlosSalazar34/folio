from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=API_DIR / ".env", extra="ignore")

    openai_api_key: str = Field(default="", validation_alias=AliasChoices("OPENAI_APIKEY", "OPENAI_API_KEY"))
    # Modelo con visión y salida estructurada; el más eficiente de la familia GPT-6 (override: OPENAI_MODEL).
    openai_model: str = "gpt-6-luna"

    database_url: str = f"sqlite:///{API_DIR / 'folio.db'}"

    s3_bucket: str = ""
    s3_prefix: str = "folio/"
    aws_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    local_storage_dir: Path = API_DIR / "storage"
    public_base_url: str = "http://127.0.0.1:8000"

    cors_origins: list[str] = ["*"]

    # Firma de los tokens de sesión. Vacío en local: se genera una vez y se guarda en api/.jwt_secret.
    # En producción (Railway) define JWT_SECRET.
    jwt_secret: str = ""
    jwt_expire_days: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
