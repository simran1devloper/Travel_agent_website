from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field


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
    body: str = Field(min_length=10, max_length=2000)
    media_urls: list[str] = []


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
