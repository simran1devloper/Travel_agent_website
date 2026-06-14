"""Outbound port for secrets storage."""
from __future__ import annotations

from abc import ABC, abstractmethod


class ISecretsStore(ABC):
    """A key/value store for sensitive credentials.

    Implementations must encrypt at rest (Fernet, Cloudflare KV, Infisical, …).
    All values are strings; callers are responsible for serialisation.
    """

    @abstractmethod
    def get(self, key: str) -> str:
        """Return the stored secret or an empty string if absent."""

    @abstractmethod
    def set(self, key: str, value: str) -> None:
        """Persist or update a secret."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove a secret.  No-op if the key is absent."""

    def is_available(self) -> bool:
        """Return True if the store is reachable/configured."""
        return True
