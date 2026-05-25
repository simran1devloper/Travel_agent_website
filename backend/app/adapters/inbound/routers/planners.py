"""Planner router."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.planner_service import PlannerService
from ....models import PlannerCreate
from ..auth_adapter import require_admin
from ..dependencies import get_planner_service

router = APIRouter(tags=["planners"])


@router.get("/planners")
def list_planners(
    svc: PlannerService = Depends(get_planner_service),
) -> list[dict[str, Any]]:
    return svc.list_all()


@router.post("/planners", status_code=201, dependencies=[Depends(require_admin)])
def create_planner(
    payload: PlannerCreate,
    svc: PlannerService = Depends(get_planner_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.patch("/planners/{planner_id}", dependencies=[Depends(require_admin)])
def update_planner(
    planner_id: int,
    payload: PlannerCreate,
    svc: PlannerService = Depends(get_planner_service),
) -> dict[str, Any]:
    return svc.update(planner_id, payload)


@router.delete("/planners/{planner_id}", dependencies=[Depends(require_admin)])
def delete_planner(
    planner_id: int,
    svc: PlannerService = Depends(get_planner_service),
) -> dict[str, Any]:
    return svc.delete(planner_id)
