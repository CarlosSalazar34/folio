import io
from pathlib import Path

import boto3
import pytest
from botocore.exceptions import ClientError
from botocore.response import StreamingBody
from botocore.stub import ANY, Stubber

from folio.storage import LocalStorage, S3Storage, StorageKeyError, get_storage


def test_local_round_trip(tmp_path: Path):
    storage = LocalStorage(tmp_path, "http://api.test/")
    storage.put("docs/abc/page-1.jpg", b"jpeg-bytes", "image/jpeg")

    assert (tmp_path / "docs/abc/page-1.jpg").read_bytes() == b"jpeg-bytes"
    assert storage.get("docs/abc/page-1.jpg") == b"jpeg-bytes"
    assert storage.url("docs/abc/page-1.jpg") == "http://api.test/files/docs/abc/page-1.jpg"

    storage.delete("docs/abc/page-1.jpg")
    assert not (tmp_path / "docs/abc/page-1.jpg").exists()
    storage.delete("docs/abc/page-1.jpg")  # idempotente
    with pytest.raises(FileNotFoundError):
        storage.get("docs/abc/page-1.jpg")


@pytest.mark.parametrize("key", ["", "../x", "a/../../x", "/etc/passwd", "a//b", "a/./b", "a\\b", "a/.."])
def test_local_rejects_traversal(tmp_path: Path, key: str):
    storage = LocalStorage(tmp_path / "root", "http://api.test")
    with pytest.raises(StorageKeyError):
        storage.put(key, b"x", "text/plain")
    with pytest.raises(StorageKeyError):
        storage.url(key)
    assert not (tmp_path / "x").exists()


def test_local_rejects_symlink_escape(tmp_path: Path):
    root = tmp_path / "root"
    root.mkdir()
    (root / "link").symlink_to(tmp_path)
    storage = LocalStorage(root, "http://api.test")
    with pytest.raises(StorageKeyError):
        storage.put("link/evil.txt", b"x", "text/plain")


def test_get_storage_defaults_to_local_and_files_are_served(client):
    storage = get_storage()
    assert isinstance(storage, LocalStorage)
    assert get_storage() is storage

    storage.put("test/hello.txt", b"hola", "text/plain")
    response = client.get("/files/test/hello.txt")
    assert response.status_code == 200
    assert response.content == b"hola"
    storage.delete("test/hello.txt")


@pytest.fixture
def s3():
    client = boto3.client(
        "s3", region_name="us-east-1", aws_access_key_id="testing", aws_secret_access_key="testing"
    )
    with Stubber(client) as stubber:
        yield S3Storage("bucket", "folio/", client=client), stubber, client
        stubber.assert_no_pending_responses()


def test_s3_put_get_delete(s3):
    storage, stubber, _ = s3
    stubber.add_response(
        "put_object",
        {},
        {"Bucket": "bucket", "Key": "folio/docs/a.jpg", "Body": b"img", "ContentType": "image/jpeg"},
    )
    stubber.add_response(
        "get_object",
        {"Body": StreamingBody(io.BytesIO(b"img"), 3)},
        {"Bucket": "bucket", "Key": "folio/docs/a.jpg"},
    )
    stubber.add_response("delete_object", {}, {"Bucket": "bucket", "Key": "folio/docs/a.jpg"})
    stubber.add_response("delete_object", {}, {"Bucket": "bucket", "Key": "folio/docs/a.jpg"})

    storage.put("docs/a.jpg", b"img", "image/jpeg")
    assert storage.get("docs/a.jpg") == b"img"
    storage.delete("docs/a.jpg")
    storage.delete("docs/a.jpg")  # idempotente


def test_s3_presigned_url(s3):
    storage, _, _ = s3
    url = storage.url("docs/a.jpg", expires_in=120)
    assert url.startswith("https://bucket.s3.amazonaws.com/folio/docs/a.jpg?")
    assert "X-Amz-Expires=120" in url or "Expires=" in url


def test_s3_prefix_normalized_and_key_validated():
    client = boto3.client("s3", region_name="us-east-1", aws_access_key_id="t", aws_secret_access_key="t")
    assert S3Storage("b", "folio", client=client).prefix == "folio/"
    assert S3Storage("b", "", client=client).prefix == ""
    with pytest.raises(StorageKeyError):
        S3Storage("b", "folio/", client=client).url("../x")


def test_s3_get_missing_raises(s3):
    storage, stubber, _ = s3
    stubber.add_client_error("get_object", "NoSuchKey", http_status_code=404, expected_params={"Bucket": "bucket", "Key": ANY})
    with pytest.raises(ClientError):
        storage.get("docs/missing.jpg")


def test_r2_endpoint_client_builds_path_style_presigned_urls():
    from folio.config import Settings
    from folio.storage import _make_s3_client

    settings = Settings(
        _env_file=None,
        s3_endpoint_url="https://cuenta.r2.cloudflarestorage.com/",
        aws_access_key_id="k",
        aws_secret_access_key="s",
    )
    client = _make_s3_client(settings)
    assert client.meta.region_name == "auto"
    url = S3Storage("folio-docs", "folio/", client=client).url("docs/a.jpg", expires_in=60)
    assert url.startswith("https://cuenta.r2.cloudflarestorage.com/folio-docs/folio/docs/a.jpg?")
    assert "X-Amz-Expires=60" in url


def test_aws_client_without_endpoint_keeps_default_host():
    from folio.config import Settings
    from folio.storage import _make_s3_client

    settings = Settings(_env_file=None, aws_region="eu-west-1", aws_access_key_id="k", aws_secret_access_key="s")
    client = _make_s3_client(settings)
    assert client.meta.region_name == "eu-west-1"
    assert "amazonaws.com" in client.meta.endpoint_url
