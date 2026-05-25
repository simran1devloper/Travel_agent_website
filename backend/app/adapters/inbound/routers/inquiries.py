"""Inquiry router — public submission + admin management."""
from __future__ import annotations

import csv
import io
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ....application.inquiry_service import InquiryService
from ....models import BulkInquiryUpdate, InquiryCreate, InquiryUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_inquiry_service

router = APIRouter(tags=["inquiries"])


# ── Public ────────────────────────────────────────────────────────────────────

@router.post("/inquiries", status_code=201)
def create_inquiry(
    payload: InquiryCreate,
    svc: InquiryService = Depends(get_inquiry_service),
) -> dict[str, Any]:
    return svc.create(payload)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/stats", dependencies=[Depends(require_admin)])
def admin_stats(
    svc: InquiryService = Depends(get_inquiry_service),
) -> dict[str, Any]:
    return svc.get_admin_stats()


@router.get("/admin/inquiries", dependencies=[Depends(require_admin)])
def admin_inquiries(
    search: str | None = None,
    svc: InquiryService = Depends(get_inquiry_service),
) -> list[dict[str, Any]]:
    return svc.list_admin(search)


@router.patch("/admin/inquiries/{public_id}", dependencies=[Depends(require_admin)])
def admin_update_inquiry(
    public_id: str,
    payload: InquiryUpdate,
    svc: InquiryService = Depends(get_inquiry_service),
) -> dict[str, Any]:
    return svc.update_admin(public_id, payload)


@router.post("/admin/inquiries/bulk", dependencies=[Depends(require_admin)])
def bulk_update_inquiries(
    payload: BulkInquiryUpdate,
    svc: InquiryService = Depends(get_inquiry_service),
) -> dict[str, Any]:
    """Bulk-update the status of multiple inquiries at once."""
    updated = 0
    errors: list[dict[str, Any]] = []
    for public_id in payload.public_ids:
        try:
            svc.update_admin(public_id, InquiryUpdate(status=payload.status))
            updated += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"id": public_id, "message": str(exc)})
    return {"updated": updated, "errors": errors}


@router.get("/admin/inquiries.csv", dependencies=[Depends(require_admin)])
def export_inquiries_csv(
    svc: InquiryService = Depends(get_inquiry_service),
) -> StreamingResponse:
    rows = svc.list_admin()
    output = io.StringIO()
    fields = ["public_id", "full_name", "email", "budget", "status", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k) for k in fields})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inquiries.csv"},
    )


