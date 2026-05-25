"""Site content (CMS) router — public read, admin write."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from ..auth_adapter import require_admin
from ....application.site_content_service import SiteContentService

router = APIRouter(tags=["content"])


def get_content_service(request: Request) -> SiteContentService:
    return request.app.state.container.site_content_service


class ContentUpdate(BaseModel):
    page: str
    section: str
    key: str
    value: str


class BulkContentUpdate(BaseModel):
    updates: list[ContentUpdate]


@router.get("/content/{page}")
def get_page_content(page: str, svc: SiteContentService = Depends(get_content_service)) -> dict[str, Any]:
    return svc.get_page(page)


@router.get("/admin/content")
def get_all_content(
    _: None = Depends(require_admin),
    svc: SiteContentService = Depends(get_content_service),
) -> dict[str, Any]:
    return svc.get_all()


@router.patch("/admin/content")
def update_content(
    payload: BulkContentUpdate,
    _: None = Depends(require_admin),
    svc: SiteContentService = Depends(get_content_service),
) -> dict[str, Any]:
    updates = [u.model_dump() for u in payload.updates]
    return svc.bulk_update(updates)
