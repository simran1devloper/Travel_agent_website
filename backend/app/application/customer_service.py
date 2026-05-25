"""Customer application service — identity resolution and dashboard aggregation."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import (
    ICustomerRepository,
    IInquiryRepository,
    IMemoryRepository,
    IReviewRepository,
    IWishlistRepository,
)
from .auth_service import LOCAL_ISS


class CustomerService:
    def __init__(
        self,
        customer_repo: ICustomerRepository,
        inquiry_repo: IInquiryRepository,
        wishlist_repo: IWishlistRepository,
        review_repo: IReviewRepository,
        memory_repo: IMemoryRepository,
    ) -> None:
        self._customers = customer_repo
        self._inquiries = inquiry_repo
        self._wishlists = wishlist_repo
        self._reviews = review_repo
        self._memories = memory_repo

    # ------------------------------------------------------------------
    # Identity helpers
    # ------------------------------------------------------------------

    def resolve_customer_id(self, user: dict[str, Any]) -> int:
        """Translate a decoded JWT payload into a customer DB id.

        * Local JWT  → id is stored directly in ``sub``.
        * Auth0 JWT  → look-up or create customer row from ``sub``.
        """
        if user.get("iss") == LOCAL_ISS:
            return int(user["sub"])
        return self._get_or_create_from_auth0(
            sub=user["sub"],
            email=user.get("email", ""),
            name=user.get("name", "") or user.get("email", user["sub"]),
        )

    def _get_or_create_from_auth0(self, sub: str, email: str, name: str) -> int:
        row = self._customers.find_by_auth0_sub(sub)
        if row:
            return int(row["id"])
        if email:
            by_email = self._customers.find_by_email(email)
            if by_email:
                self._customers.update_auth0_sub(int(by_email["id"]), sub)
                return int(by_email["id"])
        return self._customers.create(
            name=name,
            email=email or None,
            phone=None,
            whatsapp=None,
            created_at=utc_now(),
        )

    def get_first_customer_id(self) -> int | None:
        """Dev-bypass: return the first customer's id (no auth context)."""
        row = self._customers.get_first()
        return int(row["id"]) if row else None

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------

    def get_dashboard(self, customer_id: int) -> dict[str, Any]:
        customer = self._customers.find_by_id(customer_id)
        if not customer:
            raise NotFoundError("Customer not found")
        email = customer.get("email") or ""
        return {
            "customer": customer,
            "inquiries": self._inquiries.list_by_customer(customer_id, email),
            "wishlist": self._wishlists.list_packages_by_customer(customer_id),
            "reviews": self._reviews.list_by_customer(customer_id),
            "memories": self._memories.list_by_customer(customer_id),
        }
