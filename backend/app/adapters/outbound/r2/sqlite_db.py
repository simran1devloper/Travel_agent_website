"""R2-SQLite database adapter.

The SQLite database file is stored in Cloudflare R2.  On first use it is
downloaded to a local cache; after each transaction the updated file is
uploaded back.

Configuration (env vars, falling back to system settings):
  R2_ACCOUNT_ID       / r2.account_id
  R2_ACCESS_KEY_ID    / r2.access_key_id
  R2_SECRET_ACCESS_KEY/ r2.secret_access_key
  R2_BUCKET           / r2.bucket
  R2_DB_CACHE_PATH    — local cache path (default: /tmp/journeymakers-r2.sqlite3)
  R2_DB_KEY           — object key in the bucket (default: db/journeymakers.sqlite3)

Requires ``boto3``.
"""
from __future__ import annotations

import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from ....ports.database import IDatabase

_lock = threading.Lock()
_DEFAULT_KEY = "db/journeymakers.sqlite3"
_DEFAULT_CACHE = "/tmp/journeymakers-r2.sqlite3"


class R2SQLiteDatabase(IDatabase):
    """Stores the SQLite DB file in Cloudflare R2; syncs on every commit."""

    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket: str,
        db_key: str = _DEFAULT_KEY,
        cache_path: str = _DEFAULT_CACHE,
    ) -> None:
        self._account_id = account_id
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._bucket = bucket
        self._db_key = db_key
        self._cache_path = cache_path
        self._initialized = False

    # ── IDatabase ─────────────────────────────────────────────────────────────

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        with _lock:
            self._ensure_local()
            conn = sqlite3.connect(self._cache_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            try:
                yield conn
                conn.commit()
                self._push_to_r2()
            finally:
                conn.close()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _client(self) -> Any:
        try:
            import boto3  # type: ignore[import]
        except ImportError as exc:
            raise RuntimeError(
                "boto3 is required for R2-SQLite storage. Run: pip install 'boto3>=1.35,<2.0'"
            ) from exc
        return boto3.client(
            "s3",
            endpoint_url=f"https://{self._account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
            region_name="auto",
        )

    def _ensure_local(self) -> None:
        if self._initialized:
            return
        cache = Path(self._cache_path)
        if not cache.exists():
            self._pull_from_r2()
        self._initialized = True

    def _pull_from_r2(self) -> None:
        client = self._client()
        Path(self._cache_path).parent.mkdir(parents=True, exist_ok=True)
        try:
            client.download_file(self._bucket, self._db_key, self._cache_path)
        except Exception:
            # File doesn't exist yet in R2 — will be created on first push
            pass

    def _push_to_r2(self) -> None:
        client = self._client()
        client.upload_file(
            self._cache_path,
            self._bucket,
            self._db_key,
            ExtraArgs={"ContentType": "application/octet-stream"},
        )
