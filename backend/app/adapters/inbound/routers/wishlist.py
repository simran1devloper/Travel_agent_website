"""Wishlist router."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.customer_service import CustomerService
from ....application.wishlist_service import WishlistService
from ....models import WishlistCreate
from ..auth_adapter import require_customer
from ..dependencies import get_customer_service, get_wishlist_service

router = APIRouter(tags=["wishlist"])


def _resolve_customer_id(
    auth_user: dict[str, Any] | None,
    svc: CustomerService,
) -> int | None:
    if auth_user is None:
        return svc.get_first_customer_id()
    return svc.resolve_customer_id(auth_user)


@router.post("/wishlist")
def add_wishlist(
    payload: WishlistCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    wish_svc: WishlistService = Depends(get_wishlist_service),
) -> dict[str, str]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if not customer_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return wish_svc.add(customer_id, payload.package_slug)


@router.delete("/wishlist/{package_slug}")
def remove_wishlist(
    package_slug: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    wish_svc: WishlistService = Depends(get_wishlist_service),
) -> dict[str, str]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if customer_id:
        wish_svc.remove(customer_id, package_slug)
    return {"removed": package_slug}
