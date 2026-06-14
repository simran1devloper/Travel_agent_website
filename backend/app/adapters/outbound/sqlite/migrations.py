"""Database schema migrations and seed data.

Called once at application startup via the lifespan hook.
"""
from __future__ import annotations

import sqlite3

from ....domain.utils import json_dumps, utc_now
from .connection import SQLiteDatabase

_DDL = """
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

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  detailed_description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 5.0,
  review_count INTEGER NOT NULL DEFAULT 0,
  highlight TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT 'Explore',
  cta_link TEXT NOT NULL DEFAULT '/services',
  show_homepage INTEGER NOT NULL DEFAULT 1,
  show_services_page INTEGER NOT NULL DEFAULT 1,
  show_hero_card INTEGER NOT NULL DEFAULT 0,
  show_footer INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  gallery TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  code TEXT,
  description TEXT NOT NULL DEFAULT '',
  offer_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL DEFAULT 0,
  badge_label TEXT NOT NULL DEFAULT 'Special Offer',
  badge_color TEXT NOT NULL DEFAULT 'accent',
  applies_to TEXT NOT NULL DEFAULT 'all',
  valid_from TEXT,
  valid_until TEXT,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'text',
  label TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(page, section, key)
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
"""

_ALTERS = [
    "ALTER TABLE customers ADD COLUMN auth0_sub TEXT",
    "ALTER TABLE customers ADD COLUMN password_hash TEXT",
    "ALTER TABLE customers ADD COLUMN username TEXT",
    "ALTER TABLE customers ADD COLUMN role TEXT DEFAULT 'user'",
    "ALTER TABLE media ADD COLUMN owner_id INTEGER",
    "ALTER TABLE reviews ADD COLUMN flag_reason TEXT",
    "ALTER TABLE reviews ADD COLUMN updated_at TEXT",
    "ALTER TABLE planners ADD COLUMN photo_url TEXT",
    "ALTER TABLE reviews ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE reviews ADD COLUMN trip_date TEXT",
    "ALTER TABLE reviews ADD COLUMN helpful_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE reviews ADD COLUMN admin_reply TEXT",
    "ALTER TABLE reviews ADD COLUMN verified INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE services ADD COLUMN category TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN short_description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN detailed_description TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN image_url TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN icon_url TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN image_alt TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN badge_text TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE services ADD COLUMN cta_text TEXT NOT NULL DEFAULT 'Explore'",
    "ALTER TABLE services ADD COLUMN cta_link TEXT NOT NULL DEFAULT '/services'",
    "ALTER TABLE services ADD COLUMN show_homepage INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE services ADD COLUMN show_services_page INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE services ADD COLUMN show_hero_card INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE services ADD COLUMN show_footer INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE services ADD COLUMN status TEXT NOT NULL DEFAULT 'published'",
    "ALTER TABLE inquiries ADD COLUMN date_from TEXT",
    "ALTER TABLE inquiries ADD COLUMN date_to TEXT",
    "ALTER TABLE inquiries ADD COLUMN basket_items TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE customers ADD COLUMN gdrive_refresh_token TEXT",
    "ALTER TABLE customers ADD COLUMN is_superadmin INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE services ADD COLUMN price REAL",
    "ALTER TABLE reviews ADD COLUMN moderation_note TEXT",
    "ALTER TABLE inquiries ADD COLUMN moderator_note TEXT",
    # Item 10: package card_type + linked entities
    "ALTER TABLE packages ADD COLUMN card_type TEXT NOT NULL DEFAULT 'normal'",
    "ALTER TABLE packages ADD COLUMN destination_slugs TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE packages ADD COLUMN service_ids TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE packages ADD COLUMN offer_ids TEXT NOT NULL DEFAULT '[]'",
    # Reviews on destinations + services
    "ALTER TABLE reviews ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'package'",
    "ALTER TABLE reviews ADD COLUMN entity_slug TEXT",
    # Multi-media gallery for packages
    "ALTER TABLE packages ADD COLUMN media_urls TEXT NOT NULL DEFAULT '[]'",
    # Media moderation — user uploads start as pending
    "ALTER TABLE media ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending'",
]

_INDEXES = [
    (
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_auth0_sub "
        "ON customers(auth0_sub) WHERE auth0_sub IS NOT NULL"
    ),
    (
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email "
        "ON customers(email) WHERE email IS NOT NULL"
    ),
]


def migrate(db: SQLiteDatabase) -> None:
    """Apply DDL, incremental ALTERs, and indexes; then seed if tables are empty."""
    with db.connect() as conn:
        conn.executescript(_DDL)
        for stmt in _ALTERS:
            try:
                conn.execute(stmt)
            except Exception:
                pass  # column already exists — safe to ignore
        for idx in _INDEXES:
            try:
                conn.execute(idx)
            except Exception:
                pass
        _seed(conn)
        _patch_content_defaults(conn)
        _patch_service_content(conn)
        # Backfill: admin-owned media existing before moderation column was added → approved
        conn.execute(
            "UPDATE media SET moderation_status = 'approved' WHERE owner_type = 'admin' AND moderation_status = 'pending'"
        )


# ---------------------------------------------------------------------------
# Seed data (only inserted when tables are empty)
# ---------------------------------------------------------------------------

def _seed(conn: sqlite3.Connection) -> None:
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
            "INSERT INTO customers (name, email, phone, whatsapp, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
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
            (slug, name, image_url, packages_count, tagline, duration,
             price, rating, review_count, gallery, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
            """,
            [(*item, now, now) for item in destinations],
        )

    if conn.execute("SELECT COUNT(*) FROM packages").fetchone()[0] == 0:
        packages = [
            ("bangkok-singapore", "Bangkok & Singapore Journey", "Thailand & Singapore", 10, 10900, "Signature", "/assets/Bangkok & Singapore.jpeg", "Street food, skyline bars, and cultural contrast.", "A 10-day journey blending Bangkok's vibrant street-food scene with Singapore's sleek skyline and multicultural neighbourhoods."),
            ("newyork-citypulse", "New York City Pulse", "USA", 8, 9800, "City Adventure", "/assets/Newyork.jpg", "Broadway nights and rooftop mornings.", "Eight days in the city that never sleeps: Broadway shows, Central Park mornings, Chelsea gallery walks."),
            ("salonei-retreat", "Salonei Retreat", "West Africa", 9, 8700, "Exclusive", "/assets/Salonei.jpeg", "Quiet beaches and soulful evenings.", "An intimate nine-day escape to Salonei's unspoiled coastline."),
            ("switzerland-alpine", "Switzerland Alpine Escape", "Switzerland", 11, 12500, "Luxury", "/assets/swizerland.jpeg", "Chalets, cable cars, and lakeside elegance.", "Eleven days of alpine luxury: private chalet stays in the Bernese Oberland."),
            ("tokyo-seoul-fusion", "Tokyo & Seoul Fusion", "Japan & South Korea", 10, 11200, "Culture & Cuisine", "/assets/Tokyo & Seoul.jpeg", "Neon nights, temples, and culinary highs.", "Ten days traversing two iconic capitals."),
            ("vietnam-river", "Vietnam River Reverie", "Vietnam", 9, 8400, "Adventure", "/assets/vitenam.jpeg", "Emerald waterways and coastal serenity.", "A nine-day adventure from Ha Long Bay to Hoi An."),
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

    if conn.execute("SELECT COUNT(*) FROM services").fetchone()[0] == 0:
        services_seed = [
            ("tour-packages", "Curated Tour Packages", "Planning", "Hand-crafted itineraries across 124+ destinations.", "Hand-crafted itineraries across 124+ destinations.", 4.9, 512, "They crafted the exact pace I needed — effortless and luxurious.", "Popular", "Explore", "/services", 1, 1, 1, 1, "published", 0),
            ("visa-assistance", "Visa Guidance & Partner Assistance", "Travel documents", "Basic travel guidance, document checklist help, and trusted third-party visa assistance partner connections when needed.", "JourneyMakers provides basic travel guidance, document checklist help, and can connect travelers with trusted third-party visa assistance partners when needed. Visa approval depends on embassy/consulate rules and applicant documents. JourneyMakers does not guarantee visa approval.", 4.8, 441, "Clear document guidance and partner assistance without false approval guarantees.", "Recommended", "Get Guidance", "/contact", 1, 1, 1, 1, "published", 1),
            ("hotel-booking", "Luxury Hotel Booking", "Bookings", "Negotiated rates at the world's best properties.", "Negotiated rates at the world's best properties.", 4.9, 378, "Every stay felt upgraded, from arrival to late checkout.", "Most Trusted", "Explore", "/services", 1, 1, 0, 1, "published", 2),
            ("flight-booking", "Flight Booking", "Bookings", "Business & first-class fares, multi-city routing.", "Business & first-class fares, multi-city routing.", 4.8, 398, "They found the perfect routing with minimal layovers.", "", "Explore", "/services", 1, 1, 0, 0, "published", 3),
            ("corporate-tours", "Corporate Retreats", "Corporate", "Off-sites that change company culture.", "Off-sites that change company culture.", 4.7, 259, "Our team returned with stronger bonds and zero logistics headaches.", "", "Explore", "/services", 1, 1, 0, 0, "published", 4),
            ("group-tours", "Group Tours", "Groups", "Small private groups, never bus-tour scale.", "Small private groups, never bus-tour scale.", 4.8, 311, "The group experience felt intimate and perfectly timed.", "", "Explore", "/services", 1, 1, 0, 0, "published", 5),
            ("honeymoon", "Honeymoon Packages", "Special occasions", "Stories that begin a marriage.", "Stories that begin a marriage.", 4.9, 287, "Attention to detail made every moment feel special.", "Popular", "Plan My Trip", "/contact", 1, 1, 0, 0, "published", 6),
            ("adventure", "Adventure Expeditions", "Adventure", "Sahara, Patagonia, Himalayas — properly equipped.", "Sahara, Patagonia, Himalayas — properly equipped.", 4.8, 330, "The guides knew every ridge, trail, and local story.", "", "Explore", "/services", 1, 1, 0, 0, "published", 7),
            ("international", "International Travel", "International", "Global routing handled end-to-end.", "Global routing handled end-to-end.", 4.8, 364, "We felt supported in every timezone.", "", "Explore", "/services", 1, 1, 1, 1, "published", 8),
            ("domestic", "Domestic Travel", "Domestic", "Hidden corners of home, beautifully arranged.", "Hidden corners of home, beautifully arranged.", 4.7, 225, "Domestic escapes felt as polished as overseas journeys.", "", "Explore", "/services", 1, 1, 0, 0, "published", 9),
            ("passport", "Passport Assistance", "Travel documents", "Document guidance and appointment preparation support.", "Document guidance and appointment preparation support.", 4.9, 402, "They helped us understand the steps and required documents.", "", "Get Guidance", "/contact", 1, 1, 0, 0, "published", 10),
            ("custom-trip", "Custom Trip Planning", "Planning", "From a single line of brief to a finished journey.", "From a single line of brief to a finished journey.", 4.9, 487, "Every detail matched our request better than expected.", "Recommended", "Plan My Trip", "/contact", 1, 1, 1, 1, "published", 11),
        ]
        conn.executemany(
            """INSERT INTO services (id, name, category, short_description, description, rating, review_count, highlight, badge_text, cta_text, cta_link, show_homepage, show_services_page, show_hero_card, show_footer, status, gallery, sort_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)""",
            [(*s, now, now) for s in services_seed],
        )

    if conn.execute("SELECT COUNT(*) FROM faqs").fetchone()[0] == 0:
        faqs_seed = [
            ("How does the booking process work?", "Submit an inquiry with your vision and dates. A planner reaches out within 24 hours. We design the journey collaboratively; you confirm before any commitments are made.", 0),
            ("Do you handle visas?", "Yes. Our concierge handles visa filings for 150+ countries, including expedited and diplomatic routing.", 1),
            ("Is there a minimum trip cost?", "We focus on curated experiences. Most journeys begin around $3,500 per traveler, though we tailor to brief, not to floor.", 2),
            ("Can I customize a published package?", "Every package is a starting point. Add days, swap stays, change pace — say the word.", 3),
            ("What if plans change mid-trip?", "24/7 concierge is included on every journey. Flights re-routed, reservations moved, doctors found — quietly.", 4),
        ]
        conn.executemany(
            "INSERT INTO faqs (question, answer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            [(*f, now, now) for f in faqs_seed],
        )

    if conn.execute("SELECT COUNT(*) FROM testimonials").fetchone()[0] == 0:
        testimonials_seed = [
            ("Aarav Mehta", "Founder, Loom Capital", "JourneyMakers planned my honeymoon in Kyoto with surgical taste. Every transition felt rehearsed by an invisible hand.", "Mumbai", 0),
            ("Elena Costa", "Architect", "I asked for 'somewhere quiet.' They sent me to a fishing village in Hokkaido I didn't know existed. Best week of my year.", "Milan", 1),
            ("Marcus Lin", "CEO, Northwind", "We've used three concierges. This is the only one that returns calls at 2am in a foreign timezone — and means it.", "Singapore", 2),
        ]
        conn.executemany(
            "INSERT INTO testimonials (name, role, quote, location, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [(*t, now, now) for t in testimonials_seed],
        )

    if conn.execute("SELECT COUNT(*) FROM site_stats").fetchone()[0] == 0:
        stats_seed = [
            ("124+", "Destinations", 0),
            ("12k", "Journeys Completed", 1),
            ("98%", "Concierge Rating", 2),
            ("24/7", "Global Support", 3),
        ]
        conn.executemany(
            "INSERT INTO site_stats (value, label, sort_order, updated_at) VALUES (?, ?, ?, ?)",
            [(*s, now) for s in stats_seed],
        )

    if conn.execute("SELECT COUNT(*) FROM offers").fetchone()[0] == 0:
        offers_seed = [
            ("Honeymoon Escape Flash Sale", "Book this week · 20% off", None,
             "Exclusive discount on all honeymoon packages for bookings made this week. Limited slots.",
             "flash", 20.0, "FLASH 20% OFF", "red", "all",
             "2026-05-01", "2026-06-30", 50, 12, 1, 1, 1),
            ("Early Bird Bali", "Book 90 days ahead · Save ₹25,000", "EARLYBIRD",
             "Lock in Bali packages 90 days in advance and save ₹25,000 off the published rate.",
             "fixed", 25000.0, "Early Bird", "green", '["bali-escape", "bali-luxury"]',
             "2026-05-01", "2026-08-31", None, 8, 1, 0, 2),
            ("Monsoon Magic", "Maldives · All-inclusive upgrade", "MONSOON26",
             "Travel to Maldives during peak monsoon season and receive a complimentary room upgrade.",
             "free_upgrade", 0.0, "Free Upgrade", "gold", '["maldives-overwater"]',
             "2026-06-01", "2026-09-30", 20, 3, 1, 0, 3),
            ("Referral Bonus", "Refer a friend · ₹10,000 off your next trip", "REFER10K",
             "Refer a friend who books any package above ₹1,00,000 and get ₹10,000 off your next booking.",
             "fixed", 10000.0, "Referral", "accent", "all",
             None, None, None, 0, 1, 0, 4),
        ]
        for row in offers_seed:
            conn.execute("""
                INSERT OR IGNORE INTO offers
                (title, subtitle, code, description, offer_type, discount_value,
                 badge_label, badge_color, applies_to, valid_from, valid_until,
                 max_uses, current_uses, is_active, is_featured, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, row + (now, now))

    if conn.execute("SELECT COUNT(*) FROM site_content").fetchone()[0] == 0:
        content_seed = [
            # (page, section, key, value, value_type, label, sort_order)

            # ── HOME ──────────────────────────────────────────────────────────
            ("home", "hero", "badge", "Traveler-led luxury planning", "text", "Badge text", 0),
            ("home", "hero", "tagline", "Discover places through the moments travelers never stopped talking about.", "text", "Tagline (above title)", 1),
            ("home", "hero", "title", "Build your journey from living memories.", "text", "Main headline", 2),
            ("home", "hero", "subtitle", "Save cinematic traveler moments, feel the mood of every stop, then turn your collection into a private itinerary with concierge support.", "text", "Subtitle", 3),
            ("home", "hero", "cta_primary", "Start Collecting", "text", "Primary CTA label", 4),
            ("home", "hero", "cta_primary_url", "/booking", "url", "Primary CTA URL", 5),
            ("home", "hero", "cta_secondary", "View Journeys", "text", "Secondary CTA label", 6),
            ("home", "hero", "cta_secondary_url", "/packages", "url", "Secondary CTA URL", 7),
            ("home", "hero", "video_url", "", "url", "Hero background video URL", 8),

            ("home", "about_section", "label", "About JourneyMakers", "text", "About section label", 0),
            ("home", "about_section", "heading", "We plan journeys that feel personal, smooth, and memorable.", "text", "About main heading", 1),
            ("home", "about_section", "short_description", "JourneyMakers helps travelers plan smooth, personalized, and memorable trips. We exist to make travel easier and stress-free by handling destination planning, packages, hotels, flights, transfers, and on-trip support.", "text", "Short about description used in hero card", 2),
            ("home", "about_section", "detailed_description", "JourneyMakers helps travelers plan customized trips across India and international destinations. From itinerary planning and hotel bookings to flights, transfers, sightseeing, honeymoon packages, family tours, group travel, and corporate retreats, we handle every detail with care and expert support.", "text", "Detailed about description used in homepage section", 3),
            ("home", "about_section", "purpose", "We make travel easier, more meaningful, and stress-free.", "text", "Company purpose", 4),
            ("home", "about_section", "highlight_1", "Personalized trip planning", "text", "Highlight 1", 5),
            ("home", "about_section", "highlight_2", "End-to-end support", "text", "Highlight 2", 6),
            ("home", "about_section", "highlight_3", "For couples, families, groups, and corporate travelers", "text", "Highlight 3", 7),
            ("home", "about_section", "highlight_4", "Crafted journeys, not generic packages", "text", "Highlight 4", 8),
            ("home", "about_section", "cta_text", "Discover Our Story", "text", "About CTA text", 9),
            ("home", "about_section", "cta_link", "/about", "url", "About CTA link", 10),
            ("home", "about_section", "image", "", "url", "About image URL", 11),
            ("home", "about_section", "status", "published", "text", "Published / Draft / Hidden", 12),

            ("home", "cinematic_moment", "badge", "Cinematic Moment", "text", "Section badge", 0),
            ("home", "cinematic_moment", "title", "One saved memory can become the reason for the whole journey.", "text", "Main headline", 1),
            ("home", "cinematic_moment", "quote_suffix", "felt like the world went quiet for a few minutes.", "text", "Quote suffix appended to gallery caption", 2),

            ("home", "featured_packages", "eyebrow", "Featured journeys", "text", "Eyebrow label", 0),
            ("home", "featured_packages", "title", "Four ways to begin.", "text", "Section title", 1),
            ("home", "featured_packages", "description", "A smaller, more deliberate set of journeys keeps the page calm and makes comparison easier.", "text", "Description", 2),

            ("home", "services_section", "eyebrow", "What we orchestrate", "text", "Eyebrow label", 0),
            ("home", "services_section", "title", "Beyond the itinerary.", "text", "Section title", 1),
            ("home", "services_section", "description", "We do not just book flights. We orchestrate transitions between worlds: visas, jets, private chefs, and the moments in between.", "text", "Description", 2),
            ("home", "services_section", "bullet_1", "Emergency desk in every itinerary", "text", "Feature bullet 1", 3),
            ("home", "services_section", "bullet_2", "Local specialists across 124 destinations", "text", "Feature bullet 2", 4),
            ("home", "services_section", "bullet_3", "Real-time trip changes handled quietly", "text", "Feature bullet 3", 5),
            ("home", "services_section", "cta_label", "All services", "text", "CTA button label", 6),

            ("home", "destinations_strip", "eyebrow", "Where the moments live", "text", "Eyebrow label", 0),
            ("home", "destinations_strip", "title", "Six places. Infinite combinations.", "text", "Section title", 1),

            ("home", "review_board", "eyebrow", "Traveler Board", "text", "Eyebrow label", 0),
            ("home", "review_board", "title", "Review, share, and inspire.", "text", "Section title", 1),
            ("home", "review_board", "body", "Real travelers leave ratings, tips, photos and video notes for every destination, package and service. It's a living guide that helps future journeys feel instantly familiar.", "text", "Body text", 2),
            ("home", "review_board", "cta_label", "Browse all reviews", "text", "CTA label", 3),

            ("home", "testimonials", "eyebrow", "Field Notes", "text", "Eyebrow label", 0),
            ("home", "testimonials", "title", "Whispered between travelers.", "text", "Section title", 1),

            ("home", "faq_section", "eyebrow", "Frequently Asked", "text", "Eyebrow label", 0),
            ("home", "faq_section", "title", "Quietly answered.", "text", "Section title", 1),

            ("home", "newsletter_cta", "eyebrow", "Your first memory", "text", "Eyebrow label", 0),
            ("home", "newsletter_cta", "title", "Describe the moments you want to remember forever.", "text", "Section title", 1),
            ("home", "newsletter_cta", "body", "Tell us the feeling, the people, the pace, or the image in your head. We will turn it into a journey that has room for surprise and still runs beautifully.", "text", "Body text", 2),
            ("home", "newsletter_cta", "placeholder", "Misty mountains, slow dinners, private trains...", "text", "Input placeholder", 3),
            ("home", "newsletter_cta", "cta_label", "Begin", "text", "CTA label", 4),

            # ── FOOTER ────────────────────────────────────────────────────────
            ("footer", "brand", "name", "JourneyMakers", "text", "Brand name", 0),
            ("footer", "brand", "logo_text", "JM", "text", "Logo initials", 1),
            ("footer", "brand", "tagline", "Building the future of high-intent travel. Every mile a memory, every journey a masterpiece.", "text", "Brand tagline", 2),
            ("footer", "brand", "trust_1", "IATA partner desk", "text", "Trust badge 1", 3),
            ("footer", "brand", "trust_2", "Secure payments", "text", "Trust badge 2", 4),
            ("footer", "brand", "trust_3", "24/7 concierge", "text", "Trust badge 3", 5),
            ("footer", "brand", "copyright", "© 2026 JourneyMakers Collective", "text", "Copyright line", 6),

            ("footer", "newsletter", "title", "Private departures, first.", "text", "Newsletter section title", 0),
            ("footer", "newsletter", "body", "Receive limited-seat journeys, visa updates, and planner notes before they reach the public calendar.", "text", "Newsletter description", 1),
            ("footer", "newsletter", "cta_label", "Join", "text", "Subscribe button label", 2),
            ("footer", "newsletter", "placeholder", "Email address", "text", "Email input placeholder", 3),

            ("footer", "contact", "email", "hello@journeymakers.travel", "text", "Contact email", 0),
            ("footer", "contact", "phone", "+1 (555) 123-4567", "text", "Phone number", 1),
            ("footer", "contact", "whatsapp", "15551234567", "text", "WhatsApp number (digits only)", 2),
            ("footer", "contact", "address", "", "text", "Office address", 3),

            ("footer", "contact_card", "company_name", "JourneyMakers", "text", "Company name", 0),
            ("footer", "contact_card", "agent_name", "Sonia Mehra", "text", "Agent name", 1),
            ("footer", "contact_card", "agent_role", "Senior Travel Expert", "text", "Agent role", 2),
            ("footer", "contact_card", "phone", "+1 (555) 123-4567", "text", "Display phone", 3),
            ("footer", "contact_card", "whatsapp", "15551234567", "text", "WhatsApp number (digits only)", 4),
            ("footer", "contact_card", "location", "JourneyMakers Travel Desk, New York, USA", "text", "Company location", 5),

            ("footer", "social", "instagram_url", "", "url", "Instagram URL", 0),
            ("footer", "social", "linkedin_url", "", "url", "LinkedIn URL", 1),
            ("footer", "social", "twitter_url", "", "url", "Twitter/X URL", 2),

            # ── CONTACT PAGE ──────────────────────────────────────────────────
            ("contact", "hero", "eyebrow", "Begin here", "text", "Eyebrow label", 0),
            ("contact", "hero", "title", "Start a conversation.", "text", "Page title", 1),
            ("contact", "hero", "body", "Tell us the kind of moments you want to experience. A planner will reach out within 24 hours.", "text", "Intro body", 2),
            ("contact", "hero", "quote", "We believe the best itineraries are built around memories, not checklists.", "text", "Pull quote", 3),

            ("contact", "whatsapp", "title", "Quick questions", "text", "Card title", 0),
            ("contact", "whatsapp", "body", "WhatsApp a planner when the idea is still forming.", "text", "Card description", 1),
            ("contact", "whatsapp", "number", "+1 (555) 123-4567", "text", "Display number", 2),
            ("contact", "whatsapp", "link", "https://wa.me/15551234567", "url", "WhatsApp link URL", 3),

            ("contact", "email_contact", "title", "Custom itinerary", "text", "Card title", 0),
            ("contact", "email_contact", "body", "Share dates, moods, and the memories you want built in.", "text", "Card description", 1),
            ("contact", "email_contact", "address", "concierge@journeymakers.travel", "text", "Email address", 2),

            ("contact", "phone_contact", "title", "Private consultation", "text", "Card title", 0),
            ("contact", "phone_contact", "body", "Book a focused call for celebrations, groups, or complex routing.", "text", "Card description", 1),
            ("contact", "phone_contact", "action", "Schedule a call", "text", "CTA label", 2),

            ("contact", "stats", "stat_1_value", "4.9", "text", "Stat 1 value", 0),
            ("contact", "stats", "stat_1_label", "average traveler rating", "text", "Stat 1 label", 1),
            ("contact", "stats", "stat_2_value", "2,300+", "text", "Stat 2 value", 2),
            ("contact", "stats", "stat_2_label", "curated journeys planned", "text", "Stat 2 label", 3),
            ("contact", "stats", "stat_3_value", "84", "text", "Stat 3 value", 4),
            ("contact", "stats", "stat_3_label", "countries explored by planners", "text", "Stat 3 label", 5),

            # ── PACKAGES PAGE ─────────────────────────────────────────────────
            ("packages", "hero", "eyebrow", "Journey catalog", "text", "Eyebrow label", 0),
            ("packages", "hero", "title", "Journeys shaped by living memories.", "text", "Page title", 1),
            ("packages", "hero", "body", "Experience-first luxury journey discovery shaped by real traveler memories and curated private planning.", "text", "Hero body text", 2),

            ("packages", "featured_section", "eyebrow", "Featured journeys", "text", "Eyebrow label", 0),
            ("packages", "featured_section", "title", "Four ways to begin.", "text", "Section title", 1),
            ("packages", "featured_section", "body", "A smaller, more deliberate set of journeys keeps the page calm and makes comparison easier.", "text", "Section description", 2),

            ("packages", "quiet_quote", "text", "Luxury is not more information. It is the confidence to show only what matters.", "text", "Pull quote text", 0),
            ("packages", "quiet_quote", "author", "JourneyMakers design principle", "text", "Quote attribution", 1),

            ("packages", "planner_cta", "eyebrow", "Private travel design", "text", "Eyebrow label", 0),
            ("packages", "planner_cta", "title", "Describe the journey. We will build it.", "text", "CTA title", 1),
            ("packages", "planner_cta", "body", "Tell us the mood, the people, the pace. A planner will respond within 24 hours with ideas, questions, and early route sketches.", "text", "CTA body", 2),
            ("packages", "planner_cta", "cta_label", "Begin planning", "text", "CTA button label", 3),

            # ── DESTINATIONS PAGE ─────────────────────────────────────────────
            ("destinations", "hero", "eyebrow", "Where to go", "text", "Eyebrow label", 0),
            ("destinations", "hero", "title", "Destinations.", "text", "Page title", 1),
            ("destinations", "hero", "body", "Every destination is a starting point, not a checklist. Choose one that matches the pace you want.", "text", "Hero body", 2),

            ("destinations", "experience_section", "eyebrow", "Traveler experiences", "text", "Eyebrow label", 0),
            ("destinations", "experience_section", "title", "What travelers remember most.", "text", "Section title", 1),

            # ── SERVICES PAGE ─────────────────────────────────────────────────
            ("services", "hero", "eyebrow", "Services", "text", "Eyebrow label", 0),
            ("services", "hero", "title", "Everything we orchestrate, end-to-end.", "text", "Page title", 1),
            ("services", "hero", "body", "Visa guidance, hotel & flight booking, honeymoon packages, corporate retreats, and bespoke planning.", "text", "Hero body", 2),

            # ── GLOBAL ────────────────────────────────────────────────────────
            ("global", "brand", "name", "JourneyMakers", "text", "Brand name used site-wide", 0),
            ("global", "brand", "whatsapp_number", "15551234567", "text", "WhatsApp FAB number (digits only)", 1),
            ("global", "brand", "whatsapp_message", "Hi, I'd like to plan a journey!", "text", "Default WhatsApp message", 2),
            ("global", "nav", "cta_label", "Inquire", "text", "Nav bar CTA button label", 3),
        ]
        conn.executemany(
            """INSERT OR IGNORE INTO site_content
               (page, section, key, value, value_type, label, sort_order, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [(*row, now) for row in content_seed],
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
                (public_id, full_name, email, destinations, adults, children,
                 budget, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 2, 0, ?, ?, ?, ?)
                """,
                (f"INQ-{index}", name, email, json_dumps([destination]), budget, status, now, now),
            )


def _patch_service_content(conn: sqlite3.Connection) -> None:
    visa_description = (
        "JourneyMakers provides basic travel guidance, document checklist help, and can connect "
        "travelers with trusted third-party visa assistance partners when needed. Visa approval "
        "depends on embassy/consulate rules and applicant documents. JourneyMakers does not "
        "guarantee visa approval."
    )
    try:
        conn.execute(
            """UPDATE services
               SET name = ?,
                   category = ?,
                   short_description = ?,
                   description = ?,
                   detailed_description = ?,
                   highlight = ?,
                   badge_text = ?,
                   cta_text = ?,
                   cta_link = ?
               WHERE id = ? OR name = ?""",
            (
                "Visa Guidance & Partner Assistance",
                "Travel documents",
                "Basic travel guidance, document checklist help, and trusted third-party visa assistance partner connections when needed.",
                visa_description,
                visa_description,
                "Clear document guidance and partner assistance without false approval guarantees.",
                "Recommended",
                "Get Guidance",
                "/contact",
                "visa-assistance",
                "Visa Concierge",
            ),
        )
        conn.execute(
            """UPDATE site_content
               SET value = ?
               WHERE page = 'services' AND section = 'hero' AND key = 'body'
                 AND value LIKE '%Visa concierge%'""",
            (
                "Visa guidance, hotel & flight booking, honeymoon packages, corporate retreats, and bespoke planning.",
            ),
        )
    except Exception:
        pass


def _patch_content_defaults(conn: sqlite3.Connection) -> None:
    now = utc_now()
    rows = [
        ("home", "about_section", "label", "About JourneyMakers", "text", "About section label", 0),
        ("home", "about_section", "heading", "We plan journeys that feel personal, smooth, and memorable.", "text", "About main heading", 1),
        ("home", "about_section", "short_description", "JourneyMakers helps travelers plan smooth, personalized, and memorable trips. We exist to make travel easier and stress-free by handling destination planning, packages, hotels, flights, transfers, and on-trip support.", "text", "Short about description used in hero card", 2),
        ("home", "about_section", "detailed_description", "JourneyMakers helps travelers plan customized trips across India and international destinations. From itinerary planning and hotel bookings to flights, transfers, sightseeing, honeymoon packages, family tours, group travel, and corporate retreats, we handle every detail with care and expert support.", "text", "Detailed about description used in homepage section", 3),
        ("home", "about_section", "purpose", "We make travel easier, more meaningful, and stress-free.", "text", "Company purpose", 4),
        ("home", "about_section", "highlight_1", "Personalized trip planning", "text", "Highlight 1", 5),
        ("home", "about_section", "highlight_2", "End-to-end support", "text", "Highlight 2", 6),
        ("home", "about_section", "highlight_3", "For couples, families, groups, and corporate travelers", "text", "Highlight 3", 7),
        ("home", "about_section", "highlight_4", "Crafted journeys, not generic packages", "text", "Highlight 4", 8),
        ("home", "about_section", "cta_text", "Discover Our Story", "text", "About CTA text", 9),
        ("home", "about_section", "cta_link", "/about", "url", "About CTA link", 10),
        ("home", "about_section", "image", "", "url", "About image URL", 11),
        ("home", "about_section", "status", "published", "text", "Published / Draft / Hidden", 12),
        ("contact", "contact_card", "company_name", "JourneyMakers", "text", "Company name", 0),
        ("contact", "contact_card", "agent_name", "JourneyMakers", "text", "Travel expert name", 1),
        ("contact", "contact_card", "agent_role", "Travel Expert", "text", "Travel expert role", 2),
        ("contact", "contact_card", "whatsapp", "+91 98765 43210", "text", "WhatsApp number", 3),
        ("contact", "contact_card", "phone", "+91 98765 43210", "text", "Phone number", 4),
        ("contact", "contact_card", "email", "hello@journeymakers.com", "text", "Email address", 5),
        ("contact", "contact_card", "location", "JourneyMakers Travel Desk", "text", "Office address / location", 6),
        ("contact", "contact_card", "response_text", "Get itinerary, package details, and pricing in minutes.", "text", "Trust / response text", 7),
        ("contact", "contact_card", "response_time", "Fast response", "text", "Response time text", 8),
        ("contact", "contact_card", "guidance_text", "Personalized guidance", "text", "Guidance text", 9),
        ("contact", "contact_card", "discussion_text", "Free itinerary discussion", "text", "Discussion text", 10),
        ("contact", "contact_card", "cta_text", "Chat on WhatsApp", "text", "CTA text", 11),
        ("contact", "contact_card", "whatsapp_message", "Hi JourneyMakers, I want to plan a trip. Please share package details.", "text", "WhatsApp pre-filled message", 12),
    ]
    try:
        conn.executemany(
            """INSERT OR IGNORE INTO site_content
               (page, section, key, value, value_type, label, sort_order, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [(*row, now) for row in rows],
        )
    except Exception:
        pass
