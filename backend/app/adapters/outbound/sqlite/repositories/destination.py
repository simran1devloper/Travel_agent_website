from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IDestinationRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteDestinationRepository(IDestinationRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM destinations ORDER BY name"
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO destinations
                (slug, name, image_url, packages_count, tagline, duration,
                 price, rating, review_count, gallery, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["slug"], data["name"], data.get("image_url"),
                    data.get("packages_count", 0), data.get("tagline"),
                    data.get("duration"), data.get("price"), data.get("rating"),
                    data.get("review_count", 0), json_dumps(data.get("gallery", [])),
                    data["created_at"], data["updated_at"],
                ),
            )

    def update(self, slug: str, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                UPDATE destinations
                SET name=?, image_url=?, packages_count=?, tagline=?, duration=?,
                    price=?, rating=?, review_count=?, gallery=?, updated_at=?
                WHERE slug=?
                """,
                (
                    data["name"], data.get("image_url"), data.get("packages_count", 0),
                    data.get("tagline"), data.get("duration"), data.get("price"),
                    data.get("rating"), data.get("review_count", 0),
                    json_dumps(data.get("gallery", [])), data["updated_at"], slug,
                ),
            )

    def delete(self, slug: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM destinations WHERE slug = ?", (slug,))

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM destinations").fetchone()[0])
