import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Camera, Globe, CalendarDays, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { api, type ApiMemory } from "@/lib/api";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Traveler Memories — JourneyMakers" },
      {
        name: "description",
        content:
          "Real moments shared by JourneyMakers travelers. Browse the memory wall and let their stories inspire your next journey.",
      },
      { property: "og:title", content: "Traveler Memories — JourneyMakers" },
      { property: "og:url", content: "/memories" },
    ],
    links: [{ rel: "canonical", href: "/memories" }],
  }),
  component: MemoriesPage,
});

function MemoriesPage() {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["public-memories"],
    queryFn: api.getPublicMemories,
  });

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f7f2ea] text-[#171717]">
        <Hero />
        <MemoryFeed memories={memories} loading={isLoading} />
        <CtaSection />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0b1018] py-28 text-white md:py-36">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-[#c76b2f] blur-[120px]" />
        <div className="absolute right-1/4 top-1/2 h-64 w-64 rounded-full bg-[#d7aa73] blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-3xl"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-bold uppercase text-white/78 backdrop-blur-xl">
            <Globe className="size-3.5 text-[#d7aa73]" /> Traveler memories
          </span>
          <h1 className="text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
            Stories from the <span className="text-[#d7aa73]">road.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/72 md:text-lg">
            Real moments shared by JourneyMakers travelers. Let their stories inspire your next
            journey.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#c76b2f] px-6 py-3 text-sm font-extrabold text-white hover:-translate-y-0.5 transition-transform"
            >
              Share your memory <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/10 px-6 py-3 text-sm font-extrabold text-white backdrop-blur-xl hover:-translate-y-0.5 transition-transform"
            >
              Explore journeys
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MemoryFeed({ memories, loading }: { memories: ApiMemory[]; loading: boolean }) {
  if (loading) {
    return (
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-black/8 aspect-[4/5]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (memories.length === 0) {
    return (
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-black/20 py-24 text-center">
            <Camera className="size-12 text-muted-foreground/40" />
            <div>
              <p className="text-xl font-extrabold tracking-tight">No public memories yet</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Be the first to share your journey. Your story could inspire thousands of travelers.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background hover:bg-accent transition-colors"
            >
              Share your memory
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // bento layout: first memory is featured (large), then grid
  const [featured, ...rest] = memories;

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="mb-2 block font-mono text-xs font-black uppercase tracking-[0.2em] text-accent">
              Memory wall
            </span>
            <h2 className="text-4xl font-black tracking-tighter md:text-5xl">
              {memories.length} {memories.length === 1 ? "story" : "stories"} shared.
            </h2>
          </div>
        </div>

        {/* Featured card */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <FeaturedMemoryCard memory={featured} />
          </motion.div>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((memory, idx) => (
              <motion.div
                key={memory.public_id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(idx * 0.06, 0.24) }}
              >
                <MemoryGridCard memory={memory} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedMemoryCard({ memory }: { memory: ApiMemory }) {
  const coverUrl = resolveUrl(memory.media_urls?.[0]);
  const hasDates = memory.travel_date_from || memory.travel_date_to;

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-[#0b1018] text-white md:grid md:grid-cols-2 md:min-h-[480px]">
      {/* Image side */}
      <div className="relative min-h-[280px] overflow-hidden md:min-h-[480px]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={memory.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white/5">
            <Camera className="size-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1018]/60 via-transparent to-transparent" />
        {memory.media_urls?.length > 1 && (
          <span className="absolute bottom-4 right-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            +{memory.media_urls.length - 1} photos
          </span>
        )}
      </div>

      {/* Content side */}
      <div className="flex flex-col justify-center p-8 md:p-10">
        <span className="mb-4 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#d7aa73]">
          Featured memory
        </span>
        <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
          {memory.title}
        </h2>
        {memory.destination && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/70">
            <MapPin className="size-4 text-[#d7aa73]" /> {memory.destination}
          </p>
        )}
        {hasDates && (
          <p className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
            <CalendarDays className="size-3" />
            {memory.travel_date_from ?? ""}
            {memory.travel_date_from && memory.travel_date_to ? " → " : ""}
            {memory.travel_date_to ?? ""}
          </p>
        )}
        {memory.description && (
          <p className="mt-5 line-clamp-4 text-base leading-8 text-white/70">
            {memory.description}
          </p>
        )}
        <div className="mt-8 border-t border-white/12 pt-5">
          <p className="text-sm font-bold text-white/80">{memory.customer_name ?? "Traveler"}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {new Date(memory.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </article>
  );
}

function MemoryGridCard({ memory }: { memory: ApiMemory }) {
  const coverUrl = resolveUrl(memory.media_urls?.[0]);
  const hasDates = memory.travel_date_from || memory.travel_date_to;

  return (
    <article className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_40px_rgba(23,23,23,0.06)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f0ebe2]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={memory.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Camera className="size-10 text-muted-foreground/30" />
          </div>
        )}
        {memory.media_urls?.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            +{memory.media_urls.length - 1}
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-extrabold tracking-tight">{memory.title}</h3>
        {memory.destination && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MapPin className="size-3 text-accent" /> {memory.destination}
          </p>
        )}
        {hasDates && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {memory.travel_date_from ?? ""}
            {memory.travel_date_from && memory.travel_date_to ? " – " : ""}
            {memory.travel_date_to ?? ""}
          </p>
        )}
        {memory.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {memory.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4">
          <p className="text-sm font-bold">{memory.customer_name ?? "Traveler"}</p>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {new Date(memory.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </article>
  );
}

function CtaSection() {
  return (
    <section className="bg-[#fffaf2] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="grid gap-8 border-y border-black/10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="mb-3 block font-mono text-xs font-black uppercase tracking-[0.2em] text-accent">
              Share your story
            </span>
            <h2 className="text-4xl font-black tracking-tighter md:text-6xl">
              Your journey belongs here.
            </h2>
          </div>
          <div>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Every JourneyMakers traveler has a story worth telling. Share your photos, moments,
              and memories — and help future travelers feel confident in their choice.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#171717] px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-accent"
              >
                Go to my dashboard <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/booking"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-black/12 px-7 text-sm font-extrabold text-foreground transition-all hover:-translate-y-0.5 hover:bg-[#f7f2ea]"
              >
                Plan a journey
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function resolveUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `http://localhost:8000${url}`;
}
