#!/usr/bin/env python3
"""Create the JourneyMakers schema on a Neon Postgres database.

The app's SQLite migrations are skipped for Neon at startup (they use
SQLite DDL and cannot run on Postgres). Run this script once after
creating your Neon project to initialize the schema.

Usage:
    python backend/scripts/init_neon_schema.py

Requirements:
    NEON_DATABASE_URL must be set in backend/.env  (or as env var)
    Format: postgresql://user:password@host/dbname?sslmode=require

Optional flags:
    --drop   Drop all existing tables first (DESTRUCTIVE — use for reset only)
"""
from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
load_dotenv(_BACKEND / ".env")

from app.config import get_settings

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2-binary not installed.")
    print("       Run: uv pip install psycopg2-binary  (or pip install psycopg2-binary)")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Full Postgres-compatible schema
# This is the canonical final state — DDL + all incremental additions merged.
# ---------------------------------------------------------------------------

_SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
  id               SERIAL PRIMARY KEY,
  name             TEXT    NOT NULL,
  email            TEXT    UNIQUE,
  phone            TEXT,
  whatsapp         TEXT,
  created_at       TEXT    NOT NULL,
  password_hash    TEXT,
  username         TEXT,
  role             TEXT    DEFAULT 'user',
  auth0_sub        TEXT,
  gdrive_refresh_token TEXT,
  is_superadmin    INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_auth0_sub
  ON customers(auth0_sub) WHERE auth0_sub IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email
  ON customers(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS planners (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  specialty  TEXT,
  created_at TEXT NOT NULL,
  photo_url  TEXT
);

CREATE TABLE IF NOT EXISTS destinations (
  id             SERIAL PRIMARY KEY,
  slug           TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  image_url      TEXT,
  packages_count INTEGER NOT NULL DEFAULT 0,
  tagline        TEXT,
  duration       TEXT,
  price          REAL,
  rating         REAL,
  review_count   INTEGER NOT NULL DEFAULT 0,
  gallery        TEXT    NOT NULL DEFAULT '[]',
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id                SERIAL PRIMARY KEY,
  slug              TEXT    NOT NULL UNIQUE,
  title             TEXT    NOT NULL,
  location          TEXT    NOT NULL,
  days              INTEGER NOT NULL,
  price             REAL    NOT NULL,
  category          TEXT,
  image_url         TEXT,
  tagline           TEXT,
  description       TEXT,
  rating            REAL,
  review_count      INTEGER NOT NULL DEFAULT 0,
  reviews           TEXT    NOT NULL DEFAULT '[]',
  published         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL,
  card_type         TEXT    NOT NULL DEFAULT 'normal',
  destination_slugs TEXT    NOT NULL DEFAULT '[]',
  service_ids       TEXT    NOT NULL DEFAULT '[]',
  offer_ids         TEXT    NOT NULL DEFAULT '[]',
  media_urls        TEXT    NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS inquiries (
  id                  SERIAL PRIMARY KEY,
  public_id           TEXT    NOT NULL UNIQUE,
  customer_id         INTEGER,
  full_name           TEXT    NOT NULL,
  email               TEXT    NOT NULL,
  phone               TEXT,
  whatsapp            TEXT,
  preferred_contact   TEXT,
  destinations        TEXT    NOT NULL DEFAULT '[]',
  specific_place      TEXT,
  experiences         TEXT    NOT NULL DEFAULT '[]',
  travel_styles       TEXT    NOT NULL DEFAULT '[]',
  services            TEXT    NOT NULL DEFAULT '[]',
  preferred_dates     TEXT,
  adults              INTEGER NOT NULL DEFAULT 1,
  children            INTEGER NOT NULL DEFAULT 0,
  budget              TEXT,
  passport_notes      TEXT,
  occasion            TEXT,
  inspiration         TEXT    NOT NULL DEFAULT '[]',
  inspiration_links   TEXT,
  trip_feel           TEXT,
  status              TEXT    NOT NULL DEFAULT 'New',
  assigned_planner_id INTEGER,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL,
  date_from           TEXT,
  date_to             TEXT,
  basket_items        TEXT    NOT NULL DEFAULT '[]',
  moderator_note      TEXT,
  FOREIGN KEY (customer_id)         REFERENCES customers(id),
  FOREIGN KEY (assigned_planner_id) REFERENCES planners(id)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id           SERIAL PRIMARY KEY,
  public_id    TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  contact      TEXT NOT NULL,
  destination  TEXT,
  message      TEXT NOT NULL,
  journey_types TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'New',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL,
  package_slug TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  UNIQUE (customer_id, package_slug),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS media (
  id                SERIAL PRIMARY KEY,
  filename          TEXT NOT NULL,
  url               TEXT NOT NULL,
  content_type      TEXT,
  size_bytes        INTEGER,
  alt_text          TEXT,
  owner_type        TEXT,
  owner_id          INTEGER,
  owner_slug        TEXT,
  created_at        TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS reviews (
  id             SERIAL PRIMARY KEY,
  public_id      TEXT    NOT NULL UNIQUE,
  customer_id    INTEGER NOT NULL,
  package_slug   TEXT    NOT NULL,
  rating         INTEGER NOT NULL,
  body           TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'approved',
  media_urls     TEXT    NOT NULL DEFAULT '[]',
  created_at     TEXT    NOT NULL,
  flag_reason    TEXT,
  updated_at     TEXT,
  title          TEXT    NOT NULL DEFAULT '',
  trip_date      TEXT,
  helpful_count  INTEGER NOT NULL DEFAULT 0,
  admin_reply    TEXT,
  verified       INTEGER NOT NULL DEFAULT 0,
  moderation_note TEXT,
  entity_type    TEXT    NOT NULL DEFAULT 'package',
  entity_slug    TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS memories (
  id              SERIAL PRIMARY KEY,
  public_id       TEXT    NOT NULL UNIQUE,
  customer_id     INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  description     TEXT,
  destination     TEXT,
  travel_date_from TEXT,
  travel_date_to  TEXT,
  is_public       INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'published',
  media_urls      TEXT    NOT NULL DEFAULT '[]',
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS services (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT '',
  short_description    TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  detailed_description TEXT NOT NULL DEFAULT '',
  image_url            TEXT NOT NULL DEFAULT '',
  icon_url             TEXT NOT NULL DEFAULT '',
  image_alt            TEXT NOT NULL DEFAULT '',
  rating               REAL NOT NULL DEFAULT 5.0,
  review_count         INTEGER NOT NULL DEFAULT 0,
  highlight            TEXT NOT NULL DEFAULT '',
  badge_text           TEXT NOT NULL DEFAULT '',
  cta_text             TEXT NOT NULL DEFAULT 'Explore',
  cta_link             TEXT NOT NULL DEFAULT '/services',
  show_homepage        INTEGER NOT NULL DEFAULT 1,
  show_services_page   INTEGER NOT NULL DEFAULT 1,
  show_hero_card       INTEGER NOT NULL DEFAULT 0,
  show_footer          INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'published',
  gallery              TEXT NOT NULL DEFAULT '[]',
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  price                REAL
);

CREATE TABLE IF NOT EXISTS faqs (
  id         SERIAL PRIMARY KEY,
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS testimonials (
  id         SERIAL PRIMARY KEY,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL,
  quote      TEXT    NOT NULL,
  location   TEXT    NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS site_stats (
  id         SERIAL PRIMARY KEY,
  value      TEXT    NOT NULL,
  label      TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id             SERIAL PRIMARY KEY,
  title          TEXT    NOT NULL,
  subtitle       TEXT    NOT NULL DEFAULT '',
  code           TEXT,
  description    TEXT    NOT NULL DEFAULT '',
  offer_type     TEXT    NOT NULL DEFAULT 'percent',
  discount_value REAL    NOT NULL DEFAULT 0,
  badge_label    TEXT    NOT NULL DEFAULT 'Special Offer',
  badge_color    TEXT    NOT NULL DEFAULT 'accent',
  applies_to     TEXT    NOT NULL DEFAULT 'all',
  valid_from     TEXT,
  valid_until    TEXT,
  max_uses       INTEGER,
  current_uses   INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  is_featured    INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
  id         SERIAL PRIMARY KEY,
  page       TEXT    NOT NULL,
  section    TEXT    NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT    NOT NULL DEFAULT '',
  value_type TEXT    NOT NULL DEFAULT 'text',
  label      TEXT    NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL,
  UNIQUE (page, section, key)
);

CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  public_id   TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_slug TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL
);
"""

_DROP_ALL = """
DROP TABLE IF EXISTS comments       CASCADE;
DROP TABLE IF EXISTS site_content   CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS site_stats     CASCADE;
DROP TABLE IF EXISTS testimonials   CASCADE;
DROP TABLE IF EXISTS faqs           CASCADE;
DROP TABLE IF EXISTS offers         CASCADE;
DROP TABLE IF EXISTS memories       CASCADE;
DROP TABLE IF EXISTS reviews        CASCADE;
DROP TABLE IF EXISTS media          CASCADE;
DROP TABLE IF EXISTS wishlists      CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS inquiries      CASCADE;
DROP TABLE IF EXISTS packages       CASCADE;
DROP TABLE IF EXISTS destinations   CASCADE;
DROP TABLE IF EXISTS services       CASCADE;
DROP TABLE IF EXISTS planners       CASCADE;
DROP TABLE IF EXISTS customers      CASCADE;
"""

EXPECTED_TABLES = [
    "customers", "planners", "destinations", "packages", "inquiries",
    "contact_messages", "wishlists", "media", "reviews", "memories",
    "services", "faqs", "testimonials", "site_stats", "offers",
    "site_content", "system_settings", "comments",
]


def main() -> None:
    drop = "--drop" in sys.argv

    settings = get_settings()
    url = settings.neon_database_url

    if not url or "xxxx" in url or url == "":
        print("ERROR: NEON_DATABASE_URL is not set or still contains the placeholder value.")
        print()
        print("  1. Go to https://console.neon.tech")
        print("  2. Create a project (or open an existing one)")
        print("  3. Click  Connection Details → .env tab")
        print("  4. Copy the DATABASE_URL value")
        print("  5. Paste it as NEON_DATABASE_URL in your .env file")
        sys.exit(1)

    print(f"Connecting to Neon … {url[:url.index('@') + 1]}***")

    try:
        conn = psycopg2.connect(url)
    except Exception as e:
        print(f"ERROR: Could not connect to Neon Postgres.\n  {e}")
        sys.exit(1)

    cur = conn.cursor()

    if drop:
        confirm = input("DROP all tables? This deletes all data. Type YES to confirm: ")
        if confirm.strip() != "YES":
            print("Aborted.")
            conn.close()
            sys.exit(0)
        print("Dropping all tables …")
        cur.execute(_DROP_ALL)
        conn.commit()
        print("Done.")

    print("Creating schema …")
    cur.execute(_SCHEMA)
    conn.commit()

    # Verify
    cur.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' ORDER BY table_name"
    )
    existing = {r[0] for r in cur.fetchall()}
    missing  = [t for t in EXPECTED_TABLES if t not in existing]

    conn.close()

    print()
    print("=" * 60)
    print("  NEON SCHEMA INIT")
    print("=" * 60)
    if missing:
        print(f"  WARNING: missing tables: {missing}")
    else:
        print(f"  All {len(EXPECTED_TABLES)} tables created successfully.")
    print()
    print("  Next steps:")
    print("  1. In .env set:  JOURNEYMAKERS_DB_BACKEND=neon-postgres")
    print("  2. Restart the backend server")
    print("  3. Run seed scripts to create test accounts:")
    print("     python backend/scripts/seed_all_test_credentials.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
