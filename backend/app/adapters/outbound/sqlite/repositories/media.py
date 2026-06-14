from __future__ import annotations

from typing import Any

from .....ports.repositories import IMediaRepository
from ..connection import SQLiteDatabase, row_to_dict


class SQLiteMediaRepository(IMediaRepository):
    def __init__(self, db: SQLiteDatabase) -> None:
        self._db = db

    def list_paginated(
        self, page: int, per_page: int
    ) -> tuple[list[dict[str, Any]], int]:
        offset = (page - 1) * per_page
        with self._db.connect() as conn:
            total = int(conn.execute("SELECT COUNT(*) FROM media").fetchone()[0])
            rows = conn.execute(
                "SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (per_page, offset),
            ).fetchall()
        return ([row_to_dict(r) for r in rows], total)  # type: ignore[misc]

    def find_by_id(self, media_id: int) -> dict[str, Any] | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM media WHERE id = ?", (media_id,)
            ).fetchone()
        return row_to_dict(row)

    def create(self, data: dict[str, Any]) -> int:
        with self._db.connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO media
                (filename, url, content_type, size_bytes, alt_text,
                 owner_type, owner_id, moderation_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["filename"], data["url"], data.get("content_type"),
                    data.get("size_bytes"), data.get("alt_text"),
                    data.get("owner_type"), data.get("owner_id"),
                    data.get("moderation_status", "pending"),
                    data["created_at"],
                ),
            )
        return int(cur.lastrowid)

    def update_moderation(self, media_id: int, status: str) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE media SET moderation_status = ? WHERE id = ?",
                (status, media_id),
            )

    def list_user_media(
        self, page: int, per_page: int, status: str | None = None
    ) -> tuple[list[dict[str, Any]], int]:
        offset = (page - 1) * per_page
        where = "WHERE owner_type = 'customer'"
        params: list[Any] = []
        if status:
            where += " AND moderation_status = ?"
            params.append(status)
        with self._db.connect() as conn:
            total = int(conn.execute(
                f"SELECT COUNT(*) FROM media {where}", params  # noqa: S608
            ).fetchone()[0])
            rows = conn.execute(
                f"SELECT * FROM media {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",  # noqa: S608
                [*params, per_page, offset],
            ).fetchall()
        return ([row_to_dict(r) for r in rows], total)  # type: ignore[misc]

    def update(self, media_id: int, data: dict[str, Any]) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE media SET alt_text=?, owner_type=?, owner_slug=? WHERE id=?",
                (
                    data.get("alt_text"),
                    data.get("owner_type"),
                    data.get("owner_slug"),
                    media_id,
                ),
            )

    def delete(self, media_id: int) -> None:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM media WHERE id = ?", (media_id,))
