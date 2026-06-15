#!/usr/bin/env python3
"""Seed test accounts for ALL roles and print a summary table.

Works with both local SQLite and Neon Postgres backends — automatically
detects which one is configured via JOURNEYMAKERS_DB_BACKEND in .env.

Run from the project root:
    python backend/scripts/seed_all_test_credentials.py

Or from backend/:
    python scripts/seed_all_test_credentials.py
"""
from __future__ import annotations

import hashlib
import os
import sys
import time
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_BACKEND = _HERE.parent
sys.path.insert(0, str(_BACKEND))

# Load root .env then backend/.env (backend takes precedence)
from dotenv import load_dotenv
load_dotenv(_BACKEND.parent / ".env")
load_dotenv(_BACKEND / ".env")

from app.config import get_settings  # noqa: E402

try:
    import jwt as pyjwt
except ImportError:
    print("ERROR: PyJWT not installed. Run: pip install PyJWT")
    sys.exit(1)

LOCAL_ISS = "journeymakers-local"
_TTL = 60 * 60 * 24 * 7  # 7 days

TEST_ACCOUNTS = [
    {"email": "user@test.com",       "password": "User#Test2025",   "name": "Test User",       "role": "user",       "is_superadmin": 0},
    {"email": "admin@test.com",      "password": "Admin#Test2025",  "name": "Test Admin",      "role": "admin",      "is_superadmin": 0},
    {"email": "moderator@test.com",  "password": "Mod#Test2025",    "name": "Test Moderator",  "role": "moderator",  "is_superadmin": 0},
    {"email": "superadmin@test.com", "password": "Super#Admin2025", "name": "Test Superadmin", "role": "superadmin", "is_superadmin": 1},
]


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 310_000).hex()
    return f"pbkdf2:{salt}:{digest}"


def make_token(account: dict, customer_id: int, jwt_secret: str) -> str:
    now_ts = int(time.time())
    return pyjwt.encode(
        {
            "sub": str(customer_id),
            "email": account["email"],
            "name": account["name"],
            "role": account["role"],
            "iss": LOCAL_ISS,
            "iat": now_ts,
            "exp": now_ts + _TTL,
        },
        jwt_secret,
        algorithm="HS256",
    )


# ── SQLite backend ────────────────────────────────────────────────────────────

def seed_sqlite(settings) -> list[dict]:
    import sqlite3

    db_path = settings.database_path
    if not db_path.exists():
        print(f"ERROR: SQLite DB not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    results = []

    for account in TEST_ACCOUNTS:
        row = conn.execute("SELECT id FROM customers WHERE email = ?", (account["email"],)).fetchone()
        if row:
            customer_id = row["id"]
            conn.execute(
                "UPDATE customers SET role = ?, is_superadmin = ? WHERE id = ?",
                (account["role"], account["is_superadmin"], customer_id),
            )
            conn.commit()
            action = "updated"
        else:
            pw_hash = hash_password(account["password"])
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            conn.execute(
                "INSERT INTO customers (name, email, password_hash, role, is_superadmin, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (account["name"], account["email"], pw_hash, account["role"], account["is_superadmin"], now),
            )
            conn.commit()
            customer_id = conn.execute("SELECT id FROM customers WHERE email = ?", (account["email"],)).fetchone()["id"]
            action = "created"

        token = make_token(account, customer_id, settings.jwt_secret)
        results.append({**account, "id": customer_id, "action": action, "token": token})
        print(f"[{action}] {account['role']:12s}  id={customer_id}  {account['email']}")

    conn.close()
    return results


# ── Neon Postgres backend ─────────────────────────────────────────────────────

def seed_neon(settings) -> list[dict]:
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2-binary not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    url = settings.neon_database_url
    if not url or "xxxx" in url:
        print("ERROR: NEON_DATABASE_URL is not set or still contains the placeholder.")
        print("       Fill it in .env first, then re-run this script.")
        sys.exit(1)

    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    results = []

    for account in TEST_ACCOUNTS:
        cur.execute("SELECT id FROM customers WHERE email = %s", (account["email"],))
        row = cur.fetchone()
        if row:
            customer_id = row["id"]
            cur.execute(
                "UPDATE customers SET role = %s, is_superadmin = %s WHERE id = %s",
                (account["role"], account["is_superadmin"], customer_id),
            )
            conn.commit()
            action = "updated"
        else:
            pw_hash = hash_password(account["password"])
            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            cur.execute(
                "INSERT INTO customers (name, email, password_hash, role, is_superadmin, created_at) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (account["name"], account["email"], pw_hash, account["role"], account["is_superadmin"], now),
            )
            customer_id = cur.fetchone()["id"]
            conn.commit()
            action = "created"

        token = make_token(account, customer_id, settings.jwt_secret)
        results.append({**account, "id": customer_id, "action": action, "token": token})
        print(f"[{action}] {account['role']:12s}  id={customer_id}  {account['email']}")

    cur.close()
    conn.close()
    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    settings = get_settings()
    backend = settings.db_backend.lower()

    print(f"Backend: {backend}")
    print()

    if backend == "neon-postgres":
        results = seed_neon(settings)
    else:
        results = seed_sqlite(settings)

    print()
    print("=" * 70)
    print("  ALL TEST CREDENTIALS  (tokens valid 7 days)")
    print("=" * 70)
    print(f"  {'ROLE':<12}  {'EMAIL':<26}  PASSWORD")
    print(f"  {'-'*12}  {'-'*26}  {'-'*20}")
    for r in results:
        print(f"  {r['role']:<12}  {r['email']:<26}  {r['password']}")
    print()
    print("  BEARER TOKENS")
    print()
    for r in results:
        print(f"  [{r['role'].upper()}]")
        print(f"  {r['token']}")
        print()
    print("=" * 70)
    print()
    print("  Sign in at /signin  — use the email + password above.")
    print("  Or paste a Bearer token directly into Authorization headers.")
    print("=" * 70)


if __name__ == "__main__":
    main()
