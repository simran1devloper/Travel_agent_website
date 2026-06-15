#!/usr/bin/env python3
"""Seed a test regular-user account and print its login token.

Run from the project root:
    python backend/scripts/make_test_user.py

Or from backend/:
    python scripts/make_test_user.py
"""
from __future__ import annotations

import hashlib
import os
import sqlite3
import sys
import time
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_BACKEND = _HERE.parent
sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv
load_dotenv(_BACKEND / ".env")

from app.config import get_settings  # noqa: E402

try:
    import jwt as pyjwt
except ImportError:
    print("ERROR: PyJWT not installed. Run: pip install PyJWT")
    sys.exit(1)

TEST_EMAIL    = "user@test.com"
TEST_PASSWORD = "User#Test2025"
TEST_NAME     = "Test User"
TEST_ROLE     = "user"

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

    row = conn.execute(
        "SELECT id, role FROM customers WHERE email = ?", (TEST_EMAIL,)
    ).fetchone()

    if row:
        customer_id = row["id"]
        conn.execute(
            "UPDATE customers SET role = ? WHERE id = ?", (TEST_ROLE, customer_id)
        )
        conn.commit()
        print(f"[updated] Existing account role set to user (id={customer_id})")
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
        print(f"[created] User account seeded (id={customer_id})")

    conn.close()

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
    print("  TEST USER CREDENTIALS")
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
    print("  Access:")
    print("  - Customer dashboard  (/dashboard)")
    print("  - Wishlist, reviews, memories  (/user/memories, etc.)")
    print()
    print("  Usage:")
    print('  curl -H "Authorization: Bearer <token>" http://localhost:8000/dashboard')
    print("=" * 60)


if __name__ == "__main__":
    main()
