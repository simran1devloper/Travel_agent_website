"""Media router — admin management and user upload."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile

from ....application.customer_service import CustomerService
from ....application.media_service import MediaService
from ....models import MediaUpdate
from ..auth_adapter import require_admin, require_customer
from ..dependencies import get_customer_service, get_media_service

router = APIRouter(tags=["media"])


# ── Admin upload ──────────────────────────────────────────────────────────────

@router.post("/media", dependencies=[Depends(require_admin)])
async def upload_media(
    file: UploadFile = File(...),
    alt_text: str | None = None,
    svc: MediaService = Depends(get_media_service),
) -> dict[str, Any]:
    content = await file.read()
    return svc.upload_admin(
        original_filename=file.filename or "upload",
        content=content,
        content_type=file.content_type or "application/octet-stream",
        alt_text=alt_text,
    )


# ── User upload ───────────────────────────────────────────────────────────────

@router.post("/user/media", status_code=201)
async def upload_user_media(
    file: UploadFile = File(...),
    alt_text: str | None = None,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: MediaService = Depends(get_media_service),
) -> dict[str, Any]:
    if auth_user is None:
        customer_id = cust_svc.get_first_customer_id()
    else:
        customer_id = cust_svc.resolve_customer_id(auth_user)
    content = await file.read()
    return svc.upload_user(
        original_filename=file.filename or "upload",
        content=content,
        content_type=file.content_type or "application/octet-stream",
        alt_text=alt_text,
        customer_id=customer_id,
    )


# ── Admin management ──────────────────────────────────────────────────────────

@router.get("/admin/media", dependencies=[Depends(require_admin)])
def admin_list_media(
    page: int = 1,
    per_page: int = 20,
    svc: MediaService = Depends(get_media_service),
) -> dict[str, Any]:
    return svc.list_admin(page, per_page)


@router.patch("/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_update_media(
    media_id: int,
    payload: MediaUpdate,
    svc: MediaService = Depends(get_media_service),
) -> dict[str, Any]:
    return svc.update_admin(media_id, payload)


@router.delete("/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_delete_media(
    media_id: int,
    svc: MediaService = Depends(get_media_service),
) -> dict[str, Any]:
    return svc.delete_admin(media_id)
