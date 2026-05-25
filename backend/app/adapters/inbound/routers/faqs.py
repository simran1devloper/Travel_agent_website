"""FAQs router — public listing + admin CRUD."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.faq_service import FaqService
from ....models import FaqCreate, FaqUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_faq_service

router = APIRouter(tags=["faqs"])


@router.get("/faqs")
def list_faqs(
    svc: FaqService = Depends(get_faq_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.post("/faqs", status_code=201, dependencies=[Depends(require_admin)])
def create_faq(
    payload: FaqCreate,
    svc: FaqService = Depends(get_faq_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.patch("/faqs/{faq_id}", dependencies=[Depends(require_admin)])
def update_faq(
    faq_id: int,
    payload: FaqUpdate,
    svc: FaqService = Depends(get_faq_service),
) -> dict[str, Any]:
    return svc.update(faq_id, payload)


@router.delete("/faqs/{faq_id}", dependencies=[Depends(require_admin)])
def delete_faq(
    faq_id: int,
    svc: FaqService = Depends(get_faq_service),
) -> dict[str, int]:
    return svc.delete(faq_id)
