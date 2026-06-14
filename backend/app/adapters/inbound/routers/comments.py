"""Comments router — public submit + admin moderation."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.comment_service import CommentService
from ....models import CommentCreate
from ..auth_adapter import require_admin
from ..dependencies import get_comment_service

router = APIRouter(tags=["comments"])


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("/{entity_type}/{slug}/comments")
def list_entity_comments(
    entity_type: str,
    slug: str,
    svc: CommentService = Depends(get_comment_service),
) -> list[dict[str, Any]]:
    """Return approved comments for a package, destination, or service."""
    return svc.list_by_entity(entity_type, slug)


@router.post("/comments", status_code=201)
def submit_comment(
    payload: CommentCreate,
    svc: CommentService = Depends(get_comment_service),
) -> dict[str, Any]:
    """Anyone can submit a comment; it starts as 'pending' until approved."""
    return svc.submit(payload)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/comments", dependencies=[Depends(require_admin)])
def admin_list_comments(
    status: str | None = None,
    svc: CommentService = Depends(get_comment_service),
) -> list[dict[str, Any]]:
    return svc.admin_list(status)


@router.patch("/admin/comments/{public_id}", dependencies=[Depends(require_admin)])
def admin_update_comment(
    public_id: str,
    payload: dict[str, str],
    svc: CommentService = Depends(get_comment_service),
) -> dict[str, Any]:
    status = payload.get("status", "")
    if status not in ("approved", "rejected", "pending"):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="status must be approved, rejected, or pending")
    return svc.admin_update_status(public_id, status)


@router.delete("/admin/comments/{public_id}", dependencies=[Depends(require_admin)])
def admin_delete_comment(
    public_id: str,
    svc: CommentService = Depends(get_comment_service),
) -> dict[str, str]:
    return svc.admin_delete(public_id)
