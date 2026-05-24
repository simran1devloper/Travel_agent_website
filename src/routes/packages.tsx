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
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { MEDIA } from "@/config/media";
import { api } from "@/lib/api";
import { destinations, packages } from "@/lib/mock-data";

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

type PackageItem = (typeof packages)[number];
type GalleryItem = (typeof destinations)[number]["gallery"][number];

type JourneyPlace = {
  name: string;
  destinationSlug: string;
  days: string;
  topMoments: string[];
  quote: string;
  quoteAuthor: string;
};

const featuredPackages = packages.slice(0, 4);

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
        <FeaturedJourneys />
        <QuietQuote />
        <CuratedMemory />
        <PlannerCta />
        <MobileStickyCta />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
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

function FeaturedJourneys() {
  return (
    <section id="journeys" className="bg-[#f7f2ea] py-20 md:py-28">
      <div className="section-shell">
        <SectionIntro
          eyebrow="Featured journeys"
          title="Four ways to begin."
          copy="A smaller, more deliberate set of journeys keeps the page calm and makes comparison easier."
        />

        <div className="mt-12 grid gap-8">
          {featuredPackages.map((packageItem, index) => (
            <DestinationStoryCard key={packageItem.slug} index={index} packageItem={packageItem} />
          ))}
        </div>
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
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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
          disabled={saving || saved}
          onClick={async () => {
            setSaving(true);
            try {
              await api.saveWishlist(packageItem.slug);
              setSaved(true);
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-accent focus-ring"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save moment"} <Heart className="size-4" />
        </button>
        <Link
          to="/booking"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-black/12 px-5 text-sm font-extrabold text-foreground transition-all hover:-translate-y-0.5 hover:bg-[#f7f2ea] focus-ring"
        >
          Explore journey <ArrowUpRight className="size-4" />
        </Link>
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
  return (
    <section className="bg-[#fffaf2] py-20 md:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-3xl font-black leading-tight md:text-5xl">
            "Luxury is not more information. It is the confidence to show only what matters."
          </p>
          <p className="mt-6 text-sm font-bold uppercase text-muted-foreground">
            JourneyMakers design principle
          </p>
        </div>
      </div>
    </section>
  );
}

function CuratedMemory() {
  const packageItem = packages[4] ?? packages[0];
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

function getPlaceGallery(place: JourneyPlace, packageItem: PackageItem): GalleryItem[] {
  const destination = destinations.find((item) => item.slug === place.destinationSlug);
  const gallery = destination?.gallery ?? [];

  if (gallery.length === 0) {
    return packageItem.reviews.flatMap((review) =>
      review.media.map((item) => ({
        type: item.type,
        src: packageItem.image,
        caption: item.label,
        author: `${review.author} - ${review.date}`,
      })),
    ) as GalleryItem[];
  }

  return gallery.map((item) => ({
    ...item,
    src: MEDIA.destinations[place.destinationSlug] ?? packageItem.image,
  }));
}
