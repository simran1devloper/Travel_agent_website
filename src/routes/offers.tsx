import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import { api, type ApiOffer } from "@/lib/api";
import { Copy, Check, Clock, Tag, Zap, Gift, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Exclusive Offers — JourneyMakers" },
      { name: "description", content: "Flash sales, early bird deals, and exclusive travel offers curated for discerning travelers." },
    ],
  }),
  component: OffersPage,
});

// Badge color map
const BADGE_COLORS: Record<string, string> = {
  accent: "bg-accent text-white",
  red: "bg-red-500 text-white",
  green: "bg-emerald-500 text-white",
  gold: "bg-amber-400 text-amber-900",
};

const OFFER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  percent: Tag,
  fixed: Gift,
  free_upgrade: Gift,
  flash: Zap,
};

// Countdown timer hook
function useCountdown(until: string | undefined) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!until) return;
    const target = new Date(until).getTime();
    function tick() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  return timeLeft;
}

function CountdownBadge({ until }: { until: string }) {
  const t = useCountdown(until);
  if (!t) return null;
  return (
    <div className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-mono text-red-600">
      <Clock className="size-3" />
      <span>{t.d}d {String(t.h).padStart(2, "0")}h {String(t.m).padStart(2, "0")}m {String(t.s).padStart(2, "0")}s</span>
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
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-secondary/50 px-4 py-1.5 font-mono text-sm font-bold tracking-widest hover:bg-secondary transition-colors"
    >
      <span>{code}</span>
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </button>
  );
}

function OfferCard({ offer, featured = false }: { offer: ApiOffer; featured?: boolean }) {
  const recordUse = useMutation({ mutationFn: () => api.recordOfferUse(offer.id) });
  const Icon = OFFER_ICONS[offer.offer_type] ?? Tag;
  const isFlash = offer.offer_type === "flash";
  const isSoldOut = offer.max_uses != null && offer.current_uses >= offer.max_uses;

  function formatDiscount() {
    switch (offer.offer_type) {
      case "percent": return `${offer.discount_value}% OFF`;
      case "fixed": return `₹${offer.discount_value.toLocaleString()} OFF`;
      case "free_upgrade": return "FREE UPGRADE";
      case "flash": return `${offer.discount_value}% FLASH`;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-3xl border overflow-hidden transition-shadow hover:shadow-xl ${
        featured
          ? "border-accent/30 bg-gradient-to-br from-accent/5 to-background"
          : "border-border bg-card"
      } ${isSoldOut ? "opacity-60" : ""}`}
    >
      {/* Badge */}
      <div className="absolute top-4 left-4 z-10">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${BADGE_COLORS[offer.badge_color] ?? BADGE_COLORS.accent}`}>
          <Icon className="size-3" />
          {offer.badge_label}
        </span>
      </div>
      {isSoldOut && (
        <div className="absolute top-4 right-4 z-10">
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sold out</span>
        </div>
      )}

      <div className={`p-6 ${featured ? "pt-14" : "pt-14"}`}>
        {/* Discount hero */}
        <div className={`mb-4 ${featured ? "text-5xl" : "text-3xl"} font-black tracking-tighter ${isFlash ? "text-red-500" : "text-foreground"}`}>
          {formatDiscount()}
        </div>

        <h3 className={`font-extrabold tracking-tight ${featured ? "text-xl" : "text-lg"}`}>{offer.title}</h3>
        {offer.subtitle && (
          <p className="mt-1 text-sm text-accent font-semibold">{offer.subtitle}</p>
        )}
        {offer.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">{offer.description}</p>
        )}

        {/* Countdown */}
        {offer.valid_until && (
          <div className="mt-4">
            <CountdownBadge until={offer.valid_until} />
          </div>
        )}

        {/* Promo code */}
        {offer.code && (
          <div className="mt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Promo code</p>
            <CopyCodeButton code={offer.code} />
          </div>
        )}

        {/* Usage meter */}
        {offer.max_uses != null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{offer.current_uses} / {offer.max_uses} claimed</span>
              <span>{Math.round((offer.current_uses / offer.max_uses) * 100)}% gone</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${offer.current_uses / (offer.max_uses ?? 1) > 0.8 ? "bg-red-500" : "bg-accent"}`}
                style={{ width: `${Math.min(100, (offer.current_uses / offer.max_uses) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6">
          <Link
            to="/booking"
            onClick={() => { if (!isSoldOut) recordUse.mutate(); }}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-extrabold tracking-wide transition-colors ${
              isSoldOut
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : featured
                ? "bg-foreground text-background hover:bg-accent"
                : "border border-foreground text-foreground hover:bg-foreground hover:text-background"
            }`}
          >
            {isSoldOut ? "Fully Claimed" : "Claim this offer"}
            {!isSoldOut && <ArrowUpRight className="size-4" />}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function OffersPage() {
  const offersQuery = useQuery({
    queryKey: ["offers"],
    queryFn: api.offers,
  });

  const offers = offersQuery.data ?? [];
  const featured = offers.filter((o) => o.is_featured);
  const regular = offers.filter((o) => !o.is_featured);

  return (
    <PageShell
      eyebrow="Limited-time · Members only"
      title="Exclusive offers."
      description="Handpicked deals on our most-loved packages — flash sales, early birds, and private upgrades."
    >
      {offers.length === 0 && !offersQuery.isLoading && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-bold">No active offers right now.</p>
          <p className="text-sm mt-2">Check back soon — we drop new deals every week.</p>
        </div>
      )}

      {/* Featured offers */}
      {featured.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="size-5 text-accent" />
            <h2 className="text-lg font-extrabold uppercase tracking-widest">Featured Deals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((o) => <OfferCard key={o.id} offer={o} featured />)}
          </div>
        </section>
      )}

      {/* Regular offers */}
      {regular.length > 0 && (
        <section>
          <h2 className="text-lg font-extrabold uppercase tracking-widest mb-6">All Offers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {regular.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </section>
      )}

      <div className="mt-16 rounded-3xl border border-border p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent mb-2">Never miss a deal</p>
        <h3 className="text-2xl font-black tracking-tighter">Private offers for members</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Create an account to access member-exclusive flash sales and early bird pricing before they go public.
        </p>
        <Link
          to="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-extrabold text-background hover:bg-accent transition-colors"
        >
          Join for free <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </PageShell>
  );
}
