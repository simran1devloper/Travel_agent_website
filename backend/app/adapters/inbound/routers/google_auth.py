"""Google OAuth sign-in flow — credentials come from superadmin system settings."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from ....application.auth_service import LOCAL_ISS
from ....config import get_settings
from ....domain.utils import utc_now

router = APIRouter(tags=["google-auth"])

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _get_google_creds(request: Request) -> tuple[str, str] | None:
    """Return (client_id, client_secret) from system settings or env, or None if unconfigured."""
    try:
        svc = request.app.state.container.system_settings_service
        client_id = svc.get("google.client_id") or get_settings().google_client_id
        client_secret = svc.get("google.client_secret") or get_settings().google_client_secret
        if client_id and client_secret:
            return client_id, client_secret
    except Exception:
        pass
    return None


@router.get("/auth/config")
def auth_config(request: Request) -> dict[str, Any]:
    """Public — frontend fetches this to get runtime auth configuration.

    Reads auth0 and Google credentials from system settings first, falls back to env vars.
    This lets the superadmin configure all auth providers without a redeploy.
    """
    settings = get_settings()
    try:
        svc = request.app.state.container.system_settings_service
        auth0_domain = svc.get("auth0.domain") or settings.auth0_domain
        auth0_client_id = svc.get("auth0.client_id") or settings.auth0_client_id
        auth0_audience = svc.get("auth0.audience") or settings.auth0_audience
        google_creds = _get_google_creds(request)
    except Exception:
        auth0_domain = settings.auth0_domain
        auth0_client_id = settings.auth0_client_id
        auth0_audience = settings.auth0_audience
        google_creds = None

    auth0_enabled = bool(auth0_domain and auth0_client_id)
    return {
        "auth0_enabled": auth0_enabled,
        "auth0_domain": auth0_domain if auth0_enabled else "",
        "auth0_client_id": auth0_client_id if auth0_enabled else "",
        "auth0_audience": auth0_audience,
        "google_available": google_creds is not None,
    }


@router.get("/auth/google/available")
def google_available(request: Request) -> dict[str, Any]:
    """Public endpoint — tells the frontend whether Google sign-in is configured."""
    creds = _get_google_creds(request)
    return {"available": creds is not None}


@router.get("/auth/google")
def google_signin(request: Request) -> RedirectResponse:
    """Redirect the user to Google's OAuth consent screen."""
    creds = _get_google_creds(request)
    if not creds:
        settings = get_settings()
        return RedirectResponse(
            f"{settings.frontend_url}/signin?google_error=not_configured"
        )
    client_id, _ = creds
    settings = get_settings()
    params = {
        "client_id": client_id,
        "redirect_uri": settings.google_signin_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}")


@router.get("/auth/google/callback")
def google_callback(code: str, request: Request) -> RedirectResponse:
    """Exchange the Google auth code for user info and issue a local JWT."""
    settings = get_settings()
    frontend = settings.frontend_url

    creds = _get_google_creds(request)
    if not creds:
        return RedirectResponse(f"{frontend}/signin?google_error=not_configured")

    client_id, client_secret = creds

    # Exchange code for tokens
    try:
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.google_signin_redirect_uri,
        }).encode()
        req = urllib.request.Request(_GOOGLE_TOKEN_URL, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read())
    except Exception as e:
        return RedirectResponse(f"{frontend}/signin?google_error=token_exchange_failed")

    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(f"{frontend}/signin?google_error=no_access_token")

    # Get user info
    try:
        info_req = urllib.request.Request(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urllib.request.urlopen(info_req, timeout=10) as resp:
            user_info = json.loads(resp.read())
    except Exception:
        return RedirectResponse(f"{frontend}/signin?google_error=userinfo_failed")

    email: str = user_info.get("email", "")
    name: str = user_info.get("name", "") or email.split("@")[0]
    google_sub: str = user_info.get("id", "")

    if not email:
        return RedirectResponse(f"{frontend}/signin?google_error=no_email")

    # Find or create customer
    container = request.app.state.container
    try:
        with container.db.connect() as conn:
            row = conn.execute(
                "SELECT id, role, name FROM customers WHERE email = ?", (email,)
            ).fetchone()

        if row:
            customer_id, role, stored_name = row[0], row[1] or "user", row[2] or name
        else:
            now = utc_now()
            with container.db.connect() as conn:
                cur = conn.execute(
                    "INSERT INTO customers (name, email, role, created_at) VALUES (?, ?, 'user', ?)",
                    (name, email, now),
                )
                customer_id = cur.lastrowid
            role = "user"
            stored_name = name
    except Exception:
        return RedirectResponse(f"{frontend}/signin?google_error=db_error")

    # Issue a local JWT
    import jwt as pyjwt
    now_ts = int(time.time())
    token = pyjwt.encode(
        {
            "sub": str(customer_id),
            "email": email,
            "name": stored_name,
            "role": role,
            "iss": LOCAL_ISS,
            "iat": now_ts,
            "exp": now_ts + 60 * 60 * 24 * 7,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )

    params = urllib.parse.urlencode({"token": token, "name": stored_name, "role": role})
    return RedirectResponse(f"{frontend}/signin?{params}")
