"""Review application service."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import ForbiddenError, NotFoundError
from ..domain.utils import utc_now
from ..ports.repositories import IPackageRepository, IReviewRepository
from ..models import ReviewCreate, ReviewAdminUpdate, ReviewBulkAction


class ReviewService:
    def __init__(
        self,
        review_repo: IReviewRepository,
        package_repo: IPackageRepository,
    ) -> None:
        self._reviews = review_repo
        self._packages = package_repo

    # ------------------------------------------------------------------
    # Public

    def list_by_package(self, slug: str) -> list[dict[str, Any]]:
        return self._reviews.list_approved_by_package(slug)

    def submit(
        self, slug: str, payload: ReviewCreate, customer_id: int
    ) -> dict[str, Any]:
        if not self._packages.find_by_slug(slug):
            raise NotFoundError("Package not found")
        public_id = f"REV-{self._reviews.count() + 2001}"
        now = utc_now()
        self._reviews.create(
            {
                "public_id": public_id,
                "customer_id": customer_id,
                "package_slug": slug,
                "rating": payload.rating,
                "title": payload.title,
                "body": payload.body,
                "trip_date": payload.trip_date,
                "media_urls": payload.media_urls,
                "created_at": now,
                "updated_at": now,
            }
        )
        # Recalculate package rating after inserting
        rating, count = self._reviews.get_rating_stats(slug)
        self._packages.update_rating(slug, rating, count, now)
        return {"id": public_id, "status": "approved"}

    def list_by_entity(self, entity_type: str, entity_slug: str) -> list[dict[str, Any]]:
        return self._reviews.list_approved_by_entity(entity_type, entity_slug)

    def submit_for_entity(
        self, entity_type: str, entity_slug: str, payload: ReviewCreate, customer_id: int
    ) -> dict[str, Any]:
        public_id = f"REV-{self._reviews.count() + 2001}"
        now = utc_now()
        self._reviews.create_entity_review(
            {
                "public_id": public_id,
                "customer_id": customer_id,
                "entity_type": entity_type,
                "entity_slug": entity_slug,
                "rating": payload.rating,
                "title": payload.title,
                "body": payload.body,
                "trip_date": payload.trip_date,
                "media_urls": payload.media_urls,
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"id": public_id, "status": "approved"}

    def delete(self, public_id: str, customer_id: int) -> dict[str, str]:
        review = self._reviews.find_by_public_id(public_id)
        if not review:
            raise NotFoundError("Review not found")
        if review["customer_id"] != customer_id:
            raise ForbiddenError("Not your review")
        slug = review["package_slug"]
        self._reviews.delete(public_id)
        rating, count = self._reviews.get_rating_stats(slug)
        self._packages.update_rating(slug, rating, count, utc_now())
        return {"deleted": public_id}

    # ------------------------------------------------------------------
    # Admin

    def admin_list(self, status: str | None = None) -> list[dict[str, Any]]:
        return self._reviews.list_all(status)

    def admin_update(
        self, public_id: str, payload: ReviewAdminUpdate
    ) -> dict[str, Any]:
        review = self._reviews.find_by_public_id(public_id)
        if not review:
            raise NotFoundError("Review not found")
        new_status = payload.status if payload.status is not None else review["status"]
        new_body = payload.body if payload.body is not None else review["body"]
        new_flag = payload.flag_reason if payload.flag_reason is not None else review.get("flag_reason")
        now = utc_now()
        self._reviews.update(public_id, new_status, new_body, new_flag, now)
        rating, count = self._reviews.get_rating_stats(review["package_slug"])
        self._packages.update_rating(review["package_slug"], rating, count, now)
        return {"id": public_id, "status": new_status}

    def admin_delete(self, public_id: str) -> dict[str, str]:
        review = self._reviews.find_by_public_id(public_id)
        if not review:
            raise NotFoundError("Review not found")
        slug = review["package_slug"]
        self._reviews.delete(public_id)
        rating, count = self._reviews.get_rating_stats(slug)
        self._packages.update_rating(slug, rating, count, utc_now())
        return {"deleted": public_id}

    def admin_bulk_action(self, payload: ReviewBulkAction) -> dict[str, Any]:
        new_status = "approved" if payload.action == "approve" else "rejected"
        now = utc_now()
        slugs = self._reviews.bulk_update_status(payload.public_ids, new_status, now)
        for slug in slugs:
            rating, count = self._reviews.get_rating_stats(slug)
            self._packages.update_rating(slug, rating, count, now)
        return {"updated": len(payload.public_ids), "status": new_status}

    def mark_helpful(self, public_id: str) -> dict[str, Any]:
        count = self._reviews.increment_helpful(public_id)
        return {"public_id": public_id, "helpful_count": count}

    def admin_reply(self, public_id: str, reply: str) -> dict[str, Any]:
        review = self._reviews.find_by_public_id(public_id)
        if not review:
            raise NotFoundError("Review not found")
        now = utc_now()
        self._reviews.set_admin_reply(public_id, reply, now)
        return {"id": public_id, "admin_reply": reply}

    def admin_set_verified(self, public_id: str, verified: bool) -> dict[str, Any]:
        review = self._reviews.find_by_public_id(public_id)
        if not review:
            raise NotFoundError("Review not found")
        self._reviews.update_verified(public_id, verified, utc_now())
        return {"id": public_id, "verified": verified}

    def get_package_stats(self, slug: str) -> dict[str, Any]:
        return self._reviews.get_stats_by_package(slug)

    def get_all_public(self) -> list[dict[str, Any]]:
        return self._reviews.list_all("approved")
