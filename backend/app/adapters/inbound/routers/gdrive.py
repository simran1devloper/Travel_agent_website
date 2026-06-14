"""Google Drive OAuth + upload router (admin only)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile

from ....application.gdrive_service import GDriveService
from ..auth_adapter import require_admin, require_superadmin
from ..dependencies import get_current_admin_customer_id, get_gdrive_service

router = APIRouter(tags=["gdrive"])


# ── OAuth flow ────────────────────────────────────────────────────────────────

@router.get("/admin/gdrive/authorize", dependencies=[Depends(require_admin), Depends(require_superadmin)])
def gdrive_authorize(
    admin_id: int = Depends(get_current_admin_customer_id),
    svc: GDriveService = Depends(get_gdrive_service),
) -> dict[str, str]:
    """Return the Google OAuth authorization URL for the admin to open."""
    url = svc.get_authorize_url(state=str(admin_id))
    return {"url": url}


@router.get("/admin/gdrive/callback")
def gdrive_callback(
    code: str,
    state: str = "",
    svc: GDriveService = Depends(get_gdrive_service),
) -> dict[str, Any]:
    """Google redirects here after the admin grants consent."""
    admin_customer_id = int(state) if state.isdigit() else 0
    result = svc.exchange_code(code, admin_customer_id)
    return result


@router.get("/admin/gdrive/status", dependencies=[Depends(require_admin)])
def gdrive_status(
    admin_id: int = Depends(get_current_admin_customer_id),
    svc: GDriveService = Depends(get_gdrive_service),
) -> dict[str, Any]:
    """Return whether the admin's Google Drive is connected."""
    return svc.get_status(admin_id)


@router.delete("/admin/gdrive/disconnect", dependencies=[Depends(require_admin), Depends(require_superadmin)])
def gdrive_disconnect(
    admin_id: int = Depends(get_current_admin_customer_id),
    svc: GDriveService = Depends(get_gdrive_service),
) -> dict[str, str]:
    svc.disconnect(admin_id)
    return {"status": "disconnected"}


# ── File upload via GDrive ────────────────────────────────────────────────────

@router.post("/admin/gdrive/upload", dependencies=[Depends(require_admin)])
async def gdrive_upload(
    file: UploadFile = File(...),
    admin_id: int = Depends(get_current_admin_customer_id),
    svc: GDriveService = Depends(get_gdrive_service),
) -> dict[str, str]:
    """Upload a file to admin's GDrive; returns the public URL."""
    content = await file.read()
    url = svc.upload_file(
        admin_customer_id=admin_id,
        filename=file.filename or "upload",
        content=content,
        content_type=file.content_type or "application/octet-stream",
    )
    return {"url": url}
