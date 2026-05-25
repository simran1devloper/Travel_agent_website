from __future__ import annotations

from typing import Any

from .....ports.repositories import IPlannerRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLitePlannerRepository(IPlannerRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute("SELECT * FROM planners ORDER BY name").fetchall()
        return [dict(r) for r in rows]

    def find_by_id(self, planner_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM planners WHERE id = ?", (planner_id,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> int:
        with self._db.connect() as conn:
            cur = conn.execute(
                "INSERT INTO planners (name, email, specialty, photo_url, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (
                    data["name"], data["email"],
                    data.get("specialty"), data.get("photo_url"),
                    data["created_at"],
                ),
            )
        return int(cur.lastrowid)

    def update(self, planner_id: int, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE planners SET name=?, email=?, specialty=?, photo_url=? WHERE id=?",
                (
                    data["name"], data["email"],
                    data.get("specialty"), data.get("photo_url"),
                    planner_id,
                ),
            )

    def delete(self, planner_id: int) -> None:
        with self._db.connect() as conn:
            # Nullify assigned inquiries first to preserve referential integrity
            conn.execute(
                "UPDATE inquiries SET assigned_planner_id = NULL"
                " WHERE assigned_planner_id = ?",
                (planner_id,),
            )
            conn.execute("DELETE FROM planners WHERE id = ?", (planner_id,))

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM planners").fetchone()[0])
