from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IReviewRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteReviewRepository(IReviewRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_approved_by_package(self, slug: str) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT r.*, c.name as customer_name FROM reviews r
                JOIN customers c ON c.id = r.customer_id
                WHERE r.package_slug = ? AND r.status = 'approved'
                ORDER BY r.created_at DESC
                """,
                (slug,),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_all(self, status: str | None = None) -> list[dict[str, Any]]:
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
        with self._db.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_by_customer(self, customer_id: int) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT r.*, p.title as package_title FROM reviews r
                LEFT JOIN packages p ON p.slug = r.package_slug
                WHERE r.customer_id = ?
                ORDER BY r.created_at DESC
                """,
                (customer_id,),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM reviews WHERE public_id = ?", (public_id,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO reviews
                (public_id, customer_id, package_slug, rating, title, body, trip_date,
                 media_urls, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    data["public_id"], data["customer_id"], data["package_slug"],
                    data["rating"], data.get("title", ""), data["body"],
                    data.get("trip_date"),
                    json_dumps(data.get("media_urls", [])),
                    data["created_at"], data["updated_at"],
                ),
            )

    def update(
        self,
        public_id: str,
        status: str,
        body: str,
        flag_reason: str | None,
        updated_at: str,
    ) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE reviews SET status=?, body=?, flag_reason=?, updated_at=?"
                " WHERE public_id=?",
                (status, body, flag_reason, updated_at, public_id),
            )

    def delete(self, public_id: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM reviews WHERE public_id = ?", (public_id,))

    def get_rating_stats(self, slug: str) -> tuple[float, int]:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT AVG(CAST(rating AS REAL)), COUNT(*)"
                " FROM reviews WHERE package_slug = ? AND status = 'approved'",
                (slug,),
            ).fetchone()
        return (round(row[0] or 0, 1), int(row[1]))

    def bulk_update_status(
        self, public_ids: list[str], status: str, updated_at: str
    ) -> set[str]:
        affected_slugs: set[str] = set()
        with self._db.connect() as conn:
            for pid in public_ids:
                row = conn.execute(
                    "SELECT package_slug FROM reviews WHERE public_id = ?", (pid,)
                ).fetchone()
                if row:
                    conn.execute(
                        "UPDATE reviews SET status=?, updated_at=? WHERE public_id=?",
                        (status, updated_at, pid),
                    )
                    affected_slugs.add(row["package_slug"])
        return affected_slugs

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0])

    def increment_helpful(self, public_id: str) -> int:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE reviews SET helpful_count = helpful_count + 1 WHERE public_id = ?",
                (public_id,),
            )
            row = conn.execute(
                "SELECT helpful_count FROM reviews WHERE public_id = ?", (public_id,)
            ).fetchone()
        return int(row["helpful_count"]) if row else 0

    def set_admin_reply(self, public_id: str, reply: str, updated_at: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE reviews SET admin_reply = ?, updated_at = ? WHERE public_id = ?",
                (reply, updated_at, public_id),
            )

    def update_verified(self, public_id: str, verified: bool, updated_at: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE reviews SET verified = ?, updated_at = ? WHERE public_id = ?",
                (1 if verified else 0, updated_at, public_id),
            )

    def get_stats_by_package(self, slug: str) -> dict[str, Any]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT rating, COUNT(*) as cnt FROM reviews WHERE package_slug = ? AND status = 'approved' GROUP BY rating",
                (slug,),
            ).fetchall()
        breakdown = {i: 0 for i in range(1, 6)}
        total = 0
        total_rating = 0.0
        for row in rows:
            r, c = int(row["rating"]), int(row["cnt"])
            breakdown[r] = c
            total += c
            total_rating += r * c
        avg = round(total_rating / total, 1) if total else 0.0
        return {"average": avg, "total": total, "breakdown": breakdown}
