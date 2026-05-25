"""Services router — public listing + admin CRUD."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.service_service import ServiceService
from ....models import ServiceCreate, ServiceUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_service_service

router = APIRouter(tags=["services"])


@router.get("/services")
def list_services(
    svc: ServiceService = Depends(get_service_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.get("/services/{service_id}")
def get_service(
    service_id: str,
    svc: ServiceService = Depends(get_service_service),
) -> dict[str, Any]:
    return svc.get(service_id)


@router.put("/services/{service_id}", dependencies=[Depends(require_admin)], status_code=200)
def upsert_service(
    service_id: str,
    payload: ServiceCreate,
    svc: ServiceService = Depends(get_service_service),
) -> dict[str, Any]:
    # Enforce that the URL service_id matches the body
    payload_dict = payload.model_dump()
    payload_dict["id"] = service_id
    payload = ServiceCreate(**payload_dict)
    return svc.upsert(payload)


@router.post("/services", status_code=201, dependencies=[Depends(require_admin)])
def create_service(
    payload: ServiceCreate,
    svc: ServiceService = Depends(get_service_service),
) -> dict[str, Any]:
    return svc.upsert(payload)


@router.patch("/services/{service_id}", dependencies=[Depends(require_admin)])
def update_service(
    service_id: str,
    payload: ServiceUpdate,
    svc: ServiceService = Depends(get_service_service),
) -> dict[str, Any]:
    return svc.update(service_id, payload)


@router.delete("/services/{service_id}", dependencies=[Depends(require_admin)])
def delete_service(
    service_id: str,
    svc: ServiceService = Depends(get_service_service),
) -> dict[str, str]:
    return svc.delete(service_id)
