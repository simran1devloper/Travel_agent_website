"""Application service for CMS FAQs."""
from __future__ import annotations

from typing import Any

from ..domain.exceptions import NotFoundError
from ..models import FaqCreate, FaqUpdate
from ..ports.repositories import IFaqRepository


class FaqService:
    def __init__(self, *, faq_repo: IFaqRepository) -> None:
        self._repo = faq_repo

    def list_all(self) -> list[dict[str, Any]]:
        return self._repo.list_all()

    def create(self, payload: FaqCreate) -> dict[str, Any]:
        data = payload.model_dump()
        faq_id = self._repo.create(data)
        return self._repo.find_by_id(faq_id) or {**data, "id": faq_id}  # type: ignore[return-value]

    def update(self, faq_id: int, payload: FaqUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_id(faq_id)
        if not existing:
            raise NotFoundError(f"FAQ {faq_id} not found")
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        self._repo.update(faq_id, data)
        return self._repo.find_by_id(faq_id) or existing  # type: ignore[return-value]

    def delete(self, faq_id: int) -> dict[str, int]:
        existing = self._repo.find_by_id(faq_id)
        if not existing:
            raise NotFoundError(f"FAQ {faq_id} not found")
        self._repo.delete(faq_id)
        return {"deleted": faq_id}
