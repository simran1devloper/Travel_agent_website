"""Local-disk implementation of IFileStorage."""
from __future__ import annotations

import uuid
from pathlib import Path

from ....ports.file_storage import IFileStorage


class LocalFileStorage(IFileStorage):
    """Saves files to a local upload directory with UUID-prefixed names."""

    def __init__(self, upload_dir: str = "backend/uploads") -> None:
        self._upload_dir = Path(upload_dir)

    def save(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str, int]:
        """Write *content* to disk.

        Returns ``(unique_filename, public_url, size_bytes)``.
        """
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(original_filename).suffix
        unique_name = f"{uuid.uuid4().hex}{suffix}"
        target = self._upload_dir / unique_name
        target.write_bytes(content)
        return unique_name, f"/uploads/{unique_name}", target.stat().st_size

    def delete(self, filename: str) -> None:
        target = self._upload_dir / filename
        target.unlink(missing_ok=True)
