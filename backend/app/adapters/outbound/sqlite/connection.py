"""SQLite connection wrapper — local-sqlite database adapter."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from ....domain.utils import json_loads
from ....ports.database import IDatabase


# JSON-serialised columns that are transparently decoded into Python lists
_JSON_LIST_COLUMNS = frozenset(
    {
        "destinations",
        "experiences",
        "travel_styles",
        "services",
        "inspiration",
        "journey_types",
        "tags",
        "gallery",
        "reviews",
        "media_urls",
        "destination_slugs",
        "service_ids",
        "offer_ids",
        "basket_items",
    }
)


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    """Convert a ``sqlite3.Row`` to a plain dict, deserialising JSON list columns."""
    if row is None:
        return None
    data = dict(row)
    for key in _JSON_LIST_COLUMNS:
        if key in data:
            data[key] = json_loads(data[key], [])
    return data


class SQLiteDatabase(IDatabase):
    """Local-SQLite adapter — stores the database file on the server filesystem."""

    def __init__(self, database_path: str) -> None:
        self._path = database_path

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        """Yield an auto-committing, foreign-key-enabled SQLite connection."""
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
