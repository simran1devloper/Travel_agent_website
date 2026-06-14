"""IDatabase port — the abstract database connection contract.

All database adapters (local SQLite, GDrive-SQLite, R2-SQLite, Neon Postgres)
implement this port.  The rest of the application depends ONLY on this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import contextmanager
from typing import Any, Iterator


class IDatabase(ABC):
    """Abstract database connection factory."""

    @contextmanager
    @abstractmethod
    def connect(self) -> Iterator[Any]:
        """Yield a connection-like object that supports `.execute()` / `.fetchone()` / `.fetchall()`."""
        ...  # pragma: no cover
