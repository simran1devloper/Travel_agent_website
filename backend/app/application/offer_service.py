"""Application service for offers / promotions."""
from __future__ import annotations
from typing import Any
from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IOfferRepository
from ..models import OfferCreate, OfferUpdate


class OfferService:
    def __init__(self, *, offer_repo: IOfferRepository) -> None:
        self._offers = offer_repo

    def list_active(self) -> list[dict[str, Any]]:
        return self._offers.list_active()

    def list_all(self) -> list[dict[str, Any]]:
        return self._offers.list_all()

    def get(self, offer_id: int) -> dict[str, Any]:
        offer = self._offers.find_by_id(offer_id)
        if not offer:
            raise NotFoundError("Offer not found")
        return offer

    def create(self, payload: OfferCreate) -> dict[str, Any]:
        now = utc_now()
        offer_id = self._offers.create({
            "title": payload.title,
            "subtitle": payload.subtitle,
            "code": payload.code,
            "description": payload.description,
            "offer_type": payload.offer_type,
            "discount_value": payload.discount_value,
            "badge_label": payload.badge_label,
            "badge_color": payload.badge_color,
            "applies_to": payload.applies_to,
            "valid_from": payload.valid_from,
            "valid_until": payload.valid_until,
            "max_uses": payload.max_uses,
            "is_active": payload.is_active,
            "is_featured": payload.is_featured,
            "sort_order": payload.sort_order,
            "created_at": now,
            "updated_at": now,
        })
        return self.get(offer_id)

    def update(self, offer_id: int, payload: OfferUpdate) -> dict[str, Any]:
        if not self._offers.find_by_id(offer_id):
            raise NotFoundError("Offer not found")
        now = utc_now()
        data = payload.model_dump(exclude_none=True)
        data["updated_at"] = now
        self._offers.update(offer_id, data)
        return self.get(offer_id)

    def delete(self, offer_id: int) -> dict[str, int]:
        if not self._offers.find_by_id(offer_id):
            raise NotFoundError("Offer not found")
        self._offers.delete(offer_id)
        return {"deleted": offer_id}

    def record_use(self, offer_id: int) -> None:
        self._offers.increment_uses(offer_id)
