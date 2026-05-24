from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from .config import get_settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True)


def loads(value: str | None, fallback: Any = None) -> Any:
    if value is None:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    settings = get_settings()
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    data = dict(row)
    for key in (
        "destinations",
        "experiences",
        "travel_styles",
        "services",
        "inspiration",
        "journey_types",
        "tags",
        "gallery",
        "reviews",
        "media_urls",
    ):
        if key in data:
            data[key] = loads(data[key], [])
    return data


def migrate() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT UNIQUE,
              phone TEXT,
              whatsapp TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS planners (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              specialty TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS destinations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slug TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              image_url TEXT,
              packages_count INTEGER NOT NULL DEFAULT 0,
              tagline TEXT,
              duration TEXT,
              price REAL,
              rating REAL,
              review_count INTEGER NOT NULL DEFAULT 0,
              gallery TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS packages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slug TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              location TEXT NOT NULL,
              days INTEGER NOT NULL,
              price REAL NOT NULL,
              category TEXT,
              image_url TEXT,
              tagline TEXT,
              description TEXT,
              rating REAL,
              review_count INTEGER NOT NULL DEFAULT 0,
              reviews TEXT NOT NULL DEFAULT '[]',
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS inquiries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              public_id TEXT NOT NULL UNIQUE,
              customer_id INTEGER,
              full_name TEXT NOT NULL,
              email TEXT NOT NULL,
              phone TEXT,
              whatsapp TEXT,
              preferred_contact TEXT,
              destinations TEXT NOT NULL DEFAULT '[]',
              specific_place TEXT,
              experiences TEXT NOT NULL DEFAULT '[]',
              travel_styles TEXT NOT NULL DEFAULT '[]',
              services TEXT NOT NULL DEFAULT '[]',
              preferred_dates TEXT,
              adults INTEGER NOT NULL DEFAULT 1,
              children INTEGER NOT NULL DEFAULT 0,
              budget TEXT,
              passport_notes TEXT,
              occasion TEXT,
              inspiration TEXT NOT NULL DEFAULT '[]',
              inspiration_links TEXT,
              trip_feel TEXT,
              status TEXT NOT NULL DEFAULT 'New',
              assigned_planner_id INTEGER,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(customer_id) REFERENCES customers(id),
              FOREIGN KEY(assigned_planner_id) REFERENCES planners(id)
            );

            CREATE TABLE IF NOT EXISTS contact_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              public_id TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              contact TEXT NOT NULL,
              destination TEXT,
              message TEXT NOT NULL,
              journey_types TEXT NOT NULL DEFAULT '[]',
              status TEXT NOT NULL DEFAULT 'New',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS wishlists (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER NOT NULL,
              package_slug TEXT NOT NULL,
              created_at TEXT NOT NULL,
              UNIQUE(customer_id, package_slug),
              FOREIGN KEY(customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS media (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              filename TEXT NOT NULL,
              url TEXT NOT NULL,
              content_type TEXT,
              size_bytes INTEGER,
              alt_text TEXT,
              owner_type TEXT,
              owner_id INTEGER,
              owner_slug TEXT,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviews (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              public_id TEXT NOT NULL UNIQUE,
              customer_id INTEGER NOT NULL,
              package_slug TEXT NOT NULL,
              rating INTEGER NOT NULL,
              body TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'approved',
              media_urls TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL,
              FOREIGN KEY(customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS memories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              public_id TEXT NOT NULL UNIQUE,
              customer_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              destination TEXT,
              travel_date_from TEXT,
              travel_date_to TEXT,
              is_public INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'published',
              media_urls TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(customer_id) REFERENCES customers(id)
            );
            """
        )
        # SQLite cannot ADD COLUMN with a UNIQUE constraint — add the column
        # first, then enforce uniqueness with a separate index.
        for alter in (
            "ALTER TABLE customers ADD COLUMN auth0_sub TEXT",
            "ALTER TABLE customers ADD COLUMN password_hash TEXT",
            "ALTER TABLE customers ADD COLUMN username TEXT",
            "ALTER TABLE customers ADD COLUMN role TEXT DEFAULT 'user'",
            "ALTER TABLE media ADD COLUMN owner_id INTEGER",
            "ALTER TABLE reviews ADD COLUMN flag_reason TEXT",
            "ALTER TABLE reviews ADD COLUMN updated_at TEXT",
            "ALTER TABLE planners ADD COLUMN photo_url TEXT",
        ):
            try:
                conn.execute(alter)
            except Exception:
                pass  # column already exists — safe to ignore

        # Unique indexes (idempotent; skipped if already present).
        for idx in (
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_auth0_sub "
            "ON customers(auth0_sub) WHERE auth0_sub IS NOT NULL",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email "
            "ON customers(email) WHERE email IS NOT NULL",
        ):
            try:
                conn.execute(idx)
            except Exception:
                pass
        seed(conn)


def seed(conn: sqlite3.Connection) -> None:
    now = utc_now()
    if conn.execute("SELECT COUNT(*) FROM planners").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO planners (name, email, specialty, created_at) VALUES (?, ?, ?, ?)",
            [
                ("Maya Rao", "maya@journeymakers.travel", "Asia journeys", now),
                ("Leo Hart", "leo@journeymakers.travel", "Alpine luxury", now),
            ],
        )

    if conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
        conn.execute(
            "INSERT INTO customers (name, email, phone, whatsapp, created_at) VALUES (?, ?, ?, ?, ?)",
            ("Aarav Mehta", "aarav@example.com", "+91 90000 00000", "+91 90000 00000", now),
        )

    if conn.execute("SELECT COUNT(*) FROM destinations").fetchone()[0] == 0:
        destinations = [
            ("bangkok-singapore", "Bangkok & Singapore", "/assets/Bangkok & Singapore.jpeg", 12, "Fusion of flavors and skyline", "10 Days", 10900, 4.8, 148),
            ("newyork", "New York", "/assets/Newyork.jpg", 9, "City that never sleeps", "8 Days", 9800, 4.9, 201),
            ("salonei", "Salonei", "/assets/Salonei.jpeg", 7, "Soulful spice and sunset style", "9 Days", 8700, 4.7, 112),
            ("switzerland", "Switzerland", "/assets/swizerland.jpeg", 11, "Alpine elegance", "11 Days", 12500, 4.9, 223),
            ("tokyo-seoul", "Tokyo & Seoul", "/assets/Tokyo & Seoul.jpeg", 10, "Neon culture", "10 Days", 11200, 4.8, 188),
            ("vietnam", "Vietnam", "/assets/vitenam.jpeg", 8, "River rhythm", "9 Days", 8400, 4.7, 171),
        ]
        conn.executemany(
            """
            INSERT INTO destinations
            (slug, name, image_url, packages_count, tagline, duration, price, rating, review_count, gallery, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
            """,
            [(*item, now, now) for item in destinations],
        )

    if conn.execute("SELECT COUNT(*) FROM packages").fetchone()[0] == 0:
        # Each tuple: (slug, title, location, days, price, category, image_url, tagline, description)
        packages = [
            (
                "bangkok-singapore", "Bangkok & Singapore Journey", "Thailand & Singapore",
                10, 10900, "Signature", "/assets/Bangkok & Singapore.jpeg",
                "Street food, skyline bars, and cultural contrast.",
                "A 10-day journey blending Bangkok's vibrant street-food scene with Singapore's "
                "sleek skyline and multicultural neighbourhoods. Includes guided temple visits, "
                "hawker-centre dinners, a cruise on the Chao Phraya, and a rooftop bar evening.",
            ),
            (
                "newyork-citypulse", "New York City Pulse", "USA",
                8, 9800, "City Adventure", "/assets/Newyork.jpg",
                "Broadway nights and rooftop mornings.",
                "Eight days in the city that never sleeps: Broadway shows, Central Park mornings, "
                "Chelsea gallery walks, Empire State sunsets, and world-class dining from Chinatown "
                "to the West Village.",
            ),
            (
                "salonei-retreat", "Salonei Retreat", "West Africa",
                9, 8700, "Exclusive", "/assets/Salonei.jpeg",
                "Quiet beaches and soulful evenings.",
                "An intimate nine-day escape to Salonei's unspoiled coastline, vibrant local "
                "markets, and spice-laced evening feasts. Small-group, off-the-beaten-path "
                "itinerary designed for travellers seeking authentic West African culture.",
            ),
            (
                "switzerland-alpine", "Switzerland Alpine Escape", "Switzerland",
                11, 12500, "Luxury", "/assets/swizerland.jpeg",
                "Chalets, cable cars, and lakeside elegance.",
                "Eleven days of alpine luxury: private chalet stays in the Bernese Oberland, "
                "panoramic cable-car rides above Zermatt, cheese-and-wine evenings in Gruyères, "
                "and a leisurely boat cruise on Lake Geneva.",
            ),
            (
                "tokyo-seoul-fusion", "Tokyo & Seoul Fusion", "Japan & South Korea",
                10, 11200, "Culture & Cuisine", "/assets/Tokyo & Seoul.jpeg",
                "Neon nights, temples, and culinary highs.",
                "Ten days traversing two iconic capitals: Tokyo's neon-lit Shibuya, Senso-ji at "
                "dawn, and ramen alleys; then Seoul's Gyeongbokgung palace, Insadong galleries, "
                "and a K-BBQ crawl through Mapo-gu.",
            ),
            (
                "vietnam-river", "Vietnam River Reverie", "Vietnam",
                9, 8400, "Adventure", "/assets/vitenam.jpeg",
                "Emerald waterways and coastal serenity.",
                "A nine-day adventure from the limestone karsts of Ha Long Bay to the lantern-lit "
                "streets of Hoi An and the Mekong Delta's floating markets. Kayaking, cooking "
                "classes, and overnight junk-boat stays included.",
            ),
        ]
        conn.executemany(
            """
            INSERT INTO packages
            (slug, title, location, days, price, category, image_url, tagline, description,
             rating, review_count, reviews, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 4.8, 100, '[]', 1, ?, ?)
            """,
            [(*item, now, now) for item in packages],
        )

    if conn.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0] == 0:
        samples = [
            ("Priya Shah", "priya@example.com", "Bali", "$10k - $25k", "New"),
            ("James Carter", "james@example.com", "Iceland", "$25k+", "Assigned"),
            ("Mei Tanaka", "mei@example.com", "Greece", "$5k - $10k", "In review"),
        ]
        for index, (name, email, destination, budget, status) in enumerate(samples, start=2054):
            conn.execute(
                """
                INSERT INTO inquiries
                (public_id, full_name, email, destinations, adults, children, budget, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 2, 0, ?, ?, ?, ?)
                """,
                (f"INQ-{index}", name, email, dumps([destination]), budget, status, now, now),
            )
