"""SQLite repository for offers/promotions."""
from __future__ import annotations
from typing import Any
from .....ports.repositories import IOfferRepository
from ..connection import SQLiteDatabase, row_to_dict
from .....domain.utils import utc_now


class SQLiteOfferRepository(IOfferRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_active(self) -> list[dict[str, Any]]:
        now = utc_now()
        with self._db.connect() as conn:
            rows = conn.execute("""
                SELECT * FROM offers
                WHERE is_active = 1
                  AND (valid_from IS NULL OR valid_from <= ?)
                  AND (valid_until IS NULL OR valid_until >= ?)
                  AND (max_uses IS NULL OR current_uses < max_uses)
                ORDER BY sort_order ASC, is_featured DESC
            """, (now, now)).fetchall()
        return [row_to_dict(r) for r in rows]

    def list_all(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM offers ORDER BY sort_order ASC, created_at DESC"
            ).fetchall()
        return [row_to_dict(r) for r in rows]

    def find_by_id(self, offer_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute("SELECT * FROM offers WHERE id = ?", (offer_id,)).fetchone()
        return row_to_dict(row) if row else None

    def create(self, data: dict[str, Any]) -> int:
        with self._db.connect() as conn:
            cur = conn.execute("""
                INSERT INTO offers
                (title, subtitle, code, description, offer_type, discount_value,
                 badge_label, badge_color, applies_to, valid_from, valid_until,
                 max_uses, is_active, is_featured, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data["title"], data.get("subtitle", ""), data.get("code"),
                data.get("description", ""), data.get("offer_type", "percent"),
                data.get("discount_value", 0), data.get("badge_label", "Special Offer"),
                data.get("badge_color", "accent"), data.get("applies_to", "all"),
                data.get("valid_from"), data.get("valid_until"),
                data.get("max_uses"), 1 if data.get("is_active", True) else 0,
                1 if data.get("is_featured", False) else 0,
                data.get("sort_order", 0),
                data["created_at"], data["updated_at"],
            ))
        return cur.lastrowid

    def update(self, offer_id: int, data: dict[str, Any]) -> None:
        fields = []
        vals = []
        allowed = ["title", "subtitle", "code", "description", "offer_type", "discount_value",
                   "badge_label", "badge_color", "applies_to", "valid_from", "valid_until",
                   "max_uses", "is_active", "is_featured", "sort_order", "updated_at"]
        for k in allowed:
            if k in data:
                fields.append(f"{k} = ?")
                v = data[k]
                if k in ("is_active", "is_featured") and isinstance(v, bool):
                    v = 1 if v else 0
                vals.append(v)
        if not fields:
            return
        vals.append(offer_id)
        with self._db.connect() as conn:
            conn.execute(f"UPDATE offers SET {', '.join(fields)} WHERE id = ?", vals)

    def delete(self, offer_id: int) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM offers WHERE id = ?", (offer_id,))

    def increment_uses(self, offer_id: int) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE offers SET current_uses = current_uses + 1 WHERE id = ?",
                (offer_id,),
            )
