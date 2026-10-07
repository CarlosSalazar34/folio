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
   - `JWT_SECRET`: texto largo y aleatorio (**obligatorio**; sin él cada despliegue cierra todas las sesiones)
   - Almacenamiento (Cloudflare R2 o AWS S3): `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
     `AWS_REGION` y, para R2, `S3_ENDPOINT_URL`; opcional `S3_PREFIX` (por defecto `folio/`)
   - `PUBLIC_BASE_URL` = URL pública del servicio (solo se usa con almacenamiento local)
   - opcional `CORS_ORIGINS` (JSON, p. ej. `["https://folio.app"]`)

Railway no guarda el disco entre despliegues: en producción configura R2 o S3.

### Cloudflare R2

1. En Cloudflare: **R2 → Create bucket** (p. ej. `folio-docs`). El bucket es privado; la app usa URLs prefirmadas.
2. **R2 → Manage API tokens → Create API token** con permiso **Object Read & Write**, limitado a ese bucket.
3. Variables:
   ```
   S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_BUCKET=folio-docs
   AWS_REGION=auto
   AWS_ACCESS_KEY_ID=<Access Key ID del token>
   AWS_SECRET_ACCESS_KEY=<Secret Access Key del token>
   ```
