"""Infisical secrets store adapter.

Infisical (https://infisical.com) is a free, open-source secrets manager.
Secrets are end-to-end encrypted and accessible via REST API.

Required env vars (set once by the developer):
  INFISICAL_TOKEN        — Machine Identity Universal Auth token (or Service Token)
  INFISICAL_WORKSPACE_ID — Project ID (shown in Infisical dashboard → Project Settings)
  INFISICAL_ENVIRONMENT  — Environment slug, e.g. "prod" or "dev" (default: "prod")
  INFISICAL_BASE_URL     — Base URL; default: https://app.infisical.com
                           (change only for self-hosted Infisical)

No extra Python packages needed — uses stdlib ``urllib`` only.

Dashboard steps:
  1. Create a project at https://app.infisical.com
  2. Project Settings → copy the Project ID → INFISICAL_WORKSPACE_ID
  3. Organization Settings → Machine Identities → Create → copy client credentials
     or use a Service Token from Project Settings → Service Tokens
  4. Add token to backend/.env as INFISICAL_TOKEN

Key naming: Infisical secret names must match ``[A-Z][A-Z0-9_]*``.
  Our keys (e.g. ``r2.secret_access_key``) are uppercased and dots replaced:
  ``r2.secret_access_key`` → ``R2_SECRET_ACCESS_KEY``
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

from ....domain.exceptions import DomainError
from ....ports.secrets_store import ISecretsStore


def _to_infisical_name(key: str) -> str:
    """Convert dotted lowercase key to UPPER_SNAKE secret name."""
    return key.upper().replace(".", "_")


class InfisicalSecretsStore(ISecretsStore):
    """Read/write secrets via the Infisical REST API v3."""

    def __init__(
        self,
        token: str,
        workspace_id: str,
        environment: str = "prod",
        base_url: str = "https://app.infisical.com",
        secret_path: str = "/",
    ) -> None:
        self._token = token
        self._workspace_id = workspace_id
        self._environment = environment
        self._base_url = base_url.rstrip("/")
        self._secret_path = secret_path

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    def _check_configured(self) -> None:
        if not (self._token and self._workspace_id):
            raise DomainError(
                "Infisical is not configured. "
                "Set INFISICAL_TOKEN and INFISICAL_WORKSPACE_ID in backend/.env."
            )

    def is_available(self) -> bool:
        return bool(self._token and self._workspace_id)

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = f"{self._base_url}{path}"
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode()
            try:
                detail = json.loads(raw).get("message", raw)
            except Exception:
                detail = raw
            raise DomainError(f"Infisical {method} {path} failed ({exc.code}): {detail}") from exc

    def get(self, key: str) -> str:
        self._check_configured()
        name = _to_infisical_name(key)
        params = (
            f"?workspaceId={self._workspace_id}"
            f"&environment={self._environment}"
            f"&secretPath={self._secret_path}"
        )
        url = f"{self._base_url}/api/v3/secrets/raw/{name}{params}"
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
            return data.get("secret", {}).get("secretValue", "")
        except urllib.error.HTTPError as exc:
            if exc.code in (404, 400):
                return ""
            raw = exc.read().decode()
            raise DomainError(f"Infisical GET failed ({exc.code}): {raw}") from exc

    def set(self, key: str, value: str) -> None:
        self._check_configured()
        name = _to_infisical_name(key)
        # Try update first; fall back to create
        existing = self.get(key)
        body = {
            "workspaceId": self._workspace_id,
            "environment": self._environment,
            "secretPath": self._secret_path,
            "secretValue": value,
        }
        if existing:
            self._request("PATCH", f"/api/v3/secrets/raw/{name}", body)
        else:
            body["secretName"] = name
            self._request("POST", f"/api/v3/secrets/raw/{name}", body)

    def delete(self, key: str) -> None:
        self._check_configured()
        name = _to_infisical_name(key)
        params = (
            f"?workspaceId={self._workspace_id}"
            f"&environment={self._environment}"
            f"&secretPath={self._secret_path}"
        )
        url = f"{self._base_url}/api/v3/secrets/raw/{name}{params}"
        req = urllib.request.Request(url, headers=self._headers(), method="DELETE")
        try:
            urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as exc:
            if exc.code in (404, 400):
                return
            raw = exc.read().decode()
            raise DomainError(f"Infisical DELETE failed ({exc.code}): {raw}") from exc
