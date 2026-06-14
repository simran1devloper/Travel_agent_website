from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IPackageRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLitePackageRepository(IPackageRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self, include_unpublished: bool = False) -> list[dict[str, Any]]:
        query = "SELECT * FROM packages"
        if not include_unpublished:
            query += " WHERE published = 1"
        query += " ORDER BY created_at DESC"
        with self._db.connect() as conn:
            rows = conn.execute(query).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_slug(self, slug: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM packages WHERE slug = ?", (slug,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO packages
                (slug, title, location, days, price, category, image_url, tagline,
                 description, rating, review_count, reviews, published,
                 card_type, destination_slugs, service_ids, offer_ids, media_urls,
                 created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["slug"], data["title"], data["location"], data["days"],
                    data["price"], data.get("category"), data.get("image_url"),
                    data.get("tagline"), data.get("description"), data.get("rating"),
                    data.get("review_count", 0), json_dumps(data.get("reviews", [])),
                    1 if data.get("published", True) else 0,
                    data.get("card_type", "normal"),
                    json_dumps(data.get("destination_slugs", [])),
                    json_dumps(data.get("service_ids", [])),
                    json_dumps(data.get("offer_ids", [])),
                    json_dumps(data.get("media_urls", [])),
                    data["created_at"], data["updated_at"],
                ),
            )

    def update(self, slug: str, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                UPDATE packages
                SET title=?, location=?, days=?, price=?, category=?, image_url=?,
                    tagline=?, description=?, rating=?, review_count=?, reviews=?,
                    published=?, card_type=?, destination_slugs=?, service_ids=?,
                    offer_ids=?, media_urls=?, updated_at=?
                WHERE slug=?
                """,
                (
                    data["title"], data["location"], data["days"], data["price"],
                    data.get("category"), data.get("image_url"), data.get("tagline"),
                    data.get("description"), data.get("rating"),
                    data.get("review_count", 0), json_dumps(data.get("reviews", [])),
                    1 if data.get("published", True) else 0,
                    data.get("card_type", "normal"),
                    json_dumps(data.get("destination_slugs", [])),
                    json_dumps(data.get("service_ids", [])),
                    json_dumps(data.get("offer_ids", [])),
                    json_dumps(data.get("media_urls", [])),
                    data["updated_at"], slug,
                ),
            )

    def delete(self, slug: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM packages WHERE slug = ?", (slug,))

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM packages").fetchone()[0])

    def update_rating(
        self, slug: str, rating: float, review_count: int, updated_at: str
    ) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE packages SET rating=?, review_count=?, updated_at=? WHERE slug=?",
                (rating, review_count, updated_at, slug),
            )
