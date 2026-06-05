import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  ChevronLeft,
  ChevronRight,
  Play,
  Camera,
  BadgeCheck,
  Clock3,
  Globe2,
  ShieldCheck,
  Star,
  Bookmark,
  Zap,
  Tag,
  Gift,
  Clock,
  X,
  Award,
  Headphones,
  ThumbsUp,
  Info,
  Map,
  MessageCircle,
  ReceiptText,
  BriefcaseBusiness,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { saveHeroSearch } from "@/lib/search-state";
import { type ApiOffer } from "@/lib/api";
import { useContent } from "@/lib/use-content";
import { MEDIA } from "@/config/media";
import {
  API_BASE_URL,
  api,
  type ApiPackage,
  type ApiDestination,
  type ApiGalleryItem,
} from "@/lib/api";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { ReviewForm } from "@/components/review-form";
import { WhatsAppOutlineIcon } from "@/components/whatsapp-icon";
import { ContactInfoCard } from "@/components/contact-info-card";

// ── Shape mappers ─────────────────────────────────────────────────────────────

type GalleryItem = ApiGalleryItem;

function resolveReviewMediaUrl(url: string) {
  return url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
}

function isVideoMedia(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

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

type MappedPackage = {
  slug: string;
  title: string;
  location: string;
  days: number;
  price: number;
  category: string;
  image: string;
  tagline?: string;
  rating: number;
  reviewCount: number;
};

type MappedDestination = {
  slug: string;
  name: string;
  image: string;
  packagesCount: number;
  tagline?: string;
  duration?: string;
  price: number;
  rating: number;
  reviewCount: number;
  gallery: GalleryItem[];
};

function mapPkg(p: ApiPackage): MappedPackage {
  return {
    slug: p.slug,
    title: p.title,
    location: p.location,
    days: p.days,
    price: p.price,
    category: p.category ?? "Journey",
    image:
      MEDIA.destinations?.[p.slug] ?? p.image_url ?? `https://picsum.photos/seed/${p.slug}/800/600`,
    tagline: p.tagline,
    rating: p.rating ?? 4.8,
    reviewCount: p.review_count,
  };
}

function mapDest(d: ApiDestination): MappedDestination {
  return {
    slug: d.slug,
    name: d.name,
    image:
      MEDIA.destinations?.[d.slug] ?? d.image_url ?? `https://picsum.photos/seed/${d.slug}/800/600`,
    packagesCount: d.packages_count,
    tagline: d.tagline,
    duration: d.duration,
    price: d.price ?? 0,
    rating: d.rating ?? 4.8,
    reviewCount: d.review_count,
    gallery: (d.gallery ?? []).length > 0 ? (d.gallery as GalleryItem[]) : galleryFallback(d.slug),
  };
}

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
        <HomeAboutSection />
        <OffersStrip />
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
  const { c } = useContent("home");
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const openContactCard = (message: string) => setContactMessage(message);

  return (
    <section className="relative w-full overflow-hidden bg-[#080b0f] text-white">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={MEDIA.heroPoster}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={MEDIA.heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,10,0.9)_0%,rgba(5,7,10,0.68)_38%,rgba(5,7,10,0.38)_67%,rgba(5,7,10,0.72)_100%),linear-gradient(180deg,rgba(5,7,10,0.04)_0%,rgba(5,7,10,0.48)_66%,rgba(5,7,10,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
        className="relative mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-none flex-col justify-center gap-5 px-4 py-6 sm:px-6 lg:min-h-[calc(100svh-76px)] lg:justify-start lg:px-10 lg:pb-44 lg:pt-10 xl:px-12"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(420px,0.8fr)_minmax(360px,0.62fr)_minmax(330px,0.55fr)] xl:grid-cols-[minmax(510px,0.85fr)_minmax(420px,0.68fr)_minmax(380px,0.6fr)] 2xl:grid-cols-[560px_500px_460px]">
          <div className="max-w-[660px] pt-4 lg:pt-14">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/28 px-4 py-2 text-xs font-extrabold uppercase tracking-normal text-white/88 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <Star className="size-3.5 fill-[#e88535] text-[#e88535]" />
              {c("hero", "badge", "Traveler-led luxury planning")}
            </span>
            <p className="mb-4 max-w-2xl text-sm font-extrabold uppercase leading-6 tracking-normal text-white/72 md:text-base">
              {c(
                "hero",
                "tagline",
                "Discover places through the moments travelers never stopped talking about.",
              )}
            </p>
            <h1 className="mb-6 max-w-[650px] text-balance text-5xl font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_16px_38px_rgba(0,0,0,0.5)] sm:text-6xl md:text-7xl lg:text-[4.7rem] xl:text-[5.05rem]">
              Build your journey from <span className="text-[#ef7d2a]">living memories</span>
            </h1>
            <p className="mb-6 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
              {c(
                "hero",
                "subtitle",
                "Save cinematic traveler moments, feel the mood of every stop, then turn your collection into a private itinerary with concierge support.",
              )}
            </p>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                to="/booking"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#e66f1f] px-9 text-sm font-extrabold text-white shadow-[0_18px_50px_rgba(230,111,31,0.36)] transition-all hover:-translate-y-0.5 hover:bg-[#f17b28] hover:shadow-[0_24px_70px_rgba(230,111,31,0.46)] focus-ring"
              >
                {c("hero", "cta_primary", "Start Collecting")}
              </Link>
              <Link
                to="/packages"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/30 bg-white/6 px-9 text-sm font-bold text-white backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/12 focus-ring"
              >
                {c("hero", "cta_secondary", "View Journeys")}
              </Link>
            </div>
          </div>

          <HeroDealCard onContact={openContactCard} />

          <div className="grid gap-4 lg:mt-8 lg:max-w-[430px] lg:justify-self-end 2xl:max-w-[460px]">
            <HeroTestimonialCard onContact={openContactCard} />
            <HeroExitCard onContact={openContactCard} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:absolute lg:bottom-6 lg:left-10 xl:left-12">
          <SearchBar />
          <HeroTrustStrip />
        </div>
      </motion.div>
      <ContactInfoCard
        open={contactMessage !== null}
        onClose={() => setContactMessage(null)}
        message={contactMessage ?? undefined}
      />
    </section>
  );
}

const aboutStats = [
  {
    icon: Award,
    value: "10+",
    title: "10+ Years of Travel Experience",
    description: "Trusted planning for domestic & international journeys",
  },
  {
    icon: Users,
    value: "5000+",
    title: "5000+ Happy Travelers",
    description: "Families, couples, groups, and corporate clients served",
  },
  {
    icon: Star,
    value: "4.9/5",
    title: "4.9/5 Traveler Rating",
    description: "Known for smooth planning and transparent service",
  },
  {
    icon: Headphones,
    value: "End-to-End",
    title: "End-to-End Trip Support",
    description: "Flights, hotels, transfers, sightseeing, and expert help",
  },
];

const aboutHighlights = [
  {
    icon: Map,
    title: "Personalized Itineraries",
    description: "Custom travel plans crafted around your style and comfort.",
  },
  {
    icon: ReceiptText,
    title: "Transparent Pricing",
    description: "Clear inclusions, no hidden charges, total peace of mind.",
  },
  {
    icon: MessageCircle,
    title: "Quick WhatsApp Response",
    description: "Real people, real support, right when you need it.",
  },
];

function HomeAboutSection() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <section className="bg-[#f7efe5] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="relative mx-auto max-w-[1540px] overflow-hidden rounded-2xl border border-[#d9c8b5]/70 bg-[#fbf6ee] px-5 py-10 shadow-[0_24px_80px_rgba(127,87,48,0.08)] sm:px-8 lg:px-16 lg:py-16">
        <div className="absolute left-[61%] top-12 hidden items-center gap-2 text-[#df7b37] opacity-70 xl:flex">
          <svg
            width="132"
            height="58"
            viewBox="0 0 132 58"
            fill="none"
            aria-hidden="true"
            className="h-14 w-32"
          >
            <path
              d="M2 30C18 3 42 24 31 38C20 52 2 17 27 9C53 1 66 31 91 22C107 16 111 9 125 2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeDasharray="4 6"
              strokeLinecap="round"
            />
          </svg>
          <Plane className="-ml-2 size-7 rotate-45 fill-current" />
        </div>

        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(540px,0.88fr)] xl:gap-16">
          <div className="relative z-10 max-w-[650px]">
            <span className="mb-5 block text-xs font-extrabold uppercase tracking-[0.34em] text-[#d77232]">
              About JourneyMakers
            </span>
            <h2 className="mb-6 text-4xl font-black leading-[1.12] tracking-normal text-[#17191b] sm:text-5xl lg:text-6xl">
              We plan journeys that feel personal, smooth, and memorable.
            </h2>
            <p className="mb-7 text-base font-semibold leading-8 text-[#636363] sm:text-lg">
              JourneyMakers helps travelers plan customized trips across India and international
              destinations. From itinerary planning and hotel bookings to flights, transfers,
              sightseeing, honeymoon packages, family tours, group travel, and corporate retreats,
              we handle every detail with care and expert support.
            </p>

            <div className="mb-7 flex gap-4 rounded-xl border border-[#dcccbc] bg-white/34 p-5 text-sm font-semibold leading-7 text-[#626262] shadow-sm sm:items-center sm:px-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#f3c7a2] bg-[#fff0e4] text-[#db7835]">
                <Info className="size-5" />
              </span>
              <p>
                For international trips, we provide basic travel guidance and can connect travelers
                with trusted third-party visa assistance partners when needed.
              </p>
            </div>

            <div className="mb-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/booking"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#d86f2d] px-9 text-sm font-extrabold text-white shadow-[0_18px_40px_rgba(216,111,45,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#e27a35] focus-ring"
              >
                Plan My Trip <ArrowUpRight className="size-5" />
              </Link>
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#ddccba] bg-white/44 px-9 text-sm font-extrabold text-[#181a1c] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#d86f2d] hover:text-[#c96628] focus-ring"
              >
                <WhatsAppOutlineIcon className="size-6" /> Chat on WhatsApp
              </button>
            </div>
          </div>

          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)] xl:min-h-[610px]">
            <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:self-center">
              {aboutStats.map(({ icon: Icon, value, title, description }) => (
                <article
                  key={title}
                  className="min-h-[220px] rounded-xl border border-[#ddccba] bg-white/42 p-6 shadow-[0_18px_54px_rgba(102,70,38,0.08)] backdrop-blur-sm"
                >
                  <div className="mb-6 grid size-16 place-items-center rounded-full bg-[#f7e8d8] text-[#d87433]">
                    <Icon className={`size-9 ${Icon === Star ? "" : ""}`} />
                  </div>
                  <h3 className="mb-3 text-xl font-black leading-7 text-[#16181a]">{title}</h3>
                  <p className="text-base font-semibold leading-7 text-[#626262]">{description}</p>
                  <span className="sr-only">{value}</span>
                </article>
              ))}
            </div>

            <div className="relative min-h-[420px] lg:min-h-full">
              <img
                src={MEDIA.destinations["bangkok-singapore"]}
                alt="International city waterfront at sunset"
                loading="lazy"
                className="absolute inset-0 h-full w-full rounded-2xl object-cover shadow-[0_26px_70px_rgba(112,75,38,0.16)]"
                style={{
                  clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 92%, 0 18%)",
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#f6d0b4]/18 via-transparent to-[#4e2c16]/12" />
              <div className="absolute -bottom-16 left-1/2 hidden -translate-x-1/2 rounded-full border border-[#df7b37]/35 bg-[#fbf6ee]/90 p-6 text-center text-[#d87433] shadow-[0_18px_44px_rgba(121,75,31,0.12)] backdrop-blur md:block">
                <div className="relative grid size-28 place-items-center rounded-full border border-dashed border-[#df7b37]/70">
                  <BriefcaseBusiness className="size-9" />
                  <span className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full text-[10px] font-black uppercase tracking-[0.22em] [writing-mode:horizontal-tb]">
                    <span className="absolute left-1/2 top-1 -translate-x-1/2">Journeys</span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      Just for you
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 grid overflow-hidden rounded-xl border border-[#ddccba] bg-white/36 shadow-sm md:grid-cols-3 xl:max-w-[1080px]">
          {aboutHighlights.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="grid min-h-[112px] grid-cols-[3.75rem_minmax(0,1fr)] gap-4 border-b border-[#ddccba] px-5 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="grid size-14 place-items-center rounded-full bg-[#f7e8d8] text-[#d87433]">
                <Icon className="size-7" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-black leading-6 text-[#17191b]">{title}</h3>
                <p className="text-sm font-semibold leading-6 text-[#5f5f5f]">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ContactInfoCard
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        message="Hi JourneyMakers, I'd like help planning my trip."
      />
    </section>
  );
}

function HeroDealCard({ onContact }: { onContact: (message: string) => void }) {
  return (
    <aside className="hidden min-h-[440px] overflow-hidden rounded-2xl border border-[#d49a68]/50 bg-[#0c1014]/88 shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl lg:mt-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] xl:min-h-[500px]">
      <img
        src={MEDIA.destinations["bangkok-singapore"]}
        alt="Dubai beach luxury hotel at sunset"
        className="h-full min-h-[440px] w-full object-cover xl:min-h-[500px]"
      />
      <div className="relative flex min-w-0 flex-col p-5 xl:p-7">
        <button
          type="button"
          aria-label="Close offer"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/72 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
        <span className="mb-5 w-fit rounded-full bg-[#a75e2a] px-4 py-2 text-[11px] font-black uppercase text-[#ffe5c7]">
          Limited time offer
        </span>
        <h2 className="mb-3 text-3xl font-black leading-tight text-white xl:text-4xl">
          Limited Travel Deal
        </h2>
        <p className="mb-5 text-sm leading-6 text-white/74 xl:text-base xl:leading-7">
          Get customized packages for{" "}
          <span className="font-bold text-white">Dubai, Bali, Thailand, Europe</span> and more
        </p>
        <button
          type="button"
          onClick={() => onContact("Hi JourneyMakers, I'd like the limited travel offer.")}
          className="mb-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#df6d22] px-4 text-xs font-extrabold text-white shadow-[0_16px_34px_rgba(223,109,34,0.32)] transition hover:-translate-y-0.5 hover:bg-[#ee792a] focus-ring xl:text-sm"
        >
          <WhatsAppOutlineIcon className="size-5" /> Get Offer on WhatsApp
        </button>
        <div className="mb-3 border-b border-white/14 pb-3">
          <p className="max-w-40 text-[11px] font-extrabold leading-5 text-white/58">
            Trusted by Thousands of Travelers
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 overflow-hidden border-b border-white/14">
          <HeroMetric icon={Award} value="10+" label="Years of Experience" />
          <HeroMetric icon={ThumbsUp} value="5000+" label="Happy Travelers" />
          <HeroMetric icon={Star} value="4.9/5" label="Average Traveler Rating" />
          <HeroMetric icon={Headphones} value="24/7" label="Trip Assistance" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/70">
          <input
            type="checkbox"
            className="size-4 rounded border-white/30 bg-transparent accent-[#df6d22]"
          />
          Don't show again today
        </label>
      </div>
    </aside>
  );
}

function HeroMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="grid min-h-[92px] grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 border-b border-r border-white/14 px-3 py-3 last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(n+3)]:border-b-0">
      <Icon className="size-6 shrink-0 justify-self-center text-[#eda36b]" />
      <div className="min-w-0 text-center">
        <div className="whitespace-nowrap text-lg font-black leading-none text-white">{value}</div>
        <div className="mx-auto mt-1 max-w-[90px] whitespace-normal text-[10px] font-semibold leading-3 text-white/70">
          {label}
        </div>
      </div>
    </div>
  );
}

function HeroTestimonialCard({ onContact }: { onContact: (message: string) => void }) {
  const photos = [
    MEDIA.destinations["tokyo-seoul"],
    MEDIA.destinations["newyork"],
    MEDIA.destinations.switzerland,
  ];

  return (
    <aside className="hidden rounded-2xl border border-[#d49a68]/45 bg-[#0c1014]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:block">
      <div className="relative mb-5 text-center">
        <button
          type="button"
          aria-label="Close traveler review"
          className="absolute right-0 top-0 grid size-7 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
        <h2 className="font-serif text-2xl font-bold leading-none text-white">
          What Our Travelers Say
        </h2>
        <div className="mx-auto mt-3 h-px w-32 bg-gradient-to-r from-transparent via-[#eda36b] to-transparent" />
      </div>
      <div className="relative mb-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-label="Previous review"
          className="absolute -left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/38 text-white backdrop-blur"
        >
          <ChevronLeft className="size-4" />
        </button>
        {photos.map((photo, index) => (
          <img
            key={photo}
            src={photo}
            alt={`Traveler review photo ${index + 1}`}
            className="aspect-[1.05/1] w-full rounded-lg object-cover"
          />
        ))}
        <button
          type="button"
          aria-label="Next review"
          className="absolute -right-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/38 text-white backdrop-blur"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mb-4 flex justify-center gap-1.5">
        {[0, 1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={`size-2 rounded-full ${dot === 0 ? "bg-[#df6d22]" : "bg-white/30"}`}
          />
        ))}
      </div>
      <blockquote className="mx-auto mb-5 max-w-sm text-center text-sm font-semibold italic leading-6 text-white/82">
        "Our Dubai trip was perfectly planned, hotels, transfers, and sightseeing were smooth."
      </blockquote>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/8 px-3 py-2 text-xs font-bold text-white/82">
          <Star className="size-4 fill-[#ffc247] text-[#ffc247]" /> 4.9/5 Traveler Rating
        </div>
        <div className="rounded-lg bg-white/8 px-3 py-2 text-center text-xs font-bold text-white/72">
          Trusted by 5000+ travelers
        </div>
      </div>
      <button
        type="button"
        onClick={() => onContact("Hi JourneyMakers, please plan a trip like this.")}
        className="mb-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#df6d22] px-5 text-sm font-extrabold text-white transition hover:bg-[#ee792a] focus-ring"
      >
        <WhatsAppOutlineIcon className="size-5" /> Plan My Trip Like This
      </button>
      <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-white/68">
        <span className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-4 text-[#eda36b]" /> 10+ Years of Service
        </span>
        <span className="flex items-center justify-center gap-1.5">
          <Gift className="size-4 text-[#eda36b]" /> Personalized Experiences
        </span>
      </div>
    </aside>
  );
}

function HeroExitCard({ onContact }: { onContact: (message: string) => void }) {
  return (
    <aside className="hidden rounded-2xl border border-[#d49a68]/45 bg-[#0c1014]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:block">
      <div className="relative mb-4">
        <button
          type="button"
          aria-label="Close itinerary prompt"
          className="absolute right-0 top-0 grid size-7 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
        <h2 className="max-w-[16rem] font-serif text-2xl font-bold leading-tight text-white">
          Leaving without planning your trip?
        </h2>
      </div>
      <p className="mb-5 max-w-sm text-sm font-medium leading-6 text-white/72">
        Talk to our travel expert and get a free itinerary suggestion.
      </p>
      <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-lg border border-white/16">
        {[
          ["10+ Years", "Of Trust", Award],
          ["5000+", "Happy Travelers", Users],
          ["4.9/5", "Rated Service", ThumbsUp],
          ["No Hidden", "Charges", Gift],
        ].map(([top, bottom, Icon]) => (
          <div
            key={`${top}-${bottom}`}
            className="border-r border-white/16 px-2 py-3 text-center last:border-r-0"
          >
            <Icon className="mx-auto mb-1.5 size-5 text-[#eda36b]" />
            <div className="text-[11px] font-black leading-4 text-[#f1b078]">{top as string}</div>
            <div className="text-[10px] font-bold leading-3 text-white/64">{bottom as string}</div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onContact("Hi JourneyMakers, I'd like a free itinerary suggestion.")}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#df6d22] px-5 text-sm font-extrabold text-white transition hover:bg-[#ee792a] focus-ring"
      >
        <WhatsAppOutlineIcon className="size-5" /> Get Free Itinerary on WhatsApp
      </button>
    </aside>
  );
}

function SearchBar() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState("");
  const [travelers, setTravelers] = useState("");
  const [budget, setBudget] = useState("");

  function handlePlanJourney() {
    saveHeroSearch({ destination, dates, travelers, budget });
    void router.navigate({ to: "/booking" });
  }

  return (
    <div className="grid w-full max-w-[760px] grid-cols-1 gap-1 rounded-2xl border border-white/24 bg-[#11171d]/72 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl md:grid-cols-[1fr_1fr_1fr_1fr_1.05fr] xl:max-w-[780px]">
      <FieldGroup icon={MapPin} label="Destination">
        <input
          type="text"
          placeholder="Worldwide"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/76"
        />
      </FieldGroup>
      <FieldGroup icon={Calendar} label="Timeline">
        <input
          type="text"
          placeholder="Pick dates"
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/76"
        />
      </FieldGroup>
      <FieldGroup icon={Users} label="Travelers">
        <input
          type="text"
          placeholder="2 adults"
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/76"
        />
      </FieldGroup>
      <FieldGroup icon={Wallet} label="Budget">
        <input
          type="text"
          placeholder="$5k - $12k"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/76"
        />
      </FieldGroup>
      <button
        type="button"
        onClick={handlePlanJourney}
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#e66f1f] px-6 py-4 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#f17b28] hover:shadow-[0_16px_36px_rgba(230,111,31,0.35)] active:scale-95 focus-ring"
      >
        Plan Journey <ArrowUpRight className="size-4" />
      </button>
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
    <div className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-white/8 md:border-r md:border-white/14 last:border-0">
      <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-normal text-white/74">
        <Icon className="size-4 text-white/72" /> {label}
      </span>
      {children}
    </div>
  );
}

function HeroTrustStrip() {
  const trustItems = [
    { icon: Award, value: "10+", label: "10+ Years of Trusted Service" },
    { icon: Users, value: "5000+", label: "Happy Travelers" },
    { icon: Star, value: "4.9/5", label: "Average Rating" },
    { icon: Headphones, value: "24/7", label: "Trip Support" },
    { icon: ShieldCheck, value: "Safe", label: "Secure & Hassle-Free Travel" },
  ];

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-white/24 bg-[#11171d]/72 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-5">
      {trustItems.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className="flex min-h-20 items-center gap-3 border-b border-white/14 px-5 py-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"
        >
          <Icon className="size-8 shrink-0 text-[#eda36b]" />
          <div>
            <div className="text-lg font-black leading-tight text-white">{value}</div>
            <div className="text-xs font-bold leading-4 text-white/72">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function useCountdownSimple(until: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!until) return;
    const target = new Date(until).getTime();
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return timeLeft;
}

function OffersStripCard({ offer }: { offer: ApiOffer }) {
  const countdown = useCountdownSimple(offer.valid_until ?? undefined);
  const isFlash = offer.offer_type === "flash";
  const Icon = isFlash ? Zap : offer.offer_type === "fixed" ? Gift : Tag;
  function formatDiscount() {
    switch (offer.offer_type) {
      case "percent":
        return `${offer.discount_value}% OFF`;
      case "fixed":
        return `₹${offer.discount_value.toLocaleString()} OFF`;
      case "free_upgrade":
        return "FREE UPGRADE";
      case "flash":
        return `${offer.discount_value}% FLASH`;
    }
  }
  return (
    <Link
      to="/offers"
      className={`flex-shrink-0 w-72 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isFlash ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${isFlash ? "text-red-500" : "text-accent"}`} />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {offer.badge_label}
        </span>
      </div>
      <div
        className={`text-2xl font-black tracking-tighter ${isFlash ? "text-red-500" : "text-foreground"}`}
      >
        {formatDiscount()}
      </div>
      <p className="mt-1 text-sm font-bold line-clamp-1">{offer.title}</p>
      {offer.subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{offer.subtitle}</p>
      )}
      {countdown && offer.valid_until && (
        <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-red-600">
          <Clock className="size-3" /> {countdown}
        </div>
      )}
    </Link>
  );
}

function OffersStrip() {
  const { data: offers } = useQuery({
    queryKey: ["offers"],
    queryFn: api.offers,
  });

  if (!offers || offers.length === 0) return null;

  return (
    <section className="bg-background border-y border-border py-8 overflow-hidden">
      <div className="section-shell">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-accent" />
            <span className="text-sm font-extrabold uppercase tracking-widest">Live Offers</span>
          </div>
          <Link
            to="/offers"
            className="text-sm font-bold text-accent hover:underline flex items-center gap-1"
          >
            View all <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {offers.map((offer) => (
            <OffersStripCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedPackages() {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => (await api.packages()).map(mapPkg),
  });

  if (isLoading)
    return (
      <section className="section-shell py-24 md:py-30">
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[420px] rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </section>
    );

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
                    {(p.rating ?? 4.8).toFixed(1)} · {p.reviewCount ?? 0}
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
  const { c } = useContent("home");
  const { data: allServices = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: api.services,
  });

  if (isLoading)
    return (
      <section className="bg-[#0e1726] py-24 md:py-32">
        <div className="section-shell grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
      </section>
    );

  const featured = allServices.slice(0, 8);
  return (
    <section className="bg-[#0e1726] py-24 text-background md:py-32">
      <div className="section-shell grid grid-cols-1 gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <span className="eyebrow mb-4 text-[#d7aa73]">
            {c("services_section", "eyebrow", "What we orchestrate")}
          </span>
          <h2 className="display-title mb-8 text-4xl text-white md:text-6xl">
            {c("services_section", "title", "Beyond the itinerary.")}
          </h2>
          <p className="mb-8 max-w-md text-lg leading-9 text-background/70">
            {c(
              "services_section",
              "description",
              "We do not just book flights. We orchestrate transitions between worlds: visas, jets, private chefs, and the moments in between.",
            )}
          </p>
          <div className="mb-8 grid gap-3 text-sm text-background/76">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#d7aa73]" />{" "}
              {c("services_section", "bullet_1", "Emergency desk in every itinerary")}
            </span>
            <span className="inline-flex items-center gap-2">
              <Globe2 className="size-4 text-[#d7aa73]" />{" "}
              {c("services_section", "bullet_2", "Local specialists across 124 destinations")}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-[#d7aa73]" />{" "}
              {c("services_section", "bullet_3", "Real-time trip changes handled quietly")}
            </span>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 rounded-full border border-background/22 px-6 py-3 text-sm font-extrabold transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent focus-ring"
          >
            {c("services_section", "cta_label", "All services")} <ArrowUpRight className="size-4" />
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
                    {s.rating.toFixed(1)} · {s.review_count} reviews
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
  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => (await api.destinations()).map(mapDest),
  });

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
                  <p className="mb-1 text-base leading-7 text-muted-foreground">{d.tagline}</p>
                  <p className="text-sm font-bold text-[#8a6144]">
                    {d.duration} · from ${(d.price ?? 0).toLocaleString()} ·{" "}
                    {(d.rating ?? 4.8).toFixed(1)} rating
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
  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => (await api.destinations()).map(mapDest),
  });

  const moments = destinations.slice(0, 4).map((destination) => ({
    destination: destination.name,
    image: destination.image,
    caption: destination.gallery[0]?.caption ?? destination.tagline ?? "",
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
  const { c } = useContent("home");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedPackageSlug, setSelectedPackageSlug] = useState("");
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: api.getAllReviews,
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: api.packages,
  });
  const selectedPackage =
    packages.find((pkg) => pkg.slug === selectedPackageSlug) ?? packages[0] ?? null;

  useEffect(() => {
    if (!selectedPackageSlug && packages.length > 0) {
      setSelectedPackageSlug(packages[0].slug);
    }
  }, [packages, selectedPackageSlug]);

  return (
    <section className="bg-[linear-gradient(180deg,#f6f1ea,#eee6dc)] py-24 md:py-32">
      <div className="section-shell">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 lg:flex-row">
          <div className="max-w-3xl">
            <span className="eyebrow mb-4">{c("review_board", "eyebrow", "Traveler Board")}</span>
            <h2 className="display-title mb-5 text-4xl md:text-6xl">
              {c("review_board", "title", "Review, share, and inspire.")}
            </h2>
            <p className="body-copy text-lg">
              {c(
                "review_board",
                "body",
                "Real travelers leave ratings, tips, photos and video notes for every destination, package and service. It's a living guide that helps future journeys feel instantly familiar.",
              )}
            </p>
          </div>
          <Link
            to="/destinations"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/50 px-6 py-3 text-sm font-extrabold shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-ring"
          >
            {c("review_board", "cta_label", "Browse all reviews")}
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="grid gap-6">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground text-sm">
                  No reviews yet. Be the first to share your experience.
                </p>
              </div>
            ) : (
              reviews.slice(0, 3).map((review) => (
                <article
                  key={review.public_id}
                  className="premium-card overflow-hidden rounded-2xl"
                >
                  {review.media_urls?.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-4 md:p-5">
                      {review.media_urls.slice(0, 3).map((url, index) => {
                        const src = resolveReviewMediaUrl(url);
                        return (
                          <div
                            key={url}
                            className={`group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-white/20 ${
                              index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"
                            }`}
                          >
                            {isVideoMedia(src) ? (
                              <video
                                src={src}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={src}
                                alt={review.title ?? "Review photo"}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="size-3 text-white" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="p-6 pt-2 md:p-8 md:pt-3">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-11 place-items-center rounded-full bg-[#0e1726] text-sm font-black text-white">
                          {(review.customer_name ?? "T")[0]}
                        </div>
                        <div>
                          <div className="font-extrabold">{review.customer_name ?? "Traveler"}</div>
                          {review.trip_date && (
                            <div className="text-sm text-muted-foreground">
                              Traveled {review.trip_date}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 font-extrabold text-[#9a6b45]">
                        <Star className="size-4 fill-[#d7aa73] text-[#d7aa73]" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {review.package_title && (
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground/70">
                          {review.package_title}
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h3 className="mb-3 text-2xl font-black text-foreground">{review.title}</h3>
                    )}
                    <p className="mb-5 text-lg leading-9 text-muted-foreground">"{review.body}"</p>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-[#0e1726] p-8 text-white shadow-[var(--shadow-soft)]">
              <h3 className="mb-4 text-3xl font-black leading-tight">
                Add a review to the right package.
              </h3>
              <p className="mb-8 text-base leading-8 text-white/70">
                Choose the package you travelled with, then write your review. Photos and videos are
                optional and will appear on that package page after submission.
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-widest text-white/56">
                    Package
                  </span>
                  <select
                    value={selectedPackageSlug}
                    onChange={(e) => setSelectedPackageSlug(e.target.value)}
                    className="w-full rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#d7aa73]"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.slug} value={pkg.slug} className="text-foreground">
                        {pkg.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!selectedPackage}
                  onClick={() => setReviewOpen(true)}
                  className="w-full rounded-full bg-accent px-6 py-4 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Write review for selected package
                </button>
                <button
                  type="button"
                  disabled={!selectedPackage}
                  onClick={() => setReviewOpen(true)}
                  className="w-full rounded-full border border-white/16 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:border-[#d7aa73] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add photos/videos with review
                </button>
                {selectedPackage && (
                  <Link
                    to="/packages"
                    hash={`reviews-${selectedPackage.slug}`}
                    className="flex w-full justify-center rounded-full border border-white/16 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:border-[#d7aa73]"
                  >
                    View package reviews
                  </Link>
                )}
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
      {selectedPackage && (
        <ReviewForm
          packageSlug={selectedPackage.slug}
          packageTitle={selectedPackage.title}
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </section>
  );
}

function Testimonials() {
  const { c } = useContent("home");
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: api.testimonials,
  });

  if (isLoading)
    return (
      <section className="section-shell py-24 md:py-32">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </section>
    );

  return (
    <section className="section-shell py-24 md:py-32">
      <span className="eyebrow mb-4">{c("testimonials", "eyebrow", "Field Notes")}</span>
      <h2 className="display-title mb-14 max-w-3xl text-4xl md:text-6xl">
        {c("testimonials", "title", "Whispered between travelers.")}
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
  const { c } = useContent("home");
  const [open, setOpen] = useState<number | null>(0);
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: api.faqs,
  });

  if (isLoading)
    return (
      <section className="section-shell py-24 md:py-32">
        <div className="mx-auto max-w-4xl space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </section>
    );

  return (
    <section className="section-shell py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <span className="eyebrow mb-4 text-center">
          {c("faq_section", "eyebrow", "Frequently Asked")}
        </span>
        <h2 className="display-title mb-12 text-center text-4xl md:text-6xl">
          {c("faq_section", "title", "Quietly answered.")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-white/42 shadow-[var(--shadow-soft)]">
          {faqs.map((f, i) => (
            <div key={f.id} className="border-b border-border last:border-b-0">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-5 py-6 text-left transition-colors hover:bg-white/55 focus-ring md:px-7"
              >
                <span className="text-base font-extrabold leading-7 md:text-lg">{f.question}</span>
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
                  {f.answer}
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
  const { c } = useContent("home");
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
        <span className="eyebrow mb-5 text-[#d7aa73]">
          {c("newsletter_cta", "eyebrow", "Your first memory")}
        </span>
        <h2 className="display-title mb-8 max-w-4xl text-5xl md:text-7xl">
          {c("newsletter_cta", "title", "Describe the moments you want to remember forever.")}
        </h2>
        <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-end">
          <p className="max-w-xl text-lg leading-9 text-white/76">
            {c(
              "newsletter_cta",
              "body",
              "Tell us the feeling, the people, the pace, or the image in your head. We will turn it into a journey that has room for surprise and still runs beautifully.",
            )}
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="grid gap-3 rounded-2xl border border-white/14 bg-white/10 p-3 backdrop-blur-md sm:grid-cols-[1fr_auto]"
          >
            <input
              type="text"
              required
              placeholder={c(
                "newsletter_cta",
                "placeholder",
                "Misty mountains, slow dinners, private trains...",
              )}
              className="min-h-14 rounded-xl border border-white/12 bg-black/20 px-5 text-base text-white outline-none placeholder:text-white/46 focus:border-accent"
            />
            <button
              type="submit"
              className="min-h-14 rounded-xl bg-accent px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 focus-ring"
            >
              {c("newsletter_cta", "cta_label", "Begin")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
