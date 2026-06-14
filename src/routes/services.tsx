import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommentBox } from "@/components/comment-box";
import { ServiceReviewsSection } from "@/components/entity-reviews";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  Headphones,
  Home,
  LockKeyhole,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useBasket } from "@/lib/basket";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { api, type ApiService } from "@/lib/api";
import { useContent } from "@/lib/use-content";
import businessMeetingImage from "@/assets/business_meeting_by_the_ocean_at_sunset.png";
import deskEssentialsImage from "@/assets/elegant_desk_with_travel_essentials.png";
import friendsPromenadeImage from "@/assets/coastal_sunset_with_friends_on_promenade.png";
import hikeImage from "@/assets/golden_hour_hike_in_alpine_valley.png";
import mediterraneanVillageImage from "@/assets/golden_hour_over_a_mediterranean_village.png.png";
import planningDeskImage from "@/assets/travel_planning_essentials_on_a_cozy_desk.png";
import romanticDinnerImage from "@/assets/romantic_sunset_dinner_by_the_sea.png";
import skiesImage from "@/assets/serene_skies_at_sunset_over_the_clouds.png";
import skylinePoolImage from "@/assets/sunset_skyline_from_a_luxurious_pool_terrace.png";
import villaTerraceImage from "@/assets/serene_sunset_over_luxury_villa_terrace.png";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services - JourneyMakers" },
      {
        name: "description",
        content:
          "Visa concierge, hotel & flight booking, honeymoon packages, corporate retreats, and bespoke planning.",
      },
      { property: "og:title", content: "Services - JourneyMakers" },
      { property: "og:description", content: "Everything we orchestrate, end-to-end." },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const fallbackServices: ApiService[] = [
  {
    id: "tour-packages",
    name: "Curated Tour Packages",
    description: "Hand-crafted itineraries across 124+ destinations.",
    rating: 4.9,
    review_count: 512,
    highlight: "They crafted the exact pace I needed - effortless and luxurious.",
    gallery: [],
    sort_order: 1,
  },
  {
    id: "visa-assistance",
    name: "Visa Guidance & Partner Assistance",
    category: "Travel documents",
    short_description:
      "Basic travel guidance, document checklist help, and trusted third-party visa assistance partner connections when needed.",
    description:
      "JourneyMakers provides basic travel guidance, document checklist help, and can connect travelers with trusted third-party visa assistance partners when needed. Visa approval depends on embassy/consulate rules and applicant documents. JourneyMakers does not guarantee visa approval.",
    rating: 4.8,
    review_count: 441,
    highlight: "Clear document guidance and partner assistance without false approval guarantees.",
    badge_text: "Recommended",
    cta_text: "Get Guidance",
    cta_link: "/contact",
    status: "published",
    show_homepage: true,
    show_services_page: true,
    show_hero_card: true,
    show_footer: true,
    gallery: [],
    sort_order: 2,
  },
  {
    id: "hotel-booking",
    name: "Luxury Hotel Booking",
    description: "Negotiated rates at the world's best properties.",
    rating: 4.9,
    review_count: 378,
    highlight: "Every stay felt upgraded, from arrival to late checkout.",
    gallery: [],
    sort_order: 3,
  },
  {
    id: "flight-booking",
    name: "Flight Booking",
    description: "Business and first-class fares, multi-city routing.",
    rating: 4.8,
    review_count: 398,
    highlight: "They found the perfect routing with minimal layovers.",
    gallery: [],
    sort_order: 4,
  },
  {
    id: "corporate-tours",
    name: "Corporate Retreats",
    description: "Off-sites that change company culture.",
    rating: 4.7,
    review_count: 259,
    highlight: "Our team returned with stronger bonds and zero logistics headaches.",
    gallery: [],
    sort_order: 5,
  },
  {
    id: "group-tours",
    name: "Group Tours",
    description: "Small private groups, never bus-tour scale.",
    rating: 4.8,
    review_count: 311,
    highlight: "The group experience felt intimate and perfectly timed.",
    gallery: [],
    sort_order: 6,
  },
  {
    id: "honeymoon",
    name: "Honeymoon Packages",
    description: "Stories that begin a marriage.",
    rating: 4.9,
    review_count: 287,
    highlight: "Attention to detail made every moment feel special.",
    gallery: [],
    sort_order: 7,
  },
  {
    id: "adventure",
    name: "Adventure Expeditions",
    description: "Sahara, Patagonia, Himalayas - properly equipped.",
    rating: 4.8,
    review_count: 330,
    highlight: "The guides knew every ridge, trail, and local story.",
    gallery: [],
    sort_order: 8,
  },
  {
    id: "international",
    name: "International Travel",
    description: "Global routing handled end-to-end.",
    rating: 4.8,
    review_count: 364,
    highlight: "We felt supported in every timezone.",
    gallery: [],
    sort_order: 9,
  },
  {
    id: "domestic",
    name: "Domestic Travel",
    description: "Hidden corners of home, beautifully arranged.",
    rating: 4.7,
    review_count: 225,
    highlight: "Domestic escapes felt as polished as overseas journeys.",
    gallery: [],
    sort_order: 10,
  },
  {
    id: "passport",
    name: "Passport Assistance",
    description: "Renewals, expediting, lost-passport recovery.",
    rating: 4.9,
    review_count: 402,
    highlight: "They resolved my embassy appointments with ease.",
    gallery: [],
    sort_order: 11,
  },
  {
    id: "custom-trip",
    name: "Custom Trip Planning",
    description: "From a single line of brief to a finished journey.",
    rating: 4.9,
    review_count: 487,
    highlight: "Every detail matched our request better than expected.",
    gallery: [],
    sort_order: 12,
  },
];

const serviceImages: Record<string, string> = {
  "tour-packages": mediterraneanVillageImage,
  "visa-assistance": deskEssentialsImage,
  "hotel-booking": villaTerraceImage,
  "flight-booking": skiesImage,
  "corporate-tours": businessMeetingImage,
  "group-tours": friendsPromenadeImage,
  honeymoon: romanticDinnerImage,
  adventure: hikeImage,
  international: skylinePoolImage,
  domestic: mediterraneanVillageImage,
  passport: deskEssentialsImage,
  "custom-trip": planningDeskImage,
};

const fallbackImages = [
  mediterraneanVillageImage,
  deskEssentialsImage,
  villaTerraceImage,
  skiesImage,
  businessMeetingImage,
  friendsPromenadeImage,
  romanticDinnerImage,
  hikeImage,
  skylinePoolImage,
  planningDeskImage,
];

const cardLayouts = [
  "lg:col-span-2 lg:row-span-2",
  "lg:col-span-3 lg:row-span-2",
  "lg:col-span-2 lg:row-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-3",
  "lg:col-span-2",
  "lg:col-span-3",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-3",
];

const lightCards = new Set([
  "visa-assistance",
  "flight-booking",
  "corporate-tours",
  "group-tours",
  "passport",
  "custom-trip",
]);

const SERVICE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "planning", label: "Planning" },
  { id: "travel", label: "Travel" },
  { id: "experience", label: "Experience" },
  { id: "documents", label: "Documents" },
];

function ServicesPage() {
  const { c } = useContent("services");
  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: api.services,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const allServices = (servicesQuery.data?.length ? servicesQuery.data : fallbackServices)
    .filter((service) => (service.status ?? "published") === "published")
    .filter((service) => service.show_services_page !== false);

  const services = allServices.filter((service) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !service.name.toLowerCase().includes(q) &&
        !(service.short_description ?? service.description ?? "").toLowerCase().includes(q) &&
        !(service.category ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (categoryFilter !== "all") {
      const cat = (service.category ?? service.name ?? "").toLowerCase();
      if (!cat.includes(categoryFilter)) return false;
    }
    return true;
  });

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f6f1ea] text-[#15181d]">
        <ServiceHero c={c} />
        <TrustStrip />

        <section className="section-shell pb-8 pt-8 md:pt-10">
          <span className="eyebrow">Our services</span>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight md:text-4xl">
            Curated experiences. Seamless execution.
          </h2>

          {/* Search + filter */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-[#d8c9b8] bg-white/80 py-2.5 pl-11 pr-5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[#c76b2f]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                    categoryFilter === cat.id
                      ? "border-[#c76b2f] bg-[#c76b2f] text-white"
                      : "border-[#d8c9b8] bg-white/60 text-foreground hover:border-[#c76b2f]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {servicesQuery.isLoading ? (
            <ServiceGridSkeleton />
          ) : services.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[#d8c9b8] py-16 text-center">
              <p className="font-bold text-foreground">No services match your search.</p>
              <button
                type="button"
                onClick={() => { setSearch(""); setCategoryFilter("all"); }}
                className="mt-4 rounded-full border border-[#d8c9b8] bg-white px-5 py-2 text-sm font-bold text-foreground hover:border-[#c76b2f] hover:text-[#c76b2f]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid auto-rows-[220px] grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
              {services.slice(0, 12).map((service, index) => (
                <ServiceCard key={service.id} service={service} index={index} />
              ))}
            </div>
          )}
        </section>

        <PartnerAssistance />

        {/* Per-service reviews + comments */}
        <ServiceCommunitySection services={allServices} />

        <section className="section-shell flex flex-col items-center pb-10 pt-4 text-center">
          <Link
            to="/booking"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0e1726] px-9 text-xs font-extrabold uppercase text-white shadow-[0_18px_45px_rgba(14,23,38,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#c76b2f] focus-ring"
          >
            Start an inquiry
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <p className="mt-4 text-sm font-medium text-[#59606a]">
            Tell us your travel plans and we'll take care of the rest.
          </p>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function ServiceHero({ c }: { c: (section: string, key: string, fallback?: string) => string }) {
  return (
    <section className="section-shell grid min-h-[430px] gap-8 pb-8 pt-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-16">
      <div className="relative z-10">
        <span className="eyebrow">{c("hero", "eyebrow", "Services")}</span>
        <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-normal md:text-7xl">
          {c("hero", "title", "Everything we orchestrate, end-to-end.")}
        </h1>
        <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-[#59606a]">
          {c(
            "hero",
            "body",
            "Visa concierge, hotel & flight booking, honeymoon packages, corporate retreats, and bespoke planning.",
          )}
        </p>
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-l-[8px] rounded-r-none md:-mr-8 md:min-h-[360px]">
        <img
          src={villaTerraceImage}
          alt="Private terrace overlooking a golden coastline"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#f6f1ea]/30" />
        <div className="absolute -left-16 bottom-10 hidden size-28 place-items-center rounded-full border border-[#cda27b]/55 bg-[#f6f1ea]/78 text-center text-[#a86b42] shadow-[0_16px_45px_rgba(14,23,38,0.1)] backdrop-blur-md md:grid">
          <div className="text-3xl font-serif">JM</div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: "10+ Years of", body: "Crafting Journeys" },
    { icon: Star, title: "4.8+ Average Rating", body: "From 2,000+ Travelers" },
    { icon: LockKeyhole, title: "Secure Payments", body: "100% Protected" },
    { icon: Headphones, title: "24/7 Concierge", body: "Always by your side" },
  ];

  return (
    <section className="section-shell">
      <div className="grid overflow-hidden rounded-[8px] border border-[#d8c9b8] bg-[#fbf8f3]/72 shadow-[0_14px_36px_rgba(14,23,38,0.06)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`flex min-h-16 items-center gap-4 px-6 py-4 ${index ? "border-t border-[#d8c9b8] sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}
            >
              <Icon className="size-6 shrink-0 text-[#c76b2f]" />
              <div>
                <p className="text-xs font-extrabold leading-4">{item.title}</p>
                <p className="text-xs font-semibold leading-4 text-[#59606a]">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ServiceGridSkeleton() {
  return (
    <div className="mt-6 grid auto-rows-[220px] grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className={`${cardLayouts[index]} animate-pulse rounded-[8px] border border-[#d8c9b8] bg-[#ebe3d8]`}
        />
      ))}
    </div>
  );
}

function ServiceCard({ service, index }: { service: ApiService; index: number }) {
  const isLight = lightCards.has(service.id);
  const image =
    (service.image_url || serviceImages[service.id]) ??
    service.gallery?.find((item) => item.type === "photo")?.src ??
    fallbackImages[index % fallbackImages.length];
  const layout = cardLayouts[index % cardLayouts.length];
  const { add: addToBasket, remove: removeFromBasket, has: inBasket } = useBasket();
  const isInBasket = inBasket(service.id, "service");

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.05, ease: [0.32, 0.72, 0, 1] }}
      className={`${layout} group relative min-h-[220px] overflow-hidden rounded-[8px] border border-[#d8c9b8] bg-[#fbf8f3] shadow-[0_16px_38px_rgba(14,23,38,0.07)]`}
    >
      <img
        src={image}
        alt={service.name}
        className={`absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105 ${isLight ? "opacity-55" : "opacity-100"}`}
      />
      <div
        className={`absolute inset-0 ${
          isLight
            ? "bg-gradient-to-r from-[#fbf8f3] via-[#fbf8f3]/88 to-[#fbf8f3]/20"
            : "bg-gradient-to-t from-[#07101d]/90 via-[#07101d]/42 to-[#07101d]/8"
        }`}
      />

      {(service.badge_text || index === 1) && (
        <span className="absolute left-5 top-4 rounded-full bg-[#e36f2c] px-3 py-1 text-[10px] font-extrabold uppercase text-white">
          {service.badge_text || "Most trusted"}
        </span>
      )}

      <div
        className={`relative z-10 flex h-full flex-col justify-end p-5 ${isLight ? "text-[#15181d]" : "text-white"}`}
      >
        <span
          className={`mb-3 font-mono text-[11px] font-bold ${isLight ? "text-[#c76b2f]" : "text-white/72"}`}
        >
          [{String(index + 1).padStart(2, "0")}]
        </span>
        <h3 className="text-xl font-extrabold leading-tight">{service.name}</h3>
        <div
          className={`mt-2 flex items-center gap-2 text-xs font-semibold ${isLight ? "text-[#59606a]" : "text-white/78"}`}
        >
          <Star className="size-3.5 fill-[#f4b63f] text-[#f4b63f]" />
          <span>{service.rating.toFixed(1)}</span>
          <span>{service.review_count} reviews</span>
        </div>
        <p
          className={`mt-4 max-w-sm text-sm font-semibold leading-6 ${isLight ? "text-[#3f4650]" : "text-white/84"}`}
        >
          {service.short_description || service.description}
        </p>
        <p
          className={`mt-4 max-w-sm text-xs italic leading-5 ${isLight ? "text-[#59606a]" : "text-white/76"}`}
        >
          "{service.highlight}"
        </p>
      </div>

      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (isInBasket) {
              removeFromBasket(service.id, "service");
            } else {
              addToBasket({
                type: "service",
                slug: service.id,
                name: service.name,
                image: image,
              });
            }
          }}
          aria-label={isInBasket ? `Remove ${service.name} from basket` : `Add ${service.name} to basket`}
          className={`grid size-11 place-items-center rounded-full shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition-all group-hover:scale-105 focus-ring ${
            isInBasket
              ? "bg-[#c76b2f] text-white"
              : isLight
                ? "bg-white/80 text-[#c76b2f] hover:bg-[#c76b2f] hover:text-white"
                : "bg-white/14 text-white hover:bg-[#c76b2f]"
          }`}
        >
          <ShoppingBag className="size-5" />
        </button>
        {(service.cta_link || index === 1) && (
          <a
            href={service.cta_link?.startsWith("/") ? service.cta_link : "/contact"}
            aria-label={`Start an inquiry for ${service.name}`}
            className="grid size-11 place-items-center rounded-full bg-[#d66f2f] text-white shadow-[0_12px_24px_rgba(199,107,47,0.3)] transition-transform group-hover:scale-105 focus-ring"
          >
            <ArrowUpRight className="size-5" />
          </a>
        )}
      </div>
    </motion.article>
  );
}

function PartnerAssistance() {
  const points = [
    { icon: Home, title: "Expert Guidance", body: "Clear steps, every time" },
    { icon: BadgeCheck, title: "Higher Approval Rate", body: "Proven track record" },
    { icon: Award, title: "End-to-End Support", body: "From start to stamp" },
  ];

  return (
    <section className="section-shell py-4">
      <div className="grid gap-6 rounded-[8px] border border-[#d8c9b8] bg-[#fbf2e8]/88 p-5 shadow-[0_14px_36px_rgba(14,23,38,0.05)] lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full border border-[#d6a27b] bg-[#fff8ef] text-[#c76b2f]">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <span className="eyebrow">Partner assistance</span>
            <h3 className="mt-1 text-2xl font-semibold leading-tight">
              Visa guidance. No guesswork, just results.
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#59606a]">
              From documentation to approvals, our visa experts handle the complexity so you can
              focus on the journey.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="flex items-center gap-3">
                <Icon className="size-7 shrink-0 text-[#b7835d]" />
                <div>
                  <p className="text-xs font-extrabold leading-4">{point.title}</p>
                  <p className="text-[11px] font-semibold leading-4 text-[#59606a]">{point.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          to="/services"
          hash="visa"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d66f2f] px-6 text-xs font-extrabold uppercase text-white shadow-[0_12px_26px_rgba(199,107,47,0.22)] transition-all hover:-translate-y-0.5 focus-ring"
        >
          Learn more
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}

function ServiceCommunitySection({ services }: { services: ApiService[] }) {
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const selectedService = services.find((s) => s.id === selectedId) ?? services[0];

  if (!selectedService) return null;

  return (
    <section className="section-shell border-t border-[#d8c9b8] py-12">
      <h2 className="text-2xl font-bold tracking-tight">Community Reviews &amp; Comments</h2>
      <p className="mt-2 text-sm text-[#59606a]">Select a service to see what travelers are saying.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
              selectedId === s.id
                ? "border-[#c76b2f] bg-[#c76b2f] text-white"
                : "border-[#d8c9b8] bg-white/60 text-foreground hover:border-[#c76b2f]"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        <ServiceReviewsSection slug={selectedService.id} name={selectedService.name} />
        <CommentBox entityType="service" entitySlug={selectedService.id} />
      </div>
    </section>
  );
}
