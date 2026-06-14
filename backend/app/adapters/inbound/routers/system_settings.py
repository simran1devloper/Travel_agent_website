"""System settings router — super admin only."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ....application.system_settings_service import SystemSettingsService
from ..auth_adapter import require_admin, require_superadmin

router = APIRouter(tags=["system-settings"])


def get_system_settings_service(request: Request) -> SystemSettingsService:
    return request.app.state.container.system_settings_service


def _get_is_superadmin(request: Request) -> bool:
    """Return True only when the caller has a JWT for a DB-verified superadmin account.

    The dev admin token (x-admin-token) grants admin access but NOT superadmin status.
    Superadmin requires logging in via local auth and having is_superadmin=1 in the DB.
    """
    container = request.app.state.container
    from ..auth_adapter import _decode_token
    from ....application.auth_service import LOCAL_ISS
    from fastapi.security import HTTPAuthorizationCredentials

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token_str = auth_header[7:].strip()
        try:
            creds = HTTPAuthorizationCredentials(scheme="bearer", credentials=token_str)
            user = _decode_token(creds)
            if user and user.get("iss") == LOCAL_ISS:
                cid = int(user["sub"])
                with container.db.connect() as conn:
                    row = conn.execute(
                        "SELECT is_superadmin FROM customers WHERE id=?", (cid,)
                    ).fetchone()
                return bool(row[0]) if row else False
        except Exception:
            pass

    return False


@router.get(
    "/admin/system-settings",
    dependencies=[Depends(require_admin)],
)
def get_settings_endpoint(
    request: Request,
    svc: SystemSettingsService = Depends(get_system_settings_service),
) -> dict[str, Any]:
    """Return current system settings (secrets masked), superadmin status, and active secrets backend."""
    return {
        "settings": svc.get_all(mask_secrets=True),
        "is_superadmin": _get_is_superadmin(request),
        "secrets_store": svc.secrets_store_info(),
    }


@router.patch(
    "/admin/system-settings",
    dependencies=[Depends(require_admin), Depends(require_superadmin)],
)
def update_settings(
    payload: dict[str, str],
    svc: SystemSettingsService = Depends(get_system_settings_service),
) -> dict[str, Any]:
    """Update system settings. Super admin only."""
    svc.set_many(payload)
    return {"ok": True, "updated": list(payload.keys())}


@router.patch(
    "/admin/system-settings/storage-default",
    dependencies=[Depends(require_admin)],
)
def update_storage_default(
    payload: dict[str, str],
    svc: SystemSettingsService = Depends(get_system_settings_service),
) -> dict[str, Any]:
    """Update only storage.default_backend. Available to all admins."""
    allowed = {"storage.default_backend"}
    disallowed = set(payload) - allowed
    if disallowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only storage.default_backend may be set via this endpoint. Disallowed: {disallowed}",
        )
    svc.set_many(payload)
    return {"ok": True, "updated": list(payload.keys())}


@router.post(
    "/admin/system-settings/promote-superadmin/{customer_id}",
    dependencies=[Depends(require_admin)],
)
def promote_superadmin(
    customer_id: int,
    request: Request,
) -> dict[str, Any]:
    """Mark a customer as the super admin (dev bypass only — first-time setup)."""
    from ....config import get_settings
    settings = get_settings()
    x_token = request.headers.get("x-admin-token", "")
    if x_token != settings.admin_token:
        raise HTTPException(status_code=403, detail="Dev admin token required for promotion")
    container = request.app.state.container
    with container.db.connect() as conn:
        conn.execute("UPDATE customers SET is_superadmin=0")
        conn.execute("UPDATE customers SET is_superadmin=1 WHERE id=?", (customer_id,))
    return {"ok": True, "superadmin_id": customer_id}
