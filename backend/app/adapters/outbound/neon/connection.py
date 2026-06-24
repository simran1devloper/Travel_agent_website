"""Neon Postgres database adapter.

Connects to a Neon serverless Postgres database.  The connection string comes
from the env var NEON_DATABASE_URL (or system settings key ``db.neon_url``).

SQL compatibility notes:
  - Postgres uses %s placeholders; this adapter translates ? → %s automatically.
  - Postgres uses SERIAL / BIGSERIAL instead of AUTOINCREMENT (handled in migrations).
  - `RETURNING id` is used instead of `lastrowid`.
  - Rows are returned as dict-like objects that support column-name access,
    matching the sqlite3.Row interface the repositories expect.

Requires ``psycopg2-binary``:
  pip install "psycopg2-binary>=2.9"
"""
from __future__ import annotations

import re
from contextlib import contextmanager
from typing import Any, Iterator

from ....ports.database import IDatabase


def _translate_sql(sql: str) -> str:
    """Replace SQLite ? placeholders with Postgres %s."""
    return re.sub(r"\?", "%s", sql)


class _PgRow(dict):
    """Dict subclass that supports attribute-style AND integer-index access (like sqlite3.Row)."""

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, int):
            # sqlite3.Row supports row[0] positional access; replicate that here
            return list(self.values())[key]
        return super().__getitem__(key)

    def __getattr__(self, name: str) -> Any:
        try:
            return super().__getitem__(name)
        except KeyError:
            raise AttributeError(name) from None

    def keys(self):  # type: ignore[override]
        return super().keys()


class _PgCursor:
    """Thin wrapper around psycopg2 cursor that mimics sqlite3.Cursor."""

    def __init__(self, cur: Any) -> None:
        self._cur = cur
        self.lastrowid: int | None = None

    def execute(self, sql: str, params: tuple = ()) -> "_PgCursor":
        translated = _translate_sql(sql)
        sql_stripped = sql.strip().upper()

        # Auto-append RETURNING id to plain INSERT statements so that
        # cur.lastrowid works exactly like sqlite3.Cursor (no repo changes needed).
        is_insert = sql_stripped.startswith("INSERT")
        already_has_returning = "RETURNING" in sql_stripped
        if is_insert and not already_has_returning:
            translated += " RETURNING id"

        self._cur.execute(translated, params)

        # Capture lastrowid whenever the result contains an 'id' column
        # (covers both explicit RETURNING and the auto-appended case above).
        if self._cur.description:
            col_names = [d[0] for d in self._cur.description]
            if "id" in col_names:
                try:
                    row = self._cur.fetchone()
                    if row:
                        self.lastrowid = row[col_names.index("id")]
                except Exception:
                    pass
        return self

    def fetchone(self) -> _PgRow | None:
        row = self._cur.fetchone()
        if row is None:
            return None
        cols = [d[0] for d in self._cur.description]
        return _PgRow(zip(cols, row))

    def fetchall(self) -> list[_PgRow]:
        rows = self._cur.fetchall()
        if not rows:
            return []
        cols = [d[0] for d in self._cur.description]
        return [_PgRow(zip(cols, r)) for r in rows]

    @property
    def description(self) -> list | None:
        return self._cur.description


class _PgConnection:
    """Thin wrapper around psycopg2 connection that mimics sqlite3.Connection."""

    def __init__(self, conn: Any) -> None:
        self._conn = conn

    def execute(self, sql: str, params: tuple = ()) -> _PgCursor:
        cur = _PgCursor(self._conn.cursor())
        cur.execute(sql, params)
        return cur

    def commit(self) -> None:
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def cursor(self) -> _PgCursor:
        return _PgCursor(self._conn.cursor())


class NeonPostgresDatabase(IDatabase):
    """Neon (serverless Postgres) adapter.

    Pass ``database_url`` directly or set the NEON_DATABASE_URL env var.
    The URL format is: postgresql://user:password@host/dbname?sslmode=require
    """

    def __init__(self, database_url: str) -> None:
        self._url = database_url

    @contextmanager
    def connect(self) -> Iterator[_PgConnection]:
        try:
            import psycopg2  # type: ignore[import]
        except ImportError as exc:
            raise RuntimeError(
                "psycopg2-binary is required for Neon Postgres. "
                "Run: pip install 'psycopg2-binary>=2.9'"
            ) from exc

        conn = psycopg2.connect(self._url)
        pg = _PgConnection(conn)
        try:
            yield pg
            pg.commit()
        finally:
            pg.close()
