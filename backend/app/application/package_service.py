"""Package application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IPackageRepository
from ..models import PackageCreate


class PackageService:
    def __init__(self, package_repo: IPackageRepository) -> None:
        self._packages = package_repo

    def list_all(self, include_unpublished: bool = False) -> list[dict[str, Any]]:
        return self._packages.list_all(include_unpublished)

    def get_by_slug(self, slug: str) -> dict[str, Any]:
        pkg = self._packages.find_by_slug(slug)
        if not pkg:
            raise NotFoundError("Package not found")
        return pkg

    def create(self, payload: PackageCreate) -> dict[str, Any]:
        now = utc_now()
        self._packages.create(
            {
                "slug": payload.slug,
                "title": payload.title,
                "location": payload.location,
                "days": payload.days,
                "price": payload.price,
                "category": payload.category,
                "image_url": payload.image_url,
                "tagline": payload.tagline,
                "description": payload.description,
                "rating": payload.rating,
                "review_count": payload.review_count,
                "reviews": payload.reviews,
                "published": payload.published,
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"slug": payload.slug}

    def update(self, slug: str, payload: PackageCreate) -> dict[str, Any]:
        self._packages.update(
            slug,
            {
                "title": payload.title,
                "location": payload.location,
                "days": payload.days,
                "price": payload.price,
                "category": payload.category,
                "image_url": payload.image_url,
                "tagline": payload.tagline,
                "description": payload.description,
                "rating": payload.rating,
                "review_count": payload.review_count,
                "reviews": payload.reviews,
                "published": payload.published,
                "updated_at": utc_now(),
            },
        )
        return {"slug": slug}

    def delete(self, slug: str) -> dict[str, str]:
        self._packages.delete(slug)
        return {"deleted": slug}
