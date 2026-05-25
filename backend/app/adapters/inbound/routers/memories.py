"""Memory router — public wall + user CRUD."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.customer_service import CustomerService
from ....application.memory_service import MemoryService
from ....models import MemoryCreate, MemoryUpdate
from ..auth_adapter import require_customer
from ..dependencies import get_customer_service, get_memory_service

router = APIRouter(tags=["memories"])


def _resolve_customer_id(
    auth_user: dict[str, Any] | None,
    cust_svc: CustomerService,
) -> int | None:
    if auth_user is None:
        return cust_svc.get_first_customer_id()
    return cust_svc.resolve_customer_id(auth_user)


@router.get("/memories")
def list_public_memories(
    svc: MemoryService = Depends(get_memory_service),
) -> list[dict[str, Any]]:
    return svc.list_public()


@router.get("/user/memories")
def list_user_memories(
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: MemoryService = Depends(get_memory_service),
) -> list[dict[str, Any]]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if not customer_id:
        return []
    return svc.list_user(customer_id)


@router.post("/user/memories", status_code=201)
def create_memory(
    payload: MemoryCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: MemoryService = Depends(get_memory_service),
) -> dict[str, Any]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    if not customer_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return svc.create(payload, customer_id)


@router.patch("/user/memories/{public_id}")
def update_memory(
    public_id: str,
    payload: MemoryUpdate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: MemoryService = Depends(get_memory_service),
) -> dict[str, Any]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    return svc.update(public_id, payload, customer_id)


@router.delete("/user/memories/{public_id}")
def delete_memory(
    public_id: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
    cust_svc: CustomerService = Depends(get_customer_service),
    svc: MemoryService = Depends(get_memory_service),
) -> dict[str, str]:
    customer_id = _resolve_customer_id(auth_user, cust_svc)
    return svc.delete(public_id, customer_id)
