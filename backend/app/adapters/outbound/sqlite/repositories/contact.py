from __future__ import annotations

from typing import Any

from .....domain.utils import json_dumps
from .....ports.repositories import IContactRepository
from ..connection import SQLiteDatabase


class SQLiteContactRepository(IContactRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def create(self, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO contact_messages
                (public_id, name, contact, destination, message, journey_types, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'New', ?)
                """,
                (
                    data["public_id"],
                    data["name"],
                    data["contact"],
                    data.get("destination"),
                    data["message"],
                    json_dumps(data.get("journey_types", [])),
                    data["created_at"],
                ),
            )

    def count(self) -> int:
        with self._db.connect() as conn:
            return int(
                conn.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0]
            )
