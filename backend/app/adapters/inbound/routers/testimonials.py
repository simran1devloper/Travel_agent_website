"""Testimonials router — public listing + admin CRUD."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.testimonial_service import TestimonialService
from ....models import TestimonialCreate, TestimonialUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_testimonial_service

router = APIRouter(tags=["testimonials"])


@router.get("/testimonials")
def list_testimonials(
    svc: TestimonialService = Depends(get_testimonial_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.post("/testimonials", status_code=201, dependencies=[Depends(require_admin)])
def create_testimonial(
    payload: TestimonialCreate,
    svc: TestimonialService = Depends(get_testimonial_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.patch("/testimonials/{testimonial_id}", dependencies=[Depends(require_admin)])
def update_testimonial(
    testimonial_id: int,
    payload: TestimonialUpdate,
    svc: TestimonialService = Depends(get_testimonial_service),
) -> dict[str, Any]:
    return svc.update(testimonial_id, payload)


@router.delete("/testimonials/{testimonial_id}", dependencies=[Depends(require_admin)])
def delete_testimonial(
    testimonial_id: int,
    svc: TestimonialService = Depends(get_testimonial_service),
) -> dict[str, int]:
    return svc.delete(testimonial_id)
