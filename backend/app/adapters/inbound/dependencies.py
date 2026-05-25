"""FastAPI dependency factories — map ``Request → service`` via ``app.state.container``.

Import one of these functions as the argument to ``Depends()`` in a router:

    from ..dependencies import get_package_service

    @router.get("/packages")
    def list_packages(svc: PackageService = Depends(get_package_service)): ...
"""
from __future__ import annotations

from fastapi import Request

from ...application.auth_service import AuthService
from ...application.contact_service import ContactService
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
