"""Bulk import / export router.

Public endpoints:
  GET /admin/templates/{kind}.csv  — CSV template with headers + sample row (no auth)

Admin endpoints:
  GET /admin/export/{kind}.csv     — export all rows for an entity type
  POST /admin/import/{kind}        — import CSV rows, returns {imported, errors}

Supported kinds: packages, destinations, planners, services, faqs, testimonials
"""
from __future__ import annotations

import csv
import io
import json
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ....domain.exceptions import NotFoundError
from ....application.destination_service import DestinationService
from ....application.faq_service import FaqService
from ....application.package_service import PackageService
from ....application.planner_service import PlannerService
from ....application.service_service import ServiceService
from ....application.testimonial_service import TestimonialService
from ....models import (
    BulkDeleteRequest,
    DestinationCreate,
    FaqCreate,
    PackageCreate,
    PlannerCreate,
    ServiceCreate,
    TestimonialCreate,
)
from ..auth_adapter import require_admin
from ..dependencies import (
    get_destination_service,
    get_faq_service,
    get_package_service,
    get_planner_service,
    get_service_service,
    get_testimonial_service,
)

router = APIRouter(tags=["bulk"])

# ---------------------------------------------------------------------------
# Template definitions
# Each entry: (field_names, sample_values)
# ---------------------------------------------------------------------------

_TEMPLATES: dict[str, tuple[list[str], list[str]]] = {
    "packages": (
        [
            "slug", "title", "location", "days", "price",
            "category", "image_url", "tagline", "description",
            "rating", "review_count", "published",
        ],
        [
            "bali-escape", "Bali Escape", "Bali", "5", "49999",
            "Honeymoon", "https://example.com/bali.jpg",
            "Tropical paradise awaits", "A beautiful 5-day Bali journey.",
            "4.9", "120", "true",
        ],
    ),
    "destinations": (
        [
            "slug", "name", "image_url", "packages_count",
            "tagline", "duration", "price", "rating", "review_count",
        ],
        [
            "bali", "Bali", "https://example.com/bali.jpg", "14",
            "Tropical renewal", "5–10 days", "35000", "4.9", "240",
        ],
    ),
    "planners": (
        ["name", "email", "specialty", "photo_url"],
        [
            "Sophia Chen", "sophia@journeymakers.com",
            "Luxury Asia", "https://example.com/sophia.jpg",
        ],
    ),
    "services": (
        [
            "id", "name", "description", "rating",
            "review_count", "highlight", "sort_order",
        ],
        [
            "visa-assistance", "Visa Guidance & Partner Assistance",
            "Document checklist guidance and trusted third-party partner assistance when needed.",
            "4.8", "320", "Clear guidance without approval guarantees.", "1",
        ],
    ),
    "faqs": (
        ["question", "answer", "sort_order"],
        [
            "How far in advance should I book?",
            "We recommend booking 3–6 months ahead for peak-season travel.",
            "1",
        ],
    ),
    "testimonials": (
        ["name", "role", "quote", "location", "sort_order"],
        [
            "Priya Sharma", "Honeymooner · Bali",
            "Absolutely magical — every detail was perfect.",
            "Mumbai, India", "1",
        ],
    ),
}

SUPPORTED_KINDS = list(_TEMPLATES.keys())


def _decode_csv_upload(content: bytes) -> str:
    """Decode CSV uploads from common spreadsheet encodings.

    Excel and browser downloads can produce CSV files in UTF-8, UTF-8 with BOM,
    UTF-16, or Windows-1252. Windows-1252 is especially common when smart quotes
    are present, and strict UTF-8 decoding turns those files into 500 errors.
    """
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeError:
            continue

    raise HTTPException(
        status_code=400,
        detail="Could not decode CSV. Please upload a UTF-8, UTF-16, or Windows CSV file.",
    )


def _package_exists(svc: PackageService, slug: str) -> bool:
    try:
        svc.get_by_slug(slug)
        return True
    except NotFoundError:
        return False


# ---------------------------------------------------------------------------
# Template download — PUBLIC (no auth required)
# ---------------------------------------------------------------------------

@router.get("/admin/templates/{kind}.csv")
def download_template(kind: str) -> StreamingResponse:
    """Return a CSV template with headers and one sample row.

    Intentionally public so the admin UI can link to it directly without
    needing to attach authentication headers.
    """
    if kind not in _TEMPLATES:
        raise HTTPException(
            status_code=404,
            detail=f"No template for kind '{kind}'. Supported: {', '.join(SUPPORTED_KINDS)}",
        )

    field_names, sample = _TEMPLATES[kind]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(field_names)
    writer.writerow(sample)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={kind}_template.csv"},
    )


# ---------------------------------------------------------------------------
# Export — ADMIN
# ---------------------------------------------------------------------------

@router.get("/admin/export/{kind}.csv", dependencies=[Depends(require_admin)])
def export_csv(
    kind: str,
    pkg_svc: PackageService = Depends(get_package_service),
    dest_svc: DestinationService = Depends(get_destination_service),
    planner_svc: PlannerService = Depends(get_planner_service),
    service_svc: ServiceService = Depends(get_service_service),
    faq_svc: FaqService = Depends(get_faq_service),
    testimonial_svc: TestimonialService = Depends(get_testimonial_service),
) -> StreamingResponse:
    """Export all rows for a given entity type as a downloadable CSV."""
    if kind not in _TEMPLATES:
        raise HTTPException(
            status_code=404,
            detail=f"No exporter for kind '{kind}'. Supported: {', '.join(SUPPORTED_KINDS)}",
        )

    field_names, _ = _TEMPLATES[kind]

    match kind:
        case "packages":
            rows: list[dict[str, Any]] = pkg_svc.list_all(include_unpublished=True)
        case "destinations":
            rows = dest_svc.list_all()
        case "planners":
            rows = planner_svc.list_all()
        case "services":
            rows = service_svc.list_all()
        case "faqs":
            rows = faq_svc.list_all()
        case "testimonials":
            rows = testimonial_svc.list_all()
        case _:
            rows = []

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=field_names, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        flat: dict[str, Any] = {}
        for k in field_names:
            v = row.get(k)
            if isinstance(v, (list, dict)):
                flat[k] = json.dumps(v)
            elif v is None:
                flat[k] = ""
            else:
                flat[k] = v
        writer.writerow(flat)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={kind}_export.csv"},
    )


# ---------------------------------------------------------------------------
# Type coercion helpers
# ---------------------------------------------------------------------------

_INT_FIELDS: dict[str, set[str]] = {
    "packages": {"days", "review_count"},
    "destinations": {"packages_count", "review_count"},
    "services": {"review_count", "sort_order"},
    "faqs": {"sort_order"},
    "testimonials": {"sort_order"},
    "planners": set(),
}
_FLOAT_FIELDS: dict[str, set[str]] = {
    "packages": {"price", "rating"},
    "destinations": {"price", "rating"},
    "services": {"rating"},
    "faqs": set(),
    "testimonials": set(),
    "planners": set(),
}
_BOOL_FIELDS: dict[str, set[str]] = {
    "packages": {"published"},
    "destinations": set(),
    "services": set(),
    "faqs": set(),
    "testimonials": set(),
    "planners": set(),
}
_OPTIONAL_FIELDS: dict[str, set[str]] = {
    "packages": {"image_url", "tagline", "description", "rating", "category"},
    "destinations": {"image_url", "tagline", "duration", "price", "rating"},
    "services": set(),
    "faqs": set(),
    "testimonials": set(),
    "planners": {"specialty", "photo_url"},
}


def _coerce(raw: dict[str, str], kind: str) -> dict[str, Any]:
    """Convert all CSV string values to their correct Python types for *kind*."""
    result: dict[str, Any] = {}

    for k, v in raw.items():
        v = v.strip()

        if k in _INT_FIELDS.get(kind, set()):
            result[k] = int(v) if v else 0

        elif k in _FLOAT_FIELDS.get(kind, set()):
            if v:
                result[k] = float(v)
            elif k in _OPTIONAL_FIELDS.get(kind, set()):
                result[k] = None  # optional → omit means None
            else:
                result[k] = 0.0

        elif k in _BOOL_FIELDS.get(kind, set()):
            result[k] = v.lower() in ("1", "true", "yes", "y")

        elif not v and k in _OPTIONAL_FIELDS.get(kind, set()):
            result[k] = None  # leave optional fields as None when blank

        else:
            result[k] = v

    return result


# ---------------------------------------------------------------------------
# Import — ADMIN
# ---------------------------------------------------------------------------

@router.post("/admin/import/{kind}", dependencies=[Depends(require_admin)])
async def import_csv(
    kind: str,
    conflict: str = "skip",
    file: UploadFile = File(...),
    pkg_svc: PackageService = Depends(get_package_service),
    dest_svc: DestinationService = Depends(get_destination_service),
    planner_svc: PlannerService = Depends(get_planner_service),
    service_svc: ServiceService = Depends(get_service_service),
    faq_svc: FaqService = Depends(get_faq_service),
    testimonial_svc: TestimonialService = Depends(get_testimonial_service),
) -> dict[str, Any]:
    """Import entities from an uploaded CSV file.

    Returns:
        {"imported": <int>, "errors": [{"row": <int>, "message": <str>}, ...]}

    Rows that fail validation are skipped and reported in *errors*; valid rows
    are always committed even when some rows fail.
    """
    if kind not in _TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported kind '{kind}'. Must be one of: {', '.join(SUPPORTED_KINDS)}",
        )
    if conflict not in {"skip", "update"}:
        raise HTTPException(status_code=400, detail="conflict must be 'skip' or 'update'.")

    raw_content = _decode_csv_upload(await file.read())
    reader = csv.DictReader(io.StringIO(raw_content))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV is empty or missing a header row.")

    expected_fields, _ = _TEMPLATES[kind]
    headers = {field.strip() for field in reader.fieldnames if field and field.strip()}
    missing_headers = [field for field in expected_fields if field not in headers]
    if missing_headers:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(missing_headers)}",
        )

    raw_rows = list(reader)

    imported = 0
    updated = 0
    skipped = 0
    errors: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    destination_slugs = {row["slug"] for row in dest_svc.list_all()}

    for i, raw_row in enumerate(raw_rows, start=2):  # row 2 = first data row (1 = header)
        # Strip whitespace from keys and values; drop empty-key columns
        clean = {k.strip(): v.strip() for k, v in raw_row.items() if k and k.strip()}

        try:
            coerced = _coerce(clean, kind)

            match kind:
                case "packages":
                    payload = PackageCreate(**coerced)
                    exists = _package_exists(pkg_svc, payload.slug)
                    if exists and conflict == "update":
                        pkg_svc.update(payload.slug, payload)
                        updated += 1
                    elif exists:
                        skipped += 1
                        conflicts.append(
                            {
                                "row": i,
                                "id": payload.slug,
                                "message": "Package slug already exists; skipped.",
                            }
                        )
                    else:
                        pkg_svc.create(payload)
                        imported += 1
                case "destinations":
                    payload = DestinationCreate(**coerced)
                    exists = payload.slug in destination_slugs
                    if exists and conflict == "update":
                        dest_svc.update(payload.slug, payload)
                        updated += 1
                    elif exists:
                        skipped += 1
                        conflicts.append(
                            {
                                "row": i,
                                "id": payload.slug,
                                "message": "Destination slug already exists; skipped.",
                            }
                        )
                    else:
                        dest_svc.create(payload)
                        destination_slugs.add(payload.slug)
                        imported += 1
                case "planners":
                    planner_svc.create(PlannerCreate(**coerced))
                    imported += 1
                case "services":
                    service_svc.upsert(ServiceCreate(**coerced))
                    imported += 1
                case "faqs":
                    faq_svc.create(FaqCreate(**coerced))
                    imported += 1
                case "testimonials":
                    testimonial_svc.create(TestimonialCreate(**coerced))
                    imported += 1

        except Exception as exc:  # noqa: BLE001
            errors.append({"row": i, "message": str(exc)})

    return {
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "conflicts": conflicts,
    }


# ---------------------------------------------------------------------------
# Bulk delete — ADMIN
# ---------------------------------------------------------------------------

_BULK_DELETE_KINDS = {"packages", "destinations", "planners", "services", "faqs", "testimonials"}


@router.post("/admin/bulk-delete/{kind}", dependencies=[Depends(require_admin)])
def bulk_delete(
    kind: str,
    payload: BulkDeleteRequest,
    pkg_svc: PackageService = Depends(get_package_service),
    dest_svc: DestinationService = Depends(get_destination_service),
    planner_svc: PlannerService = Depends(get_planner_service),
    service_svc: ServiceService = Depends(get_service_service),
    faq_svc: FaqService = Depends(get_faq_service),
    testimonial_svc: TestimonialService = Depends(get_testimonial_service),
) -> dict[str, Any]:
    """Delete multiple entities by ID/slug in one request.

    IDs are sent as strings; integer-keyed entities (planners, faqs,
    testimonials) have their IDs coerced to int automatically.

    Returns:
        {"deleted": <int>, "errors": [{"id": ..., "message": ...}, ...]}
    """
    if kind not in _BULK_DELETE_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported kind '{kind}'. Must be one of: {', '.join(sorted(_BULK_DELETE_KINDS))}",
        )

    deleted = 0
    errors: list[dict[str, Any]] = []

    for raw_id in payload.ids:
        try:
            match kind:
                case "packages":
                    pkg_svc.delete(raw_id)
                case "destinations":
                    dest_svc.delete(raw_id)
                case "planners":
                    planner_svc.delete(int(raw_id))
                case "services":
                    service_svc.delete(raw_id)
                case "faqs":
                    faq_svc.delete(int(raw_id))
                case "testimonials":
                    testimonial_svc.delete(int(raw_id))
            deleted += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"id": raw_id, "message": str(exc)})

    return {"deleted": deleted, "errors": errors}
