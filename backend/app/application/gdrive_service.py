"""Google Drive OAuth + file upload service.

Set these environment variables to enable:
  GOOGLE_CLIENT_ID      — from Google Cloud Console OAuth 2.0 credentials
  GOOGLE_CLIENT_SECRET  — from Google Cloud Console OAuth 2.0 credentials
  GOOGLE_REDIRECT_URI   — must match the URI registered in Google Cloud Console
                          (default: http://localhost:8000/admin/gdrive/callback)

The super admin connects their Google account once; the refresh token is stored
in the `customers` table against their user row. All subsequent media uploads
go to their Google Drive and the returned share link is stored in the DB.
"""
from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from ..config import Settings
from ..domain.exceptions import DomainError

if TYPE_CHECKING:
    from .system_settings_service import SystemSettingsService


_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
]

_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
_FILES_URL = "https://www.googleapis.com/drive/v3/files"


class GDriveService:
    def __init__(self, settings: Settings, db: Any, system_settings: "SystemSettingsService | None" = None) -> None:
        self._settings = settings
        self._db = db
        self._system_settings = system_settings

    def _get_client_id(self) -> str:
        if self._system_settings:
            val = self._system_settings.get("google.client_id")
            if val:
                return val
        return self._settings.google_client_id

    def _get_client_secret(self) -> str:
        if self._system_settings:
            val = self._system_settings.get("google.client_secret")
            if val:
                return val
        return self._settings.google_client_secret

    def _is_configured(self) -> bool:
        return bool(self._get_client_id() and self._get_client_secret())

    # ── OAuth helpers ─────────────────────────────────────────────────────────

    def get_authorize_url(self, state: str = "") -> str:
        if not self._is_configured():
            raise DomainError("Google OAuth is not configured. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in backend/.env or via the super admin Settings tab.")
        import urllib.parse
        params = {
            "client_id": self._get_client_id(),
            "redirect_uri": self._settings.google_redirect_uri,
            "response_type": "code",
            "scope": " ".join(_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str, admin_customer_id: int) -> dict[str, Any]:
        import urllib.request
        import urllib.parse
        if not self._is_configured():
            raise DomainError("Google OAuth is not configured.")
        body = urllib.parse.urlencode({
            "code": code,
            "client_id": self._get_client_id(),
            "client_secret": self._get_client_secret(),
            "redirect_uri": self._settings.google_redirect_uri,
            "grant_type": "authorization_code",
        }).encode()
        req = urllib.request.Request(_TOKEN_URL, data=body, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req) as resp:
            token_data = json.loads(resp.read())
        refresh_token = token_data.get("refresh_token")
        if not refresh_token:
            raise DomainError("Google did not return a refresh token. Ensure 'access_type=offline' and 'prompt=consent'.")
        self._save_refresh_token(admin_customer_id, refresh_token)
        return {"status": "connected", "email": token_data.get("email", "")}

    def get_status(self, admin_customer_id: int) -> dict[str, Any]:
        token = self._load_refresh_token(admin_customer_id)
        return {"connected": token is not None}

    def disconnect(self, admin_customer_id: int) -> None:
        self._save_refresh_token(admin_customer_id, None)

    # ── Upload ────────────────────────────────────────────────────────────────

    def upload_file(
        self,
        admin_customer_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """Upload a file to the admin's GDrive and return a publicly shareable URL."""
        import urllib.request
        import urllib.parse

        refresh_token = self._load_refresh_token(admin_customer_id)
        if not refresh_token:
            raise DomainError("Google Drive is not connected. Connect your account from the admin settings.")

        access_token = self._refresh_access_token(refresh_token)

        # Multipart upload — metadata part
        metadata = json.dumps({"name": filename}).encode()
        boundary = b"gdrive_upload_boundary"
        body = (
            b"--" + boundary + b"\r\n"
            b"Content-Type: application/json; charset=UTF-8\r\n\r\n"
            + metadata + b"\r\n"
            b"--" + boundary + b"\r\n"
            b"Content-Type: " + content_type.encode() + b"\r\n\r\n"
            + content + b"\r\n"
            b"--" + boundary + b"--"
        )

        upload_req = urllib.request.Request(
            f"{_UPLOAD_URL}?uploadType=multipart",
            data=body,
            method="POST",
        )
        upload_req.add_header("Authorization", f"Bearer {access_token}")
        upload_req.add_header("Content-Type", f"multipart/related; boundary={boundary.decode()}")

        with urllib.request.urlopen(upload_req) as resp:
            file_data = json.loads(resp.read())

        file_id = file_data["id"]
        self._make_public(file_id, access_token)
        return f"https://drive.google.com/uc?export=view&id={file_id}"

    # ── Internal ──────────────────────────────────────────────────────────────

    def _refresh_access_token(self, refresh_token: str) -> str:
        import urllib.request
        import urllib.parse

        body = urllib.parse.urlencode({
            "client_id": self._get_client_id(),
            "client_secret": self._get_client_secret(),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }).encode()
        req = urllib.request.Request(_TOKEN_URL, data=body, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
        access_token = data.get("access_token")
        if not access_token:
            raise DomainError("Failed to refresh Google access token. Re-connect your Google account.")
        return str(access_token)

    def _make_public(self, file_id: str, access_token: str) -> None:
        import urllib.request
        body = json.dumps({"role": "reader", "type": "anyone"}).encode()
        req = urllib.request.Request(
            f"{_FILES_URL}/{file_id}/permissions",
            data=body,
            method="POST",
        )
        req.add_header("Authorization", f"Bearer {access_token}")
        req.add_header("Content-Type", "application/json")
        urllib.request.urlopen(req)

    def _save_refresh_token(self, customer_id: int, token: str | None) -> None:
        with self._db.connect() as conn:
            conn.execute(
                "UPDATE customers SET gdrive_refresh_token = ? WHERE id = ?",
                (token, customer_id),
            )

    def _load_refresh_token(self, customer_id: int) -> str | None:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT gdrive_refresh_token FROM customers WHERE id = ?",
                (customer_id,),
            ).fetchone()
        if row and row[0]:
            return str(row[0])
        return None
