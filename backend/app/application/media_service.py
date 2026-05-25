"""Media application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError, UnsupportedMediaTypeError
from ..domain.utils import utc_now
from ..ports.file_storage import IFileStorage
from ..ports.repositories import IMediaRepository
from ..models import MediaUpdate

_ALLOWED_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"}
)


class MediaService:
    def __init__(
        self,
        media_repo: IMediaRepository,
        file_storage: IFileStorage,
    ) -> None:
        self._media = media_repo
        self._storage = file_storage

    # ------------------------------------------------------------------
    # Admin upload (preserves original filename, no content-type check)

    def upload_admin(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
        alt_text: str | None,
    ) -> dict[str, Any]:
        filename, url, size = self._storage.save(
            original_filename, content, content_type
        )
        media_id = self._media.create(
            {
                "filename": filename,
                "url": url,
                "content_type": content_type,
                "size_bytes": size,
                "alt_text": alt_text,
                "owner_type": "admin",
                "created_at": utc_now(),
            }
        )
        return {"id": media_id, "url": url}

    # ------------------------------------------------------------------
    # User upload (content-type restricted)

    def upload_user(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
        alt_text: str | None,
        customer_id: int | None,
    ) -> dict[str, Any]:
        if content_type not in _ALLOWED_TYPES:
            raise UnsupportedMediaTypeError("Unsupported file type")
        filename, url, size = self._storage.save(
            original_filename, content, content_type
        )
        media_id = self._media.create(
            {
                "filename": filename,
                "url": url,
                "content_type": content_type,
                "size_bytes": size,
                "alt_text": alt_text,
                "owner_type": "customer",
                "owner_id": customer_id,
                "created_at": utc_now(),
            }
        )
        return {"id": media_id, "url": url}

    # ------------------------------------------------------------------
    # Admin management

    def list_admin(self, page: int, per_page: int) -> dict[str, Any]:
        items, total = self._media.list_paginated(page, per_page)
        return {
            "items": items,
            "total": total,
            "page": page,
            "pages": max(1, -(-total // per_page)),
        }

    def update_admin(self, media_id: int, payload: MediaUpdate) -> dict[str, Any]:
        row = self._media.find_by_id(media_id)
        if not row:
            raise NotFoundError("Media not found")
        self._media.update(
            media_id,
            {
                "alt_text": payload.alt_text if payload.alt_text is not None else row.get("alt_text"),
                "owner_type": payload.owner_type if payload.owner_type is not None else row.get("owner_type"),
                "owner_slug": payload.owner_slug if payload.owner_slug is not None else row.get("owner_slug"),
            },
        )
        return {"id": media_id}

    def delete_admin(self, media_id: int) -> dict[str, Any]:
        row = self._media.find_by_id(media_id)
        if not row:
            raise NotFoundError("Media not found")
        self._media.delete(media_id)
        self._storage.delete(row["filename"])
        return {"deleted": media_id}
