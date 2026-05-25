"""Offers / promotions router."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends
from ....application.offer_service import OfferService
from ....models import OfferCreate, OfferUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_offer_service

router = APIRouter(tags=["offers"])


@router.get("/offers")
def list_active_offers(
    svc: OfferService = Depends(get_offer_service),
) -> list[dict[str, Any]]:
    return svc.list_active()


@router.get("/admin/offers", dependencies=[Depends(require_admin)])
def admin_list_offers(
    svc: OfferService = Depends(get_offer_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.post("/admin/offers", status_code=201, dependencies=[Depends(require_admin)])
def admin_create_offer(
    payload: OfferCreate,
    svc: OfferService = Depends(get_offer_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.patch("/admin/offers/{offer_id}", dependencies=[Depends(require_admin)])
def admin_update_offer(
    offer_id: int,
    payload: OfferUpdate,
    svc: OfferService = Depends(get_offer_service),
) -> dict[str, Any]:
    return svc.update(offer_id, payload)


@router.delete("/admin/offers/{offer_id}", dependencies=[Depends(require_admin)])
def admin_delete_offer(
    offer_id: int,
    svc: OfferService = Depends(get_offer_service),
) -> dict[str, int]:
    return svc.delete(offer_id)


@router.post("/offers/{offer_id}/use", status_code=204)
def record_offer_use(
    offer_id: int,
    svc: OfferService = Depends(get_offer_service),
) -> None:
    svc.record_use(offer_id)
