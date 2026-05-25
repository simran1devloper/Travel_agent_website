"""Application service for CMS services (what the agency offers)."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import ConflictError, NotFoundError
from ..models import ServiceCreate, ServiceUpdate
from ..ports.repositories import IServiceRepository


class ServiceService:
    def __init__(self, *, service_repo: IServiceRepository) -> None:
        self._repo = service_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._repo.list_all()

    def get(self, service_id: str) -> dict[str, Any]:
        svc = self._repo.find_by_id(service_id)
        if not svc:
            raise NotFoundError(f"Service '{service_id}' not found")
        return svc

    def upsert(self, payload: ServiceCreate) -> dict[str, Any]:
        data = payload.model_dump()
        # Convert GalleryItem objects to plain dicts
        data["gallery"] = [g if isinstance(g, dict) else g.model_dump() for g in (payload.gallery or [])]
        self._repo.upsert(data)
        return self._repo.find_by_id(payload.id) or data  # type: ignore[return-value]

    def update(self, service_id: str, payload: ServiceUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_id(service_id)
        if not existing:
            raise NotFoundError(f"Service '{service_id}' not found")
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        if "gallery" in data:
            data["gallery"] = [g if isinstance(g, dict) else g.model_dump() for g in data["gallery"]]
        self._repo.update(service_id, data)
        return self._repo.find_by_id(service_id) or existing  # type: ignore[return-value]

    def delete(self, service_id: str) -> dict[str, str]:
        existing = self._repo.find_by_id(service_id)
        if not existing:
            raise NotFoundError(f"Service '{service_id}' not found")
        self._repo.delete(service_id)
        return {"deleted": service_id}
