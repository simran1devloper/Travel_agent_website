"""Outbound port for file-storage operations."""
from __future__ import annotations

from abc import ABC, abstractmethod


class IFileStorage(ABC):
    @abstractmethod
    def save(
        self,
        original_filename: str,
        content: bytes,
        content_type: str,
    ) -> tuple[str, str, int]:
        """Persist a file and return ``(unique_filename, public_url, size_bytes)``."""
        ...

    @abstractmethod
    def delete(self, filename: str) -> None:
        """Delete a previously saved file.  No-op if the file is missing."""
        ...
