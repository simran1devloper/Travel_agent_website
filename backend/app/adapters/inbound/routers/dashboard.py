"""Customer dashboard router."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.customer_service import CustomerService
from ..auth_adapter import require_customer
from ..dependencies import get_customer_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def customer_dashboard(
    auth_user: dict[str, Any] | None = Depends(require_customer),
    svc: CustomerService = Depends(get_customer_service),
) -> dict[str, Any]:
    if auth_user is None:
        # Dev bypass — use the first customer in the DB
        customer_id = svc.get_first_customer_id()
        if customer_id is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        customer_id = svc.resolve_customer_id(auth_user)
    return svc.get_dashboard(customer_id)
