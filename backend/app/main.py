from __future__ import annotations

import csv
import io
import shutil
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .auth import (
    LOCAL_ISS,
    create_local_token,
    current_user,
    hash_password,
    require_admin,
    require_customer,
    verify_password,
)
from .config import get_settings
from .database import db, dumps, migrate, row_to_dict, utc_now
from .models import (
    AuthLogin,
    AuthSignup,
    ContactCreate,
    DestinationCreate,
    InquiryCreate,
    InquiryUpdate,
    MediaUpdate,
    MemoryCreate,
    MemoryUpdate,
    PackageCreate,
    PlannerCreate,
    ReviewAdminUpdate,
    ReviewBulkAction,
    ReviewCreate,
    WishlistCreate,
)

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    migrate()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def next_public_id(prefix: str, table: str) -> str:
    with db() as conn:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] + 2001
    return f"{prefix}-{count}"


def get_or_create_customer_by_sub(user: dict[str, Any]) -> int:
    """Return customer.id for an Auth0 user, creating a record if this is their first visit."""
    sub: str = user["sub"]
    email: str = user.get("email", "")
    name: str = user.get("name", "") or user.get("email", sub)
    with db() as conn:
        row = conn.execute("SELECT id FROM customers WHERE auth0_sub = ?", (sub,)).fetchone()
        if row:
            return int(row["id"])
        if email:
            row = conn.execute("SELECT id FROM customers WHERE email = ?", (email,)).fetchone()
            if row:
                conn.execute("UPDATE customers SET auth0_sub = ? WHERE id = ?", (sub, row["id"]))
                return int(row["id"])
        cur = conn.execute(
            "INSERT INTO customers (name, email, auth0_sub, created_at) VALUES (?, ?, ?, ?)",
            (name, email or None, sub, utc_now()),
        )
        return int(cur.lastrowid)


def get_customer_id(user: dict[str, Any]) -> int:
    """Return customer.id for either a local-auth user or an Auth0 user."""
    if user.get("iss") == LOCAL_ISS:
        return int(user["sub"])
    return get_or_create_customer_by_sub(user)


def upsert_customer(payload: InquiryCreate) -> int:
    with db() as conn:
        existing = conn.execute("SELECT id FROM customers WHERE email = ?", (payload.email,)).fetchone()
        if existing:
            conn.execute(
                "UPDATE customers SET name = ?, phone = ?, whatsapp = ? WHERE id = ?",
                (payload.full_name, payload.phone, payload.whatsapp, existing["id"]),
            )
            return int(existing["id"])
        cur = conn.execute(
            "INSERT INTO customers (name, email, phone, whatsapp, created_at) VALUES (?, ?, ?, ?, ?)",
            (payload.full_name, payload.email, payload.phone, payload.whatsapp, utc_now()),
        )
        return int(cur.lastrowid)


@app.post("/inquiries", status_code=201)
def create_inquiry(payload: InquiryCreate) -> dict[str, Any]:
    now = utc_now()
    customer_id = upsert_customer(payload)
    public_id = next_public_id("INQ", "inquiries")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO inquiries
            (public_id, customer_id, full_name, email, phone, whatsapp, preferred_contact,
             destinations, specific_place, experiences, travel_styles, services, preferred_dates,
             adults, children, budget, passport_notes, occasion, inspiration, inspiration_links,
             trip_feel, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)
            """,
            (
                public_id,
                customer_id,
                payload.full_name,
                payload.email,
                payload.phone,
                payload.whatsapp,
                payload.preferred_contact,
                dumps(payload.destinations),
                payload.specific_place,
                dumps(payload.experiences),
                dumps(payload.travel_styles),
                dumps(payload.services),
                payload.preferred_dates,
                payload.adults,
                payload.children,
                payload.budget,
                payload.passport_notes,
                payload.occasion,
                dumps(payload.inspiration),
                payload.inspiration_links,
                payload.trip_feel,
                now,
                now,
            ),
        )
    return {"id": public_id, "status": "New", "message": "Inquiry received"}


@app.post("/contacts", status_code=201)
def create_contact(payload: ContactCreate) -> dict[str, Any]:
    public_id = next_public_id("MSG", "contact_messages")
    with db() as conn:
        conn.execute(
            """
            INSERT INTO contact_messages
            (public_id, name, contact, destination, message, journey_types, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'New', ?)
            """,
            (
                public_id,
                payload.name,
                payload.contact,
                payload.destination,
                payload.message,
                dumps(payload.journey_types),
                utc_now(),
            ),
        )
    return {"id": public_id, "status": "New", "message": "Contact request received"}


@app.get("/packages")
def list_packages(include_unpublished: bool = False) -> list[dict[str, Any]]:
    with db() as conn:
        query = "SELECT * FROM packages"
        params: tuple[Any, ...] = ()
        if not include_unpublished:
            query += " WHERE published = 1"
        query += " ORDER BY created_at DESC"
        return [row_to_dict(row) for row in conn.execute(query, params).fetchall()]


@app.post("/packages", status_code=201, dependencies=[Depends(require_admin)])
def create_package(payload: PackageCreate) -> dict[str, Any]:
    now = utc_now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO packages
            (slug, title, location, days, price, category, image_url, tagline, description,
             rating, review_count, reviews, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.slug,
                payload.title,
                payload.location,
                payload.days,
                payload.price,
                payload.category,
                payload.image_url,
                payload.tagline,
                payload.description,
                payload.rating,
                payload.review_count,
                dumps(payload.reviews),
                1 if payload.published else 0,
                now,
                now,
            ),
        )
    return {"slug": payload.slug}


@app.get("/packages/{slug}")
def get_package(slug: str) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM packages WHERE slug = ?", (slug,)).fetchone()
    data = row_to_dict(row)
    if not data:
        raise HTTPException(status_code=404, detail="Package not found")
    return data


@app.patch("/packages/{slug}", dependencies=[Depends(require_admin)])
def update_package(slug: str, payload: PackageCreate) -> dict[str, Any]:
    now = utc_now()
    with db() as conn:
        conn.execute(
            """
            UPDATE packages SET title=?, location=?, days=?, price=?, category=?, image_url=?,
              tagline=?, description=?, rating=?, review_count=?, reviews=?, published=?, updated_at=?
            WHERE slug=?
            """,
            (
                payload.title,
                payload.location,
                payload.days,
                payload.price,
                payload.category,
                payload.image_url,
                payload.tagline,
                payload.description,
                payload.rating,
                payload.review_count,
                dumps(payload.reviews),
                1 if payload.published else 0,
                now,
                slug,
            ),
        )
    return {"slug": slug}


@app.delete("/packages/{slug}", dependencies=[Depends(require_admin)])
def delete_package(slug: str) -> dict[str, str]:
    with db() as conn:
        conn.execute("DELETE FROM packages WHERE slug = ?", (slug,))
    return {"deleted": slug}


@app.get("/destinations")
def list_destinations() -> list[dict[str, Any]]:
    with db() as conn:
        return [row_to_dict(row) for row in conn.execute("SELECT * FROM destinations ORDER BY name").fetchall()]


@app.post("/destinations", status_code=201, dependencies=[Depends(require_admin)])
def create_destination(payload: DestinationCreate) -> dict[str, Any]:
    now = utc_now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO destinations
            (slug, name, image_url, packages_count, tagline, duration, price, rating, review_count, gallery, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.slug,
                payload.name,
                payload.image_url,
                payload.packages_count,
                payload.tagline,
                payload.duration,
                payload.price,
                payload.rating,
                payload.review_count,
                dumps(payload.gallery),
                now,
                now,
            ),
        )
    return {"slug": payload.slug}


@app.patch("/destinations/{slug}", dependencies=[Depends(require_admin)])
def update_destination(slug: str, payload: DestinationCreate) -> dict[str, Any]:
    with db() as conn:
        conn.execute(
            """
            UPDATE destinations SET name=?, image_url=?, packages_count=?, tagline=?, duration=?,
              price=?, rating=?, review_count=?, gallery=?, updated_at=?
            WHERE slug=?
            """,
            (
                payload.name,
                payload.image_url,
                payload.packages_count,
                payload.tagline,
                payload.duration,
                payload.price,
                payload.rating,
                payload.review_count,
                dumps(payload.gallery),
                utc_now(),
                slug,
            ),
        )
    return {"slug": slug}


@app.delete("/destinations/{slug}", dependencies=[Depends(require_admin)])
def delete_destination(slug: str) -> dict[str, str]:
    with db() as conn:
        conn.execute("DELETE FROM destinations WHERE slug = ?", (slug,))
    return {"deleted": slug}


@app.get("/admin/stats", dependencies=[Depends(require_admin)])
def admin_stats() -> dict[str, Any]:
    with db() as conn:
        active_leads = conn.execute("SELECT COUNT(*) FROM inquiries WHERE status NOT IN ('Won', 'Lost')").fetchone()[0]
        customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        won = conn.execute("SELECT COUNT(*) FROM inquiries WHERE status = 'Won'").fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0]
    conversion = round((won / total) * 100) if total else 0
    return {
        "active_leads": active_leads,
        "customers": customers,
        "revenue_mtd": 0,
        "conversion": conversion,
    }


@app.get("/admin/inquiries", dependencies=[Depends(require_admin)])
def admin_inquiries(search: str | None = None) -> list[dict[str, Any]]:
    with db() as conn:
        base = """
            SELECT i.*, p.name as planner_name FROM inquiries i
            LEFT JOIN planners p ON p.id = i.assigned_planner_id
        """
        params: tuple[Any, ...] = ()
        if search:
            base += " WHERE i.full_name LIKE ? OR i.email LIKE ? OR i.public_id LIKE ?"
            needle = f"%{search}%"
            params = (needle, needle, needle)
        base += " ORDER BY i.created_at DESC"
        return [row_to_dict(row) for row in conn.execute(base, params).fetchall()]


@app.patch("/admin/inquiries/{public_id}", dependencies=[Depends(require_admin)])
def admin_update_inquiry(public_id: str, payload: InquiryUpdate) -> dict[str, Any]:
    with db() as conn:
        existing = conn.execute("SELECT * FROM inquiries WHERE public_id = ?", (public_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        status = payload.status or existing["status"]
        planner_id = payload.assigned_planner_id if payload.assigned_planner_id is not None else existing["assigned_planner_id"]
        conn.execute(
            "UPDATE inquiries SET status = ?, assigned_planner_id = ?, updated_at = ? WHERE public_id = ?",
            (status, planner_id, utc_now(), public_id),
        )
    return {"id": public_id, "status": status, "assigned_planner_id": planner_id}


@app.get("/admin/inquiries.csv", dependencies=[Depends(require_admin)])
def export_inquiries_csv() -> StreamingResponse:
    rows = admin_inquiries()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["public_id", "full_name", "email", "budget", "status", "created_at"])
    writer.writeheader()
    for row in rows:
        writer.writerow({key: row.get(key) for key in writer.fieldnames})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inquiries.csv"},
    )


@app.post("/admin/import/{kind}", dependencies=[Depends(require_admin)])
async def import_csv(kind: str, file: UploadFile = File(...)) -> dict[str, Any]:
    if kind not in {"packages", "destinations"}:
        raise HTTPException(status_code=400, detail="kind must be packages or destinations")
    content = (await file.read()).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(content)))
    created = 0
    for row in rows:
        if kind == "packages":
            create_package(PackageCreate(**row))
        else:
            create_destination(DestinationCreate(**row))
        created += 1
    return {"imported": created}


@app.get("/dashboard")
def customer_dashboard(auth_user: dict[str, Any] | None = Depends(require_customer)) -> dict[str, Any]:
    if auth_user is None:
        with db() as conn:
            customer = conn.execute("SELECT * FROM customers ORDER BY id LIMIT 1").fetchone()
    else:
        customer_id = get_customer_id(auth_user)
        with db() as conn:
            customer = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer_id = customer["id"]
    with db() as conn:
        inquiries = [row_to_dict(row) for row in conn.execute(
            "SELECT * FROM inquiries WHERE customer_id = ? OR email = ? ORDER BY created_at DESC",
            (customer_id, customer["email"]),
        ).fetchall()]
        wishlist = [row_to_dict(row) for row in conn.execute(
            """
            SELECT p.* FROM wishlists w
            JOIN packages p ON p.slug = w.package_slug
            WHERE w.customer_id = ?
            ORDER BY w.created_at DESC
            """,
            (customer_id,),
        ).fetchall()]
        reviews = [row_to_dict(row) for row in conn.execute(
            """
            SELECT r.*, p.title as package_title FROM reviews r
            LEFT JOIN packages p ON p.slug = r.package_slug
            WHERE r.customer_id = ?
            ORDER BY r.created_at DESC
            """,
            (customer_id,),
        ).fetchall()]
        memories = [row_to_dict(row) for row in conn.execute(
            "SELECT * FROM memories WHERE customer_id = ? ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()]
    return {
        "customer": dict(customer),
        "inquiries": inquiries,
        "wishlist": wishlist,
        "reviews": reviews,
        "memories": memories,
    }


@app.post("/wishlist")
def add_wishlist(
    payload: WishlistCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, str]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    if not customer_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    with db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO wishlists (customer_id, package_slug, created_at) VALUES (?, ?, ?)",
            (customer_id, payload.package_slug, utc_now()),
        )
    return {"saved": payload.package_slug}


@app.delete("/wishlist/{package_slug}")
def remove_wishlist(
    package_slug: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, str]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    if customer_id:
        with db() as conn:
            conn.execute(
                "DELETE FROM wishlists WHERE customer_id = ? AND package_slug = ?",
                (customer_id, package_slug),
            )
    return {"removed": package_slug}


@app.post("/media", dependencies=[Depends(require_admin)])
async def upload_media(file: UploadFile = File(...), alt_text: str | None = None) -> dict[str, Any]:
    upload_dir = Path("backend/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / file.filename
    with target.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO media (filename, url, content_type, size_bytes, alt_text, owner_type, created_at)
            VALUES (?, ?, ?, ?, ?, 'admin', ?)
            """,
            (
                file.filename,
                f"/uploads/{file.filename}",
                file.content_type,
                target.stat().st_size,
                alt_text,
                utc_now(),
            ),
        )
    return {"id": cur.lastrowid, "url": f"/uploads/{file.filename}"}


# ── User media upload ────────────────────────────────────────────────────────

import uuid as _uuid


def _save_upload(file: UploadFile) -> tuple[str, str, int]:
    """Write upload to disk with a unique filename; return (filename, url, size)."""
    suffix = Path(file.filename or "upload").suffix
    unique_name = f"{_uuid.uuid4().hex}{suffix}"
    upload_dir = Path("backend/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / unique_name
    with target.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return unique_name, f"/uploads/{unique_name}", target.stat().st_size


@app.post("/user/media", status_code=201)
async def upload_user_media(
    file: UploadFile = File(...),
    alt_text: str | None = None,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, Any]:
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    customer_id: int | None = None
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    filename, url, size = _save_upload(file)
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO media (filename, url, content_type, size_bytes, alt_text, owner_type, owner_id, created_at)
            VALUES (?, ?, ?, ?, ?, 'customer', ?, ?)
            """,
            (filename, url, file.content_type, size, alt_text, customer_id, utc_now()),
        )
    return {"id": cur.lastrowid, "url": url}


# ── Reviews ──────────────────────────────────────────────────────────────────

@app.get("/packages/{slug}/reviews")
def list_package_reviews(slug: str) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT r.*, c.name as customer_name FROM reviews r
            JOIN customers c ON c.id = r.customer_id
            WHERE r.package_slug = ? AND r.status = 'approved'
            ORDER BY r.created_at DESC
            """,
            (slug,),
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.post("/packages/{slug}/reviews", status_code=201)
def submit_review(
    slug: str,
    payload: ReviewCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, Any]:
    with db() as conn:
        pkg = conn.execute("SELECT slug FROM packages WHERE slug = ?", (slug,)).fetchone()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    if not customer_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    public_id = next_public_id("REV", "reviews")
    now = utc_now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO reviews (public_id, customer_id, package_slug, rating, body, media_urls, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (public_id, customer_id, slug, payload.rating, payload.body, dumps(payload.media_urls), now, now),
        )
        row = conn.execute(
            "SELECT AVG(CAST(rating AS REAL)), COUNT(*) FROM reviews WHERE package_slug = ? AND status = 'approved'",
            (slug,),
        ).fetchone()
        new_rating = round(row[0] or 0, 1)
        new_count = int(row[1])
        conn.execute(
            "UPDATE packages SET rating = ?, review_count = ?, updated_at = ? WHERE slug = ?",
            (new_rating, new_count, now, slug),
        )
    return {"id": public_id, "status": "approved"}


@app.delete("/reviews/{public_id}")
def delete_review(
    public_id: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, str]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    with db() as conn:
        review = conn.execute("SELECT * FROM reviews WHERE public_id = ?", (public_id,)).fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if review["customer_id"] != customer_id:
            raise HTTPException(status_code=403, detail="Not your review")
        slug = review["package_slug"]
        conn.execute("DELETE FROM reviews WHERE public_id = ?", (public_id,))
        row = conn.execute(
            "SELECT AVG(CAST(rating AS REAL)), COUNT(*) FROM reviews WHERE package_slug = ? AND status = 'approved'",
            (slug,),
        ).fetchone()
        new_rating = round(row[0] or 0, 1)
        new_count = int(row[1])
        conn.execute(
            "UPDATE packages SET rating = ?, review_count = ?, updated_at = ? WHERE slug = ?",
            (new_rating, new_count, utc_now(), slug),
        )
    return {"deleted": public_id}


# ── Memories ─────────────────────────────────────────────────────────────────

@app.get("/memories")
def list_public_memories() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT m.*, c.name as customer_name FROM memories m
            JOIN customers c ON c.id = m.customer_id
            WHERE m.is_public = 1 AND m.status = 'published'
            ORDER BY m.created_at DESC
            LIMIT 50
            """,
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.get("/user/memories")
def list_user_memories(auth_user: dict[str, Any] | None = Depends(require_customer)) -> list[dict[str, Any]]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    if not customer_id:
        return []
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM memories WHERE customer_id = ? ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()
    return [row_to_dict(row) for row in rows]


@app.post("/user/memories", status_code=201)
def create_memory(
    payload: MemoryCreate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, Any]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    if not customer_id:
        raise HTTPException(status_code=404, detail="Customer not found")
    public_id = next_public_id("MEM", "memories")
    now = utc_now()
    with db() as conn:
        conn.execute(
            """
            INSERT INTO memories
            (public_id, customer_id, title, description, destination, travel_date_from, travel_date_to,
             is_public, status, media_urls, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
            """,
            (
                public_id,
                customer_id,
                payload.title,
                payload.description,
                payload.destination,
                payload.travel_date_from,
                payload.travel_date_to,
                1 if payload.is_public else 0,
                dumps(payload.media_urls),
                now,
                now,
            ),
        )
    return {"id": public_id, "status": "published"}


@app.patch("/user/memories/{public_id}")
def update_memory(
    public_id: str,
    payload: MemoryUpdate,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, Any]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    with db() as conn:
        mem = conn.execute("SELECT * FROM memories WHERE public_id = ?", (public_id,)).fetchone()
        if not mem:
            raise HTTPException(status_code=404, detail="Memory not found")
        if mem["customer_id"] != customer_id:
            raise HTTPException(status_code=403, detail="Not your memory")
        updated = {
            "title": payload.title if payload.title is not None else mem["title"],
            "description": payload.description if payload.description is not None else mem["description"],
            "destination": payload.destination if payload.destination is not None else mem["destination"],
            "travel_date_from": payload.travel_date_from if payload.travel_date_from is not None else mem["travel_date_from"],
            "travel_date_to": payload.travel_date_to if payload.travel_date_to is not None else mem["travel_date_to"],
            "is_public": (1 if payload.is_public else 0) if payload.is_public is not None else mem["is_public"],
            "media_urls": dumps(payload.media_urls) if payload.media_urls is not None else mem["media_urls"],
        }
        conn.execute(
            """
            UPDATE memories SET title=?, description=?, destination=?, travel_date_from=?,
              travel_date_to=?, is_public=?, media_urls=?, updated_at=?
            WHERE public_id=?
            """,
            (*updated.values(), utc_now(), public_id),
        )
    return {"id": public_id}


@app.delete("/user/memories/{public_id}")
def delete_memory(
    public_id: str,
    auth_user: dict[str, Any] | None = Depends(require_customer),
) -> dict[str, str]:
    if auth_user is None:
        with db() as conn:
            row = conn.execute("SELECT id FROM customers ORDER BY id LIMIT 1").fetchone()
            customer_id = row["id"] if row else None
    else:
        customer_id = get_customer_id(auth_user)
    with db() as conn:
        mem = conn.execute("SELECT * FROM memories WHERE public_id = ?", (public_id,)).fetchone()
        if not mem:
            raise HTTPException(status_code=404, detail="Memory not found")
        if mem["customer_id"] != customer_id:
            raise HTTPException(status_code=403, detail="Not your memory")
        conn.execute("DELETE FROM memories WHERE public_id = ?", (public_id,))
    return {"deleted": public_id}


# ── Admin: Media management ───────────────────────────────────────────────────

@app.get("/admin/media", dependencies=[Depends(require_admin)])
def admin_list_media(page: int = 1, per_page: int = 20) -> dict[str, Any]:
    offset = (page - 1) * per_page
    with db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM media").fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (per_page, offset),
        ).fetchall()
    return {
        "items": [row_to_dict(row) for row in rows],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // per_page)),
    }


@app.patch("/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_update_media(media_id: int, payload: MediaUpdate) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Media not found")
        new_alt = payload.alt_text if payload.alt_text is not None else row["alt_text"]
        new_owner_type = payload.owner_type if payload.owner_type is not None else row["owner_type"]
        new_owner_slug = payload.owner_slug if payload.owner_slug is not None else row["owner_slug"]
        conn.execute(
            "UPDATE media SET alt_text=?, owner_type=?, owner_slug=? WHERE id=?",
            (new_alt, new_owner_type, new_owner_slug, media_id),
        )
    return {"id": media_id}


@app.delete("/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_delete_media(media_id: int) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Media not found")
        filename = row["filename"]
        conn.execute("DELETE FROM media WHERE id = ?", (media_id,))
    target = Path("backend/uploads") / filename
    if target.exists():
        target.unlink(missing_ok=True)
    return {"deleted": media_id}


# ── Admin: Review moderation ──────────────────────────────────────────────────

def _recalc_package_rating(conn: Any, slug: str) -> None:
    row = conn.execute(
        "SELECT AVG(CAST(rating AS REAL)), COUNT(*) FROM reviews WHERE package_slug = ? AND status = 'approved'",
        (slug,),
    ).fetchone()
    conn.execute(
        "UPDATE packages SET rating = ?, review_count = ?, updated_at = ? WHERE slug = ?",
        (round(row[0] or 0, 1), int(row[1]), utc_now(), slug),
    )


@app.get("/admin/reviews", dependencies=[Depends(require_admin)])
def admin_list_reviews(status: str | None = None) -> list[dict[str, Any]]:
    with db() as conn:
        query = """
            SELECT r.*, c.name as customer_name, p.title as package_title
            FROM reviews r
            JOIN customers c ON c.id = r.customer_id
            LEFT JOIN packages p ON p.slug = r.package_slug
        """
        params: tuple[Any, ...] = ()
        if status:
            query += " WHERE r.status = ?"
            params = (status,)
        query += " ORDER BY r.created_at DESC"
        return [row_to_dict(row) for row in conn.execute(query, params).fetchall()]


@app.patch("/admin/reviews/{public_id}", dependencies=[Depends(require_admin)])
def admin_update_review(public_id: str, payload: ReviewAdminUpdate) -> dict[str, Any]:
    with db() as conn:
        review = conn.execute("SELECT * FROM reviews WHERE public_id = ?", (public_id,)).fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        new_status = payload.status if payload.status is not None else review["status"]
        new_body = payload.body if payload.body is not None else review["body"]
        new_flag = payload.flag_reason if payload.flag_reason is not None else review.get("flag_reason")
        now = utc_now()
        conn.execute(
            "UPDATE reviews SET status=?, body=?, flag_reason=?, updated_at=? WHERE public_id=?",
            (new_status, new_body, new_flag, now, public_id),
        )
        _recalc_package_rating(conn, review["package_slug"])
    return {"id": public_id, "status": new_status}


@app.delete("/admin/reviews/{public_id}", dependencies=[Depends(require_admin)])
def admin_delete_review(public_id: str) -> dict[str, str]:
    with db() as conn:
        review = conn.execute("SELECT * FROM reviews WHERE public_id = ?", (public_id,)).fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        slug = review["package_slug"]
        conn.execute("DELETE FROM reviews WHERE public_id = ?", (public_id,))
        _recalc_package_rating(conn, slug)
    return {"deleted": public_id}


@app.post("/admin/reviews/bulk", dependencies=[Depends(require_admin)])
def admin_bulk_reviews(payload: ReviewBulkAction) -> dict[str, Any]:
    new_status = "approved" if payload.action == "approve" else "rejected"
    now = utc_now()
    slugs_to_recalc: set[str] = set()
    with db() as conn:
        for pid in payload.public_ids:
            row = conn.execute("SELECT package_slug FROM reviews WHERE public_id = ?", (pid,)).fetchone()
            if row:
                conn.execute(
                    "UPDATE reviews SET status=?, updated_at=? WHERE public_id=?",
                    (new_status, now, pid),
                )
                slugs_to_recalc.add(row["package_slug"])
        for slug in slugs_to_recalc:
            _recalc_package_rating(conn, slug)
    return {"updated": len(payload.public_ids), "status": new_status}


# ── Admin: Planner management ─────────────────────────────────────────────────

@app.get("/planners")
def list_planners() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM planners ORDER BY name").fetchall()
    return [dict(row) for row in rows]


@app.post("/planners", status_code=201, dependencies=[Depends(require_admin)])
def create_planner(payload: PlannerCreate) -> dict[str, Any]:
    now = utc_now()
    with db() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO planners (name, email, specialty, photo_url, created_at) VALUES (?, ?, ?, ?, ?)",
                (payload.name, payload.email, payload.specialty, payload.photo_url, now),
            )
        except Exception:
            raise HTTPException(status_code=409, detail="Email already in use")
    return {"id": cur.lastrowid, "name": payload.name}


@app.patch("/planners/{planner_id}", dependencies=[Depends(require_admin)])
def update_planner(planner_id: int, payload: PlannerCreate) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT id FROM planners WHERE id = ?", (planner_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Planner not found")
        conn.execute(
            "UPDATE planners SET name=?, email=?, specialty=?, photo_url=? WHERE id=?",
            (payload.name, payload.email, payload.specialty, payload.photo_url, planner_id),
        )
    return {"id": planner_id}


@app.delete("/planners/{planner_id}", dependencies=[Depends(require_admin)])
def delete_planner(planner_id: int) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT id FROM planners WHERE id = ?", (planner_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Planner not found")
        conn.execute("UPDATE inquiries SET assigned_planner_id = NULL WHERE assigned_planner_id = ?", (planner_id,))
        conn.execute("DELETE FROM planners WHERE id = ?", (planner_id,))
    return {"deleted": planner_id}


# ── Authentication endpoints ──────────────────────────────────────────────────

@app.post("/auth/signup", status_code=201)
def auth_signup(payload: AuthSignup) -> dict[str, Any]:
    with db() as conn:
        existing = conn.execute("SELECT id FROM customers WHERE email = ?", (payload.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        cur = conn.execute(
            "INSERT INTO customers (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'user', ?)",
            (payload.name, payload.email, hash_password(payload.password), utc_now()),
        )
        customer_id = int(cur.lastrowid)
    token = create_local_token(
        customer_id=customer_id, email=payload.email, name=payload.name, role="user"
    )
    return {"token": token, "role": "user", "name": payload.name}


@app.post("/auth/login")
def auth_login(payload: AuthLogin) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash, role FROM customers WHERE email = ?",
            (payload.email,),
        ).fetchone()
    if not row or not row["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    role = row["role"] or "user"
    token = create_local_token(
        customer_id=row["id"], email=row["email"], name=row["name"], role=role
    )
    return {"token": token, "role": role, "name": row["name"]}


@app.get("/auth/me")
def auth_me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("iss") == LOCAL_ISS:
        return {
            "id": user["sub"],
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
        }
    customer_id = get_or_create_customer_by_sub(user)
    with db() as conn:
        row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "id": str(row["id"]),
        "email": row["email"] or "",
        "name": row["name"] or "",
        "role": row["role"] or "user",
    }
