from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IMemoryRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteMemoryRepository(IMemoryRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_public(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT m.*, c.name as customer_name FROM memories m
                JOIN customers c ON c.id = m.customer_id
                WHERE m.is_public = 1 AND m.status = 'published'
                ORDER BY m.created_at DESC
                LIMIT 50
                """
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_by_customer(self, customer_id: int) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM memories WHERE customer_id = ? ORDER BY created_at DESC",
                (customer_id,),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM memories WHERE public_id = ?", (public_id,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO memories
                (public_id, customer_id, title, description, destination,
                 travel_date_from, travel_date_to, is_public, status, media_urls,
                 created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
                """,
                (
                    data["public_id"], data["customer_id"], data["title"],
                    data.get("description"), data.get("destination"),
                    data.get("travel_date_from"), data.get("travel_date_to"),
                    1 if data.get("is_public") else 0,
                    json_dumps(data.get("media_urls", [])),
                    data["created_at"], data["updated_at"],
                ),
            )

    def update(self, public_id: str, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                UPDATE memories
                SET title=?, description=?, destination=?, travel_date_from=?,
                    travel_date_to=?, is_public=?, media_urls=?, updated_at=?
                WHERE public_id=?
                """,
                (
                    data["title"], data.get("description"), data.get("destination"),
                    data.get("travel_date_from"), data.get("travel_date_to"),
                    1 if data.get("is_public") else 0,
                    json_dumps(data.get("media_urls", [])),
                    data["updated_at"], public_id,
                ),
            )

    def delete(self, public_id: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM memories WHERE public_id = ?", (public_id,))

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM memories").fetchone()[0])
