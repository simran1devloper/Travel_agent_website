import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { MEDIA } from "@/config/media";
import {
  API_BASE_URL,
  api,
  type ApiPackage,
  type ApiGalleryItem,
  type ApiReview,
  type ApiReviewStats,
} from "@/lib/api";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import {
  useRecentlyViewed,
  useGuestWishlist,
  useHelpfulVotes,
  usePackageFilterState,
  useCompareList,
} from "@/lib/user-prefs";
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

type ReviewMoment = GalleryItem & {
  reviewId?: string;
  reviewTitle?: string;
  reviewBody?: string;
  reviewer?: string;
  rating?: number;
  tripDate?: string;
};

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
    {
      type: "photo",
      src: `https://picsum.photos/seed/${slug}-01/600/800`,
      caption: "Featured moment",
      author: "JourneyMakers traveler",
    },
    {
      type: "photo",
      src: `https://picsum.photos/seed/${slug}-02/800/600`,
      caption: "Local scene",
      author: "Verified traveler",
    },
    {
      type: "video",
      src: `https://picsum.photos/seed/${slug}-reel/600/400`,
      caption: "Journey highlights",
      author: "Community moment",
    },
    {
      type: "photo",
      src: `https://picsum.photos/seed/${slug}-04/600/800`,
      caption: "Hidden gems",
      author: "JourneyMakers guide",
    },
  ];
}

function resolveReviewMediaUrl(url: string) {
  return url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
}

function isVideoMoment(src: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(src);
}

function getReviewMoments(reviews: ApiReview[]): ReviewMoment[] {
  return reviews.flatMap((review) =>
    (review.media_urls ?? []).map((url, index) => ({
      type: isVideoMoment(url) ? "video" : "photo",
      src: resolveReviewMediaUrl(url),
      caption: review.title || `Traveler moment ${index + 1}`,
      author: review.customer_name ?? "Verified traveler",
      reviewId: review.public_id,
      reviewTitle: review.title,
      reviewBody: review.body,
      reviewer: review.customer_name ?? "Traveler",
      rating: review.rating,
      tripDate: review.trip_date,
    })),
  );
}

function mapApiPackage(pkg: ApiPackage): PackageItem {
  return {
    slug: pkg.slug,
    title: pkg.title,
    location: pkg.location,
    days: pkg.days,
    price: pkg.price,
    category: pkg.category ?? "Journey",
    image: pkg.image_url
      ? resolveReviewMediaUrl(pkg.image_url)
      : (MEDIA.destinations?.[pkg.slug] ?? `https://picsum.photos/seed/${pkg.slug}/800/600`),
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

const packageSpecs: Record<
  string,
  {
    bestTime: string;
    pace: string;
    stayStyle: string;
    idealFor: string;
    route: string[];
    inclusions: string[];
    funFacts: string[];
    planningNotes: string[];
  }
> = {
  "bangkok-singapore": {
    bestTime: "November to March",
    pace: "Medium pace with food-led evenings",
    stayStyle: "Skyline hotels and private transfers",
    idealFor: "Couples, friends, first-time Asia travelers",
    route: ["Bangkok", "Singapore"],
    inclusions: [
      "Private airport transfers",
      "Rooftop dining reservation",
      "Guided market route",
      "Marina Bay evening plan",
    ],
    funFacts: [
      "Bangkok and Singapore are both globally loved street-food cities.",
      "This pairing balances traditional temple mornings with futuristic skyline nights.",
      "Many travelers save this route for food, shopping, and short-haul luxury.",
    ],
    planningNotes: [
      "Add one free evening in each city",
      "Reserve restaurants early",
      "Pack breathable clothing",
    ],
  },
  "newyork-citypulse": {
    bestTime: "April to June or September to November",
    pace: "High-energy days with flexible evenings",
    stayStyle: "Boutique city hotels near dining and theatre",
    idealFor: "Culture lovers, families, couples, city explorers",
    route: ["Manhattan", "Brooklyn"],
    inclusions: [
      "Theatre planning",
      "Private gallery route",
      "Rooftop table suggestions",
      "Neighborhood food map",
    ],
    funFacts: [
      "Central Park is larger than Monaco.",
      "New York has one of the world's most diverse dining scenes.",
      "The city is best experienced by neighborhood, not checklist.",
    ],
    planningNotes: [
      "Book shows early",
      "Use private transfers for late nights",
      "Build walking breaks into each day",
    ],
  },
  "salonei-retreat": {
    bestTime: "May to September",
    pace: "Slow and restorative",
    stayStyle: "Coastal boutique stays and private boats",
    idealFor: "Honeymoons, beach lovers, slow travel",
    route: ["Old town", "Private coves", "Fishing harbor"],
    inclusions: [
      "Sunset boat option",
      "Market breakfast walk",
      "Beach club reservation",
      "Private transfer plan",
    ],
    funFacts: [
      "Local menus often change with the morning catch.",
      "The best beach hours are usually early morning and late afternoon.",
      "Slow coastal journeys work best with fewer hotel moves.",
    ],
    planningNotes: [
      "Keep one unscheduled day",
      "Book boats before peak season",
      "Pack light layers for evenings",
    ],
  },
  "switzerland-alpine": {
    bestTime: "June to September or December to March",
    pace: "Slow scenic route with rail days",
    stayStyle: "Lake hotels, alpine lodges, and chalet terraces",
    idealFor: "Scenic rail lovers, families, luxury nature travel",
    route: ["Zurich", "Interlaken", "Zermatt", "Lake towns"],
    inclusions: [
      "Rail reservation guidance",
      "Mountain-view stay planning",
      "Lake morning route",
      "Chalet dining suggestions",
    ],
    funFacts: [
      "The Glacier Express is famous for panoramic slow travel.",
      "Switzerland has thousands of lakes.",
      "Many alpine villages are best explored without cars.",
    ],
    planningNotes: [
      "Reserve panoramic rail seats",
      "Pack layers",
      "Avoid overloading mountain days",
    ],
  },
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
              <img src={pkg.image} alt={pkg.title} className="size-10 rounded-xl object-cover" />
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
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);

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

  if (isLoading)
    return (
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
          copy={c(
            "featured_section",
            "body",
            "A smaller, more deliberate set of journeys keeps the page calm and makes comparison easier.",
          )}
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
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">
              Budget
            </span>
            {BUDGET_FILTERS.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() =>
                  setSelectedBudgetLabel(selectedBudgetLabel === b.label ? "" : b.label)
                }
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
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">
              Duration
            </span>
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
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground self-center mr-1">
                Category
              </span>
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
              <DestinationStoryCard
                key={packageItem.slug}
                index={index}
                packageItem={packageItem}
                onOpenDetails={() => setSelectedPackage(packageItem)}
              />
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
      <PackageDetailModal packageItem={selectedPackage} onClose={() => setSelectedPackage(null)} />
    </section>
  );
}

function DestinationStoryCard({
  packageItem,
  index,
  onOpenDetails,
}: {
  packageItem: PackageItem;
  index: number;
  onOpenDetails: () => void;
}) {
  const places = getPlacesForPackage(packageItem);
  const fallbackMoments = places.flatMap((place) =>
    getPlaceGallery(place, packageItem)
      .slice(0, 2)
      .map((item) => ({ item, place })),
  );
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", packageItem.slug],
    queryFn: () => api.getPackageReviews(packageItem.slug),
  });
  const reviewMoments = getReviewMoments(reviews);
  const moments =
    reviewMoments.length > 0
      ? reviewMoments.map((item) => ({ item, place: places[0] }))
      : fallbackMoments;
  const [activeMoment, setActiveMoment] = useState<number | null>(null);
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
        <JourneyDetailPanel
          packageItem={packageItem}
          places={places}
          topMoments={topMoments}
          onOpenDetails={onOpenDetails}
        />

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Traveler moments preview</h3>
            <span className="text-sm font-semibold text-muted-foreground">
              {places.length} {places.length === 1 ? "city" : "cities"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {moments.slice(0, 3).map(({ item, place }, momentIndex) => (
              <ExperienceMomentCard
                key={`${packageItem.slug}-${place.name}-${item.caption}-${item.src}`}
                item={item}
                placeName={place.name}
                onOpen={() => setActiveMoment(momentIndex)}
              />
            ))}
          </div>
        </div>
      </div>

      {activeMoment !== null && (
        <ReviewMomentsModal
          moments={moments.map(({ item }) => item)}
          activeIndex={activeMoment}
          onChange={setActiveMoment}
          onClose={() => setActiveMoment(null)}
          packageTitle={packageItem.title}
        />
      )}

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
  onOpenDetails,
}: {
  packageItem: PackageItem;
  places: JourneyPlace[];
  topMoments: string[];
  onOpenDetails: () => void;
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

      <button
        type="button"
        onClick={onOpenDetails}
        className="mb-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f7f2ea] px-5 text-sm font-extrabold text-foreground transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-ring"
      >
        View full specifications <Info className="size-4" />
      </button>

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
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save moment"}{" "}
          <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
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
          {inCompare(packageItem.slug)
            ? "✓ Added to compare"
            : isFull
              ? "Compare full (max 3)"
              : "Compare"}
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

function PackageDetailModal({
  packageItem,
  onClose,
}: {
  packageItem: PackageItem | null;
  onClose: () => void;
}) {
  if (!packageItem) return null;

  const places = getPlacesForPackage(packageItem);
  const spec =
    packageSpecs[packageItem.slug] ??
    ({
      bestTime: "Year-round with seasonal planning",
      pace: `${packageItem.days}-day private journey`,
      stayStyle: "Curated stays matched to your comfort",
      idealFor: packageItem.category,
      route: places.map((place) => place.name),
      inclusions: [
        "Private planning call",
        "Custom itinerary design",
        "Stay and transfer guidance",
        "Concierge support",
      ],
      funFacts: [
        "This route can be adjusted around traveler memories, not only standard attractions.",
        "JourneyMakers planners tune the pace before confirming hotels and transfers.",
      ],
      planningNotes: [
        "Share preferred pace early",
        "Mention dietary needs",
        "Keep room for one flexible local evening",
      ],
    } satisfies (typeof packageSpecs)[string]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-md">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#fffaf2] shadow-2xl">
        <div className="relative min-h-[320px]">
          <img
            src={packageItem.image}
            alt={packageItem.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/20 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close package details"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md hover:bg-black/65"
          >
            <X className="size-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#eda36b]">
              <MapPin className="size-4" /> {packageItem.location}
            </p>
            <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              {packageItem.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/82">
              {packageStories[packageItem.slug] ?? packageItem.description ?? packageItem.tagline}
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="grid grid-cols-2 gap-3">
              <PackageSpecTile
                icon={CalendarDays}
                label="Duration"
                value={`${packageItem.days} days`}
              />
              <PackageSpecTile icon={Clock3} label="Best time" value={spec.bestTime} />
              <PackageSpecTile icon={MapPin} label="Route" value={spec.route.join(" + ")} />
              <PackageSpecTile
                icon={Star}
                label="Starting from"
                value={`₹${packageItem.price.toLocaleString("en-IN")}`}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-xs font-black uppercase text-accent">Journey profile</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-foreground/78">
                <ProfileLine label="Pace" value={spec.pace} />
                <ProfileLine label="Stay style" value={spec.stayStyle} />
                <ProfileLine label="Ideal for" value={spec.idealFor} />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <PackageDetailList title="Included planning" items={spec.inclusions} />
            <PackageDetailList title="Fun facts" items={spec.funFacts} />
            <PackageDetailList title="Planning notes" items={spec.planningNotes} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/booking"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-extrabold text-white hover:bg-accent focus-ring"
              >
                Plan this package <ArrowUpRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-5 text-sm font-extrabold text-foreground hover:border-accent hover:text-accent focus-ring"
              >
                Back to packages
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageSpecTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <Icon className="mb-3 size-5 text-accent" />
      <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-extrabold leading-5">{value}</p>
    </div>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-black/10 pb-3 last:border-0 last:pb-0">
      <span className="w-24 shrink-0 text-xs font-black uppercase text-muted-foreground">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function PackageDetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="mb-3 text-xs font-black uppercase text-accent">{title}</p>
      <ul className="grid gap-2 text-sm font-semibold leading-6 text-foreground/76">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExperienceMomentCard({
  item,
  placeName,
  onOpen,
}: {
  item: GalleryItem;
  placeName: string;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-xl bg-[#171717] text-left focus-ring"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {item.type === "video" || isVideoMoment(item.src) ? (
          <video
            src={item.src}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={item.src}
            alt={item.caption}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
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
    </button>
  );
}

function ReviewMomentsModal({
  moments,
  activeIndex,
  onChange,
  onClose,
  packageTitle,
}: {
  moments: ReviewMoment[];
  activeIndex: number;
  onChange: (index: number) => void;
  onClose: () => void;
  packageTitle: string;
}) {
  const active = moments[activeIndex];
  if (!active) return null;

  const hasMany = moments.length > 1;
  const goPrev = () => onChange((activeIndex - 1 + moments.length) % moments.length);
  const goNext = () => onChange((activeIndex + 1) % moments.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/78 p-3 backdrop-blur-md sm:p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              Customer moments
            </p>
            <h3 className="truncate text-base font-black">{packageTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_340px]">
          <div className="relative flex min-h-[360px] items-center justify-center bg-[#0f0f0f]">
            {active.type === "video" || isVideoMoment(active.src) ? (
              <video
                src={active.src}
                className="max-h-full max-w-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={active.src}
                alt={active.caption}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {hasMany && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-md hover:bg-black/70"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-md hover:bg-black/70"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-border bg-background lg:border-l lg:border-t-0">
            <div className="p-5">
              <div className="flex items-center gap-2">
                {active.rating && <StarRating value={active.rating} readonly size="sm" />}
                {active.tripDate && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {active.tripDate}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-black">{active.reviewTitle || active.caption}</p>
              {active.reviewBody && (
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{active.reviewBody}</p>
              )}
              <p className="mt-4 text-xs font-bold text-foreground/70">
                - {active.reviewer ?? active.author}
              </p>
            </div>

            {hasMany && (
              <div className="grid grid-cols-4 gap-2 border-t border-border p-4 lg:grid-cols-3">
                {moments.map((moment, index) => (
                  <button
                    type="button"
                    key={`${moment.src}-${index}`}
                    onClick={() => onChange(index)}
                    className={`aspect-square overflow-hidden rounded-lg border ${activeIndex === index ? "border-accent" : "border-transparent"}`}
                  >
                    {moment.type === "video" || isVideoMoment(moment.src) ? (
                      <video
                        src={moment.src}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={moment.src}
                        alt={moment.caption}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuietQuote() {
  const { c } = useContent("packages");
  return (
    <section className="bg-[#fffaf2] py-20 md:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-3xl font-black leading-tight md:text-5xl">
            "
            {c(
              "quiet_quote",
              "text",
              "Luxury is not more information. It is the confidence to show only what matters.",
            )}
            "
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

  if (!packageItem)
    return (
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const queryClient = useQueryClient();
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
    onMutate: async (publicId) => {
      await queryClient.cancelQueries({ queryKey: ["reviews", slug] });
      const previousReviews = queryClient.getQueryData<ApiReview[]>(["reviews", slug]);

      queryClient.setQueryData<ApiReview[]>(["reviews", slug], (current) =>
        current?.map((review) =>
          review.public_id === publicId
            ? { ...review, helpful_count: (review.helpful_count ?? 0) + 1 }
            : review,
        ),
      );

      return { previousReviews };
    },
    onError: (_error, _publicId, context) => {
      queryClient.setQueryData(["reviews", slug], context?.previousReviews);
    },
    onSuccess: (result, publicId) => {
      markVoted(publicId);
      queryClient.setQueryData<ApiReview[]>(["reviews", slug], (current) =>
        current?.map((review) =>
          review.public_id === publicId
            ? { ...review, helpful_count: result.helpful_count }
            : review,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
    },
  });

  const reviews = reviewsQuery.data ?? [];
  const stats = statsQuery.data as ApiReviewStats | undefined;
  const sortedReviews = [...reviews].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if ((b.helpful_count ?? 0) !== (a.helpful_count ?? 0)) {
      return (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const topReview = sortedReviews[0];
  const reviewHasHelpfulVote = (review: ApiReview) =>
    hasVoted(review.public_id) && (review.helpful_count ?? 0) > 0;
  const reviewIsVoting = (review: ApiReview) =>
    helpfulMut.isPending && helpfulMut.variables === review.public_id;

  return (
    <div id={`reviews-${slug}`} className="mt-10 border-t border-border pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold tracking-tighter">Traveler Reviews</h3>
          {stats && stats.total > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.average} ★ · {stats.total} review{stats.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {reviews.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllReviews(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:bg-secondary transition-colors"
            >
              View all reviews
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-accent transition-colors"
          >
            Write a review
          </button>
        </div>
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
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-muted-foreground">Top customer review</p>
            {reviews.length > 1 && (
              <span className="text-xs font-semibold text-muted-foreground">
                Showing 1 of {reviews.length}
              </span>
            )}
          </div>
          {topReview && (
            <ReviewCard
              review={topReview}
              hasVoted={reviewHasHelpfulVote(topReview)}
              isVoting={reviewIsVoting(topReview)}
              onHelpful={() => helpfulMut.mutate(topReview.public_id)}
            />
          )}
        </div>
      )}

      {reviews.length > 1 && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setShowAllReviews(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-bold hover:bg-secondary"
          >
            View all {reviews.length} reviews
          </button>
        </div>
      )}

      {showAllReviews && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close reviews"
            className="absolute inset-0 bg-[#11131c]/72"
            onClick={() => setShowAllReviews(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[820px] flex-col bg-background shadow-2xl sm:w-[58vw]">
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-wide">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.average ?? 0} ★ · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllReviews(false)}
                className="rounded-full p-2 hover:bg-secondary"
                aria-label="Close reviews"
              >
                <X className="size-6" />
              </button>
            </div>

            {stats && stats.total > 0 && (
              <div className="border-b border-border px-5 py-4">
                <ReviewStatsDashboard stats={stats} compact />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">All customer reviews</p>
                <button
                  type="button"
                  onClick={() => setShowAllReviews(false)}
                  className="text-sm font-bold text-accent hover:underline"
                >
                  View less
                </button>
              </div>
              <div className="divide-y divide-border">
                {sortedReviews.map((review) => (
                  <div key={review.public_id} className="py-5 first:pt-0">
                    <ReviewCard
                      review={review}
                      hasVoted={reviewHasHelpfulVote(review)}
                      isVoting={reviewIsVoting(review)}
                      onHelpful={() => helpfulMut.mutate(review.public_id)}
                      flush
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
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

function ReviewStatsDashboard({
  stats,
  compact = false,
}: {
  stats: ApiReviewStats;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border p-5 flex gap-6 items-center ${compact ? "bg-secondary/20" : ""}`}
    >
      <div className="text-center shrink-0">
        <div className={`${compact ? "text-4xl" : "text-5xl"} font-black tracking-tighter`}>
          {stats.average}
        </div>
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
  );
}

function ReviewCard({
  review,
  hasVoted,
  isVoting = false,
  onHelpful,
  flush = false,
}: {
  review: ApiReview;
  hasVoted: boolean;
  isVoting?: boolean;
  onHelpful: () => void;
  flush?: boolean;
}) {
  return (
    <div className={flush ? "" : "rounded-2xl border border-border p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{review.customer_name ?? "Traveler"}</span>
            {Boolean(review.verified) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                ✓ Verified traveler
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-black text-white">
              {review.rating.toFixed(1)} ★
            </span>
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
      {review.title && <p className="mt-3 font-bold text-sm">{review.title}</p>}
      <p className="mt-2 text-sm text-muted-foreground leading-7">{review.body}</p>
      {review.media_urls?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.media_urls.map((url) => (
            <ReviewMediaThumb key={url} url={url} />
          ))}
        </div>
      )}
      {review.admin_reply && (
        <div className="mt-3 rounded-xl bg-secondary/60 border border-border/50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">
            Response from JourneyMakers
          </p>
          <p className="text-sm text-muted-foreground">{review.admin_reply}</p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border/50">
        <button
          type="button"
          onClick={() => !hasVoted && !isVoting && onHelpful()}
          disabled={hasVoted || isVoting}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          👍 {isVoting ? "Saving..." : "Helpful"} ({review.helpful_count ?? 0})
        </button>
      </div>
    </div>
  );
}
function ReviewMediaThumb({ url }: { url: string }) {
  const src = resolveReviewMediaUrl(url);
  if (isVideoMoment(src)) {
    return (
      <video
        src={src}
        className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
        controls
        preload="metadata"
      />
    );
  }
  return <img src={src} alt="Review" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />;
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
