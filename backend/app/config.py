from functools import lru_cache
from pathlib import Path
from pydantic import BaseModel
import os

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
    auth0_audience: str = os.getenv("AUTH0_AUDIENCE", "")
    auth0_algorithms: list[str] = ["RS256"]
    auth0_roles_claim: str = os.getenv("AUTH0_ROLES_CLAIM", "https://journeymakers.travel/roles")
    jwt_secret: str = os.getenv("JOURNEYMAKERS_JWT_SECRET", "dev-jwt-secret-change-in-production")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "JOURNEYMAKERS_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
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

    @property
    def auth0_enabled(self) -> bool:
        return bool(self.auth0_domain and self.auth0_audience)


@lru_cache
def get_settings() -> Settings:
    return Settings()
