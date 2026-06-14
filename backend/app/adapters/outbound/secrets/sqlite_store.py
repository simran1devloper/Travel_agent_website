"""SQLite-backed secrets store with optional Fernet encryption.

When ``encryption_key`` is set (a 32-byte URL-safe base64 key generated via
``Fernet.generate_key()``), every secret value is encrypted before being
written to the ``system_settings`` table and decrypted on read.

Without an encryption key the store falls back to plain-text (acceptable for
local development; a warning is logged).  Set ``SECRETS_ENCRYPTION_KEY`` in
``backend/.env`` before going to production.

Generate a key once:
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

import logging
from typing import Any

from ....domain.utils import utc_now
from ....ports.secrets_store import ISecretsStore

log = logging.getLogger(__name__)

_ENC_PREFIX = "enc:v1:"


class SQLiteSecretsStore(ISecretsStore):
    """Stores secrets in the ``system_settings`` table, optionally Fernet-encrypted."""

    def __init__(self, db: Any, encryption_key: str = "") -> None:
        self._db = db
        self._fernet = None
        if encryption_key:
            try:
                from cryptography.fernet import Fernet  # type: ignore[import]
                self._fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
            except ImportError:
                log.warning(
                    "cryptography package not installed — secrets stored as plain text. "
                    "Run: pip install 'cryptography>=42,<45'"
                )
            except Exception as exc:
                log.warning("Invalid SECRETS_ENCRYPTION_KEY (%s) — plain-text fallback.", exc)
        else:
            log.warning(
                "SECRETS_ENCRYPTION_KEY not set — secrets stored as plain text in SQLite. "
                "Set this env var in backend/.env before going to production."
            )

    def _encrypt(self, value: str) -> str:
        if self._fernet is None:
            return value
        return _ENC_PREFIX + self._fernet.encrypt(value.encode()).decode()

    def _decrypt(self, raw: str) -> str:
        if not raw.startswith(_ENC_PREFIX):
            return raw
        if self._fernet is None:
            log.error("Encrypted secret found but no encryption key configured — returning empty.")
            return ""
        try:
            return self._fernet.decrypt(raw[len(_ENC_PREFIX):].encode()).decode()
        except Exception as exc:
            log.error("Failed to decrypt secret: %s", exc)
            return ""

    def get(self, key: str) -> str:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT value FROM system_settings WHERE key = ?", (key,)
            ).fetchone()
        if not row or not row[0]:
            return ""
        return self._decrypt(str(row[0]))

    def set(self, key: str, value: str) -> None:
        stored = self._encrypt(value)
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE
                  SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, stored, now),
            )

    def delete(self, key: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM system_settings WHERE key = ?", (key,))
