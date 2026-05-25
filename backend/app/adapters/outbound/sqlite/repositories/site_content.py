from __future__ import annotations
from typing import Any
from ..connection import SQLiteDatabase, row_to_dict
from .....domain.utils import utc_now


class SQLiteSiteContentRepository:
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def get_page(self, page: str) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM site_content WHERE page = ? ORDER BY section, sort_order",
                (page,),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def get_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM site_content ORDER BY page, section, sort_order"
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def upsert(self, page: str, section: str, key: str, value: str) -> None:
        now = utc_now()
        with self._db.connect() as conn:
            conn.execute(
                """INSERT INTO site_content (page, section, key, value, updated_at)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(page, section, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
                (page, section, key, value, now),
            )

    def bulk_upsert(self, updates: list[dict[str, str]]) -> int:
        now = utc_now()
        with self._db.connect() as conn:
            for u in updates:
                conn.execute(
                    """INSERT INTO site_content (page, section, key, value, updated_at)
                       VALUES (?, ?, ?, ?, ?)
                       ON CONFLICT(page, section, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
                    (u["page"], u["section"], u["key"], u["value"], now),
                )
        return len(updates)
