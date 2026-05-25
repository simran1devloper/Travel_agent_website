"""SQLite implementation of IFaqRepository."""
from __future__ import annotations

from typing import Any

from .....domain.utils import utc_now
from .....ports.repositories import IFaqRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteFaqRepository(IFaqRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM faqs ORDER BY sort_order ASC, id ASC"
            ).fetchall()
            return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_id(self, faq_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM faqs WHERE id = ?", (faq_id,)
            ).fetchone()
            return row_to_dict(row) if row else None

    def create(self, data: dict[str, Any]) -> int:
        now = utc_now()
        with self._db.connect() as conn:
            cur = conn.execute(
                "INSERT INTO faqs (question, answer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (data["question"], data["answer"], data.get("sort_order", 0), now, now),
            )
            return cur.lastrowid  # type: ignore[return-value]

    def update(self, faq_id: int, data: dict[str, Any]) -> None:
        now = utc_now()
        fields = []
        params: list[Any] = []
        for key in ("question", "answer", "sort_order"):
            if key in data and data[key] is not None:
                fields.append(f"{key} = ?")
                params.append(data[key])
        fields.append("updated_at = ?")
        params.append(now)
        params.append(faq_id)
        with self._db.connect() as conn:
            conn.execute(
                f"UPDATE faqs SET {', '.join(fields)} WHERE id = ?",  # noqa: S608
                params,
            )

    def delete(self, faq_id: int) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM faqs WHERE id = ?", (faq_id,))
