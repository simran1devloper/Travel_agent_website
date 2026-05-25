"""Composition root — wires every concrete adapter to every application service.

``build_container(settings)`` is called once during application startup
(lifespan hook).  The resulting ``Container`` object is stored in
``app.state.container`` and retrieved by the inbound adapter's dependency
factories.

To swap SQLite for PostgreSQL: replace the SQLite* classes here — nothing
else in the codebase changes.
"""
from __future__ import annotations

from dataclasses import dataclass

from .adapters.outbound.filesystem.file_storage import LocalFileStorage
from .adapters.outbound.sqlite.connection import SQLiteDatabase
from .adapters.outbound.sqlite.repositories.contact import SQLiteContactRepository
from .adapters.outbound.sqlite.repositories.customer import SQLiteCustomerRepository
from .adapters.outbound.sqlite.repositories.destination import SQLiteDestinationRepository
from .adapters.outbound.sqlite.repositories.faq import SQLiteFaqRepository
from .adapters.outbound.sqlite.repositories.inquiry import SQLiteInquiryRepository
from .adapters.outbound.sqlite.repositories.media import SQLiteMediaRepository
from .adapters.outbound.sqlite.repositories.memory import SQLiteMemoryRepository
from .adapters.outbound.sqlite.repositories.offer import SQLiteOfferRepository
from .adapters.outbound.sqlite.repositories.package import SQLitePackageRepository
from .adapters.outbound.sqlite.repositories.planner import SQLitePlannerRepository
from .adapters.outbound.sqlite.repositories.review import SQLiteReviewRepository
from .adapters.outbound.sqlite.repositories.service import SQLiteServiceRepository
from .adapters.outbound.sqlite.repositories.site_content import SQLiteSiteContentRepository
from .adapters.outbound.sqlite.repositories.site_stat import SQLiteSiteStatRepository
from .adapters.outbound.sqlite.repositories.testimonial import SQLiteTestimonialRepository
from .adapters.outbound.sqlite.repositories.wishlist import SQLiteWishlistRepository
from .application.auth_service import AuthService
from .application.site_content_service import SiteContentService
from .application.contact_service import ContactService
from .application.customer_service import CustomerService
from .application.destination_service import DestinationService
from .application.faq_service import FaqService
from .application.inquiry_service import InquiryService
from .application.media_service import MediaService
from .application.memory_service import MemoryService
from .application.offer_service import OfferService
from .application.package_service import PackageService
from .application.planner_service import PlannerService
from .application.review_service import ReviewService
from .application.service_service import ServiceService
from .application.site_stat_service import SiteStatService
from .application.testimonial_service import TestimonialService
from .application.wishlist_service import WishlistService
from .config import Settings


@dataclass
class Container:
    # ── Application services ────────────────────────────────────────────────
    auth_service: AuthService
    customer_service: CustomerService
    inquiry_service: InquiryService
    contact_service: ContactService
    package_service: PackageService
    destination_service: DestinationService
    review_service: ReviewService
    memory_service: MemoryService
    media_service: MediaService
    planner_service: PlannerService
    wishlist_service: WishlistService
    # ── CMS services ────────────────────────────────────────────────────────
    service_service: ServiceService
    faq_service: FaqService
    testimonial_service: TestimonialService
    site_stat_service: SiteStatService
    offer_service: OfferService
    site_content_service: SiteContentService


def build_container(settings: Settings) -> Container:
    """Instantiate all adapters and services, inject dependencies, return Container."""

    # ── Infrastructure ──────────────────────────────────────────────────────
    db = SQLiteDatabase(str(settings.database_path))
    file_storage = LocalFileStorage()

    # ── Outbound repository adapters ────────────────────────────────────────
    customer_repo = SQLiteCustomerRepository(db)
    package_repo = SQLitePackageRepository(db)
    destination_repo = SQLiteDestinationRepository(db)
    inquiry_repo = SQLiteInquiryRepository(db)
    contact_repo = SQLiteContactRepository(db)
    review_repo = SQLiteReviewRepository(db)
    memory_repo = SQLiteMemoryRepository(db)
    media_repo = SQLiteMediaRepository(db)
    planner_repo = SQLitePlannerRepository(db)
    wishlist_repo = SQLiteWishlistRepository(db)
    service_repo = SQLiteServiceRepository(db)
    faq_repo = SQLiteFaqRepository(db)
    testimonial_repo = SQLiteTestimonialRepository(db)
    site_stat_repo = SQLiteSiteStatRepository(db)
    offer_repo = SQLiteOfferRepository(db)
    site_content_repo = SQLiteSiteContentRepository(db)

    # ── Application services (pure DI — constructor injection) ──────────────
    auth_svc = AuthService(
        customer_repo=customer_repo,
        jwt_secret=settings.jwt_secret,
    )
    customer_svc = CustomerService(
        customer_repo=customer_repo,
        inquiry_repo=inquiry_repo,
        wishlist_repo=wishlist_repo,
        review_repo=review_repo,
        memory_repo=memory_repo,
    )
    inquiry_svc = InquiryService(
        inquiry_repo=inquiry_repo,
        customer_repo=customer_repo,
    )
    contact_svc = ContactService(contact_repo=contact_repo)
    package_svc = PackageService(package_repo=package_repo)
    destination_svc = DestinationService(destination_repo=destination_repo)
    review_svc = ReviewService(
        review_repo=review_repo,
        package_repo=package_repo,
    )
    memory_svc = MemoryService(memory_repo=memory_repo)
    media_svc = MediaService(media_repo=media_repo, file_storage=file_storage)
    planner_svc = PlannerService(planner_repo=planner_repo)
    wishlist_svc = WishlistService(wishlist_repo=wishlist_repo)
    service_svc = ServiceService(service_repo=service_repo)
    faq_svc = FaqService(faq_repo=faq_repo)
    testimonial_svc = TestimonialService(testimonial_repo=testimonial_repo)
    site_stat_svc = SiteStatService(site_stat_repo=site_stat_repo)
    offer_svc = OfferService(offer_repo=offer_repo)
    site_content_svc = SiteContentService(repo=site_content_repo)

    return Container(
        auth_service=auth_svc,
        customer_service=customer_svc,
        inquiry_service=inquiry_svc,
        contact_service=contact_svc,
        package_service=package_svc,
        destination_service=destination_svc,
        review_service=review_svc,
        memory_service=memory_svc,
        media_service=media_svc,
        planner_service=planner_svc,
        wishlist_service=wishlist_svc,
        service_service=service_svc,
        faq_service=faq_svc,
        testimonial_service=testimonial_svc,
        site_stat_service=site_stat_svc,
        offer_service=offer_svc,
        site_content_service=site_content_svc,
    )
