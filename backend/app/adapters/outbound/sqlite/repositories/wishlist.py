from __future__ import annotations

from typing import Any

from .....ports.repositories import IWishlistRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteWishlistRepository(IWishlistRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def add(self, customer_id: int, package_slug: str, created_at: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO wishlists (customer_id, package_slug, created_at)"
                " VALUES (?, ?, ?)",
                (customer_id, package_slug, created_at),
            )

    def remove(self, customer_id: int, package_slug: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "DELETE FROM wishlists WHERE customer_id = ? AND package_slug = ?",
                (customer_id, package_slug),
            )

    def list_packages_by_customer(
        self, customer_id: int
    ) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT p.* FROM wishlists w
                JOIN packages p ON p.slug = w.package_slug
                WHERE w.customer_id = ?
                ORDER BY w.created_at DESC
                """,
                (customer_id,),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]
