"""Package CRUD router."""
from __future__ import annotations

import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile

from ....application.package_service import PackageService
from ....models import PackageCreate
from ..auth_adapter import require_admin
from ..dependencies import get_package_service

router = APIRouter(tags=["packages"])


@router.get("/packages")
def list_packages(
    include_unpublished: bool = False,
    svc: PackageService = Depends(get_package_service),
) -> list[dict[str, Any]]:
    return svc.list_all(include_unpublished)


@router.post("/packages", status_code=201, dependencies=[Depends(require_admin)])
def create_package(
    payload: PackageCreate,
    svc: PackageService = Depends(get_package_service),
) -> dict[str, Any]:
    return svc.create(payload)


@router.get("/packages/{slug}")
def get_package(
    slug: str,
    svc: PackageService = Depends(get_package_service),
) -> dict[str, Any]:
    return svc.get_by_slug(slug)


@router.patch("/packages/{slug}", dependencies=[Depends(require_admin)])
def update_package(
    slug: str,
    payload: PackageCreate,
    svc: PackageService = Depends(get_package_service),
) -> dict[str, Any]:
    return svc.update(slug, payload)


@router.delete("/packages/{slug}", dependencies=[Depends(require_admin)])
def delete_package(
    slug: str,
    svc: PackageService = Depends(get_package_service),
) -> dict[str, str]:
    return svc.delete(slug)
