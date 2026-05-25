"""Authentication application service.

Handles signup, login, and identity resolution.
Only depends on domain utilities and the customer port — no FastAPI/HTTP.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from typing import Any

import jwt

from ..domain.exceptions import ConflictError, UnauthorizedError
from ..domain.utils import utc_now
from ..ports.repositories import ICustomerRepository

LOCAL_ISS = "journeymakers-local"
_LOCAL_TTL = 60 * 60 * 24 * 7  # 7 days


# ---------------------------------------------------------------------------
# Pure functions — testable without any DI
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
    return f"pbkdf2:{salt}:{digest}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split(":")
    if len(parts) != 3:
        return False
    _, salt, stored_hash = parts
    expected = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 310_000
    ).hex()
    return hmac.compare_digest(expected, stored_hash)


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------

class AuthService:
    def __init__(
        self,
        customer_repo: ICustomerRepository,
        jwt_secret: str,
    ) -> None:
        self._customers = customer_repo
        self._jwt_secret = jwt_secret

    # ------------------------------------------------------------------
    def signup(self, name: str, email: str, password: str) -> dict[str, Any]:
        if self._customers.find_by_email(email):
            raise ConflictError("Email already registered")
        customer_id = self._customers.create_with_credentials(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="user",
            created_at=utc_now(),
        )
        token = self._make_token(
            customer_id=customer_id, email=email, name=name, role="user"
        )
        return {"token": token, "role": "user", "name": name}

    # ------------------------------------------------------------------
    def login(self, email: str, password: str) -> dict[str, Any]:
        row = self._customers.find_by_email(email)
        if not row or not row.get("password_hash"):
            raise UnauthorizedError("Invalid email or password")
        if not verify_password(password, row["password_hash"]):
            raise UnauthorizedError("Invalid email or password")
        role = row.get("role") or "user"
        token = self._make_token(
            customer_id=row["id"], email=row["email"], name=row["name"], role=role
        )
        return {"token": token, "role": role, "name": row["name"]}

    # ------------------------------------------------------------------
    def get_me_local(self, user: dict[str, Any]) -> dict[str, Any]:
        """Return profile payload for a locally-issued JWT."""
        return {
            "id": user["sub"],
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
        }

    def get_me_auth0(self, user: dict[str, Any]) -> dict[str, Any]:
        """Resolve the Auth0 JWT owner to a customer row and return profile."""
        customer_id = self._get_or_create_from_auth0(
            sub=user["sub"],
            email=user.get("email", ""),
            name=user.get("name", "") or user.get("email", user["sub"]),
        )
        row = self._customers.find_by_id(customer_id)
        if not row:
            from ..domain.exceptions import NotFoundError
            raise NotFoundError("Customer not found")
        return {
            "id": str(row["id"]),
            "email": row.get("email") or "",
            "name": row.get("name") or "",
            "role": row.get("role") or "user",
        }

    # ------------------------------------------------------------------
    # Helpers used by other services (via the customer service)
    # ------------------------------------------------------------------

    def get_or_create_from_auth0(
        self, sub: str, email: str, name: str
    ) -> int:
        return self._get_or_create_from_auth0(sub=sub, email=email, name=name)

    # ------------------------------------------------------------------

    def _get_or_create_from_auth0(
        self, sub: str, email: str, name: str
    ) -> int:
        row = self._customers.find_by_auth0_sub(sub)
        if row:
            return int(row["id"])
        if email:
            by_email = self._customers.find_by_email(email)
            if by_email:
                self._customers.update_auth0_sub(int(by_email["id"]), sub)
                return int(by_email["id"])
        return self._customers.create(
            name=name,
            email=email or None,
            phone=None,
            whatsapp=None,
            created_at=utc_now(),
        )

    def _make_token(
        self, *, customer_id: int, email: str, name: str, role: str
    ) -> str:
        now = int(time.time())
        payload = {
            "sub": str(customer_id),
            "email": email,
            "name": name,
            "role": role,
            "iss": LOCAL_ISS,
            "iat": now,
            "exp": now + _LOCAL_TTL,
        }
        return jwt.encode(payload, self._jwt_secret, algorithm="HS256")
