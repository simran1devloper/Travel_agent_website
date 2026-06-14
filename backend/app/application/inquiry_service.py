"""Inquiry application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import ICustomerRepository, IInquiryRepository
from ..models import InquiryCreate, InquiryUpdate


class InquiryService:
    def __init__(
        self,
        inquiry_repo: IInquiryRepository,
        customer_repo: ICustomerRepository,
    ) -> None:
        self._inquiries = inquiry_repo
        self._customers = customer_repo

    # ------------------------------------------------------------------

    def create(self, payload: InquiryCreate) -> dict[str, Any]:
        now = utc_now()
        customer_id = self._upsert_customer(payload, now)
        public_id = f"INQ-{self._inquiries.count() + 2001}"
        self._inquiries.create(
            {
                "public_id": public_id,
                "customer_id": customer_id,
                "full_name": payload.full_name,
                "email": payload.email,
                "phone": payload.phone,
                "whatsapp": payload.whatsapp,
                "preferred_contact": payload.preferred_contact,
                "destinations": payload.destinations,
                "specific_place": payload.specific_place,
                "experiences": payload.experiences,
                "travel_styles": payload.travel_styles,
                "services": payload.services,
                "preferred_dates": payload.preferred_dates,
                "date_from": payload.date_from,
                "date_to": payload.date_to,
                "adults": payload.adults,
                "children": payload.children,
                "budget": payload.budget,
                "passport_notes": payload.passport_notes,
                "occasion": payload.occasion,
                "inspiration": payload.inspiration,
                "inspiration_links": payload.inspiration_links,
                "trip_feel": payload.trip_feel,
                "basket_items": payload.basket_items,
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"id": public_id, "status": "New", "message": "Inquiry received"}

    def list_admin(self, search: str | None = None) -> list[dict[str, Any]]:
        return self._inquiries.list_all(search)

    def update_admin(
        self, public_id: str, payload: InquiryUpdate
    ) -> dict[str, Any]:
        existing = self._inquiries.find_by_public_id(public_id)
        if not existing:
            raise NotFoundError("Inquiry not found")
        status = payload.status or existing["status"]
        planner_id = (
            payload.assigned_planner_id
            if payload.assigned_planner_id is not None
            else existing.get("assigned_planner_id")
        )
        self._inquiries.update(public_id, status, planner_id)
        return {"id": public_id, "status": status, "assigned_planner_id": planner_id}

    def get_admin_stats(self) -> dict[str, Any]:
        total = self._inquiries.count()
        won = self._inquiries.count_won()
        conversion = round((won / total) * 100) if total else 0
        return {
            "active_leads": self._inquiries.count_active(),
            "customers": self._customers.count(),
            "revenue_mtd": 0,
            "conversion": conversion,
        }

    # ------------------------------------------------------------------

    def _upsert_customer(self, payload: InquiryCreate, now: str) -> int:
        existing = self._customers.find_by_email(payload.email)
        if existing:
            self._customers.update_contact_info(
                int(existing["id"]),
                name=payload.full_name,
                phone=payload.phone,
                whatsapp=payload.whatsapp,
            )
            return int(existing["id"])
        return self._customers.create(
            name=payload.full_name,
            email=payload.email,
            phone=payload.phone,
            whatsapp=payload.whatsapp,
            created_at=now,
        )
