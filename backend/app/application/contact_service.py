"""Contact message application service."""
from __future__ import annotations

from typing import Any

from ..domain.utils import utc_now
from ..ports.repositories import IContactRepository
from ..models import ContactCreate


class ContactService:
    def __init__(self, contact_repo: IContactRepository) -> None:
        self._contacts = contact_repo

    def create(self, payload: ContactCreate) -> dict[str, Any]:
        public_id = f"MSG-{self._contacts.count() + 2001}"
        self._contacts.create(
            {
                "public_id": public_id,
                "name": payload.name,
                "contact": payload.contact,
                "destination": payload.destination,
                "message": payload.message,
                "journey_types": payload.journey_types,
                "created_at": utc_now(),
            }
        )
        return {"id": public_id, "status": "New", "message": "Contact request received"}
