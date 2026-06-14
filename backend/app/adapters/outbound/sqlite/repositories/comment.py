from __future__ import annotations

from typing import Any

from ..connection import SQLiteDatabase, row_to_dict


class SQLiteCommentRepository:
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_approved_by_entity(self, entity_type: str, entity_slug: str) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM comments
                WHERE entity_type = ? AND entity_slug = ? AND status = 'approved'
                ORDER BY created_at DESC
                """,
                (entity_type, entity_slug),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_all(self, status: str | None = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM comments"
        params: tuple[Any, ...] = ()
        if status:
            query += " WHERE status = ?"
            params = (status,)
        query += " ORDER BY created_at DESC"
        with self._db.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM comments WHERE public_id = ?", (public_id,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO comments (public_id, entity_type, entity_slug, name, email, body, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["public_id"],
                    data["entity_type"],
                    data["entity_slug"],
                    data["name"],
                    data.get("email"),
                    data["body"],
                    data["created_at"],
                ),
            )

    def update_status(self, public_id: str, status: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE comments SET status = ? WHERE public_id = ?",
                (status, public_id),
            )

    def delete(self, public_id: str) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM comments WHERE public_id = ?", (public_id,))

    def count(self) -> int:
        with self._db.connect() as conn:
            row = conn.execute("SELECT COUNT(*) FROM comments").fetchone()
        return int(row[0]) if row else 0
