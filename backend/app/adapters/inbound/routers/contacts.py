"""Contact message router."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.contact_service import ContactService
from ....models import ContactCreate
from ..dependencies import get_contact_service

router = APIRouter(tags=["contacts"])


@router.post("/contacts", status_code=201)
def create_contact(
    payload: ContactCreate,
    svc: ContactService = Depends(get_contact_service),
) -> dict[str, Any]:
    return svc.create(payload)
