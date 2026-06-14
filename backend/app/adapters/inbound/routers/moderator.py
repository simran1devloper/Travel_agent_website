"""Moderator panel endpoints — accessible to moderator and admin roles."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth_adapter import require_moderator

router = APIRouter(tags=["moderator"])


def _container(request: Request):
    return request.app.state.container


_REVIEW_COLS = ["id", "public_id", "package_slug", "rating", "body", "status", "created_at", "moderation_note", "customer_name"]


@router.get("/moderator/reviews", dependencies=[Depends(require_moderator)])
def list_pending_reviews(
    status: str = "pending",
    page: int = 1,
    per_page: int = 20,
    request: Request = None,
) -> dict[str, Any]:
    """List reviews for moderation."""
    c = _container(request)
    with c.db.connect() as conn:
        rows = conn.execute(
            """SELECT r.id, r.public_id, r.package_slug, r.rating, r.body,
                      r.status, r.created_at, r.moderation_note,
                      cu.name as customer_name
               FROM reviews r
               LEFT JOIN customers cu ON cu.id = r.customer_id
               ORDER BY r.created_at DESC
               LIMIT ? OFFSET ?""",
            (per_page, (page - 1) * per_page),
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    items = [dict(zip(_REVIEW_COLS, row)) for row in rows]
    return {"items": items, "total": total, "page": page}


@router.patch("/moderator/reviews/{public_id}", dependencies=[Depends(require_moderator)])
def moderate_review(
    public_id: str,
    payload: dict[str, Any],
    request: Request = None,
) -> dict[str, Any]:
    """Update review status and/or add a moderation note."""
    c = _container(request)
    updates = []
    params = []
    if "status" in payload:
        updates.append("status = ?")
        params.append(payload["status"])
    if "moderation_note" in payload:
        updates.append("moderation_note = ?")
        params.append(payload["moderation_note"])
    if not updates:
        return {"ok": True}
    params.append(public_id)
    with c.db.connect() as conn:
        conn.execute(
            f"UPDATE reviews SET {', '.join(updates)} WHERE public_id = ?",  # noqa: S608
            params,
        )
    return {"ok": True}


@router.get("/moderator/inquiries", dependencies=[Depends(require_moderator)])
def list_inquiries_for_moderation(
    page: int = 1,
    per_page: int = 20,
    request: Request = None,
) -> dict[str, Any]:
    """List all inquiries for moderator review."""
    c = _container(request)
    with c.db.connect() as conn:
        rows = conn.execute(
            """SELECT i.public_id, i.full_name, i.email, i.destinations,
                      i.budget, i.status, i.created_at, i.moderator_note,
                      p.name as planner_name
               FROM inquiries i
               LEFT JOIN planners p ON p.id = i.assigned_planner_id
               ORDER BY i.created_at DESC
               LIMIT ? OFFSET ?""",
            (per_page, (page - 1) * per_page),
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0]
        cols = ["public_id", "full_name", "email", "destinations", "budget", "status", "created_at", "moderator_note", "planner_name"]
    import json
    items = []
    for row in rows:
        d = dict(zip(cols, row))
        try:
            d["destinations"] = json.loads(d["destinations"] or "[]")
        except Exception:
            d["destinations"] = []
        items.append(d)
    return {"items": items, "total": total, "page": page}


@router.patch("/moderator/inquiries/{public_id}", dependencies=[Depends(require_moderator)])
def add_moderator_note(
    public_id: str,
    payload: dict[str, Any],
    request: Request = None,
) -> dict[str, Any]:
    """Add or update a moderator note on an inquiry."""
    c = _container(request)
    note = payload.get("moderator_note", "")
    with c.db.connect() as conn:
        conn.execute(
            "UPDATE inquiries SET moderator_note = ? WHERE public_id = ?",
            (note, public_id),
        )
    return {"ok": True}


# ── User media moderation ─────────────────────────────────────────────────────

_MEDIA_COLS = ["id", "filename", "url", "content_type", "size_bytes", "moderation_status", "created_at", "owner_id"]


@router.get("/moderator/media", dependencies=[Depends(require_moderator)])
def list_user_media(
    status: str = "pending",
    page: int = 1,
    per_page: int = 20,
    request: Request = None,
) -> dict[str, Any]:
    """List user-uploaded media for moderation."""
    c = _container(request)
    offset = (page - 1) * per_page
    where = "WHERE owner_type = 'customer'"
    params: list[Any] = []
    if status != "all":
        where += " AND moderation_status = ?"
        params.append(status)
    with c.db.connect() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM media {where}", params  # noqa: S608
        ).fetchone()[0]
        rows = conn.execute(
            f"""SELECT id, filename, url, content_type, size_bytes,
                       moderation_status, created_at, owner_id
                FROM media {where} ORDER BY created_at DESC LIMIT ? OFFSET ?""",  # noqa: S608
            [*params, per_page, offset],
        ).fetchall()
    items = [dict(zip(_MEDIA_COLS, row)) for row in rows]
    return {"items": items, "total": total, "page": page}


@router.patch("/moderator/media/{media_id}", dependencies=[Depends(require_moderator)])
def moderate_media(
    media_id: int,
    payload: dict[str, Any],
    request: Request = None,
) -> dict[str, Any]:
    """Approve or reject a user-uploaded media file."""
    c = _container(request)
    new_status = payload.get("status", "")
    if new_status not in ("approved", "rejected", "pending"):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="status must be approved, rejected, or pending")
    with c.db.connect() as conn:
        conn.execute(
            "UPDATE media SET moderation_status = ? WHERE id = ?",
            (new_status, media_id),
        )
    return {"ok": True}
