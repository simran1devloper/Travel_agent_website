"""GDrive-SQLite database adapter.

The SQLite database file is stored in Google Drive.  On first use the file is
downloaded to a local cache path; after each transaction the updated file is
uploaded back.  This means every write incurs a GDrive round-trip — acceptable
for low-traffic admin tooling but not for high-throughput workloads.

Configuration (all via env vars or super-admin settings):
  GOOGLE_CLIENT_ID        — OAuth client ID
  GOOGLE_CLIENT_SECRET    — OAuth client secret
  GDRIVE_DB_REFRESH_TOKEN — long-lived refresh token (set once, stored here)
  GDRIVE_DB_FILE_ID       — Drive file ID of the .sqlite3 file (auto-created on first upload)
  GDRIVE_DB_CACHE_PATH    — local cache path (default: /tmp/journeymakers-gdrive.sqlite3)
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from ....ports.database import IDatabase

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
_FILES_URL = "https://www.googleapis.com/drive/v3/files"
_DOWNLOAD_URL = "https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"

_DB_FILENAME = "journeymakers.sqlite3"
_lock = threading.Lock()


class GDriveSQLiteDatabase(IDatabase):
    """Stores the SQLite DB file in Google Drive; syncs on every commit."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        file_id: str = "",
        cache_path: str = "/tmp/journeymakers-gdrive.sqlite3",
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._refresh_token = refresh_token
        self._file_id = file_id
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
                self._push_to_gdrive()
            finally:
                conn.close()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _ensure_local(self) -> None:
        if self._initialized:
            return
        if self._file_id and not Path(self._cache_path).exists():
            self._pull_from_gdrive()
        self._initialized = True

    def _get_access_token(self) -> str:
        import urllib.request, urllib.parse
        body = urllib.parse.urlencode({
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": self._refresh_token,
            "grant_type": "refresh_token",
        }).encode()
        req = urllib.request.Request(_TOKEN_URL, data=body, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        token = data.get("access_token")
        if not token:
            raise RuntimeError("GDrive-SQLite: could not refresh access token")
        return str(token)

    def _pull_from_gdrive(self) -> None:
        import urllib.request
        token = self._get_access_token()
        url = _DOWNLOAD_URL.format(file_id=self._file_id)
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {token}")
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
        Path(self._cache_path).parent.mkdir(parents=True, exist_ok=True)
        Path(self._cache_path).write_bytes(content)

    def _push_to_gdrive(self) -> None:
        import urllib.request
        content = Path(self._cache_path).read_bytes()
        token = self._get_access_token()
        if self._file_id:
            # Update existing file
            req = urllib.request.Request(
                f"{_UPLOAD_URL}/{self._file_id}?uploadType=media",
                data=content,
                method="PATCH",
            )
        else:
            # Create new file
            req = urllib.request.Request(
                f"{_UPLOAD_URL}?uploadType=multipart",
                data=self._build_multipart(content),
                method="POST",
            )
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/octet-stream")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        if not self._file_id:
            self._file_id = data["id"]

    def _build_multipart(self, content: bytes) -> bytes:
        boundary = b"sqlite_db_boundary"
        metadata = json.dumps({"name": _DB_FILENAME}).encode()
        return (
            b"--" + boundary + b"\r\n"
            b"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            + metadata + b"\r\n"
            b"--" + boundary + b"\r\n"
            b"Content-Type: application/octet-stream\r\n\r\n"
            + content + b"\r\n"
            b"--" + boundary + b"--"
        )
