"""Application service for CMS site stats."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..models import SiteStatUpdate
from ..ports.repositories import ISiteStatRepository


class SiteStatService:
    def __init__(self, *, site_stat_repo: ISiteStatRepository) -> None:
        self._repo = site_stat_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._repo.list_all()

    def update(self, stat_id: int, payload: SiteStatUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_id(stat_id)
        if not existing:
            raise NotFoundError(f"Stat {stat_id} not found")
        data = payload.model_dump()
        self._repo.update(stat_id, data)
        return self._repo.find_by_id(stat_id) or existing  # type: ignore[return-value]

    def bulk_replace(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Replace all stats atomically."""
        self._repo.upsert_bulk(items)
        return self._repo.list_all()
