"""FastAPI dependency factories — map ``Request → service`` via ``app.state.container``.

Import one of these functions as the argument to ``Depends()`` in a router:

    from ..dependencies import get_package_service

    @router.get("/packages")
    def list_packages(svc: PackageService = Depends(get_package_service)): ...
"""
from __future__ import annotations

from typing import Any

from fastapi import Depends, Header, HTTPException, Request, status

from ...application.auth_service import LOCAL_ISS, AuthService
from ...application.comment_service import CommentService
from ...application.contact_service import ContactService
from ...application.gdrive_service import GDriveService
from ...application.system_settings_service import SystemSettingsService
from ...application.customer_service import CustomerService
from ...application.destination_service import DestinationService
from ...application.faq_service import FaqService
from ...application.inquiry_service import InquiryService
from ...application.media_service import MediaService
from ...application.memory_service import MemoryService
from ...application.offer_service import OfferService
from ...application.package_service import PackageService
from ...application.planner_service import PlannerService
from ...application.review_service import ReviewService
from ...application.service_service import ServiceService
from ...application.site_stat_service import SiteStatService
from ...application.testimonial_service import TestimonialService
from ...application.wishlist_service import WishlistService


def _c(request: Request):  # noqa: ANN001
    return request.app.state.container


def get_auth_service(request: Request) -> AuthService:
    return _c(request).auth_service


def get_comment_service(request: Request) -> CommentService:
    return _c(request).comment_service


def get_customer_service(request: Request) -> CustomerService:
    return _c(request).customer_service


def get_inquiry_service(request: Request) -> InquiryService:
    return _c(request).inquiry_service


def get_contact_service(request: Request) -> ContactService:
    return _c(request).contact_service


def get_package_service(request: Request) -> PackageService:
    return _c(request).package_service


def get_destination_service(request: Request) -> DestinationService:
    return _c(request).destination_service


def get_review_service(request: Request) -> ReviewService:
    return _c(request).review_service


def get_memory_service(request: Request) -> MemoryService:
    return _c(request).memory_service


def get_media_service(request: Request) -> MediaService:
    return _c(request).media_service


def get_planner_service(request: Request) -> PlannerService:
    return _c(request).planner_service


def get_wishlist_service(request: Request) -> WishlistService:
    return _c(request).wishlist_service


def get_service_service(request: Request) -> ServiceService:
    return _c(request).service_service


def get_faq_service(request: Request) -> FaqService:
    return _c(request).faq_service


def get_testimonial_service(request: Request) -> TestimonialService:
    return _c(request).testimonial_service


def get_site_stat_service(request: Request) -> SiteStatService:
    return _c(request).site_stat_service


def get_offer_service(request: Request) -> OfferService:
    return _c(request).offer_service


def get_gdrive_service(request: Request) -> GDriveService:
    return _c(request).gdrive_service


def get_system_settings_service(request: Request) -> SystemSettingsService:
    return _c(request).system_settings_service


def get_current_admin_customer_id(
    request: Request,
    x_admin_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(
        lambda credentials=None: None
    ),
) -> int:
    from ...config import get_settings
    from .auth_adapter import optional_user as _optional_user

    # Re-resolve the optional user from the request's authorization header
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from .auth_adapter import _decode_token

    auth_header = request.headers.get("authorization", "")
    token_user: dict[str, Any] | None = None
    if auth_header.lower().startswith("bearer "):
        token_str = auth_header[7:].strip()
        try:
            from fastapi.security.http import HTTPAuthorizationCredentials as Creds
            creds = Creds(scheme="bearer", credentials=token_str)
            token_user = _decode_token(creds)
        except Exception:
            pass

    if token_user and token_user.get("iss") == LOCAL_ISS:
        try:
            return int(token_user["sub"])
        except (KeyError, ValueError, TypeError):
            pass

    # Dev admin token bypass — find first admin customer in DB
    settings = get_settings()
    if x_admin_token == settings.admin_token:
        container = request.app.state.container
        with container.db.connect() as conn:
            row = conn.execute(
                "SELECT id FROM customers WHERE role='admin' ORDER BY id LIMIT 1"
            ).fetchone()
        if row:
            return int(row[0])

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not determine admin customer identity. Log in with a named admin account.",
    )
