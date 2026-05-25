"""Planner application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import ConflictError, NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IPlannerRepository
from ..models import PlannerCreate


class PlannerService:
    def __init__(self, planner_repo: IPlannerRepository) -> None:
        self._planners = planner_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._planners.list_all()

    def create(self, payload: PlannerCreate) -> dict[str, Any]:
        try:
            planner_id = self._planners.create(
                {
                    "name": payload.name,
                    "email": payload.email,
                    "specialty": payload.specialty,
                    "photo_url": payload.photo_url,
                    "created_at": utc_now(),
                }
            )
        except Exception:
            raise ConflictError("Email already in use")
        return {"id": planner_id, "name": payload.name}

    def update(self, planner_id: int, payload: PlannerCreate) -> dict[str, Any]:
        if not self._planners.find_by_id(planner_id):
            raise NotFoundError("Planner not found")
        self._planners.update(
            planner_id,
            {
                "name": payload.name,
                "email": payload.email,
                "specialty": payload.specialty,
                "photo_url": payload.photo_url,
            },
        )
        return {"id": planner_id}

    def delete(self, planner_id: int) -> dict[str, Any]:
        if not self._planners.find_by_id(planner_id):
            raise NotFoundError("Planner not found")
        self._planners.delete(planner_id)
        return {"deleted": planner_id}
