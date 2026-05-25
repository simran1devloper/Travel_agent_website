"""Review router — public + admin."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ....application.customer_service import CustomerService
from ....application.review_service import ReviewService
from ....models import ReviewAdminUpdate, ReviewBulkAction, ReviewCreate, ReviewAdminReply
from ..auth_adapter import require_admin, require_customer
from ..dependencies import get_customer_service, get_review_service

router = APIRouter(tags=["reviews"])


def _resolve_customer_id(
    auth_user: dict[str, Any] | None,
    cust_svc: CustomerService,
) -> int | None:
    if auth_user is None:
        return cust_svc.get_first_customer_id()
    return cust_svc.resolve_customer_id(auth_user)


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("/packages/{slug}/reviews")
def list_package_reviews(
    slug: str,
    svc: ReviewService = Depends(get_review_service),
) -> list[dict[str, Any]]:
    return svc.list_by_package(slug)


@router.post("/packages/{slug}/reviews", status_code=201)
def submit_review(
    slug: str,
    payload: ReviewCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if not customer_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return svc.submit(slug, payload, customer_id)


@router.get("/reviews")
def list_all_public_reviews(
    svc: ReviewService = Depends(get_review_service),
) -> list[dict[str, Any]]:
    """All approved reviews across all packages."""
    return svc.get_all_public()


@router.post("/reviews/{public_id}/helpful")
def mark_helpful(
    public_id: str,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    return svc.mark_helpful(public_id)


@router.get("/packages/{slug}/reviews/stats")
def package_review_stats(
    slug: str,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    return svc.get_package_stats(slug)


@router.delete("/reviews/{public_id}")
def delete_review(
    public_id: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, str]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if not customer_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return svc.delete(public_id, customer_id)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/reviews", dependencies=[Depends(require_admin)])
def admin_list_reviews(
    status: str | None = None,
    svc: ReviewService = Depends(get_review_service),
) -> list[dict[str, Any]]:
    return svc.admin_list(status)


@router.patch("/admin/reviews/{public_id}", dependencies=[Depends(require_admin)])
def admin_update_review(
    public_id: str,
    payload: ReviewAdminUpdate,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    return svc.admin_update(public_id, payload)


@router.delete("/admin/reviews/{public_id}", dependencies=[Depends(require_admin)])
def admin_delete_review(
    public_id: str,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, str]:
    return svc.admin_delete(public_id)


@router.post("/admin/reviews/bulk", dependencies=[Depends(require_admin)])
def admin_bulk_reviews(
    payload: ReviewBulkAction,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    return svc.admin_bulk_action(payload)


@router.post("/admin/reviews/{public_id}/reply", dependencies=[Depends(require_admin)])
def admin_reply_review(
    public_id: str,
    payload: ReviewAdminReply,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    return svc.admin_reply(public_id, payload.reply)


@router.patch("/admin/reviews/{public_id}/verify", dependencies=[Depends(require_admin)])
def admin_verify_review(
    public_id: str,
    svc: ReviewService = Depends(get_review_service),
) -> dict[str, Any]:
    """Toggle verified traveler badge on a review."""
    all_reviews = svc.admin_list(None)
    target = next((r for r in all_reviews if r["public_id"] == public_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Review not found")
    new_verified = not bool(target.get("verified", 0))
    return svc.admin_set_verified(public_id, new_verified)
