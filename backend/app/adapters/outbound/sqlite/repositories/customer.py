from __future__ import annotations

from typing import Any

from .....ports.repositories import ICustomerRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteCustomerRepository(ICustomerRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def find_by_id(self, customer_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE id = ?", (customer_id,)
            ).fetchone()
        return row_to_dict(row)

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE email = ?", (email,)
            ).fetchone()
        return row_to_dict(row)

    def find_by_auth0_sub(self, sub: str) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE auth0_sub = ?", (sub,)
            ).fetchone()
        return row_to_dict(row)

    def create(
        self,
        *,
        name: str,
        email: str | None,
        phone: str | None,
        whatsapp: str | None,
        created_at: str,
    ) -> int:
        with self._db.connect() as conn:
            cur = conn.execute(
                "INSERT INTO customers (name, email, phone, whatsapp, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (name, email or None, phone, whatsapp, created_at),
            )
        return int(cur.lastrowid)

    def create_with_credentials(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        role: str,
        created_at: str,
    ) -> int:
        with self._db.connect() as conn:
            cur = conn.execute(
                "INSERT INTO customers (name, email, password_hash, role, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (name, email, password_hash, role, created_at),
            )
        return int(cur.lastrowid)

    def update_auth0_sub(self, customer_id: int, sub: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE customers SET auth0_sub = ? WHERE id = ?", (sub, customer_id)
            )

    def update_contact_info(
        self,
        customer_id: int,
        *,
        name: str,
        phone: str | None,
        whatsapp: str | None,
    ) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE customers SET name = ?, phone = ?, whatsapp = ? WHERE id = ?",
                (name, phone, whatsapp, customer_id),
            )

    def get_first(self) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM customers ORDER BY id LIMIT 1"
            ).fetchone()
        return row_to_dict(row)

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0])
