"""Memory application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import ForbiddenError, NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IMemoryRepository
from ..models import MemoryCreate, MemoryUpdate


class MemoryService:
    def __init__(self, memory_repo: IMemoryRepository) -> None:
        self._memories = memory_repo

    def list_public(self) -> list[dict[str, Any]]:
        return self._memories.list_public()

    def list_user(self, customer_id: int) -> list[dict[str, Any]]:
        return self._memories.list_by_customer(customer_id)

    def create(self, payload: MemoryCreate, customer_id: int) -> dict[str, Any]:
        public_id = f"MEM-{self._memories.count() + 2001}"
        now = utc_now()
        self._memories.create(
            {
                "public_id": public_id,
                "customer_id": customer_id,
                "title": payload.title,
                "description": payload.description,
                "destination": payload.destination,
                "travel_date_from": payload.travel_date_from,
                "travel_date_to": payload.travel_date_to,
                "is_public": payload.is_public,
                "media_urls": payload.media_urls,
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"id": public_id, "status": "published"}

    def update(
        self, public_id: str, payload: MemoryUpdate, customer_id: int
    ) -> dict[str, Any]:
        mem = self._memories.find_by_public_id(public_id)
        if not mem:
            raise NotFoundError("Memory not found")
        if mem["customer_id"] != customer_id:
            raise ForbiddenError("Not your memory")
        updated = {
            "title": payload.title if payload.title is not None else mem["title"],
            "description": payload.description if payload.description is not None else mem.get("description"),
            "destination": payload.destination if payload.destination is not None else mem.get("destination"),
            "travel_date_from": payload.travel_date_from if payload.travel_date_from is not None else mem.get("travel_date_from"),
            "travel_date_to": payload.travel_date_to if payload.travel_date_to is not None else mem.get("travel_date_to"),
            "is_public": payload.is_public if payload.is_public is not None else bool(mem.get("is_public")),
            "media_urls": payload.media_urls if payload.media_urls is not None else mem.get("media_urls", []),
            "updated_at": utc_now(),
        }
        self._memories.update(public_id, updated)
        return {"id": public_id}

    def delete(self, public_id: str, customer_id: int) -> dict[str, str]:
        mem = self._memories.find_by_public_id(public_id)
        if not mem:
            raise NotFoundError("Memory not found")
        if mem["customer_id"] != customer_id:
            raise ForbiddenError("Not your memory")
        self._memories.delete(public_id)
        return {"deleted": public_id}
