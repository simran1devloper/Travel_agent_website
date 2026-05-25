"""FastAPI application factory.

This module is deliberately thin:
  - Creates the FastAPI app.
  - Registers CORS middleware.
  - Registers global exception handlers that translate domain errors → HTTP.
  - Bootstraps the DI container on startup (lifespan).
  - Mounts every feature router.

Business logic lives in ``application/``.
Infrastructure lives in ``adapters/outbound/``.
HTTP concerns live in ``adapters/inbound/routers/``.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .adapters.inbound.routers import (
    auth,
    bulk,
    contacts,
    content,
    dashboard,
    destinations,
    faqs,
    inquiries,
    media,
    memories,
    offers,
    packages,
    planners,
    reviews,
    services,
    site_stats,
    testimonials,
    wishlist,
)
from .adapters.outbound.sqlite.migrations import migrate
from .config import get_settings
from .container import build_container
from .domain.exceptions import (
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    UnsupportedMediaTypeError,
)


# ---------------------------------------------------------------------------
# Application lifespan: startup / teardown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    from .adapters.outbound.sqlite.connection import SQLiteDatabase
    db = SQLiteDatabase(str(settings.database_path))
    migrate(db)                              # apply DDL + seed once
    app.state.container = build_container(settings)  # wire DI graph
    yield
    # teardown (connections are short-lived per request; nothing to close)


# ---------------------------------------------------------------------------
# App construction
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, lifespan=lifespan)

    # ── CORS ─────────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global domain-exception → HTTP handlers ───────────────────────────
    @application.exception_handler(NotFoundError)
    async def _not_found(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @application.exception_handler(ConflictError)
    async def _conflict(request: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @application.exception_handler(ForbiddenError)
    async def _forbidden(request: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": exc.detail})

    @application.exception_handler(UnauthorizedError)
    async def _unauthorized(request: Request, exc: UnauthorizedError) -> JSONResponse:
        return JSONResponse(status_code=401, content={"detail": exc.detail})

    @application.exception_handler(UnsupportedMediaTypeError)
    async def _unsupported(
        request: Request, exc: UnsupportedMediaTypeError
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @application.exception_handler(DomainError)
    async def _domain(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    # ── Health probe ──────────────────────────────────────────────────────────
    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # ── Feature routers ───────────────────────────────────────────────────────
    for rtr in (
        auth.router,
        bulk.router,
        contacts.router,
        content.router,
        dashboard.router,
        destinations.router,
        faqs.router,
        inquiries.router,
        media.router,
        memories.router,
        offers.router,
        packages.router,
        planners.router,
        reviews.router,
        services.router,
        site_stats.router,
        testimonials.router,
        wishlist.router,
    ):
        application.include_router(rtr)

    return application


# ---------------------------------------------------------------------------
# Module-level app instance (used by uvicorn: ``uvicorn app.main:app``)
# ---------------------------------------------------------------------------
app = create_app()
