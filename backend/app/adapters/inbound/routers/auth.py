"""Auth router: signup, login, /me."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ....application.auth_service import AuthService, LOCAL_ISS
from ....models import AuthLogin, AuthSignup
from ..auth_adapter import current_user
from ..dependencies import get_auth_service

router = APIRouter(tags=["auth"])


@router.post("/auth/signup", status_code=201)
def signup(
    payload: AuthSignup,
    svc: AuthService = Depends(get_auth_service),
) -> dict[str, Any]:
    return svc.signup(payload.name, payload.email, payload.password)


@router.post("/auth/login")
def login(
    payload: AuthLogin,
    svc: AuthService = Depends(get_auth_service),
) -> dict[str, Any]:
    return svc.login(payload.email, payload.password)


@router.get("/auth/me")
def me(
    user: dict[str, Any] = Depends(current_user),
    svc: AuthService = Depends(get_auth_service),
) -> dict[str, Any]:
    if user.get("iss") == LOCAL_ISS:
        return svc.get_me_local(user)
    return svc.get_me_auth0(user)
