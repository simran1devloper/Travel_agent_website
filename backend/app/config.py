from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
import os

# Load backend/.env automatically (no-op if file is missing)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

# Resolve the default DB path relative to this file so the server can be
# launched from any working directory without creating a ghost database.
_DEFAULT_DB = str(Path(__file__).parent.parent / "data" / "journeymakers.sqlite3")
_DEFAULT_UPLOAD_DIR = str(Path(__file__).parent.parent / "uploads")


class Settings(BaseModel):
    app_name: str = "JourneyMakers API"
    database_path: Path = Path(os.getenv("JOURNEYMAKERS_DB", _DEFAULT_DB))
    upload_dir: Path = Path(os.getenv("JOURNEYMAKERS_UPLOAD_DIR", _DEFAULT_UPLOAD_DIR))
    admin_token: str = os.getenv("JOURNEYMAKERS_ADMIN_TOKEN", "dev-admin-token")
    customer_token: str = os.getenv("JOURNEYMAKERS_CUSTOMER_TOKEN", "dev-customer-token")
    auth0_domain: str = os.getenv("AUTH0_DOMAIN", "")
    auth0_client_id: str = os.getenv("AUTH0_CLIENT_ID", "")
    auth0_audience: str = os.getenv("AUTH0_AUDIENCE", "")
    auth0_algorithms: list[str] = ["RS256"]
    auth0_roles_claim: str = os.getenv("AUTH0_ROLES_CLAIM", "https://journeymakers.travel/roles")
    jwt_secret: str = os.getenv("JOURNEYMAKERS_JWT_SECRET", "dev-jwt-secret-change-in-production")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "JOURNEYMAKERS_CORS_ORIGINS",
            "http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        ).split(",")
        if origin.strip()
    ]

    @property
    def auth0_issuer(self) -> str:
        if not self.auth0_domain:
            return ""
        domain = self.auth0_domain.removeprefix("https://").removeprefix("http://").rstrip("/")
        return f"https://{domain}/"

    @property
    def auth0_jwks_url(self) -> str:
        return f"{self.auth0_issuer}.well-known/jwks.json"

    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/admin/gdrive/callback"
    )
    google_signin_redirect_uri: str = os.getenv(
        "GOOGLE_SIGNIN_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
    )
    frontend_url: str = os.getenv("JOURNEYMAKERS_FRONTEND_URL", "http://localhost:5173")

    # Cloudflare R2 (S3-compatible object storage)
    r2_account_id: str = os.getenv("R2_ACCOUNT_ID", "")
    r2_access_key_id: str = os.getenv("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    r2_bucket: str = os.getenv("R2_BUCKET", "")
    r2_public_url: str = os.getenv("R2_PUBLIC_URL", "")

    # Default storage backend — overridden by super-admin via API
    default_storage_backend: str = os.getenv("JOURNEYMAKERS_STORAGE", "local")

    # ── Database backend ─────────────────────────────────────────────────────
    # Options: "local-sqlite" (default), "gdrive-sqlite", "r2-sqlite", "neon-postgres"
    # Overridden at runtime by the super-admin via UI (stored in system_settings).
    db_backend: str = os.getenv("JOURNEYMAKERS_DB_BACKEND", "local-sqlite")

    # Neon Postgres connection string (used when db_backend = "neon-postgres")
    neon_database_url: str = os.getenv("NEON_DATABASE_URL", "")

    # GDrive SQLite (used when db_backend = "gdrive-sqlite")
    gdrive_db_refresh_token: str = os.getenv("GDRIVE_DB_REFRESH_TOKEN", "")
    gdrive_db_file_id: str = os.getenv("GDRIVE_DB_FILE_ID", "")

    # R2 SQLite (uses the same R2 credentials above; override object key if needed)
    r2_db_key: str = os.getenv("R2_DB_KEY", "db/journeymakers.sqlite3")

    # ── Secrets backend ──────────────────────────────────────────────────────
    # Which store to use for sensitive credentials (r2 keys, etc.)
    # Options: "sqlite" (default, plain-text or encrypted), "cloudflare_kv", "infisical"
    secrets_backend: str = os.getenv("SECRETS_BACKEND", "sqlite")

    # SQLite secrets store: optional Fernet encryption key
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    secrets_encryption_key: str = os.getenv("SECRETS_ENCRYPTION_KEY", "")

    # Cloudflare Workers KV secrets store
    cf_kv_account_id: str = os.getenv("CF_KV_ACCOUNT_ID", "")
    cf_kv_namespace_id: str = os.getenv("CF_KV_NAMESPACE_ID", "")
    cf_kv_api_token: str = os.getenv("CF_KV_API_TOKEN", "")

    # Infisical secrets store
    infisical_token: str = os.getenv("INFISICAL_TOKEN", "")
    infisical_workspace_id: str = os.getenv("INFISICAL_WORKSPACE_ID", "")
    infisical_environment: str = os.getenv("INFISICAL_ENVIRONMENT", "prod")
    infisical_base_url: str = os.getenv("INFISICAL_BASE_URL", "https://app.infisical.com")

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def r2_enabled(self) -> bool:
        return bool(
            self.r2_account_id
            and self.r2_access_key_id
            and self.r2_secret_access_key
            and self.r2_bucket
        )

    @property
    def auth0_enabled(self) -> bool:
        # Audience is optional — required only when a backend API is registered in Auth0.
        # Without it Auth0 issues opaque tokens; with it, Auth0 issues verifiable JWTs.
        return bool(self.auth0_domain)


@lru_cache
def get_settings() -> Settings:
    return Settings()
