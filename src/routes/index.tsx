import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Plane,
  FileCheck,
  Hotel,
  Users,
  Heart,
  Mountain,
  MapPin,
  Calendar,
  Wallet,
  ChevronDown,
  Play,
  Camera,
  BadgeCheck,
  Clock3,
  Globe2,
  ShieldCheck,
  Star,
  Bookmark,
  Sparkles,
  Quote,
} from "lucide-react";
import { useState } from "react";
import { MEDIA } from "@/config/media";
import {
  packages,
  destinations,
  services,
  testimonials,
  faqs,
  stats,
  communityReviews,
} from "@/lib/mock-data";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JourneyMakers — The world, re-stitched for you" },
      {
        name: "description",
        content:
          "Cinematic, curated journeys. Hand-crafted itineraries, visa concierge, and 24/7 global support across 124+ destinations.",
      },
      { property: "og:title", content: "JourneyMakers — The world, re-stitched for you" },
      {
        property: "og:description",
        content: "Cinematic, curated journeys across 124+ destinations.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "tour-packages": MapPin,
  "visa-assistance": FileCheck,
  "hotel-booking": Hotel,
  "flight-booking": Plane,
  "corporate-tours": Users,
  honeymoon: Heart,
  adventure: Mountain,
};

function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="relative">
        <Hero />
        <StatsStrip />
        <CinematicMoment />
        <FeaturedPackages />
        <ServicesSection />
        <DestinationStrip />
        <MomentCollector />
        <ReviewBoard />
        <Testimonials />
        <FaqSection />
        <NewsletterCTA />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[94vh] w-full flex-col justify-end overflow-hidden p-6 md:p-16">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={MEDIA.heroPoster}
        className="absolute inset-0 -z-10 w-full h-full object-cover"
      >
        <source src={MEDIA.heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.74),rgba(0,0,0,0.42)_52%,rgba(0,0,0,0.16)),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.7))]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[#0e1726]/70 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-7xl"
      >
        <div className="max-w-5xl">
          <span className="mb-5 inline-flex rounded-full border border-white/18 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-normal text-white/78 backdrop-blur-xl">
            Traveler-led luxury planning
          </span>
          <p className="mb-4 max-w-2xl text-base font-semibold uppercase tracking-normal text-white/76">
            Discover places through the moments travelers never stopped talking about.
          </p>
          <h1 className="mb-8 max-w-5xl text-balance text-5xl font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_6px_34px_rgba(0,0,0,0.35)] md:text-7xl lg:text-8xl">
            Build your journey from living memories.
          </h1>
          <p className="mb-10 max-w-2xl text-base leading-8 text-white/86 md:text-lg">
            Save cinematic traveler moments, feel the mood of every stop, then turn your collection
            into a private itinerary with concierge support.
          </p>

          <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              to="/booking"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-accent px-9 text-sm font-extrabold text-white shadow-[0_18px_50px_rgba(199,107,47,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(199,107,47,0.42)] focus-ring"
            >
              Start Collecting
            </Link>
            <Link
              to="/packages"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/32 bg-white/8 px-9 text-sm font-bold text-white backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/14 focus-ring"
            >
              View Journeys
            </Link>
          </div>

          <SearchBar />
        </div>
      </motion.div>
    </section>
  );
}

function SearchBar() {
  return (
    <div className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-white/22 bg-white/12 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:grid-cols-5">
      <FieldGroup icon={MapPin} label="Destination">
        <input
          type="text"
          placeholder="Where to?"
          className="bg-transparent text-white placeholder:text-white/40 outline-none text-sm font-medium w-full"
        />
      </FieldGroup>
      <FieldGroup icon={Calendar} label="Timeline">
        <input
          type="text"
          placeholder="Pick dates"
          className="bg-transparent text-white placeholder:text-white/40 outline-none text-sm font-medium w-full"
        />
      </FieldGroup>
      <FieldGroup icon={Users} label="Travelers">
        <input
          type="text"
          placeholder="2 adults"
          className="bg-transparent text-white placeholder:text-white/40 outline-none text-sm font-medium w-full"
        />
      </FieldGroup>
      <FieldGroup icon={Wallet} label="Budget">
        <input
          type="text"
          placeholder="$5k — $12k"
          className="bg-transparent text-white placeholder:text-white/40 outline-none text-sm font-medium w-full"
        />
      </FieldGroup>
      <Link
        to="/booking"
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 font-extrabold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(199,107,47,0.35)] active:scale-95 focus-ring"
      >
        Plan Journey <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

function FieldGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-white/8 md:border-r md:border-white/10 last:border-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-normal text-white/68">
        <Icon className="size-3.5" /> {label}
      </span>
      {children}
    </div>
  );
}

function StatsStrip() {
  return (
    <section className="border-y border-white/10 bg-[#0e1726] py-10 text-background">
      <div className="section-shell grid grid-cols-2 gap-4 text-center md:grid-cols-4 md:gap-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-7 backdrop-blur-xl"
          >
            <div className="mb-3 text-xs font-extrabold uppercase tracking-normal text-[#d7aa73]">
              {s.label}
            </div>
            <div className="text-3xl font-black tracking-normal md:text-4xl">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CinematicMoment() {
  const moment = destinations.find((d) => d.slug === "switzerland") ?? destinations[0];
  const quote = moment.gallery[0];

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-[#0e1726] text-white">
      <img
        src={MEDIA.destinations?.[moment.slug] ?? moment.image}
        alt={moment.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,23,38,0.82),rgba(14,23,38,0.38)_46%,rgba(14,23,38,0.1)),linear-gradient(180deg,rgba(14,23,38,0.12),rgba(14,23,38,0.76))]" />
      <div className="relative flex min-h-[78vh] items-end px-6 py-16 md:px-12 lg:px-20">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-extrabold backdrop-blur-md">
            <Sparkles className="size-4 text-[#d7aa73]" /> Cinematic Moment
          </div>
          <h2 className="mb-8 text-balance text-5xl font-black leading-[1.02] md:text-7xl">
            One saved memory can become the reason for the whole journey.
          </h2>
          <figure className="max-w-2xl border-l border-white/30 pl-6">
            <Quote className="mb-4 size-8 text-[#d7aa73]" />
            <blockquote className="text-2xl font-semibold leading-10 text-white/90">
              "{quote.caption} felt like the world went quiet for a few minutes."
            </blockquote>
            <figcaption className="mt-5 text-sm font-bold text-white/68">
              {quote.author} · Visited Apr 2026
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function FeaturedPackages() {
  return (
    <section className="section-shell py-24 md:py-30">
      <div className="mb-14 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div>
          <span className="eyebrow mb-4">Tailored Journeys</span>
          <h2 className="display-title text-4xl text-foreground md:text-6xl">
            Curated escapes for every traveler.
          </h2>
        </div>
        <div className="md:justify-self-end">
          <p className="body-copy mb-6">
            Larger imagery, quieter metadata, and clearer pricing make each journey easier to scan
            without losing its cinematic pull.
          </p>
          <Link
            to="/packages"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/18 bg-white/40 px-6 py-3 text-sm font-extrabold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-ring"
          >
            View all experiences <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
        {packages.slice(0, 3).map((p, i) => (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: i * 0.12, ease: [0.32, 0.72, 0, 1] }}
            className={`premium-card group overflow-hidden rounded-2xl transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] ${i === 0 ? "md:translate-y-8" : i === 2 ? "md:-translate-y-6" : ""}`}
          >
            <Link to="/packages" className="block">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/14 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-black/62 px-4 py-2 text-xs font-bold uppercase tracking-normal text-white backdrop-blur-md">
                  {p.days} days
                </div>
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/14 px-3 py-1.5 text-sm font-bold backdrop-blur-md">
                    <Star className="size-3.5 fill-[#d7aa73] text-[#d7aa73]" />{" "}
                    {p.rating.toFixed(1)} · {p.reviewCount}
                  </div>
                  <h3 className="text-3xl font-black leading-tight">{p.title}</h3>
                </div>
              </div>
              <div className="flex flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 text-xs font-extrabold uppercase tracking-normal text-accent">
                      {p.category}
                    </div>
                    <p className="text-base leading-7 text-muted-foreground">{p.tagline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold text-muted-foreground">From</div>
                    <div className="text-xl font-black">${p.price.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-5">
                  <span className="text-sm font-extrabold text-foreground">Discover more</span>
                  <ArrowUpRight className="size-5 text-accent transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ServicesSection() {
  const featured = services.slice(0, 8);
  return (
    <section className="bg-[#0e1726] py-24 text-background md:py-32">
      <div className="section-shell grid grid-cols-1 gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <span className="eyebrow mb-4 text-[#d7aa73]">What we orchestrate</span>
          <h2 className="display-title mb-8 text-4xl text-white md:text-6xl">
            Beyond the itinerary.
          </h2>
          <p className="mb-8 max-w-md text-lg leading-9 text-background/70">
            We do not just book flights. We orchestrate transitions between worlds: visas, jets,
            private chefs, and the moments in between.
          </p>
          <div className="mb-8 grid gap-3 text-sm text-background/76">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#d7aa73]" /> Emergency desk in every itinerary
            </span>
            <span className="inline-flex items-center gap-2">
              <Globe2 className="size-4 text-[#d7aa73]" /> Local specialists across 124 destinations
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-[#d7aa73]" /> Real-time trip changes handled quietly
            </span>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 rounded-full border border-background/22 px-6 py-3 text-sm font-extrabold transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent focus-ring"
          >
            All services <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((s) => {
            const Icon = serviceIcons[s.id] ?? Plane;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 transition-all hover:-translate-y-1 hover:bg-white/[0.085]"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-[#d7aa73]/28 bg-[#d7aa73]/12">
                  <Icon className="size-5 text-[#d7aa73]" />
                </div>
                <h4 className="mb-3 text-lg font-extrabold leading-snug">{s.name}</h4>
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#d7aa73]">
                  <Star className="size-4 fill-[#d7aa73]" />
                  <span>
                    {s.rating.toFixed(1)} · {s.reviewCount} reviews
                  </span>
                </div>
                <p className="text-base leading-8 text-background/68">{s.description}</p>
                <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-white/86">
                  {s.highlight}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DestinationStrip() {
  return (
    <section className="py-24 md:py-32">
      <div className="section-shell mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="eyebrow mb-4">Trending Destinations</span>
          <h2 className="display-title text-4xl md:text-6xl">Where minds wander.</h2>
        </div>
        <Link
          to="/destinations"
          className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-white/35 px-6 py-3 text-sm font-extrabold shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-ring md:self-auto"
        >
          All destinations <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-6 pb-6 snap-x snap-mandatory md:px-8">
        {destinations.map((d) => (
          <Link
            key={d.slug}
            to="/destinations"
            className="group relative grid w-[86vw] shrink-0 overflow-hidden rounded-2xl bg-[#111827] shadow-[var(--shadow-soft)] snap-start sm:w-[58vw] lg:w-[46vw] xl:w-[560px]"
          >
            <div className="relative aspect-[16/11] overflow-hidden">
              <img
                src={MEDIA.destinations?.[d.slug] ?? d.image}
                alt={d.name}
                loading="lazy"
                width={1000}
                height={688}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="grid size-10 place-items-center rounded-full bg-white/16 text-xs font-black ring-1 ring-white/20 backdrop-blur-md">
                    {d.gallery[0]?.author[0] ?? d.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">{d.gallery[0]?.author}</div>
                    <div className="text-xs text-white/62">Featured traveler moment</div>
                  </div>
                </div>
                <h3 className="mb-2 text-4xl font-black leading-tight">{d.name}</h3>
                <p className="max-w-md text-lg font-semibold leading-8 text-white/86">
                  "{d.gallery[0]?.caption}"
                </p>
              </div>
            </div>
            <div className="grid gap-4 bg-[#fbf8f3] p-5 text-foreground md:p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="mb-1 text-base leading-7 text-muted-foreground">{d.review}</p>
                  <p className="text-sm font-bold text-[#8a6144]">
                    {d.duration} · from ${d.price.toLocaleString()} · {d.rating.toFixed(1)} rating
                  </p>
                </div>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {d.gallery.slice(1, 4).map((g) => (
                  <div key={`${d.slug}-${g.caption}`} className="group/moment">
                    <div className="relative mb-2 aspect-square overflow-hidden rounded-xl">
                      <img
                        src={g.src}
                        alt={g.caption}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/moment:scale-105"
                        loading="lazy"
                      />
                      {g.type === "video" && (
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="rounded-full bg-black/45 p-2 text-white backdrop-blur-sm">
                            <Play className="size-3.5 fill-current" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs font-bold leading-5 text-muted-foreground">
                      {g.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MomentCollector() {
  const moments = destinations.slice(0, 4).map((destination) => ({
    destination: destination.name,
    image: MEDIA.destinations?.[destination.slug] ?? destination.image,
    caption: destination.gallery[0]?.caption ?? destination.tagline,
    author: destination.gallery[0]?.author ?? "JourneyMakers traveler",
  }));
  const [saved, setSaved] = useState<string[]>([moments[0]?.caption].filter(Boolean));

  function toggleMoment(caption: string) {
    setSaved((current) =>
      current.includes(caption)
        ? current.filter((item) => item !== caption)
        : [...current, caption],
    );
  }

  return (
    <section className="bg-[#0e1726] py-20 text-white md:py-28">
      <div className="section-shell grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <span className="eyebrow mb-4 text-[#d7aa73]">Collect Moments</span>
          <h2 className="display-title mb-6 max-w-3xl text-4xl md:text-6xl">
            Save what moves you. Let the itinerary form around it.
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-9 text-white/70">
            The best trips rarely begin with logistics. They begin with a dinner, a train window, a
            street at dusk, or a view someone could not stop remembering.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {moments.map((moment, index) => {
              const isSaved = saved.includes(moment.caption);
              return (
                <article
                  key={moment.caption}
                  className={`group relative overflow-hidden rounded-2xl border border-white/12 ${
                    index === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className={index === 0 ? "aspect-[16/9]" : "aspect-[4/5]"}>
                    <img
                      src={moment.image}
                      alt={moment.caption}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/14 to-transparent" />
                  <button
                    type="button"
                    onClick={() => toggleMoment(moment.caption)}
                    className={`absolute right-4 top-4 grid size-11 place-items-center rounded-full border backdrop-blur-md transition-all ${
                      isSaved
                        ? "border-accent bg-accent text-white"
                        : "border-white/22 bg-black/22 text-white hover:bg-white/16"
                    }`}
                    aria-label={`${isSaved ? "Remove" : "Save"} ${moment.caption}`}
                  >
                    <Bookmark className={`size-4 ${isSaved ? "fill-current" : ""}`} />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="mb-3 text-sm font-bold text-[#d7aa73]">{moment.destination}</p>
                    <h3 className="mb-4 text-2xl font-black leading-tight">"{moment.caption}"</h3>
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-black ring-1 ring-white/20">
                        {moment.author[0]}
                      </div>
                      <span className="text-sm font-bold text-white/74">{moment.author}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <aside className="sticky top-24 rounded-2xl border border-white/12 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-[#d7aa73]">My Journey</div>
              <h3 className="text-3xl font-black">{saved.length} saved moments</h3>
            </div>
            <div className="grid size-12 place-items-center rounded-full bg-accent text-lg font-black">
              {saved.length}
            </div>
          </div>
          <div className="mb-8 grid gap-3">
            {saved.length === 0 ? (
              <p className="rounded-xl border border-white/12 p-4 text-sm leading-7 text-white/64">
                Tap the bookmark on any moment to start shaping a journey.
              </p>
            ) : (
              saved.map((caption) => (
                <div key={caption} className="rounded-xl border border-white/12 bg-black/14 p-4">
                  <p className="text-sm font-semibold leading-6 text-white/86">"{caption}"</p>
                </div>
              ))
            )}
          </div>
          <Link
            to="/booking"
            className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 focus-ring"
          >
            Generate itinerary <ArrowUpRight className="size-4" />
          </Link>
        </aside>
      </div>
    </section>
  );
}

function ReviewBoard() {
  return (
    <section className="bg-[linear-gradient(180deg,#f6f1ea,#eee6dc)] py-24 md:py-32">
      <div className="section-shell">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 lg:flex-row">
          <div className="max-w-3xl">
            <span className="eyebrow mb-4">Traveler Board</span>
            <h2 className="display-title mb-5 text-4xl md:text-6xl">Review, share, and inspire.</h2>
            <p className="body-copy text-lg">
              Real travelers leave ratings, tips, photos and video notes for every destination,
              package and service. It's a living guide that helps future journeys feel instantly
              familiar.
            </p>
          </div>
          <Link
            to="/destinations"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/50 px-6 py-3 text-sm font-extrabold shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-ring"
          >
            Browse all reviews
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="grid gap-6">
            {communityReviews.map((review) => (
              <article key={review.id} className="premium-card overflow-hidden rounded-2xl">
                <div className="grid grid-cols-2 gap-3 p-4 md:p-5">
                  {review.media.map((item, index) => (
                    <div
                      key={index}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-white/20 ${
                        index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"
                      }`}
                    >
                      <img
                        src={item.src}
                        alt={item.label}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      {item.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 border border-white/20 transition-transform duration-300 group-hover:scale-110">
                            <Play className="size-3.5 text-white fill-white" />
                          </div>
                        </div>
                      )}
                      {item.type === "photo" && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="size-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="truncate text-xs font-bold text-white">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 pt-2 md:p-8 md:pt-3">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-full bg-[#0e1726] text-sm font-black text-white">
                        {review.author[0]}
                      </div>
                      <div>
                        <div className="font-extrabold">{review.author}</div>
                        <div className="text-sm text-muted-foreground">
                          {review.location} · {review.date}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 font-extrabold text-[#9a6b45]">
                      <Star className="size-4 fill-[#d7aa73] text-[#d7aa73]" />
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <h3 className="mb-3 text-2xl font-black text-foreground">{review.subject}</h3>
                  <p className="mb-5 text-lg leading-9 text-muted-foreground">"{review.comment}"</p>
                  <p className="border-l-2 border-accent pl-4 text-base font-semibold leading-8 text-foreground">
                    {review.tip}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-[#0e1726] p-8 text-white shadow-[var(--shadow-soft)]">
              <h3 className="mb-4 text-3xl font-black leading-tight">
                Add the moment someone else builds a trip around.
              </h3>
              <p className="mb-8 text-base leading-8 text-white/70">
                Our community reviews let future travelers feel the vibe before they book. Upload a
                quick photo, recommend a street-food stop, or share the exact moment that made the
                trip.
              </p>
              <div className="space-y-3">
                <button className="w-full rounded-full bg-accent px-6 py-4 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5">
                  Add a review
                </button>
                <button className="w-full rounded-full border border-white/16 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:border-[#d7aa73]">
                  Upload photos/videos
                </button>
                <button className="w-full rounded-full border border-white/16 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:border-[#d7aa73]">
                  Share a local tip
                </button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-white/48 p-6">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-normal text-accent">
                  Photo & video board
                </div>
                <p className="text-base leading-8 text-muted-foreground">
                  Travelers are sharing behind-the-scenes moments from every journey — street food
                  scenes, hidden lodges, and sunset views featured in the itinerary.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/48 p-6">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-normal text-accent">
                  Carry-on tips
                </div>
                <p className="text-base leading-8 text-muted-foreground">
                  In the review feed you'll also find packing shortcuts, transport hacks, local
                  etiquette notes, and the best times to arrive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="section-shell py-24 md:py-32">
      <span className="eyebrow mb-4">Field Notes</span>
      <h2 className="display-title mb-14 max-w-3xl text-4xl md:text-6xl">
        Whispered between travelers.
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {testimonials.map((t, index) => (
          <figure key={t.name} className="premium-card flex flex-col gap-6 rounded-2xl p-7 md:p-8">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((n) => (
                  <div
                    key={n}
                    className="grid size-9 place-items-center rounded-full border-2 border-[#fbf8f3] bg-[#0e1726] text-xs font-black text-white"
                  >
                    {t.name.split(" ")[n % 2]?.[0] ?? "J"}
                  </div>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f2e5d6] px-3 py-1.5 text-xs font-extrabold text-[#7a512f]">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            </div>
            <div
              className="flex gap-1 text-[#d7aa73]"
              aria-label={`${index + 1} verified five star review`}
            >
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl font-semibold leading-9 text-balance">
              "{t.quote}"
            </blockquote>
            <figcaption className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-6">
              <div>
                <div className="text-sm font-extrabold">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </div>
              <div className="text-right text-xs font-bold uppercase tracking-normal text-muted-foreground">
                {t.location}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-shell py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <span className="eyebrow mb-4 text-center">Frequently Asked</span>
        <h2 className="display-title mb-12 text-center text-4xl md:text-6xl">Quietly answered.</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-white/42 shadow-[var(--shadow-soft)]">
          {faqs.map((f, i) => (
            <div key={i} className="border-b border-border last:border-b-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-5 py-6 text-left transition-colors hover:bg-white/55 focus-ring md:px-7"
              >
                <span className="text-base font-extrabold leading-7 md:text-lg">{f.q}</span>
                <ChevronDown
                  className={`size-5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-6 text-base leading-8 text-muted-foreground md:px-7"
                >
                  {f.a}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterCTA() {
  return (
    <section className="relative min-h-[72vh] overflow-hidden bg-[#0e1726] px-6 py-20 text-white md:px-12 md:py-28">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={MEDIA.heroPoster}
        className="absolute inset-0 h-full w-full object-cover opacity-75"
      >
        <source src={MEDIA.heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,23,38,0.86),rgba(14,23,38,0.42)_52%,rgba(14,23,38,0.74)),linear-gradient(180deg,rgba(14,23,38,0.18),rgba(14,23,38,0.84))]" />
      <div className="relative mx-auto flex min-h-[54vh] max-w-6xl flex-col justify-end">
        <span className="eyebrow mb-5 text-[#d7aa73]">Your first memory</span>
        <h2 className="display-title mb-8 max-w-4xl text-5xl md:text-7xl">
          Describe the moments you want to remember forever.
        </h2>
        <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-end">
          <p className="max-w-xl text-lg leading-9 text-white/76">
            Tell us the feeling, the people, the pace, or the image in your head. We will turn it
            into a journey that has room for surprise and still runs beautifully.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="grid gap-3 rounded-2xl border border-white/14 bg-white/10 p-3 backdrop-blur-md sm:grid-cols-[1fr_auto]"
          >
            <input
              type="text"
              required
              placeholder="Misty mountains, slow dinners, private trains..."
              className="min-h-14 rounded-xl border border-white/12 bg-black/20 px-5 text-base text-white outline-none placeholder:text-white/46 focus:border-accent"
            />
            <button
              type="submit"
              className="min-h-14 rounded-xl bg-accent px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 focus-ring"
            >
              Begin
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
