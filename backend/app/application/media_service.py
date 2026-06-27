"""Media application service — supports multiple storage backends."""
from __future__ import annotations

from typing import Any, Callable

from ..domain.exceptions import NotFoundError, UnsupportedMediaTypeError
from ..domain.utils import utc_now
from ..ports.file_storage import IFileStorage
from ..ports.repositories import IMediaRepository
from ..models import MediaUpdate

_ALLOWED_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime",
     "application/pdf", "text/csv", "application/vnd.ms-excel",
     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
)

_ALLOWED_ADMIN_TYPES = _ALLOWED_TYPES | frozenset({"application/octet-stream"})

StorageBackend = str  # "local" | "gdrive" | "r2"


class MediaService:
    def __init__(
        self,
        media_repo: IMediaRepository,
        local_storage: IFileStorage,
        gdrive_storage: IFileStorage | None = None,
        r2_storage: IFileStorage | None = None,
        default_backend: StorageBackend = "local",
        user_default_backend: StorageBackend = "local",
        # Optional callable that returns the current default backend from DB (overrides default_backend)
        get_default_backend: Callable[[], str] | None = None,
        get_user_default_backend: Callable[[], str] | None = None,
    ) -> None:
        self._media = media_repo
        self._backends: dict[str, IFileStorage] = {"local": local_storage}
        if gdrive_storage is not None:
            self._backends["gdrive"] = gdrive_storage
        if r2_storage is not None:
            self._backends["r2"] = r2_storage
        self._default = default_backend
        self._user_default = user_default_backend
        self._get_default_backend = get_default_backend
        self._get_user_default_backend = get_user_default_backend

    def _current_default(self) -> str:
        if self._get_default_backend is not None:
            try:
                return self._get_default_backend() or self._default
            except Exception:
                pass
        return self._default

    def _current_user_default(self) -> str:
        if self._get_user_default_backend is not None:
            try:
                return self._get_user_default_backend() or self._user_default
            except Exception:
                pass
        return self._user_default

    def available_backends(self) -> list[dict[str, Any]]:
        return [
            {"key": k, "label": _BACKEND_LABELS.get(k, k)}
            for k in self._backends
        ]

    def _pick_storage(self, backend: str | None) -> IFileStorage:
        key = backend or self._current_default()
        return self._backends.get(key) or self._backends["local"]

    # ------------------------------------------------------------------
    # Admin upload

    def upload_admin(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
        alt_text: str | None,
        storage_backend: str | None = None,
    ) -> dict[str, Any]:
        storage = self._pick_storage(storage_backend)
        filename, url, size = storage.save(original_filename, content, content_type)
        backend_used = storage_backend or self._current_default()
        media_id = self._media.create(
            {
                "filename": filename,
                "url": url,
                "content_type": content_type,
                "size_bytes": size,
                "alt_text": alt_text,
                "owner_type": "admin",
                "moderation_status": "approved",
                "storage_backend": backend_used,
                "created_at": utc_now(),
            }
        )
        return {"id": media_id, "url": url, "storage_backend": backend_used}

    # ------------------------------------------------------------------
    # User upload (content-type restricted; backend from superadmin setting)

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
        storage = self._pick_storage(self._current_user_default())
        filename, url, size = storage.save(original_filename, content, content_type)
        media_id = self._media.create(
            {
                "filename": filename,
                "url": url,
                "content_type": content_type,
                "size_bytes": size,
                "alt_text": alt_text,
                "owner_type": "customer",
                "owner_id": customer_id,
                "moderation_status": "pending",
                "storage_backend": self._user_default,
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
        backend_key = row.get("storage_backend", "local") or "local"
        storage = self._backends.get(backend_key, self._backends["local"])
        storage.delete(row["filename"])
        return {"deleted": media_id}


_BACKEND_LABELS: dict[str, str] = {
    "local": "Local server",
    "gdrive": "Google Drive",
    "r2": "Cloudflare R2",
}
