from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IInquiryRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteInquiryRepository(IInquiryRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO inquiries
                (public_id, customer_id, full_name, email, phone, whatsapp,
                 preferred_contact, destinations, specific_place, experiences,
                 travel_styles, services, preferred_dates, date_from, date_to,
                 adults, children, budget, passport_notes, occasion,
                 inspiration, inspiration_links, trip_feel, basket_items,
                 status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)
                """,
                (
                    data["public_id"], data.get("customer_id"), data["full_name"],
                    data["email"], data.get("phone"), data.get("whatsapp"),
                    data.get("preferred_contact"),
                    json_dumps(data.get("destinations", [])),
                    data.get("specific_place"),
                    json_dumps(data.get("experiences", [])),
                    json_dumps(data.get("travel_styles", [])),
                    json_dumps(data.get("services", [])),
                    data.get("preferred_dates"),
                    data.get("date_from"), data.get("date_to"),
                    data.get("adults", 1), data.get("children", 0),
                    data.get("budget"), data.get("passport_notes"),
                    data.get("occasion"),
                    json_dumps(data.get("inspiration", [])),
                    data.get("inspiration_links"), data.get("trip_feel"),
                    json_dumps(data.get("basket_items", [])),
                    data["created_at"], data["updated_at"],
                ),
            )

    def find_by_public_id(self, public_id: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM inquiries WHERE public_id = ?", (public_id,)
            ).fetchone()
        return row_to_dict(row)

    def list_all(self, search: str | None = None) -> list[dict[str, Any]]:
        base = (
            "SELECT i.*, p.name as planner_name FROM inquiries i"
            " LEFT JOIN planners p ON p.id = i.assigned_planner_id"
        )
        params: tuple[Any, ...] = ()
        if search:
            base += " WHERE i.full_name LIKE ? OR i.email LIKE ? OR i.public_id LIKE ?"
            needle = f"%{search}%"
            params = (needle, needle, needle)
        base += " ORDER BY i.created_at DESC"
        with self._db.connect() as conn:
            rows = conn.execute(base, params).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def list_by_customer(
        self, customer_id: int, email: str
    ) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM inquiries"
                " WHERE customer_id = ? OR email = ?"
                " ORDER BY created_at DESC",
                (customer_id, email),
            ).fetchall()
        return [row_to_dict(r) for r in rows]  # type: ignore[misc]

    def update(
        self, public_id: str, status: str, planner_id: int | None
    ) -> None:
        from .....domain.utils import utc_now
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE inquiries SET status=?, assigned_planner_id=?, updated_at=?"
                " WHERE public_id=?",
                (status, planner_id, utc_now(), public_id),
            )

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0])

    def count_active(self) -> int:
        with self._db.connect() as conn:
            return int(
                conn.execute(
                    "SELECT COUNT(*) FROM inquiries WHERE status NOT IN ('Won','Lost')"
                ).fetchone()[0]
            )

    def count_won(self) -> int:
        with self._db.connect() as conn:
            return int(
                conn.execute(
                    "SELECT COUNT(*) FROM inquiries WHERE status = 'Won'"
                ).fetchone()[0]
            )
