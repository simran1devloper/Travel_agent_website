"""Wishlist application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IWishlistRepository


class WishlistService:
    def __init__(self, wishlist_repo: IWishlistRepository) -> None:
        self._wishlists = wishlist_repo

    def add(self, customer_id: int, package_slug: str) -> dict[str, str]:
        self._wishlists.add(customer_id, package_slug, utc_now())
        return {"saved": package_slug}

    def remove(self, customer_id: int, package_slug: str) -> dict[str, str]:
        self._wishlists.remove(customer_id, package_slug)
        return {"removed": package_slug}
