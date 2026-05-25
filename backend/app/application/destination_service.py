"""Destination application service."""
from __future__ import annotations

from typing import Any

from ..domain.utils import utc_now
from ..ports.repositories import IDestinationRepository
from ..models import DestinationCreate


class DestinationService:
    def __init__(self, destination_repo: IDestinationRepository) -> None:
        self._destinations = destination_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._destinations.list_all()

    def create(self, payload: DestinationCreate) -> dict[str, Any]:
        now = utc_now()
        self._destinations.create(
            {
                "slug": payload.slug,
                "name": payload.name,
                "image_url": payload.image_url,
                "packages_count": payload.packages_count,
                "tagline": payload.tagline,
                "duration": payload.duration,
                "price": payload.price,
                "rating": payload.rating,
                "review_count": payload.review_count,
                "gallery": payload.gallery,
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"slug": payload.slug}

    def update(self, slug: str, payload: DestinationCreate) -> dict[str, Any]:
        self._destinations.update(
            slug,
            {
                "name": payload.name,
                "image_url": payload.image_url,
                "packages_count": payload.packages_count,
                "tagline": payload.tagline,
                "duration": payload.duration,
                "price": payload.price,
                "rating": payload.rating,
                "review_count": payload.review_count,
                "gallery": payload.gallery,
                "updated_at": utc_now(),
            },
        )
        return {"slug": slug}

    def delete(self, slug: str) -> dict[str, str]:
        self._destinations.delete(slug)
        return {"deleted": slug}
