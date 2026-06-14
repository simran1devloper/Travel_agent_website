"""System settings service — DB-backed config with secure secrets routing.

Non-sensitive settings (e.g. ``storage.default_backend``, ``r2.bucket``) are
stored in the ``system_settings`` SQLite table as plain text.

Sensitive credentials (e.g. ``r2.access_key_id``, ``r2.secret_access_key``)
are routed through an ``ISecretsStore`` — which may encrypt them in SQLite,
store them in Cloudflare Workers KV, or push them to Infisical.
"""
from __future__ import annotations

from typing import Any

from ..domain.utils import utc_now
from ..ports.secrets_store import ISecretsStore


_ALLOWED_KEYS = {
    "storage.default_backend",
    "storage.user_default_backend",
    "r2.account_id",
    "r2.access_key_id",
    "r2.secret_access_key",
    "r2.bucket",
    "r2.public_url",
    "google.client_id",
    "google.client_secret",
    # DB backend selection
    "db.backend",           # local-sqlite | gdrive-sqlite | r2-sqlite | neon-postgres
    "db.neon_url",          # Neon DATABASE_URL (postgres://...)
    "db.gdrive_file_id",    # GDrive file ID of the sqlite3 file
    "db.gdrive_refresh_token",  # Long-lived refresh token for gdrive-sqlite
    "db.r2_key",            # R2 object key (default: db/journeymakers.sqlite3)
}

# Keys routed through ISecretsStore instead of plain DB
_SENSITIVE_KEYS = {
    "r2.access_key_id",
    "r2.secret_access_key",
    "google.client_secret",
    "db.neon_url",
    "db.gdrive_refresh_token",
}

_MASK = "••••••••"


class SystemSettingsService:
    def __init__(self, db: Any, secrets_store: ISecretsStore) -> None:
        self._db = db
        self._secrets_store = secrets_store

    # ── Internal DB helpers (non-sensitive only) ──────────────────────────────

    def _db_get(self, key: str) -> str:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT value FROM system_settings WHERE key = ?", (key,)
            ).fetchone()
        return str(row[0]) if row and row[0] else ""

    def _db_set(self, key: str, value: str) -> None:
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE
                  SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, now),
            )

    # ── Public API ────────────────────────────────────────────────────────────

    def get(self, key: str, default: str = "") -> str:
        if key in _SENSITIVE_KEYS:
            return self._secrets_store.get(key) or default
        return self._db_get(key) or default

    def set(self, key: str, value: str) -> None:
        if key not in _ALLOWED_KEYS:
            from ..domain.exceptions import DomainError
            raise DomainError(f"Unknown system setting: {key!r}")
        if key in _SENSITIVE_KEYS:
            self._secrets_store.set(key, value)
        else:
            self._db_set(key, value)

    def set_many(self, updates: dict[str, str]) -> None:
        for key, value in updates.items():
            self.set(key, value)

    def get_all(self, mask_secrets: bool = True) -> dict[str, str]:
        """Return all settings.  Sensitive values are masked when mask_secrets=True."""
        # Non-sensitive: read from DB
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT key, value FROM system_settings WHERE key NOT IN ({})".format(
                    ",".join("?" * len(_SENSITIVE_KEYS))
                ),
                tuple(_SENSITIVE_KEYS),
            ).fetchall()
        result: dict[str, str] = {k: v for k, v in rows}

        # Sensitive: read from secrets store
        for key in _SENSITIVE_KEYS:
            value = self._secrets_store.get(key)
            if value and mask_secrets:
                result[key] = _MASK
            else:
                result[key] = value

        return result

    def get_r2_config(self) -> dict[str, str]:
        """Return raw (unmasked) R2 credentials for use by the R2 adapter."""
        return {
            "r2.account_id": self._db_get("r2.account_id"),
            "r2.access_key_id": self._secrets_store.get("r2.access_key_id"),
            "r2.secret_access_key": self._secrets_store.get("r2.secret_access_key"),
            "r2.bucket": self._db_get("r2.bucket"),
            "r2.public_url": self._db_get("r2.public_url"),
        }

    def get_google_config(self) -> dict[str, str]:
        """Return raw (unmasked) Google OAuth credentials. Falls back to env vars."""
        import os
        return {
            "google.client_id": self._db_get("google.client_id") or os.getenv("GOOGLE_CLIENT_ID", ""),
            "google.client_secret": (
                self._secrets_store.get("google.client_secret")
                or os.getenv("GOOGLE_CLIENT_SECRET", "")
            ),
        }

    def get_db_config(self) -> dict[str, str]:
        """Return DB backend config (backend name + credentials)."""
        return {
            "db.backend": self._db_get("db.backend") or "local-sqlite",
            "db.neon_url": self._secrets_store.get("db.neon_url") or "",
            "db.gdrive_file_id": self._db_get("db.gdrive_file_id") or "",
            "db.gdrive_refresh_token": self._secrets_store.get("db.gdrive_refresh_token") or "",
            "db.r2_key": self._db_get("db.r2_key") or "db/journeymakers.sqlite3",
        }

    def secrets_store_info(self) -> dict[str, str]:
        """Return the name of the active secrets store (for display in Settings tab)."""
        name = type(self._secrets_store).__name__
        return {"backend": name, "available": str(self._secrets_store.is_available())}
