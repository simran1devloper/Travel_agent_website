"""SQLite implementation of IServiceRepository."""
from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps, json_loads, utc_now
from .....ports.repositories import IServiceRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteServiceRepository(IServiceRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def _normalize(self, row: dict[str, Any]) -> dict[str, Any]:
        for key in ("show_homepage", "show_services_page", "show_hero_card", "show_footer"):
            if key in row:
                row[key] = bool(row[key])
        return row

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM services ORDER BY sort_order ASC, id ASC"
            ).fetchall()
            return [self._normalize(row_to_dict(r)) for r in rows]  # type: ignore[misc]

    def find_by_id(self, service_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM services WHERE id = ?", (service_id,)
            ).fetchone()
            return self._normalize(row_to_dict(row)) if row else None

    def upsert(self, data: dict[str, Any]) -> None:
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute(
                """INSERT INTO services (
                     id, name, category, short_description, description, detailed_description,
                     image_url, icon_url, image_alt, rating, review_count, highlight, badge_text,
                     cta_text, cta_link, show_homepage, show_services_page, show_hero_card,
                     show_footer, status, gallery, sort_order, created_at, updated_at
                   )
                   VALUES (
                     :id, :name, :category, :short_description, :description, :detailed_description,
                     :image_url, :icon_url, :image_alt, :rating, :review_count, :highlight,
                     :badge_text, :cta_text, :cta_link, :show_homepage, :show_services_page,
                     :show_hero_card, :show_footer, :status, :gallery, :sort_order,
                     :created_at, :updated_at
                   )
                   ON CONFLICT(id) DO UPDATE SET
                     name=excluded.name,
                     category=excluded.category,
                     short_description=excluded.short_description,
                     description=excluded.description,
                     detailed_description=excluded.detailed_description,
                     image_url=excluded.image_url,
                     icon_url=excluded.icon_url,
                     image_alt=excluded.image_alt,
                     rating=excluded.rating,
                     review_count=excluded.review_count,
                     highlight=excluded.highlight,
                     badge_text=excluded.badge_text,
                     cta_text=excluded.cta_text,
                     cta_link=excluded.cta_link,
                     show_homepage=excluded.show_homepage,
                     show_services_page=excluded.show_services_page,
                     show_hero_card=excluded.show_hero_card,
                     show_footer=excluded.show_footer,
                     status=excluded.status,
                     gallery=excluded.gallery,
                     sort_order=excluded.sort_order,
                     updated_at=excluded.updated_at""",
                {
                    "id": data["id"],
                    "name": data["name"],
                    "category": data.get("category", ""),
                    "short_description": data.get("short_description", ""),
                    "description": data.get("description", ""),
                    "detailed_description": data.get("detailed_description", ""),
                    "image_url": data.get("image_url", ""),
                    "icon_url": data.get("icon_url", ""),
                    "image_alt": data.get("image_alt", ""),
                    "rating": data.get("rating", 5.0),
                    "review_count": data.get("review_count", 0),
                    "highlight": data.get("highlight", ""),
                    "badge_text": data.get("badge_text", ""),
                    "cta_text": data.get("cta_text", "Explore"),
                    "cta_link": data.get("cta_link", "/services"),
                    "show_homepage": int(bool(data.get("show_homepage", True))),
                    "show_services_page": int(bool(data.get("show_services_page", True))),
                    "show_hero_card": int(bool(data.get("show_hero_card", False))),
                    "show_footer": int(bool(data.get("show_footer", False))),
                    "status": data.get("status", "published"),
                    "gallery": json_dumps(data.get("gallery", [])),
                    "sort_order": data.get("sort_order", 0),
                    "created_at": now,
                    "updated_at": now,
                },
            )

    def update(self, service_id: str, data: dict[str, Any]) -> None:
        now = utc_now()
        fields = []
        params: list[Any] = []
        scalar_keys = (
            "name",
            "category",
            "short_description",
            "description",
            "detailed_description",
            "image_url",
            "icon_url",
            "image_alt",
            "rating",
            "review_count",
            "highlight",
            "badge_text",
            "cta_text",
            "cta_link",
            "status",
            "sort_order",
        )
        bool_keys = ("show_homepage", "show_services_page", "show_hero_card", "show_footer")
        for key in scalar_keys:
            if key in data and data[key] is not None:
                fields.append(f"{key} = ?")
                params.append(data[key])
        for key in bool_keys:
            if key in data and data[key] is not None:
                fields.append(f"{key} = ?")
                params.append(int(bool(data[key])))
        if "gallery" in data and data["gallery"] is not None:
            fields.append("gallery = ?")
            params.append(json_dumps(data["gallery"]))
        fields.append("updated_at = ?")
        params.append(now)
        params.append(service_id)
        if not fields:
            return
        with self._db.connect() as conn:
            conn.execute(
                f"UPDATE services SET {', '.join(fields)} WHERE id = ?",  # noqa: S608
                params,
            )

    def delete(self, service_id: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM services WHERE id = ?", (service_id,))
