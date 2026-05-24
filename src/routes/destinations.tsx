import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  Flame,
  Heart,
  MapPin,
  Play,
  Plus,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { destinations } from "@/lib/mock-data";

export const Route = createFileRoute("/destinations")({
  head: () => ({
    meta: [
      { title: "Destinations — JourneyMakers" },
      {
        name: "description",
        content:
          "Browse destinations through verified traveler moments, community favorites, and curated journey ideas.",
      },
      { property: "og:title", content: "Destinations — JourneyMakers" },
      {
        property: "og:description",
        content: "Explore destinations through shared traveler experiences.",
      },
      { property: "og:url", content: "/destinations" },
    ],
    links: [{ rel: "canonical", href: "/destinations" }],
  }),
  component: DestinationsPage,
});

type Destination = (typeof destinations)[number];
type GalleryItem = Destination["gallery"][number];

const destinationProfiles: Record<
  string,
  {
    bestFor: string;
    curated: number;
    saved: number;
    uploaded: string;
    popular: string[];
    quote: string;
    quoteAuthor: string;
    mood: string;
  }
> = {
  "bangkok-singapore": {
    bestFor: "food + skyline lovers",
    curated: 24,
    saved: 248,
    uploaded: "12 new moments this week",
    popular: ["Rooftop dining", "Night markets", "Marina Bay"],
    quote: "The skyline after rain made the whole trip feel cinematic.",
    quoteAuthor: "Sarah, UK",
    mood: "City pulse",
  },
  newyork: {
    bestFor: "galleries + rooftop nights",
    curated: 18,
    saved: 312,
    uploaded: "8 new moments this week",
    popular: ["Broadway", "Brooklyn views", "After-hours museums"],
    quote: "New York felt edited for us, not thrown at us.",
    quoteAuthor: "Elena, Italy",
    mood: "Urban energy",
  },
  salonei: {
    bestFor: "quiet beaches + culture",
    curated: 16,
    saved: 186,
    uploaded: "6 new moments this week",
    popular: ["Private coves", "Fish markets", "Sunset boats"],
    quote: "It was private, warm, and beautifully unhurried.",
    quoteAuthor: "Camille, France",
    mood: "Coastal calm",
  },
  switzerland: {
    bestFor: "rail journeys + alpine calm",
    curated: 27,
    saved: 405,
    uploaded: "15 new moments this week",
    popular: ["Glacier Express", "Chalet terraces", "Lake mornings"],
    quote: "The silence before sunrise in Switzerland was the best part.",
    quoteAuthor: "Mia, Germany",
    mood: "Alpine quiet",
  },
  "tokyo-seoul": {
    bestFor: "night food + design",
    curated: 22,
    saved: 356,
    uploaded: "19 new moments this week",
    popular: ["Shinjuku walks", "Korean BBQ", "Palace mornings"],
    quote: "Tokyo and Seoul gave us neon, food, and sudden moments of calm.",
    quoteAuthor: "Lina, Singapore",
    mood: "Neon culture",
  },
  vietnam: {
    bestFor: "rivers + street culture",
    curated: 19,
    saved: 221,
    uploaded: "10 new moments this week",
    popular: ["Ha Long sunrise", "Mekong cruise", "Hoi An lanterns"],
    quote: "Vietnam was soft mornings, warm streets, and water everywhere.",
    quoteAuthor: "Mina, Korea",
    mood: "River rhythm",
  },
};

const filters = [
  { id: "most", label: "Most Shared", icon: Flame },
  { id: "cinematic", label: "Cinematic", icon: Play },
  { id: "food", label: "Food", icon: Sparkles },
  { id: "nightlife", label: "Nightlife", icon: Star },
  { id: "nature", label: "Nature", icon: MapPin },
];

function DestinationsPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f6f1ea]">
        <Hero />
        <DestinationGrid />
        <TravelerExperiences />
        <BuildJourneyCTA />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function Hero() {
  return (
    <section className="section-shell pb-14 pt-20 md:pb-20 md:pt-28">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div className="max-w-3xl">
          <span className="eyebrow mb-6">124+ destinations, shared by travelers</span>
          <h1 className="display-title mb-6 text-5xl md:text-7xl">
            Discover places through people who have been there.
          </h1>
          <p className="body-copy text-lg">
            Browse destinations by traveler memories, community favorites, and curated journeys you
            can build from saved moments.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric value="12,400+" label="shared experiences" />
            <Metric value="84" label="countries explored" />
            <Metric value="3,200+" label="curated journeys" />
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-white/56 p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <span className="size-2 rounded-full bg-accent" /> Live this week
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              12 travelers shared moments
            </span>
          </div>
          <div className="grid gap-3">
            {destinations.slice(0, 3).map((destination, index) => (
              <div
                key={destination.slug}
                className="grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-[#fbf8f3] p-2 pr-4"
              >
                <img
                  src={destination.gallery[index]?.src ?? destination.image}
                  alt={destination.name}
                  loading="lazy"
                  className="h-14 w-full rounded-xl object-cover"
                />
                <div>
                  <div className="text-sm font-bold">New from {destination.name}</div>
                  <div className="text-xs font-medium text-muted-foreground">{index + 2}h ago</div>
                </div>
                <div className="flex -space-x-2">
                  {["A", "M", "S"].map((letter) => (
                    <span
                      key={`${destination.slug}-${letter}`}
                      className="grid size-7 place-items-center rounded-full border-2 border-[#fbf8f3] bg-[#0e1726] text-[10px] font-bold text-white"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/44 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function DestinationGrid() {
  return (
    <section className="bg-[#fbf8f3] py-18 md:py-24">
      <div className="section-shell">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-3">Explore by destination</span>
            <h2 className="display-title text-4xl md:text-6xl">Choose the place first.</h2>
          </div>
          <p className="max-w-md text-base leading-8 text-muted-foreground">
            Each card shows why people loved the place, what they captured, and which journeys can
            begin there.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  const profile = destinationProfiles[destination.slug];
  return (
    <Link
      to="/packages"
      className="group overflow-hidden rounded-3xl border border-border bg-white shadow-[0_18px_54px_rgba(14,23,38,0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_80px_rgba(14,23,38,0.14)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={destination.image}
          alt={destination.name}
          width={800}
          height={1000}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/18 to-transparent" />
        <div className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-foreground backdrop-blur-md">
          {profile?.mood}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
              {destination.reviewCount}+ traveler moments
            </span>
            <span className="rounded-full bg-white/14 px-3 py-1.5 backdrop-blur-md">
              {profile?.curated} curated experiences
            </span>
          </div>
          <h3 className="text-3xl font-bold leading-tight">{destination.name}</h3>
          <p className="mt-2 text-base leading-7 text-white/80">{destination.tagline}</p>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-muted-foreground">
            Best for {profile?.bestFor}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[#7a512f]">
            <Heart className="size-4 fill-[#d7aa73] text-[#d7aa73]" /> {profile?.saved}
          </span>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {profile?.popular.map((item) => (
            <span
              key={item}
              className="rounded-full bg-[#f2e5d6] px-3 py-1.5 text-sm font-semibold text-[#7a512f]"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="text-base leading-8 text-muted-foreground">
          "{profile?.quote}"{" "}
          <span className="font-semibold text-foreground/70">- {profile?.quoteAuthor}</span>
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
          <span className="text-sm font-semibold text-accent">{profile?.uploaded}</span>
          <ArrowUpRight className="size-5 text-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function TravelerExperiences() {
  const [activeSlug, setActiveSlug] = useState(destinations[0].slug);
  const [activeFilter, setActiveFilter] = useState(filters[0].id);
  const active =
    destinations.find((destination) => destination.slug === activeSlug) ?? destinations[0];
  const profile = destinationProfiles[active.slug];
  const gallery = useMemo(() => active.gallery, [active]);
  const [featured, ...supporting] = gallery;

  return (
    <section className="bg-[#eee6dc] py-18 md:py-24">
      <div className="section-shell">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-3">Experiences, captured</span>
            <h2 className="display-title text-4xl md:text-6xl">Memories with people attached.</h2>
          </div>
          <div className="rounded-2xl border border-border bg-white/50 px-5 py-4 text-sm font-semibold text-muted-foreground">
            <span className="mr-2 inline-block size-2 rounded-full bg-accent" />
            {active.reviewCount}+ photos, videos, and traveler tips from {active.name}
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {destinations.map((destination) => (
            <button
              key={destination.slug}
              onClick={() => setActiveSlug(destination.slug)}
              className={`shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                activeSlug === destination.slug
                  ? "bg-[#0e1726] text-white shadow-[0_12px_30px_rgba(14,23,38,0.16)]"
                  : "border border-border bg-white/46 text-muted-foreground hover:text-foreground"
              }`}
            >
              {destination.name} · {destination.reviewCount}
            </button>
          ))}
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeFilter === filter.id
                    ? "bg-accent text-white"
                    : "border border-border bg-white/50 text-foreground/72"
                }`}
              >
                <Icon className="size-4" /> {filter.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeSlug}-${activeFilter}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
          >
            {featured && <FeaturedMoment destination={active} item={featured} profile={profile} />}
            <div className="grid gap-4">
              <div className="rounded-3xl border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  <Users className="size-4" /> Why people loved it
                </div>
                <p className="text-2xl font-semibold leading-snug">"{profile?.quote}"</p>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">
                  - {profile?.quoteAuthor}
                </p>
              </div>
              {supporting.slice(0, 3).map((item) => (
                <SmallMoment key={item.src} destination={active} item={item} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function FeaturedMoment({
  destination,
  item,
  profile,
}: {
  destination: Destination;
  item: GalleryItem;
  profile?: (typeof destinationProfiles)[string];
}) {
  return (
    <article className="group relative min-h-[520px] overflow-hidden rounded-3xl border border-border bg-[#0e1726] shadow-[var(--shadow-lift)]">
      <img
        src={item.src}
        alt={item.caption}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/20 to-transparent" />
      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/48 px-4 py-2 text-sm font-bold text-white backdrop-blur-md">
          {item.type === "video" ? (
            <Play className="size-4 fill-white" />
          ) : (
            <Camera className="size-4" />
          )}
          Verified traveler moment
        </span>
        <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-foreground">
          {profile?.saved} saved this
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
        <div className="mb-4 flex -space-x-2">
          {["S", "A", "M", "J"].map((letter) => (
            <span
              key={`${destination.slug}-${letter}`}
              className="grid size-10 place-items-center rounded-full border-2 border-black/30 bg-white text-xs font-bold text-foreground"
            >
              {letter}
            </span>
          ))}
        </div>
        <h3 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{item.caption}</h3>
        <p className="mt-4 max-w-xl text-lg leading-8 text-white/78">
          "{profile?.quote}"{" "}
          <span className="font-semibold text-white">- {profile?.quoteAuthor}</span>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5">
            <Plus className="size-4" /> Add this moment to my trip
          </button>
          <Link
            to="/booking"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/22 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md transition-all hover:-translate-y-0.5"
          >
            Generate a journey <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function SmallMoment({ destination, item }: { destination: Destination; item: GalleryItem }) {
  return (
    <article className="grid grid-cols-[132px_1fr] overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
      <div className="relative min-h-36 overflow-hidden">
        <img
          src={item.src}
          alt={item.caption}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-2 top-2 rounded-full bg-black/52 p-2 text-white backdrop-blur-sm">
          {item.type === "video" ? (
            <Play className="size-3.5 fill-white" />
          ) : (
            <Camera className="size-3.5" />
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="mb-2 text-xs font-bold text-accent">Community favorite</div>
        <h4 className="line-clamp-2 text-lg font-semibold leading-snug">{item.caption}</h4>
        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
          {item.author} · {destination.name}
        </p>
        <button className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-foreground">
          <Heart className="size-4" /> Save moment
        </button>
      </div>
    </article>
  );
}

function BuildJourneyCTA() {
  return (
    <section className="bg-[#0e1726] py-18 text-white md:py-24">
      <div className="section-shell">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <span className="mb-4 block text-sm font-bold text-[#d7aa73]">
              Build journey from moments
            </span>
            <h2 className="display-title max-w-3xl text-4xl md:text-6xl">
              Save what you love, then let us turn it into a route.
            </h2>
          </div>
          <Link
            to="/booking"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5"
          >
            Generate my journey <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
