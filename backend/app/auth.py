from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client: jwt.PyJWKClient | None = None
_jwks_client_url: str = ""

LOCAL_ISS = "journeymakers-local"
LOCAL_TTL = 60 * 60 * 24 * 7  # 7 days


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client, _jwks_client_url
    settings = get_settings()
    if _jwks_client is None or _jwks_client_url != settings.auth0_jwks_url:
        _jwks_client = jwt.PyJWKClient(settings.auth0_jwks_url, cache_jwk_set=True, lifespan=300)
        _jwks_client_url = settings.auth0_jwks_url
    return _jwks_client


def _jwt_alg(token: str) -> str:
    """Peek at JWT header to identify algorithm without verifying signature."""
    try:
        segment = token.split(".")[0]
        padded = segment + "=" * (-len(segment) % 4)
        header = json.loads(base64.b64decode(padded))
        return str(header.get("alg", ""))
    except Exception:
        return ""


# ── Password hashing (PBKDF2-SHA256, 310 000 iterations — NIST-recommended) ──

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
    return f"pbkdf2:{salt}:{h}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split(":")
    if len(parts) != 3:
        return False
    _, salt, stored_hash = parts
    expected = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
    return hmac.compare_digest(expected, stored_hash)


# ── Local JWT (HS256) ─────────────────────────────────────────────────────────

def create_local_token(*, customer_id: int, email: str, name: str, role: str) -> str:
    settings = get_settings()
    now = int(time.time())
    payload = {
        "sub": str(customer_id),
        "email": email,
        "name": name,
        "role": role,
        "iss": LOCAL_ISS,
        "iat": now,
        "exp": now + LOCAL_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_local_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=LOCAL_ISS)
    except jwt.PyJWTError:
        return None


# ── Auth0 JWT (RS256 via JWKS) ────────────────────────────────────────────────

def _decode_auth0_token(credentials: HTTPAuthorizationCredentials) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.auth0_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 is not configured on the API",
        )
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
        return jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=settings.auth0_algorithms,
            audience=settings.auth0_audience,
            issuer=settings.auth0_issuer,
            leeway=10,
        )
    except jwt.PyJWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid access token: {error}",
        ) from error


# ── Unified token decoder ─────────────────────────────────────────────────────

def _decode_token(credentials: HTTPAuthorizationCredentials | None) -> dict[str, Any] | None:
    if credentials is None:
        return None
    alg = _jwt_alg(credentials.credentials)
    if alg == "HS256":
        result = _decode_local_token(credentials.credentials)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired local token",
            )
        return result
    return _decode_auth0_token(credentials)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    payload = _decode_token(credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer access token",
        )
    return payload


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any] | None:
    return _decode_token(credentials)


def _permissions(user: dict[str, Any] | None) -> set[str]:
    if not user:
        return set()
    scope = str(user.get("scope", ""))
    permissions = user.get("permissions", [])
    if not isinstance(permissions, list):
        permissions = []
    return {str(item) for item in permissions} | set(scope.split())


def _roles(user: dict[str, Any] | None) -> set[str]:
    if not user:
        return set()
    if user.get("iss") == LOCAL_ISS:
        return {str(user.get("role", "user")).lower()}
    settings = get_settings()
    roles = user.get(settings.auth0_roles_claim, user.get("roles", []))
    if not isinstance(roles, list):
        roles = []
    return {str(item).lower() for item in roles}


def require_permissions(*required_permissions: str):
    def dependency(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
        granted = _permissions(user)
        missing = [p for p in required_permissions if p not in granted]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return user

    return dependency


def require_admin(
    x_admin_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(optional_user),
) -> None:
    settings = get_settings()
    if x_admin_token == settings.admin_token:
        return
    if "admin" in _roles(user) or "manage:admin" in _permissions(user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin role or manage:admin permission required",
    )


def require_customer(
    x_customer_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(optional_user),
) -> dict[str, Any] | None:
    settings = get_settings()
    if x_customer_token == settings.customer_token:
        return None  # dev bypass — caller receives no identity
    if user:
        return user
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


AdminAuth = Depends(require_admin)
CustomerAuth = Depends(require_customer)
