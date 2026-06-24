"""Google Drive implementation of IFileStorage.

Uploads files to the GDrive account of the first super-admin who has
completed the OAuth flow (has a gdrive_refresh_token in the DB).
Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from ....config import Settings
from ....domain.exceptions import DomainError
from ....ports.file_storage import IFileStorage


class GDriveFileStorage(IFileStorage):
    """Saves files to Google Drive and returns a publicly shareable URL."""

    def __init__(self, settings: Settings, db: object) -> None:
        self._settings = settings
        self._db = db

    def save(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str, int]:
        if not self._settings.google_oauth_enabled:
            raise DomainError(
                "Google Drive is not configured. "
                "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file."
            )

        admin_id = self._find_connected_admin()
        if admin_id is None:
            raise DomainError(
                "No Google Drive account is connected. "
                "Go to Admin → Settings and connect your Google Drive."
            )

        from ....application.gdrive_service import GDriveService
        svc = GDriveService(self._settings, self._db)

        suffix = Path(original_filename).suffix
        unique_name = f"{uuid.uuid4().hex}{suffix}"
        url = svc.upload_file(admin_id, unique_name, content, content_type)
        return unique_name, url, len(content)

    def delete(self, filename: str) -> None:
        # Deleting from GDrive would require storing the file ID separately.
        # The filename here is just the key we assigned — skip silently.
        pass

    def _find_connected_admin(self) -> int | None:
        with self._db.connect() as conn:  # type: ignore[attr-defined]
            row = conn.execute(
                "SELECT id FROM customers"
                " WHERE role='admin' AND gdrive_refresh_token IS NOT NULL"
                " ORDER BY id LIMIT 1"
            ).fetchone()
        return int(row["id"]) if row else None
