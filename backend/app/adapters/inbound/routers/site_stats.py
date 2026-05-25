"""Site stats router — public listing + admin update."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.site_stat_service import SiteStatService
from ....models import SiteStatUpdate
from ..auth_adapter import require_admin
from ..dependencies import get_site_stat_service

router = APIRouter(tags=["site-stats"])


@router.get("/site-stats")
def list_site_stats(
    svc: SiteStatService = Depends(get_site_stat_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.put("/site-stats", dependencies=[Depends(require_admin)])
def bulk_replace_stats(
    items: list[SiteStatUpdate],
    svc: SiteStatService = Depends(get_site_stat_service),
) -> list[dict[str, Any]]:
    """Atomically replace all site stats."""
    return svc.bulk_replace([item.model_dump() for item in items])


@router.patch("/site-stats/{stat_id}", dependencies=[Depends(require_admin)])
def update_stat(
    stat_id: int,
    payload: SiteStatUpdate,
    svc: SiteStatService = Depends(get_site_stat_service),
) -> dict[str, Any]:
    return svc.update(stat_id, payload)
