#!/usr/bin/env python3
"""Seed a test moderator account and print its login token.

Run from the project root:
    python backend/scripts/make_test_moderator.py

Or from backend/:
    python scripts/make_test_moderator.py
"""
from __future__ import annotations

import hashlib
import hmac
import os
import sqlite3
import sys
import time
from pathlib import Path

# Resolve project root so the script works from any CWD
_HERE = Path(__file__).resolve().parent
_BACKEND = _HERE.parent
sys.path.insert(0, str(_BACKEND))

# Load .env before importing config
from dotenv import load_dotenv
load_dotenv(_BACKEND / ".env")

from app.config import get_settings  # noqa: E402

try:
    import jwt as pyjwt
except ImportError:
    print("ERROR: PyJWT not installed. Run: pip install PyJWT")
    sys.exit(1)

# ── Credentials for the test account ──────────────────────────────────────────
TEST_EMAIL    = "moderator@test.com"
TEST_PASSWORD = "Mod#Test2025"
TEST_NAME     = "Test Moderator"
TEST_ROLE     = "moderator"

LOCAL_ISS = "journeymakers-local"
_TTL = 60 * 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 310_000
    ).hex()
    return f"pbkdf2:{salt}:{digest}"


def main() -> None:
    settings = get_settings()
    db_path = settings.database_path

    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # Check if the account already exists
    row = conn.execute(
        "SELECT id, role FROM customers WHERE email = ?", (TEST_EMAIL,)
    ).fetchone()

    if row:
        customer_id = row["id"]
        # Ensure role is set to moderator
        conn.execute(
            "UPDATE customers SET role = ? WHERE id = ?", (TEST_ROLE, customer_id)
        )
        conn.commit()
        print(f"[updated] Existing account upgraded to moderator (id={customer_id})")
    else:
        password_hash = hash_password(TEST_PASSWORD)
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        conn.execute(
            """
            INSERT INTO customers (name, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (TEST_NAME, TEST_EMAIL, password_hash, TEST_ROLE, now),
        )
        conn.commit()
        customer_id = conn.execute(
            "SELECT id FROM customers WHERE email = ?", (TEST_EMAIL,)
        ).fetchone()["id"]
        print(f"[created] Moderator account seeded (id={customer_id})")

    conn.close()

    # Issue a 7-day JWT
    now_ts = int(time.time())
    token = pyjwt.encode(
        {
            "sub": str(customer_id),
            "email": TEST_EMAIL,
            "name": TEST_NAME,
            "role": TEST_ROLE,
            "iss": LOCAL_ISS,
            "iat": now_ts,
            "exp": now_ts + _TTL,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )

    print()
    print("=" * 60)
    print("  TEST MODERATOR CREDENTIALS")
    print("=" * 60)
    print(f"  Email    : {TEST_EMAIL}")
    print(f"  Password : {TEST_PASSWORD}")
    print(f"  Role     : {TEST_ROLE}")
    print(f"  DB id    : {customer_id}")
    print()
    print("  Bearer token (valid 7 days):")
    print()
    print(f"  {token}")
    print()
    print("  Usage:")
    print('  curl -H "Authorization: Bearer <token>" http://localhost:8000/moderator/reviews')
    print("=" * 60)


if __name__ == "__main__":
    main()
