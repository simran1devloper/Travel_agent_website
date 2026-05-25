import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { MEDIA } from "@/config/media";
import { api, type ApiPackage, type ApiGalleryItem, type ApiReview, type ApiReviewStats } from "@/lib/api";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { useRecentlyViewed, useGuestWishlist, useHelpfulVotes, usePackageFilterState, useCompareList } from "@/lib/user-prefs";
import { useContent } from "@/lib/use-content";
import { PackageCompareDrawer } from "@/components/package-compare";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "Luxury Shared Travel Experiences - JourneyMakers" },
      {
        name: "description",
        content:
          "Experience-first luxury journey discovery shaped by real traveler memories and curated private planning.",
      },
      { property: "og:title", content: "Luxury Shared Travel Experiences - JourneyMakers" },
      {
        property: "og:description",
        content: "Explore curated journeys through real traveler experiences.",
      },
      { property: "og:url", content: "/packages" },
    ],
    links: [{ rel: "canonical", href: "/packages" }],
  }),
  component: PackagesPage,
});

// ── Local types & mappers ──────────────────────────────────────────────────

type GalleryItem = ApiGalleryItem;

type PackageItem = {
  slug: string;
  title: string;
  location: string;
  days: number;
  price: number;
  category: string;
  image: string;
  tagline?: string;
  description?: string;
  rating: number;
  reviewCount: number;
};

function galleryFallback(slug: string): GalleryItem[] {
  return [
    { type: "photo", src: `https://picsum.photos/seed/${slug}-01/600/800`, caption: "Featured moment", author: "JourneyMakers traveler" },
    { type: "photo", src: `https://picsum.photos/seed/${slug}-02/800/600`, caption: "Local scene", author: "Verified traveler" },
    { type: "video", src: `https://picsum.photos/seed/${slug}-reel/600/400`, caption: "Journey highlights", author: "Community moment" },
    { type: "photo", src: `https://picsum.photos/seed/${slug}-04/600/800`, caption: "Hidden gems", author: "JourneyMakers guide" },
  ];
}

function mapApiPackage(pkg: ApiPackage): PackageItem {
  return {
    slug: pkg.slug,
    title: pkg.title,
    location: pkg.location,
    days: pkg.days,
    price: pkg.price,
    category: pkg.category ?? "Journey",
    image: MEDIA.destinations?.[pkg.slug] ?? pkg.image_url ?? `https://picsum.photos/seed/${pkg.slug}/800/600`,
    tagline: pkg.tagline,
    description: pkg.description,
    rating: pkg.rating ?? 4.8,
    reviewCount: pkg.review_count,
  };
}


type JourneyPlace = {
  name: string;
  destinationSlug: string;
  days: string;
  topMoments: string[];
  quote: string;
  quoteAuthor: string;
  gallery?: GalleryItem[];
};

const packageStories: Record<string, string> = {
  "bangkok-singapore":
    "A warm, high-contrast journey from Bangkok's markets and temple mornings to Singapore's polished skyline.",
  "newyork-citypulse":
    "A private city rhythm of Broadway nights, quiet galleries, rooftops, and tables worth crossing town for.",
  "salonei-retreat":
    "A coastal escape built around unhurried beaches, market mornings, and evenings that stay with you.",
  "switzerland-alpine":
    "A cinematic alpine route through glacier railways, lake towns, chalet terraces, and mountain dining.",
};

const placesByPackage: Record<string, JourneyPlace[]> = {
  "bangkok-singapore": [
    {
      name: "Bangkok",
      destinationSlug: "bangkok-singapore",
      days: "Days 1-5",
      topMoments: ["Rooftop dining", "Floating markets", "Temple mornings"],
      quote: "Bangkok felt alive from the first market breakfast to the rooftop skyline.",
      quoteAuthor: "Mila, UK",
    },
    {
      name: "Singapore",
      destinationSlug: "bangkok-singapore",
      days: "Days 6-10",
      topMoments: ["Marina Bay skyline", "Garden walks", "Private food route"],
      quote: "Singapore was polished, futuristic, and surprisingly intimate at sunrise.",
      quoteAuthor: "Raj, India",
    },
  ],
  "newyork-citypulse": [
    {
      name: "New York",
      destinationSlug: "newyork",
      days: "Days 1-8",
      topMoments: ["Broadway evening", "Rooftop brunch", "Brooklyn skyline walk"],
      quote: "The city felt curated for us, not handed over as a checklist.",
      quoteAuthor: "Avery, USA",
    },
  ],
  "salonei-retreat": [
    {
      name: "Salonei",
      destinationSlug: "salonei",
      days: "Days 1-9",
      topMoments: ["Private cove", "Fish market morning", "Sunset boat ride"],
      quote: "Evenings by the beach were quiet, private, and deeply local.",
      quoteAuthor: "Camille, France",
    },
  ],
  "switzerland-alpine": [
    {
      name: "Swiss Alps",
      destinationSlug: "switzerland",
      days: "Days 1-11",
      topMoments: ["Glacier Express", "Chalet terrace", "Lake reflections"],
      quote: "The early morning fog over the rail line felt completely unreal.",
      quoteAuthor: "Mia, Germany",
    },
  ],
};

function PackagesPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen overflow-hidden bg-[#f7f2ea] text-[#171717]">
        <Hero />
        <RecentlyViewedStrip />
        <FeaturedJourneys />
        <QuietQuote />
        <CuratedMemory />
        <PlannerCta />
        <MobileStickyCta />
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <PackageCompareDrawer />
    </>
  );
}

function RecentlyViewedStrip() {
  const { items } = useRecentlyViewed();
  if (items.length < 2) return null; // Only show after 2+ unique views

  return (
    <section className="bg-white border-b border-border py-6">
      <div className="section-shell">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Continue exploring
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {items.map((pkg) => (
            <a
              key={pkg.slug}
              href={`/packages#${pkg.slug}`}
              className="group flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-2.5 hover:border-foreground/30 hover:bg-secondary transition-colors"
            >
              <img
                src={pkg.image}
                alt={pkg.title}
                className="size-10 rounded-xl object-cover"
              />
              <div>
                <p className="text-sm font-bold leading-tight line-clamp-1">{pkg.title}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.days}d · from ₹{pkg.price.toLocaleString("en-IN")}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-end overflow-hidden px-5 pb-10 pt-24 md:px-8 lg:px-12">
      <img
        src={MEDIA.destinations["bangkok-singapore"]}
        alt="Bangkok and Singapore luxury journey"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,14,0.82),rgba(8,10,14,0.48)_48%,rgba(8,10,14,0.12)),linear-gradient(180deg,rgba(8,10,14,0.08),rgba(8,10,14,0.78))]" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] lg:items-end"
      >
        <div className="max-w-5xl text-white">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-bold uppercase text-white/78 backdrop-blur-xl">
            <Sparkles className="size-3.5 text-[#d7aa73]" /> Experience-first luxury travel
          </span>
          <h1 className="max-w-5xl text-balance text-5xl font-black leading-[0.96] tracking-normal md:text-7xl lg:text-8xl">
            Choose the journey by the memory it creates.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
            Curated private journeys, shown through a small set of traveler moments that make each
            destination easier to feel.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#journeys"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#c76b2f] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(199,107,47,0.36)] focus-ring"
            >
              Explore featured journeys <ArrowRight className="size-4" />
            </a>
            <Link
              to="/booking"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/24 bg-white/10 px-7 text-sm font-extrabold text-white backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/16 focus-ring"
            >
              Start a private inquiry
            </Link>
          </div>
        </div>

        <div className="hidden rounded-2xl border border-white/14 bg-black/18 p-5 text-white shadow-2xl shadow-black/25 backdrop-blur-xl lg:block">
          <p className="text-sm font-bold text-[#d7aa73]">Core action</p>
          <p className="mt-3 text-2xl font-black leading-tight">Save moments. Build the journey.</p>
          <div className="mt-6 space-y-4 border-t border-white/12 pt-5 text-sm font-semibold text-white/72">
            <p className="flex items-center gap-3">
              <Heart className="size-4 text-[#d7aa73]" /> Select the moments that move you
            </p>
            <p className="flex items-center gap-3">
              <MessageCircle className="size-4 text-[#d7aa73]" /> Share them with a planner
            </p>
            <p className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-[#d7aa73]" /> Receive a private itinerary
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// Budget filter ranges
const BUDGET_FILTERS = [
  { label: "Under ₹1L", min: 0, max: 100000 },
  { label: "₹1L–₹2L", min: 100000, max: 200000 },
  { label: "₹2L+", min: 200000, max: Infinity },
];

// Duration filter ranges
const DURATION_FILTERS = [
  { label: "Under 7 days", min: 0, max: 6 },
  { label: "7–14 days", min: 7, max: 14 },
  { label: "14+ days", min: 15, max: 9999 },
];

function FeaturedJourneys() {
  const { c } = useContent("packages");
  const { data: allPackages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await api.packages()).map(mapApiPackage),
  });

  const [filterState, setFilterState, resetFilter] = usePackageFilterState();

  // Selected budget label (stored as minDays/maxDays not ideal, use category for budget label)
  const [selectedBudgetLabel, setSelectedBudgetLabel] = useState<string>("");
  const [selectedDurationLabel, setSelectedDurationLabel] = useState<string>("");

  // Derive unique categories
  const categories = Array.from(new Set(allPackages.map((p) => p.category).filter(Boolean)));

  // Apply all filters
  const filteredPackages = allPackages.filter((p) => {
    // Search
    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.location.toLowerCase().includes(q) &&
        !(p.category ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    // Category
    if (filterState.category && filterState.category !== "all") {
      if (p.category !== filterState.category) return false;
    }
    // Duration
    if (filterState.minDays > 0 || filterState.maxDays < 90) {
      if (p.days < filterState.minDays || p.days > filterState.maxDays) return false;
    }
    // Budget (stored as selectedBudgetLabel in local state)
    if (selectedBudgetLabel) {
      const budgetFilter = BUDGET_FILTERS.find((b) => b.label === selectedBudgetLabel);
      if (budgetFilter && (p.price < budgetFilter.min || p.price > budgetFilter.max)) return false;
    }
    return true;
  });

  const hasActiveFilters =
    filterState.search !== "" ||
    filterState.category !== "all" ||
    filterState.minDays > 0 ||
    filterState.maxDays < 90 ||
    selectedBudgetLabel !== "";

  function handleClearFilters() {
    resetFilter();
    setSelectedBudgetLabel("");
    setSelectedDurationLabel("");
  }

  if (isLoading) return (
    <section id="journeys" className="bg-[#f7f2ea] py-20 md:py-28">
      <div className="section-shell">
        <div className="mt-12 grid gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[520px] rounded-2xl bg-black/5 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <section id="journeys" className="bg-[#f7f2ea] py-20 md:py-28">
      <div className="section-shell">
        <SectionIntro
          eyebrow={c("featured_section", "eyebrow", "Featured journeys")}
          title={c("featured_section", "title", "Four ways to begin.")}
          copy={c("featured_section", "body", "A smaller, more deliberate set of journeys keeps the page calm and makes comparison easier.")}
        />

        {/* Filter UI */}
        <div className="mt-10 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <input
              type="text"
              placeholder="Search journeys..."
              value={filterState.search}
              onChange={(e) => setFilterState((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-full border border-black/12 bg-white px-5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[#c76b2f]"
            />
          </div>

          {/* Budget chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">Budget</span>
            {BUDGET_FILTERS.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => setSelectedBudgetLabel(selectedBudgetLabel === b.label ? "" : b.label)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                  selectedBudgetLabel === b.label
                    ? "border-[#c76b2f] bg-[#c76b2f] text-white"
                    : "border-black/12 bg-white text-foreground hover:border-[#c76b2f]"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Duration chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">Duration</span>
            {DURATION_FILTERS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => {
                  if (selectedDurationLabel === d.label) {
                    setSelectedDurationLabel("");
                    setFilterState((prev) => ({ ...prev, minDays: 0, maxDays: 90 }));
                  } else {
                    setSelectedDurationLabel(d.label);
                    setFilterState((prev) => ({ ...prev, minDays: d.min, maxDays: d.max }));
                  }
                }}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                  selectedDurationLabel === d.label
                    ? "border-[#c76b2f] bg-[#c76b2f] text-white"
                    : "border-black/12 bg-white text-foreground hover:border-[#c76b2f]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Category / mood chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">Category</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      category: prev.category === cat ? "all" : cat,
                    }))
                  }
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
                    filterState.category === cat
                      ? "border-[#c76b2f] bg-[#c76b2f] text-white"
                      : "border-black/12 bg-white text-foreground hover:border-[#c76b2f]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-8">
          {filteredPackages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/12 bg-white/50 py-16 text-center">
              <p className="font-bold text-foreground">No journeys match these filters.</p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 rounded-full border border-black/12 bg-white px-5 py-2 text-sm font-bold text-foreground hover:border-[#c76b2f] hover:text-[#c76b2f]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            filteredPackages.map((packageItem, index) => (
              <DestinationStoryCard key={packageItem.slug} index={index} packageItem={packageItem} />
            ))
          )}
        </div>

        {hasActiveFilters && filteredPackages.length > 0 && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm font-bold text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear all filters ({filteredPackages.length} shown)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function DestinationStoryCard({ packageItem, index }: { packageItem: PackageItem; index: number }) {
  const places = getPlacesForPackage(packageItem);
  const moments = places.flatMap((place) =>
    getPlaceGallery(place, packageItem)
      .slice(0, 2)
      .map((item) => ({ item, place })),
  );
  const topMoments = places.flatMap((place) => place.topMoments).slice(0, 3);

  // Track recently viewed packages in localStorage
  const { push: pushRecent } = useRecentlyViewed();
  useEffect(() => {
    pushRecent({
      slug: packageItem.slug,
      title: packageItem.title,
      image: packageItem.image,
      price: packageItem.price,
      days: packageItem.days,
    });
    // Only fire when the slug changes (i.e. a different package is rendered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageItem.slug]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.65, delay: Math.min(index * 0.05, 0.16) }}
      className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_28px_80px_rgba(23,23,23,0.08)]"
    >
      <div className="relative min-h-[380px] overflow-hidden md:min-h-[520px]">
        <img
          src={packageItem.image}
          alt={packageItem.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/16 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-8">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#d7aa73]">
            <MapPin className="size-4" /> {packageItem.location}
          </p>
          <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            {packageItem.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/76">
            {packageStories[packageItem.slug] ?? packageItem.description}
          </p>
        </div>
      </div>

      <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
        <JourneyDetailPanel packageItem={packageItem} places={places} topMoments={topMoments} />

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Traveler moments preview</h3>
            <span className="text-sm font-semibold text-muted-foreground">
              {places.length} {places.length === 1 ? "city" : "cities"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {moments.slice(0, 3).map(({ item, place }) => (
              <ExperienceMomentCard
                key={`${packageItem.slug}-${place.name}-${item.caption}`}
                item={item}
                placeName={place.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 md:px-8">
        <PackageReviewsSection slug={packageItem.slug} title={packageItem.title} />
      </div>
    </motion.article>
  );
}

function JourneyDetailPanel({
  packageItem,
  places,
  topMoments,
}: {
  packageItem: PackageItem;
  places: JourneyPlace[];
  topMoments: string[];
}) {
  const [saving, setSaving] = useState(false);
  // Guest wishlist persists in localStorage; API wishlist used when logged in
  const { toggle: toggleWishlist, has: inWishlist } = useGuestWishlist();
  const saved = inWishlist(packageItem.slug);
  const { toggle: toggleCompare, has: inCompare, isFull } = useCompareList();

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3 border-b border-black/10 pb-6">
        <SimpleMeta icon={CalendarDays} label={`${packageItem.days} days`} />
        <SimpleMeta icon={MapPin} label={`${places.length} stops`} />
        <SimpleMeta icon={Star} label={`${packageItem.rating} rating`} />
      </div>

      <h3 className="mb-4 text-xl font-black">Top experiences</h3>
      <ul className="space-y-3 text-base font-semibold text-foreground/78">
        {topMoments.map((moment) => (
          <li key={moment} className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-[#c76b2f]" />
            {moment}
          </li>
        ))}
      </ul>

      <div className="mt-7 border-t border-black/10 pt-6">
        <p className="text-sm leading-7 text-muted-foreground">
          "{places[0]?.quote}"{" "}
          <span className="font-bold text-foreground/70">- {places[0]?.quoteAuthor}</span>
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            // Optimistically toggle guest wishlist (instant, no spinner needed)
            toggleWishlist(packageItem.slug);
            // Also sync to API in background (best-effort)
            setSaving(true);
            try {
              await api.saveWishlist(packageItem.slug);
            } catch {
              // API call failed — guest wishlist still updated, that's fine
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-accent focus-ring"
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save moment"} <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
        </button>
        <Link
          to="/booking"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-black/12 px-5 text-sm font-extrabold text-foreground transition-all hover:-translate-y-0.5 hover:bg-[#f7f2ea] focus-ring"
        >
          Explore journey <ArrowUpRight className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => toggleCompare(packageItem.slug)}
          disabled={isFull && !inCompare(packageItem.slug)}
          className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-5 text-sm font-extrabold transition-all hover:-translate-y-0.5 focus-ring ${
            inCompare(packageItem.slug)
              ? "border-accent bg-accent/10 text-accent"
              : "border-black/12 text-foreground hover:bg-[#f7f2ea]"
          }`}
        >
          {inCompare(packageItem.slug) ? "✓ Added to compare" : isFull ? "Compare full (max 3)" : "Compare"}
        </button>
      </div>
    </div>
  );
}

function SimpleMeta({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Icon className="size-4 text-[#c76b2f]" />
      <span className="text-sm font-black">{label}</span>
    </div>
  );
}

function ExperienceMomentCard({ item, placeName }: { item: GalleryItem; placeName: string }) {
  return (
    <article className="group overflow-hidden rounded-xl bg-[#171717]">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={item.src}
          alt={item.caption}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/8 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/44 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
          <Camera className="mr-1 inline size-3" />
          Moment
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="line-clamp-2 text-base font-black leading-tight">{item.caption}</p>
          <p className="mt-2 text-xs font-semibold text-white/68">{placeName}</p>
        </div>
      </div>
    </article>
  );
}

function QuietQuote() {
  const { c } = useContent("packages");
  return (
    <section className="bg-[#fffaf2] py-20 md:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-3xl font-black leading-tight md:text-5xl">
            "{c("quiet_quote", "text", "Luxury is not more information. It is the confidence to show only what matters.")}"
          </p>
          <p className="mt-6 text-sm font-bold uppercase text-muted-foreground">
            {c("quiet_quote", "author", "JourneyMakers design principle")}
          </p>
        </div>
      </div>
    </section>
  );
}

function CuratedMemory() {
  const { data: allPackages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await api.packages()).map(mapApiPackage),
  });

  const packageItem = allPackages[4] ?? allPackages[0];

  if (!packageItem) return (
    <section className="bg-[#0b1018] py-20 text-white md:py-28">
      <div className="section-shell">
        <div className="h-[520px] rounded-2xl bg-white/5 animate-pulse" />
      </div>
    </section>
  );

  const places = getPlacesForPackage(packageItem);
  const place = places[0];
  const moments = getPlaceGallery(place, packageItem).slice(0, 4);
  const [feature, ...supporting] = moments;

  return (
    <section className="bg-[#0b1018] py-20 text-white md:py-28">
      <div className="section-shell">
        <SectionIntro
          eyebrow="Curated traveler memory"
          title="One story, not a wall of content."
          copy="A restrained memory section gives the shared-experience idea emotional weight without turning the page into a social feed."
          dark
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
          {feature && (
            <article className="group relative min-h-[520px] overflow-hidden rounded-2xl bg-white/[0.06]">
              <img
                src={feature.src}
                alt={feature.caption}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
                <p className="mb-3 text-sm font-bold text-[#d7aa73]">{packageItem.title}</p>
                <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  {feature.caption}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                  "{place.quote}"{" "}
                  <span className="font-bold text-white">- {place.quoteAuthor}</span>
                </p>
              </div>
            </article>
          )}

          <div className="grid gap-4">
            {supporting.map((item) => (
              <ExperienceMomentCard key={item.caption} item={item} placeName={place.name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlannerCta() {
  return (
    <section className="bg-[#f7f2ea] py-20 md:py-28">
      <div className="section-shell">
        <div className="grid gap-8 border-y border-black/10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="eyebrow mb-3">Private planning</span>
            <h2 className="display-title text-4xl md:text-6xl">
              Bring your saved moments to a planner.
            </h2>
          </div>
          <div>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              Share the moments you want to recreate. A JourneyMakers concierge turns them into a
              private itinerary with stays, routing, pacing, and local access handled.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/booking"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#171717] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-accent focus-ring"
              >
                Start private inquiry <ArrowUpRight className="size-4" />
              </Link>
              <span className="inline-flex min-h-14 items-center gap-2 rounded-full px-2 text-sm font-bold text-muted-foreground">
                <Users className="size-4 text-accent" /> Planner reply within 24 hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  copy,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr] md:items-end">
      <div>
        <span
          className={`mb-3 block text-xs font-black uppercase ${dark ? "text-[#d7aa73]" : "text-accent"}`}
        >
          {eyebrow}
        </span>
        <h2 className="display-title text-4xl md:text-6xl">{title}</h2>
      </div>
      <p
        className={`max-w-xl text-base leading-8 md:justify-self-end ${dark ? "text-white/62" : "text-muted-foreground"}`}
      >
        {copy}
      </p>
    </div>
  );
}

function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-[#0b1018]/92 p-3 backdrop-blur-2xl md:hidden">
      <Link
        to="/booking"
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c76b2f] text-sm font-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
      >
        Start private inquiry <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

function getPlacesForPackage(packageItem: PackageItem) {
  return (
    placesByPackage[packageItem.slug] ?? [
      {
        name: packageItem.location,
        destinationSlug: packageItem.slug,
        days: `Days 1-${packageItem.days}`,
        topMoments: [packageItem.tagline, "Private guide route", "Guest favorite view"],
        quote:
          "The shared moments helped us understand what the itinerary would actually feel like.",
        quoteAuthor: "Verified traveler",
      },
    ]
  );
}

function PackageReviewsSection({ slug, title }: { slug: string; title: string }) {
  const [showForm, setShowForm] = useState(false);
  // Votes now persist in localStorage so users can't re-vote after refresh
  const { hasVoted, markVoted } = useHelpfulVotes();

  const reviewsQuery = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () => api.getPackageReviews(slug),
  });
  const statsQuery = useQuery({
    queryKey: ["review-stats", slug],
    queryFn: () => api.getPackageReviewStats(slug),
  });

  const helpfulMut = useMutation({
    mutationFn: (publicId: string) => api.markReviewHelpful(publicId),
    onSuccess: (_, publicId) => {
      markVoted(publicId);
    },
  });

  const reviews = reviewsQuery.data ?? [];
  const stats = statsQuery.data as ApiReviewStats | undefined;

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold tracking-tighter">Traveler Reviews</h3>
          {stats && stats.total > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.average} ★ · {stats.total} review{stats.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-accent transition-colors"
        >
          Write a review
        </button>
      </div>

      {/* Star breakdown */}
      {stats && stats.total > 0 && (
        <div className="mb-6 rounded-2xl border border-border p-5 flex gap-6 items-center">
          <div className="text-center shrink-0">
            <div className="text-5xl font-black tracking-tighter">{stats.average}</div>
            <StarRating value={Math.round(stats.average)} readonly size="sm" />
            <div className="text-xs text-muted-foreground mt-1">{stats.total} reviews</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const breakdown = stats.breakdown as Record<number, number>;
              const count = breakdown[star] ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right text-muted-foreground">{star}</span>
                  <span className="text-amber-400">★</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">No reviews yet. Be the first to share your experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.public_id} className="rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{review.customer_name ?? "Traveler"}</span>
                    {review.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                        ✓ Verified traveler
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating value={review.rating} readonly size="sm" />
                    {review.trip_date && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Traveled {review.trip_date}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.title && (
                <p className="mt-3 font-bold text-sm">{review.title}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground leading-7">{review.body}</p>
              {review.media_urls?.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {review.media_urls.map((url) => (
                    <img
                      key={url}
                      src={url.startsWith("/") ? `http://localhost:8000${url}` : url}
                      alt="Review"
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {/* Admin reply */}
              {review.admin_reply && (
                <div className="mt-3 rounded-xl bg-secondary/60 border border-border/50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Response from JourneyMakers</p>
                  <p className="text-sm text-muted-foreground">{review.admin_reply}</p>
                </div>
              )}
              {/* Helpful */}
              <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border/50">
                <button
                  onClick={() => !hasVoted(review.public_id) && helpfulMut.mutate(review.public_id)}
                  disabled={hasVoted(review.public_id)}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center gap-1"
                >
                  👍 Helpful ({review.helpful_count ?? 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReviewForm
        packageSlug={slug}
        packageTitle={title}
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </div>
  );
}

function getPlaceGallery(place: JourneyPlace, packageItem: PackageItem): GalleryItem[] {
  // Use gallery from the destination API response; fall back to generated placeholders
  const gallery = (place.gallery ?? []) as GalleryItem[];

  if (gallery.length === 0) {
    return galleryFallback(place.destinationSlug ?? packageItem.slug);
  }

  return gallery.map((item) => ({
    ...item,
    src: MEDIA.destinations?.[place.destinationSlug] ?? packageItem.image,
  }));
}
