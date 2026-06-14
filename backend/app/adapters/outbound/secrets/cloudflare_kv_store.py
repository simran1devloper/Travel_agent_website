"""Cloudflare Workers KV secrets store.

Stores secrets in a Cloudflare Workers KV namespace so they are:
  - Accessible from Cloudflare Workers/Pages at runtime via ``env.KEY``
  - Encrypted at rest by Cloudflare
  - Readable back via the REST API (unlike Workers Secrets which are write-only)

Required env vars (set once by the developer):
  CF_KV_ACCOUNT_ID   — Cloudflare account ID
  CF_KV_NAMESPACE_ID — Workers KV namespace ID (create one in the Cloudflare dashboard)
  CF_KV_API_TOKEN    — Cloudflare API token with KV read/write permissions

No extra Python packages needed — uses stdlib ``urllib`` only.

Dashboard steps:
  1. Workers & Pages → KV → Create namespace (e.g. "journeymakers-secrets")
  2. Account → API Tokens → Create Token → "Edit Cloudflare Workers" template
  3. Copy Account ID, Namespace ID, API Token into backend/.env
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from ....domain.exceptions import DomainError
from ....ports.secrets_store import ISecretsStore


class CloudflareKVSecretsStore(ISecretsStore):
    """Read/write secrets via the Cloudflare Workers KV REST API."""

    _BASE = "https://api.cloudflare.com/client/v4"

    def __init__(self, account_id: str, namespace_id: str, api_token: str) -> None:
        self._account_id = account_id
        self._namespace_id = namespace_id
        self._api_token = api_token

    def _url(self, key: str | None = None) -> str:
        base = f"{self._BASE}/accounts/{self._account_id}/storage/kv/namespaces/{self._namespace_id}/values"
        return f"{base}/{key}" if key else base

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_token}"}

    def _check_configured(self) -> None:
        if not (self._account_id and self._namespace_id and self._api_token):
            raise DomainError(
                "Cloudflare KV is not configured. "
                "Set CF_KV_ACCOUNT_ID, CF_KV_NAMESPACE_ID, and CF_KV_API_TOKEN in backend/.env."
            )

    def is_available(self) -> bool:
        return bool(self._account_id and self._namespace_id and self._api_token)

    def get(self, key: str) -> str:
        self._check_configured()
        req = urllib.request.Request(self._url(key), headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.read().decode()
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return ""
            body = exc.read().decode()
            raise DomainError(f"Cloudflare KV GET failed ({exc.code}): {body}") from exc

    def set(self, key: str, value: str) -> None:
        self._check_configured()
        data = value.encode()
        req = urllib.request.Request(
            self._url(key),
            data=data,
            headers={**self._headers(), "Content-Type": "text/plain"},
            method="PUT",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
            if not result.get("success"):
                errors = result.get("errors", [])
                raise DomainError(f"Cloudflare KV PUT failed: {errors}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode()
            raise DomainError(f"Cloudflare KV PUT failed ({exc.code}): {body}") from exc

    def delete(self, key: str) -> None:
        self._check_configured()
        req = urllib.request.Request(self._url(key), headers=self._headers(), method="DELETE")
        try:
            urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return
            body = exc.read().decode()
            raise DomainError(f"Cloudflare KV DELETE failed ({exc.code}): {body}") from exc
