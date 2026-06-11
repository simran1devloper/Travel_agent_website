import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Headphones,
  ShieldCheck,
  Tag,
  Zap,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { api, type ApiOffer } from "@/lib/api";
import heroOfferImage from "@/assets/Exclusive_offer_Section_image.png";
import romanticDinnerImage from "@/assets/romantic_dinner_image_scene.png";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Exclusive Offers - JourneyMakers" },
      {
        name: "description",
        content:
          "Flash sales, early bird deals, and exclusive travel offers curated for discerning travelers.",
      },
    ],
  }),
  component: OffersPage,
});

const fallbackOffers: ApiOffer[] = [
  {
    id: 1,
    title: "Honeymoon Escape Flash Sale",
    subtitle: "Book this week - 20% off",
    description:
      "Exclusive discount on all honeymoon packages for bookings made this week. Limited slots.",
    offer_type: "flash",
    discount_value: 20,
    badge_label: "FLASH 20% OFF",
    badge_color: "red",
    applies_to: "all",
    valid_from: "2026-05-01",
    valid_until: "2026-06-30",
    max_uses: 50,
    current_uses: 12,
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: "2026-05-01",
    updated_at: "2026-05-01",
  },
];

const badgeColors: Record<ApiOffer["badge_color"], string> = {
  accent: "bg-[#c76b2f] text-white",
  red: "bg-[#ff4b39] text-white",
  green: "bg-emerald-500 text-white",
  gold: "bg-amber-400 text-amber-950",
};

const offerIcons: Record<ApiOffer["offer_type"], React.ComponentType<{ className?: string }>> = {
  percent: Tag,
  fixed: Gift,
  free_upgrade: Gift,
  flash: Zap,
};

function useCountdown(until: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(
    null,
  );

  useEffect(() => {
    if (!until) return;
    const target = new Date(until).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  return timeLeft;
}

function formatDiscount(offer: ApiOffer) {
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

function OffersPage() {
  const offersQuery = useQuery({
    queryKey: ["offers"],
    queryFn: api.offers,
  });

  const offers = offersQuery.data?.length ? offersQuery.data : fallbackOffers;
  const featured = offers.find((offer) => offer.is_featured) ?? offers[0];
  const regular = offers.filter((offer) => offer.id !== featured?.id);

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#f6f1ea] text-[#15181d]">
        <OffersHero />

        <section className="section-shell pb-12 pt-8">
          <div className="mb-5 flex items-center gap-2">
            <Zap className="size-4 fill-[#c76b2f] text-[#c76b2f]" />
            <h2 className="text-sm font-extrabold uppercase">Featured Deals</h2>
          </div>

          {featured ? (
            <FeaturedOffer offer={featured} />
          ) : (
            <div className="rounded-[8px] border border-[#d8c9b8] bg-[#fbf8f3] p-10 text-center text-[#59606a]">
              No active offers right now.
            </div>
          )}

          {regular.length > 0 && (
            <section className="pt-10">
              <h2 className="mb-5 text-sm font-extrabold uppercase">All Offers</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {regular.map((offer) => (
                  <SmallOfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </section>
          )}
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function OffersHero() {
  const trustItems = [
    { icon: Clock, label: "Limited-Time Deals" },
    { icon: ShieldCheck, label: "Verified Travel Packages" },
    { icon: CreditCard, label: "Secure Booking" },
    { icon: Headphones, label: "WhatsApp Support" },
  ];

  return (
    <section className="section-shell grid min-h-[395px] gap-8 pb-8 pt-12 md:grid-cols-[0.95fr_1.05fr] md:items-center md:pt-14">
      <div className="relative z-10">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase text-[#c76b2f]">
          <span>Limited-time</span>
          <span className="size-1 rounded-full bg-[#c76b2f]" />
          <span>Members only</span>
        </div>
        <h1 className="max-w-2xl text-5xl font-extrabold leading-none md:text-7xl">
          Exclusive offers.
        </h1>
        <p className="mt-5 max-w-lg text-base font-medium leading-7 text-[#59606a]">
          Handpicked deals on our most-loved packages - flash sales, early birds, and private
          upgrades.
        </p>

        <div className="mt-7 grid max-w-2xl grid-cols-2 gap-2 lg:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex min-h-14 items-center gap-2 rounded-full border border-[#d8c9b8] bg-[#fbf8f3]/80 px-3 text-[11px] font-extrabold shadow-[0_10px_28px_rgba(14,23,38,0.05)]"
              >
                <Icon className="size-4 shrink-0 text-[#c76b2f]" />
                <span className="leading-4">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[260px] overflow-hidden rounded-[8px] md:-mr-8 md:min-h-[350px]">
        <img
          src={heroOfferImage}
          alt="Luxury resort terrace at sunset"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6f1ea]/70 via-[#f6f1ea]/12 to-transparent" />
      </div>
    </section>
  );
}

function FeaturedOffer({ offer }: { offer: ApiOffer }) {
  const recordUse = useMutation({ mutationFn: () => api.recordOfferUse(offer.id) });
  const Icon = offerIcons[offer.offer_type] ?? Tag;
  const isSoldOut = offer.max_uses != null && offer.current_uses >= offer.max_uses;
  const usedPercent = offer.max_uses
    ? Math.min(100, Math.round((offer.current_uses / offer.max_uses) * 100))
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="grid overflow-hidden rounded-[8px] border border-[#d8c9b8] bg-[#fbf8f3] shadow-[0_18px_46px_rgba(14,23,38,0.12)] lg:grid-cols-[0.95fr_1.05fr]"
    >
      <div className="p-6 md:p-8">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${badgeColors[offer.badge_color]}`}
        >
          <Icon className="size-3" />
          {offer.badge_label}
        </span>

        <div className="mt-5 text-5xl font-black leading-none text-[#ff3528] md:text-6xl">
          {formatDiscount(offer)}
        </div>

        <h3 className="mt-3 text-xl font-extrabold">{offer.title}</h3>
        {offer.subtitle && (
          <p className="mt-1 text-sm font-extrabold text-[#c76b2f]">{offer.subtitle}</p>
        )}
        <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-[#59606a]">
          {offer.description}
        </p>

        {offer.valid_until && <CountdownBar until={offer.valid_until} />}

        {offer.max_uses != null && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#59606a]">
              <span>
                {offer.current_uses} / {offer.max_uses} claimed
              </span>
              <span>{usedPercent}% gone</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eadfd4]">
              <div
                className="h-full rounded-full bg-[#d66f2f]"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        )}

        {offer.code && (
          <div className="mt-4">
            <CopyCodeButton code={offer.code} />
          </div>
        )}

        <Link
          to="/booking"
          onClick={() => {
            if (!isSoldOut) recordUse.mutate();
          }}
          className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-extrabold transition-colors ${
            isSoldOut ? "bg-[#ebe3d8] text-[#59606a]" : "bg-[#0e1726] text-white hover:bg-[#c76b2f]"
          }`}
        >
          {isSoldOut ? "Fully Claimed" : "Claim this offer"}
          {!isSoldOut && <ArrowUpRight className="size-4" />}
        </Link>
      </div>

      <div className="relative min-h-[280px] lg:min-h-full">
        <img
          src={romanticDinnerImage}
          alt="Romantic dinner setting at sunset"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    </motion.article>
  );
}

function CountdownBar({ until }: { until: string }) {
  const t = useCountdown(until);
  if (!t) return null;

  return (
    <div className="mt-5 rounded-[8px] border border-red-500/10 bg-red-500/8 px-4 py-3 text-sm font-extrabold text-red-500">
      <Clock className="mr-2 inline size-4" />
      {t.d}d : {String(t.h).padStart(2, "0")}h : {String(t.m).padStart(2, "0")}m :{" "}
      {String(t.s).padStart(2, "0")}s
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-[#d8c9b8] bg-[#f6efe6] px-4 font-mono text-xs font-extrabold"
    >
      {code}
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function SmallOfferCard({ offer }: { offer: ApiOffer }) {
  const Icon = offerIcons[offer.offer_type] ?? Tag;

  return (
    <article className="rounded-[8px] border border-[#d8c9b8] bg-[#fbf8f3] p-5 shadow-[0_12px_30px_rgba(14,23,38,0.06)]">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${badgeColors[offer.badge_color]}`}
      >
        <Icon className="size-3" />
        {offer.badge_label}
      </span>
      <h3 className="mt-4 text-2xl font-black text-[#15181d]">{formatDiscount(offer)}</h3>
      <p className="mt-2 text-sm font-extrabold">{offer.title}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#59606a]">{offer.description}</p>
      <Link
        to="/booking"
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#15181d] px-5 text-xs font-extrabold hover:bg-[#15181d] hover:text-white"
      >
        Claim offer <ArrowUpRight className="size-3.5" />
      </Link>
    </article>
  );
}
