"""SQLite implementation of ISiteStatRepository."""
from __future__ import annotations

from typing import Any

from .....domain.utils import utc_now
from .....ports.repositories import ISiteStatRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteSiteStatRepository(ISiteStatRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM site_stats ORDER BY sort_order ASC, id ASC"
            ).fetchall()
            return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def find_by_id(self, stat_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM site_stats WHERE id = ?", (stat_id,)
            ).fetchone()
            return row_to_dict(row) if row else None

    def upsert_bulk(self, items: list[dict[str, Any]]) -> None:
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute("DELETE FROM site_stats")
            conn.executemany(
                "INSERT INTO site_stats (value, label, sort_order, updated_at) VALUES (?, ?, ?, ?)",
                [(item["value"], item["label"], item.get("sort_order", 0), now) for item in items],
            )

    def update(self, stat_id: int, data: dict[str, Any]) -> None:
        now = utc_now()
        fields = []
        params: list[Any] = []
        for key in ("value", "label", "sort_order"):
            if key in data and data[key] is not None:
                fields.append(f"{key} = ?")
                params.append(data[key])
        fields.append("updated_at = ?")
        params.append(now)
        params.append(stat_id)
        with self._db.connect() as conn:
            conn.execute(
                f"UPDATE site_stats SET {', '.join(fields)} WHERE id = ?",  # noqa: S608
                params,
            )
