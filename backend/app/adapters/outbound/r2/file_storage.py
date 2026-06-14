"""Cloudflare R2 (S3-compatible) implementation of IFileStorage.

Credentials are configured by the super admin through the Admin → Settings UI
and stored in the `system_settings` table — no env vars or server restarts needed.

Requires ``boto3``:
  pip install "boto3>=1.35,<2.0"
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from ....config import Settings
from ....domain.exceptions import DomainError
from ....ports.file_storage import IFileStorage


class CloudflareR2FileStorage(IFileStorage):
    """Saves files to Cloudflare R2 and returns a public URL.

    Credentials are read from the system_settings DB table at upload time,
    so the super admin can configure them in the UI without touching env files.
    Falls back to env-based Settings if DB values are absent (developer convenience).
    """

    def __init__(self, settings: Settings, db: Any) -> None:
        self._settings = settings
        self._db = db

    def _get_config(self) -> dict[str, str]:
        """Read R2 credentials from DB, falling back to env vars."""
        from ....application.system_settings_service import SystemSettingsService
        svc = SystemSettingsService(self._db)
        db_cfg = svc.get_r2_config()

        return {
            "account_id": db_cfg.get("r2.account_id") or self._settings.r2_account_id,
            "access_key_id": db_cfg.get("r2.access_key_id") or self._settings.r2_access_key_id,
            "secret_access_key": db_cfg.get("r2.secret_access_key") or self._settings.r2_secret_access_key,
            "bucket": db_cfg.get("r2.bucket") or self._settings.r2_bucket,
            "public_url": db_cfg.get("r2.public_url") or self._settings.r2_public_url,
        }

    def _is_configured(self) -> bool:
        cfg = self._get_config()
        return bool(cfg["account_id"] and cfg["access_key_id"] and cfg["secret_access_key"] and cfg["bucket"])

    def _client(self) -> Any:
        try:
            import boto3  # type: ignore[import]
        except ImportError as exc:
            raise DomainError(
                "boto3 is required for Cloudflare R2 storage. "
                "Ask your developer to run: pip install 'boto3>=1.35,<2.0'"
            ) from exc

        cfg = self._get_config()
        if not (cfg["account_id"] and cfg["access_key_id"] and cfg["secret_access_key"] and cfg["bucket"]):
            raise DomainError(
                "Cloudflare R2 is not configured yet. "
                "Go to Admin → Settings and fill in your R2 credentials."
            )

        return boto3.client(
            "s3",
            endpoint_url=f"https://{cfg['account_id']}.r2.cloudflarestorage.com",
            aws_access_key_id=cfg["access_key_id"],
            aws_secret_access_key=cfg["secret_access_key"],
            region_name="auto",
        ), cfg["bucket"], cfg["public_url"]

    def save(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str, int]:
        client, bucket, public_url = self._client()
        suffix = Path(original_filename).suffix
        key = f"{uuid.uuid4().hex}{suffix}"
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        base = public_url.rstrip("/")
        url = f"{base}/{key}" if base else f"r2://{bucket}/{key}"
        return key, url, len(content)

    def delete(self, filename: str) -> None:
        try:
            client, bucket, _ = self._client()
            client.delete_object(Bucket=bucket, Key=filename)
        except Exception:
            pass
