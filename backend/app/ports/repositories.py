"""Outbound port interfaces (repository contracts).

Application services depend ONLY on these abstract classes.
Concrete implementations live in adapters/outbound/sqlite/.

Rules:
  - No SQLite, no FastAPI, no Pydantic imports here.
  - Method signatures use only built-in types + dict.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class ICustomerRepository(ABC):
    @abstractmethod
    def find_by_id(self, customer_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def find_by_email(self, email: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def find_by_auth0_sub(self, sub: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(
        self,
        *,
        name: str,
        email: str | None,
        phone: str | None,
        whatsapp: str | None,
        created_at: str,
    ) -> int:
        """Insert a new customer row and return its auto-generated id."""
        ...

    @abstractmethod
    def create_with_credentials(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        role: str,
        created_at: str,
    ) -> int: ...

    @abstractmethod
    def update_auth0_sub(self, customer_id: int, sub: str) -> None: ...

    @abstractmethod
    def update_contact_info(
        self,
        customer_id: int,
        *,
        name: str,
        phone: str | None,
        whatsapp: str | None,
    ) -> None: ...

    @abstractmethod
    def get_first(self) -> dict[str, Any] | None:
        """Return the first customer row (dev / fallback bypass only)."""
        ...

    @abstractmethod
    def count(self) -> int: ...


# ---------------------------------------------------------------------------
# Package
# ---------------------------------------------------------------------------

class IPackageRepository(ABC):
    @abstractmethod
    def list_all(self, include_unpublished: bool = False) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_slug(self, slug: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def update(self, slug: str, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, slug: str) -> None: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def update_rating(
        self, slug: str, rating: float, review_count: int, updated_at: str
    ) -> None: ...


# ---------------------------------------------------------------------------
# Destination
# ---------------------------------------------------------------------------

class IDestinationRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def update(self, slug: str, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, slug: str) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


# ---------------------------------------------------------------------------
# Inquiry
# ---------------------------------------------------------------------------

class IInquiryRepository(ABC):
    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def list_all(self, search: str | None = None) -> list[dict[str, Any]]:
        """Return all inquiries (with joined planner_name), optionally filtered."""
        ...

    @abstractmethod
    def list_by_customer(
        self, customer_id: int, email: str
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    def update(
        self, public_id: str, status: str, planner_id: int | None
    ) -> None: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_active(self) -> int:
        """Inquiries not in ('Won', 'Lost')."""
        ...

    @abstractmethod
    def count_won(self) -> int: ...


# ---------------------------------------------------------------------------
# Contact message
# ---------------------------------------------------------------------------

class IContactRepository(ABC):
    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

class IReviewRepository(ABC):
    @abstractmethod
    def list_approved_by_package(self, slug: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_all(self, status: str | None = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_by_customer(self, customer_id: int) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def update(
        self,
        public_id: str,
        status: str,
        body: str,
        flag_reason: str | None,
        updated_at: str,
    ) -> None: ...

    @abstractmethod
    def delete(self, public_id: str) -> None: ...

    @abstractmethod
    def get_rating_stats(self, slug: str) -> tuple[float, int]:
        """Return (avg_rating, approved_count) for a package."""
        ...

    @abstractmethod
    def bulk_update_status(
        self, public_ids: list[str], status: str, updated_at: str
    ) -> set[str]:
        """Bulk-set status; return set of affected package slugs."""
        ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def increment_helpful(self, public_id: str) -> int: ...

    @abstractmethod
    def set_admin_reply(self, public_id: str, reply: str, updated_at: str) -> None: ...

    @abstractmethod
    def update_verified(self, public_id: str, verified: bool, updated_at: str) -> None: ...

    @abstractmethod
    def get_stats_by_package(self, slug: str) -> dict[str, Any]: ...


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------

class IMemoryRepository(ABC):
    @abstractmethod
    def list_public(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_by_customer(self, customer_id: int) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def update(self, public_id: str, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, public_id: str) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------

class IMediaRepository(ABC):
    @abstractmethod
    def list_paginated(
        self, page: int, per_page: int
    ) -> tuple[list[dict[str, Any]], int]:
        """Return (items, total_count)."""
        ...

    @abstractmethod
    def find_by_id(self, media_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> int:
        """Insert media row and return generated id."""
        ...

    @abstractmethod
    def update(self, media_id: int, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, media_id: int) -> None: ...


# ---------------------------------------------------------------------------
# Planner
# ---------------------------------------------------------------------------

class IPlannerRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, planner_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> int:
        """Insert planner and return generated id."""
        ...

    @abstractmethod
    def update(self, planner_id: int, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, planner_id: int) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


# ---------------------------------------------------------------------------
# Wishlist
# ---------------------------------------------------------------------------

class IWishlistRepository(ABC):
    @abstractmethod
    def add(self, customer_id: int, package_slug: str, created_at: str) -> None: ...

    @abstractmethod
    def remove(self, customer_id: int, package_slug: str) -> None: ...

    @abstractmethod
    def list_packages_by_customer(
        self, customer_id: int
    ) -> list[dict[str, Any]]:
        """Return the full package rows wishlisted by this customer."""
        ...


# ---------------------------------------------------------------------------
# Service (CMS)
# ---------------------------------------------------------------------------

class IServiceRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, service_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def upsert(self, data: dict[str, Any]) -> None:
        """Insert or replace a service row."""
        ...

    @abstractmethod
    def update(self, service_id: str, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, service_id: str) -> None: ...


# ---------------------------------------------------------------------------
# FAQ (CMS)
# ---------------------------------------------------------------------------

class IFaqRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, faq_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> int: ...

    @abstractmethod
    def update(self, faq_id: int, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, faq_id: int) -> None: ...


# ---------------------------------------------------------------------------
# Testimonial (CMS)
# ---------------------------------------------------------------------------

class ITestimonialRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, testimonial_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> int: ...

    @abstractmethod
    def update(self, testimonial_id: int, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, testimonial_id: int) -> None: ...


# ---------------------------------------------------------------------------
# Site Stats (CMS)
# ---------------------------------------------------------------------------

class ISiteStatRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, stat_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def upsert_bulk(self, items: list[dict[str, Any]]) -> None:
        """Replace the entire stats list atomically."""
        ...

    @abstractmethod
    def update(self, stat_id: int, data: dict[str, Any]) -> None: ...


# ---------------------------------------------------------------------------
# Offer (Promotions)
# ---------------------------------------------------------------------------

class IOfferRepository(ABC):
    @abstractmethod
    def list_active(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_all(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def find_by_id(self, offer_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> int: ...

    @abstractmethod
    def update(self, offer_id: int, data: dict[str, Any]) -> None: ...

    @abstractmethod
    def delete(self, offer_id: int) -> None: ...

    @abstractmethod
    def increment_uses(self, offer_id: int) -> None: ...
