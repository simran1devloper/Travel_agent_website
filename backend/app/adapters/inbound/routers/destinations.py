"""Destination CRUD router."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.destination_service import DestinationService
from ....models import DestinationCreate
from ..auth_adapter import require_admin
from ..dependencies import get_destination_service

router = APIRouter(tags=["destinations"])


@router.get("/destinations")
def list_destinations(
    svc: DestinationService = Depends(get_destination_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.post("/destinations", status_code=201, dependencies=[Depends(require_admin)])
def create_destination(
    payload: DestinationCreate,
    svc: DestinationService = Depends(get_destination_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.patch("/destinations/{slug}", dependencies=[Depends(require_admin)])
def update_destination(
    slug: str,
    payload: DestinationCreate,
    svc: DestinationService = Depends(get_destination_service),
) -> dict[str, Any]:
    return svc.update(slug, payload)


@router.delete("/destinations/{slug}", dependencies=[Depends(require_admin)])
def delete_destination(
    slug: str,
    svc: DestinationService = Depends(get_destination_service),
) -> dict[str, str]:
    return svc.delete(slug)
