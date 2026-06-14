"""Comment application service — public comments on packages, destinations, and services."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..adapters.outbound.sqlite.repositories.comment import SQLiteCommentRepository
from ..models import CommentCreate


class CommentService:
    def __init__(self, comment_repo: SQLiteCommentRepository) -> None:
        self._comments = comment_repo

    def list_by_entity(self, entity_type: str, entity_slug: str) -> list[dict[str, Any]]:
        return self._comments.list_approved_by_entity(entity_type, entity_slug)

    def submit(self, payload: CommentCreate) -> dict[str, Any]:
        public_id = f"CMT-{self._comments.count() + 1001}"
        self._comments.create(
            {
                "public_id": public_id,
                "entity_type": payload.entity_type,
                "entity_slug": payload.entity_slug,
                "name": payload.name,
                "email": payload.email,
                "body": payload.body,
                "created_at": utc_now(),
            }
        )
        return {"id": public_id, "status": "pending"}

    # ── Admin ─────────────────────────────────────────────────────────────────

    def admin_list(self, status: str | None = None) -> list[dict[str, Any]]:
        return self._comments.list_all(status)

    def admin_update_status(self, public_id: str, status: str) -> dict[str, Any]:
        comment = self._comments.find_by_public_id(public_id)
        if not comment:
            raise NotFoundError("Comment not found")
        self._comments.update_status(public_id, status)
        return {**comment, "status": status}

    def admin_delete(self, public_id: str) -> dict[str, str]:
        if not self._comments.find_by_public_id(public_id):
            raise NotFoundError("Comment not found")
        self._comments.delete(public_id)
        return {"deleted": public_id}
