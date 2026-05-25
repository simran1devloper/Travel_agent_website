"""SQLite implementation of IServiceRepository."""
from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps, json_loads, utc_now
from .....ports.repositories import IServiceRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteServiceRepository(IServiceRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM services ORDER BY sort_order ASC, id ASC"
            ).fetchall()
            return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_id(self, service_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM services WHERE id = ?", (service_id,)
            ).fetchone()
            return row_to_dict(row) if row else None

    def upsert(self, data: dict[str, Any]) -> None:
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute(
                """INSERT INTO services (id, name, description, rating, review_count, highlight, gallery, sort_order, created_at, updated_at)
                   VALUES (:id, :name, :description, :rating, :review_count, :highlight, :gallery, :sort_order, :created_at, :updated_at)
                   ON CONFLICT(id) DO UPDATE SET
                     name=excluded.name,
                     description=excluded.description,
                     rating=excluded.rating,
                     review_count=excluded.review_count,
                     highlight=excluded.highlight,
                     gallery=excluded.gallery,
                     sort_order=excluded.sort_order,
                     updated_at=excluded.updated_at""",
                {
                    "id": data["id"],
                    "name": data["name"],
                    "description": data.get("description", ""),
                    "rating": data.get("rating", 5.0),
                    "review_count": data.get("review_count", 0),
                    "highlight": data.get("highlight", ""),
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
        for key in ("name", "description", "rating", "review_count", "highlight", "sort_order"):
            if key in data and data[key] is not None:
                fields.append(f"{key} = ?")
                params.append(data[key])
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
