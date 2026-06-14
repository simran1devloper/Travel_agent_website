"""Primary adapter: JWT decoding and FastAPI auth dependencies.

Converts HTTP bearer tokens into verified user dicts.
Handles both locally-issued HS256 JWTs and Auth0 RS256 JWTs.
"""
from __future__ import annotations

import base64
import json
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...application.auth_service import LOCAL_ISS
from ...config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client: jwt.PyJWKClient | None = None
_jwks_client_url: str = ""


# ---------------------------------------------------------------------------
# JWKS client (lazy, cached per URL)
# ---------------------------------------------------------------------------

def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client, _jwks_client_url
    settings = get_settings()
    if _jwks_client is None or _jwks_client_url != settings.auth0_jwks_url:
        _jwks_client = jwt.PyJWKClient(
            settings.auth0_jwks_url, cache_jwk_set=True, lifespan=300
        )
        _jwks_client_url = settings.auth0_jwks_url
    return _jwks_client


# ---------------------------------------------------------------------------
# Token introspection helpers
# ---------------------------------------------------------------------------

def _jwt_alg(token: str) -> str:
    """Peek at the JWT header to identify the algorithm (no signature check)."""
    try:
        segment = token.split(".")[0]
        padded = segment + "=" * (-len(segment) % 4)
        header = json.loads(base64.b64decode(padded))
        return str(header.get("alg", ""))
    except Exception:
        return ""


def _decode_local_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=LOCAL_ISS,
        )
    except jwt.PyJWTError:
        return None


def _decode_auth0_token(
    credentials: HTTPAuthorizationCredentials,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.auth0_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth0 is not configured on the API",
        )
    # Opaque tokens (issued when no Auth0 API audience is registered) are NOT JWTs.
    # They cannot be decoded — detect early and return a helpful error.
    if len(credentials.credentials.split(".")) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Received an opaque Auth0 token. "
                "Register an API in Auth0 (Applications → APIs), "
                "then set AUTH0_AUDIENCE on the server and VITE_AUTH0_AUDIENCE on the frontend."
            ),
        )
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(
            credentials.credentials
        )
        # When no audience is configured, skip aud claim verification.
        decode_kwargs: dict[str, Any] = {
            "algorithms": settings.auth0_algorithms,
            "issuer": settings.auth0_issuer,
            "leeway": 10,
        }
        if settings.auth0_audience:
            decode_kwargs["audience"] = settings.auth0_audience
        else:
            decode_kwargs["options"] = {"verify_aud": False}
        return jwt.decode(credentials.credentials, signing_key.key, **decode_kwargs)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid access token: {exc}",
        ) from exc


def _decode_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> dict[str, Any] | None:
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


# ---------------------------------------------------------------------------
# FastAPI dependency functions (inbound DI)
# ---------------------------------------------------------------------------

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
    perms = user.get("permissions", [])
    if not isinstance(perms, list):
        perms = []
    return {str(p) for p in perms} | set(scope.split())


def _roles(user: dict[str, Any] | None) -> set[str]:
    if not user:
        return set()
    if user.get("iss") == LOCAL_ISS:
        return {str(user.get("role", "user")).lower()}
    settings = get_settings()
    roles = user.get(settings.auth0_roles_claim, user.get("roles", []))
    if not isinstance(roles, list):
        roles = []
    return {str(r).lower() for r in roles}


def require_admin(
    x_admin_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(optional_user),
) -> None:
    settings = get_settings()
    if x_admin_token == settings.admin_token:
        return
    if _roles(user) & {"admin", "superadmin"} or "manage:admin" in _permissions(user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin role or manage:admin permission required",
    )


def require_superadmin(
    request: Request,
    user: dict[str, Any] | None = Depends(optional_user),
) -> None:
    """Raise 403 unless the caller is a JWT-authenticated superadmin.

    No dev-token bypass — superadmin access always requires a real JWT with
    is_superadmin=1 in the database (local auth) or the superadmin role (Auth0).
    """
    if user and user.get("iss") == LOCAL_ISS:
        try:
            customer_id = int(user["sub"])
            container = request.app.state.container
            with container.db.connect() as conn:
                row = conn.execute(
                    "SELECT is_superadmin FROM customers WHERE id = ?", (customer_id,)
                ).fetchone()
            if row and row[0]:
                return
        except Exception:
            pass
    if user and "superadmin" in _roles(user) and "manage:admin" in _permissions(user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the super admin can perform this action.",
    )


def require_moderator(
    x_admin_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(optional_user),
) -> None:
    """Allow moderators, admins, and the dev admin token."""
    settings = get_settings()
    if x_admin_token == settings.admin_token:
        return
    if _roles(user) & {"admin", "moderator", "superadmin"} or "manage:admin" in _permissions(user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Moderator or admin role required",
    )


def require_customer(
    x_customer_token: str | None = Header(default=None),
    user: dict[str, Any] | None = Depends(optional_user),
) -> dict[str, Any] | None:
    """Return the decoded user payload, or None for dev-bypass requests."""
    settings = get_settings()
    if x_customer_token == settings.customer_token:
        return None  # dev bypass — caller receives no identity
    if user:
        return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )
