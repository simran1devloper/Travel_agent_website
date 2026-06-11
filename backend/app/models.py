from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field

OfferType = Literal["percent", "fixed", "free_upgrade", "flash"]
BadgeColor = Literal["accent", "red", "green", "gold"]


InquiryStatus = Literal["New", "Assigned", "In review", "Quoted", "Won", "Lost"]


class InquiryCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = None
    whatsapp: str | None = None
    preferred_contact: str | None = None
    destinations: list[str] = []
    specific_place: str | None = None
    experiences: list[str] = []
    travel_styles: list[str] = []
    services: list[str] = []
    preferred_dates: str | None = None
    adults: int = Field(default=1, ge=1, le=40)
    children: int = Field(default=0, ge=0, le=40)
    budget: str | None = None
    passport_notes: str | None = None
    occasion: str | None = None
    inspiration: list[str] = []
    inspiration_links: str | None = None
    trip_feel: str | None = None


class InquiryUpdate(BaseModel):
    status: InquiryStatus | None = None
    assigned_planner_id: int | None = None


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    contact: str = Field(min_length=3, max_length=160)
    destination: str | None = None
    message: str = Field(min_length=5, max_length=5000)
    journey_types: list[str] = []


class PackageCreate(BaseModel):
    slug: str
    title: str
    location: str
    days: int = Field(ge=1, le=90)
    price: float = Field(ge=0)
    category: str | None = None
    image_url: str | None = None
    tagline: str | None = None
    description: str | None = None
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    published: bool = True
    reviews: list[dict[str, Any]] = []


class DestinationCreate(BaseModel):
    slug: str
    name: str
    image_url: str | None = None
    packages_count: int = Field(default=0, ge=0)
    tagline: str | None = None
    duration: str | None = None
    price: float | None = Field(default=None, ge=0)
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    gallery: list[dict[str, Any]] = []


class WishlistCreate(BaseModel):
    package_slug: str


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=200)
    body: str = Field(min_length=10, max_length=2000)
    trip_date: str | None = None  # e.g. "2024-11"
    media_urls: list[str] = []


class ReviewAdminReply(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)


class ReviewHelpfulVote(BaseModel):
    pass  # just a POST trigger, no body needed


class MemoryCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    destination: str | None = None
    travel_date_from: str | None = None
    travel_date_to: str | None = None
    is_public: bool = False
    media_urls: list[str] = []


class MemoryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    destination: str | None = None
    travel_date_from: str | None = None
    travel_date_to: str | None = None
    is_public: bool | None = None
    media_urls: list[str] | None = None


# ── Admin models ──────────────────────────────────────────────────────────────

class MediaUpdate(BaseModel):
    alt_text: str | None = None
    owner_type: str | None = None
    owner_slug: str | None = None


ReviewModerationStatus = Literal["pending", "approved", "rejected", "flagged"]


class ReviewAdminUpdate(BaseModel):
    status: ReviewModerationStatus | None = None
    body: str | None = None
    flag_reason: str | None = None


class ReviewBulkAction(BaseModel):
    public_ids: list[str]
    action: Literal["approve", "reject"]


class PlannerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    specialty: str | None = None
    photo_url: str | None = None


# ── Auth models ───────────────────────────────────────────────────────────────

class AuthSignup(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthLogin(BaseModel):
    email: EmailStr
    password: str


# ── CMS content models ────────────────────────────────────────────────────────

class GalleryItem(BaseModel):
    type: Literal["photo", "video"] = "photo"
    src: str
    caption: str = ""
    author: str = ""


class ServiceCreate(BaseModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=120)
    category: str = ""
    short_description: str = ""
    description: str = ""
    detailed_description: str = ""
    image_url: str = ""
    icon_url: str = ""
    image_alt: str = ""
    rating: float = Field(default=5.0, ge=0, le=5)
    review_count: int = Field(default=0, ge=0)
    highlight: str = ""
    badge_text: str = ""
    cta_text: str = "Explore"
    cta_link: str = "/services"
    show_homepage: bool = True
    show_services_page: bool = True
    show_hero_card: bool = False
    show_footer: bool = False
    status: Literal["published", "draft", "hidden"] = "published"
    gallery: list[GalleryItem] = []
    sort_order: int = 0


class ServiceUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    short_description: str | None = None
    description: str | None = None
    detailed_description: str | None = None
    image_url: str | None = None
    icon_url: str | None = None
    image_alt: str | None = None
    rating: float | None = Field(default=None, ge=0, le=5)
    review_count: int | None = Field(default=None, ge=0)
    highlight: str | None = None
    badge_text: str | None = None
    cta_text: str | None = None
    cta_link: str | None = None
    show_homepage: bool | None = None
    show_services_page: bool | None = None
    show_hero_card: bool | None = None
    show_footer: bool | None = None
    status: Literal["published", "draft", "hidden"] | None = None
    gallery: list[GalleryItem] | None = None
    sort_order: int | None = None


class FaqCreate(BaseModel):
    question: str = Field(min_length=5, max_length=500)
    answer: str = Field(min_length=5, max_length=5000)
    sort_order: int = 0


class FaqUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    sort_order: int | None = None


class TestimonialCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    role: str = Field(min_length=2, max_length=200)
    quote: str = Field(min_length=5, max_length=2000)
    location: str = ""
    sort_order: int = 0


class TestimonialUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    quote: str | None = None
    location: str | None = None
    sort_order: int | None = None


class SiteStatUpdate(BaseModel):
    value: str = Field(min_length=1, max_length=20)
    label: str = Field(min_length=1, max_length=80)
    sort_order: int = 0


# ── Offer models ─────────────────────────────────────────────────────────────

class OfferCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subtitle: str = ""
    code: str | None = Field(default=None, max_length=50)
    description: str = ""
    offer_type: OfferType = "percent"
    discount_value: float = Field(default=0.0, ge=0)
    badge_label: str = Field(default="Special Offer", max_length=50)
    badge_color: BadgeColor = "accent"
    applies_to: str = "all"  # "all" or JSON array of slugs
    valid_from: str | None = None
    valid_until: str | None = None
    max_uses: int | None = None
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0


class OfferUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    code: str | None = None
    description: str | None = None
    offer_type: OfferType | None = None
    discount_value: float | None = None
    badge_label: str | None = None
    badge_color: BadgeColor | None = None
    applies_to: str | None = None
    valid_from: str | None = None
    valid_until: str | None = None
    max_uses: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None


# ── Bulk operation models ─────────────────────────────────────────────────────

class BulkDeleteRequest(BaseModel):
    """List of string IDs (slugs or string PKs).
    Integer IDs from the frontend arrive as strings and are coerced as needed."""
    ids: list[str] = Field(min_length=1)


class BulkInquiryUpdate(BaseModel):
    public_ids: list[str] = Field(min_length=1)
    status: InquiryStatus
