"""Application service for CMS testimonials."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..models import TestimonialCreate, TestimonialUpdate
from ..ports.repositories import ITestimonialRepository


class TestimonialService:
    def __init__(self, *, testimonial_repo: ITestimonialRepository) -> None:
        self._repo = testimonial_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._repo.list_all()

    def create(self, payload: TestimonialCreate) -> dict[str, Any]:
        data = payload.model_dump()
        t_id = self._repo.create(data)
        return self._repo.find_by_id(t_id) or {**data, "id": t_id}  # type: ignore[return-value]

    def update(self, testimonial_id: int, payload: TestimonialUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_id(testimonial_id)
        if not existing:
            raise NotFoundError(f"Testimonial {testimonial_id} not found")
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        self._repo.update(testimonial_id, data)
        return self._repo.find_by_id(testimonial_id) or existing  # type: ignore[return-value]

    def delete(self, testimonial_id: int) -> dict[str, int]:
        existing = self._repo.find_by_id(testimonial_id)
        if not existing:
            raise NotFoundError(f"Testimonial {testimonial_id} not found")
        self._repo.delete(testimonial_id)
        return {"deleted": testimonial_id}
