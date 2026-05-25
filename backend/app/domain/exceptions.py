"""Domain-level exceptions.

These are raised by application services and converted to HTTP responses
by the inbound adapter's exception handlers.  No FastAPI/Starlette imports
allowed here — this layer knows nothing about HTTP.
"""
from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain errors."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class NotFoundError(DomainError):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail)


class ConflictError(DomainError):
    def __init__(self, detail: str = "Resource already exists") -> None:
        super().__init__(detail)


class ForbiddenError(DomainError):
    def __init__(self, detail: str = "Access forbidden") -> None:
        super().__init__(detail)


class UnauthorizedError(DomainError):
    def __init__(self, detail: str = "Authentication required") -> None:
        super().__init__(detail)


class UnsupportedMediaTypeError(DomainError):
    def __init__(self, detail: str = "Unsupported file type") -> None:
        super().__init__(detail)


class ValidationError(DomainError):
    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(detail)
