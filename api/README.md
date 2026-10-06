# Folio API

FastAPI + SQLModel. Analiza documentos escaneados con OpenAI y guarda las imágenes en S3.

## Local

```bash
python3.14 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # rellena OPENAI_APIKEY
.venv/bin/uvicorn app:app --reload
.venv/bin/pytest -q
```

Sin `DATABASE_URL` usa SQLite (`folio.db`); sin `S3_BUCKET` guarda las imágenes en `storage/`.

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/documents?q=` | Lista, más recientes primero; `q` busca en título y texto OCR |
| GET | `/documents/{id}` | Detalle (404 si no existe) |
| POST | `/documents` | multipart `pages` (1–30 imágenes, 15 MB c/u) + `enhance` → 201 |
| DELETE | `/documents/{id}` | 204, borra filas y archivos |
| GET | `/documents/{id}/pdf` | PDF descargable |

## Despliegue en Railway

1. Nuevo servicio desde el repo con **Root Directory** `api` (usa `railway.json`: Railpack + `uvicorn app:app`).
2. Añade el plugin **PostgreSQL** y referencia su `DATABASE_URL` en el servicio
   (`${{Postgres.DATABASE_URL}}`). `postgres://` y `postgresql://` se convierten solos a `postgresql+psycopg://`.
3. Variables:
   - `OPENAI_APIKEY` (o `OPENAI_API_KEY`), opcional `OPENAI_MODEL`
   - `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, opcional `S3_PREFIX` (por defecto `folio/`)
   - `PUBLIC_BASE_URL` = URL pública del servicio (solo se usa con almacenamiento local)
   - opcional `CORS_ORIGINS` (JSON, p. ej. `["https://folio.app"]`)

Railway no guarda el disco entre despliegues: en producción configura S3.
