import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Heart,
  Hotel,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Mountain,
  Palmtree,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Utensils,
  Users,
  Wine,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { api, type ApiService, type ApiPackage, type ApiOffer, type ApiDestination } from "@/lib/api";
import { useInquiryDraft, clearInquiryDraft } from "@/lib/user-prefs";
import { loadHeroSearch, clearHeroSearch } from "@/lib/search-state";
import { readCheckoutPrefill, type BasketItem } from "@/lib/basket";
import { DateRangePicker, formatDateRange, type DateRange } from "@/components/date-range-picker";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Plan My Journey — JourneyMakers" },
      {
        name: "description",
        content:
          "Build a luxury travel inquiry around destinations, traveler moments, style, timing, budget, and inspiration.",
      },
      { property: "og:title", content: "Plan My Journey — JourneyMakers" },
      { property: "og:description", content: "Tell us what kind of moments you want." },
      { property: "og:url", content: "/booking" },
    ],
    links: [{ rel: "canonical", href: "/booking" }],
  }),
  component: BookingPage,
});

const destinationIdeas = [
  { name: "Japan", detail: "Tokyo nightlife, Kyoto culture, Hokkaido winter" },
  { name: "Bali", detail: "Hidden beaches, wellness villas, local markets" },
  { name: "Switzerland", detail: "Alpine rail, lake towns, chalet dining" },
  { name: "Thailand", detail: "Food walks, islands, private temple guides" },
  { name: "Vietnam", detail: "River cruises, lantern towns, emerald bays" },
  { name: "Open to ideas", detail: "Let a travel designer recommend the route" },
];

const experienceOptions = [
  { id: "food", label: "Food discovery", icon: Utensils },
  { id: "mountains", label: "Mountain escapes", icon: Mountain },
  { id: "nightlife", label: "Nightlife", icon: Sparkles },
  { id: "wellness", label: "Wellness", icon: Palmtree },
  { id: "culture", label: "Art & culture", icon: Camera },
  { id: "islands", label: "Island hopping", icon: Palmtree },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "luxury-stays", label: "Luxury stays", icon: Hotel },
];

const travelStyles = [
  "Luxury",
  "Balanced",
  "Adventure",
  "Slow travel",
  "Family",
  "Romantic",
  "Solo",
];
const budgetRanges = ["$2k-5k", "$5k-10k", "$10k-20k", "Luxury+"];
const inspirationMoments = [
  "Bangkok rooftop dinner",
  "Swiss alpine train ride",
  "Tokyo night food walk",
  "Vietnam sunrise cruise",
  "Bali hidden beach",
  "Kyoto temple morning",
];

const serviceGroups = [
  {
    title: "Planning",
    items: ["Custom itinerary", "Concierge planning", "Visa support"],
  },
  {
    title: "Travel",
    items: ["Flights", "Hotels", "Transfers"],
  },
  {
    title: "Experiences",
    items: ["Adventure", "Retreats", "Group journeys"],
  },
];

function BookingPage() {
  const { data: bookingContent } = useQuery({
    queryKey: ["content", "booking"],
    queryFn: () => api.content("booking"),
    staleTime: 60_000,
  });

  const formContent = bookingContent?.form ?? {};

  function parseJsonOption<T>(key: string, fallback: T[]): T[] {
    try {
      const raw = formContent[key];
      if (raw) return JSON.parse(raw) as T[];
    } catch { /* ignore */ }
    return fallback;
  }

  const dynamicDestinations = parseJsonOption<string>("destinations_json", [
    "Japan", "Bali", "Switzerland", "Thailand", "Vietnam", "Open to ideas",
  ]).map((name) => ({ name, detail: "" }));

  const dynamicTravelStyles = parseJsonOption<string>("travel_styles_json", travelStyles);
  const dynamicBudgetRanges = parseJsonOption<string>("budget_options_json", budgetRanges);

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    destinations: string[];
    experiences: string[];
    adults: number;
    children: number;
    budget: string;
    styles: string[];
  } | null>(null);

  // ── Draft autosave — restores progress if user leaves and comes back ──────
  const { draft, hasDraft, saveDraft, resetDraft } = useInquiryDraft();
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(hasDraft && !draftRestored);

  // ── Basket checkout prefill — one-shot, consumed on first render ─────────
  const [basketPrefill] = useState<BasketItem[] | null>(() => readCheckoutPrefill());
  const [showBasketBanner, setShowBasketBanner] = useState(basketPrefill !== null && basketPrefill.length > 0);

  // ── Hero search prefill — once, on mount ─────────────────────────────────
  const heroSearch = loadHeroSearch();

  const [step, setStep] = useState(() => {
    if (basketPrefill?.length) return 0;
    return hasDraft ? draft.step : 0;
  });
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(() => {
    if (basketPrefill?.length) {
      const names: string[] = [];
      for (const item of basketPrefill) {
        if (item.type === "destination") names.push(item.name);
        if (item.type === "package" && item.location) names.push(item.location);
      }
      return names.length > 0 ? names : [];
    }
    if (hasDraft) return draft.selectedDestinations;
    if (heroSearch?.destination) return [heroSearch.destination];
    return [];
  });
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(
    hasDraft ? draft.selectedExperiences : [],
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    hasDraft ? draft.selectedStyles : [],
  );
  const [selectedBudget, setSelectedBudget] = useState(hasDraft ? draft.selectedBudget : "");
  const [selectedInspiration, setSelectedInspiration] = useState<string[]>(
    hasDraft ? draft.selectedInspiration : [],
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(() => {
    if (basketPrefill?.length) {
      return basketPrefill.filter((i) => i.type === "service").map((i) => i.name);
    }
    return hasDraft ? draft.selectedServices : [];
  });
  const [adults, setAdults] = useState(hasDraft ? draft.adults : 2);
  const [children, setChildren] = useState(hasDraft ? draft.children : 0);
  const [specificPlace] = useState<string>(() => {
    if (basketPrefill?.length) {
      const pkgs = basketPrefill.filter((i) => i.type === "package").map((i) => i.name);
      return pkgs.join(", ");
    }
    return "";
  });

  const [travelDates, setTravelDates] = useState<DateRange | undefined>(() => {
    if (basketPrefill?.length) {
      const itemWithDates = basketPrefill.find((i) => i.dateFrom);
      if (itemWithDates?.dateFrom) {
        return {
          from: new Date(itemWithDates.dateFrom),
          to: itemWithDates.dateTo ? new Date(itemWithDates.dateTo) : undefined,
        };
      }
    }
    return undefined;
  });
  const [offerCode, setOfferCode] = useState("");
  const [customDestInput, setCustomDestInput] = useState("");
  const [customDestinations, setCustomDestinations] = useState<string[]>([]);
  const [customServiceInput, setCustomServiceInput] = useState("");

  // ── Package customization state ──────────────────────────────────────────────
  type PkgCustomization = {
    keptDestSlugs: string[];
    keptServiceIds: number[];
    keptOfferIds: number[];
  };
  const [pkgCustomizations, setPkgCustomizations] = useState<Record<string, PkgCustomization>>({});
  const hasPackagesInBasket = !!basketPrefill?.some((i) => i.type === "package");

  // Fetch services from DB for "What would you like help with?"
  const { data: dbServices } = useQuery({ queryKey: ["services"], queryFn: api.services });
  const { data: allPackages = [] } = useQuery<ApiPackage[]>({
    queryKey: ["packages"],
    queryFn: api.packages,
    enabled: hasPackagesInBasket,
  });
  const { data: allOffers = [] } = useQuery<ApiOffer[]>({
    queryKey: ["offers"],
    queryFn: api.offers,
    enabled: hasPackagesInBasket,
  });
  const { data: allDestinations = [] } = useQuery<ApiDestination[]>({
    queryKey: ["destinations"],
    queryFn: api.destinations,
    enabled: hasPackagesInBasket,
  });

  // Initialise per-package customizations once package data loads
  useEffect(() => {
    if (!basketPrefill || !allPackages.length) return;
    setPkgCustomizations((prev) => {
      const next = { ...prev };
      for (const item of basketPrefill) {
        if (item.type !== "package" || next[item.slug]) continue;
        const pkg = allPackages.find((p) => p.slug === item.slug);
        if (!pkg) continue;
        next[item.slug] = {
          keptDestSlugs: pkg.destination_slugs ?? [],
          keptServiceIds: pkg.service_ids ?? [],
          keptOfferIds: pkg.offer_ids ?? [],
        };
      }
      return next;
    });
  }, [allPackages]); // eslint-disable-line react-hooks/exhaustive-deps

  const basketDatePrefilled = !!(basketPrefill?.find((i) => i.dateFrom));

  // Clear hero search after it's been consumed on first render
  useEffect(() => {
    if (heroSearch) clearHeroSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave draft whenever any field changes
  useEffect(() => {
    saveDraft({
      step,
      selectedDestinations,
      selectedExperiences,
      selectedStyles,
      selectedBudget,
      selectedInspiration,
      selectedServices,
      adults,
      children,
    });
  }, [
    step,
    selectedDestinations,
    selectedExperiences,
    selectedStyles,
    selectedBudget,
    selectedInspiration,
    selectedServices,
    adults,
    children,
    saveDraft,
  ]);

  const steps = [
    { title: "Your trip", label: "Destinations, packages & services" },
    { title: "Preferences", label: "Experiences, style & occasion" },
    { title: "Logistics", label: "Timing and budget" },
    { title: "Inspiration", label: "What sparked the idea?" },
    { title: "Contact", label: "How should we reach you?" },
  ];

  const toggle = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  if (submitted) {
    return <SubmittedState summary={submittedSummary} />;
  }

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f6f1ea_0%,#fbf8f3_42%,#eee6dc_100%)]">
        {/* Basket prefill banner */}
        {showBasketBanner && basketPrefill && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-[#c76b2f] px-5 py-3 text-white shadow-xl">
            <span className="text-sm font-semibold">
              ✦ {basketPrefill.length} item{basketPrefill.length !== 1 ? "s" : ""} pre-filled from your package
            </span>
            <button
              onClick={() => setShowBasketBanner(false)}
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
            >
              Got it ✓
            </button>
          </div>
        )}

        {/* Draft restore banner */}
        {showDraftBanner && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-[#0e1726] px-5 py-3 text-white shadow-xl">
            <span className="text-sm font-semibold">
              ✦ Draft restored — continue where you left off
            </span>
            <button
              onClick={() => {
                resetDraft();
                setShowDraftBanner(false);
                setStep(0);
                setDraftRestored(true);
              }}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20"
            >
              Start fresh
            </button>
            <button
              onClick={() => setShowDraftBanner(false)}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20"
            >
              Got it ✓
            </button>
          </div>
        )}
        <section className="section-shell pb-8 pt-20 md:pt-28">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div className="max-w-3xl">
              <span className="eyebrow mb-6">Private travel design</span>
              <h1 className="display-title mb-6 text-5xl md:text-7xl">
                Plan a journey designed around you.
              </h1>
              <p className="body-copy text-lg">
                Tell us what kind of moments you want to experience. We will craft the itinerary
                around places, pace, people, and feeling.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Hidden beaches",
                  "Local food",
                  "Adventure",
                  "Wellness",
                  "Culture",
                  "Luxury stays",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-border bg-white/54 px-4 py-2 text-sm font-semibold text-foreground/76"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-3xl border border-border bg-white/48 p-5 shadow-[var(--shadow-soft)] sm:grid-cols-3">
              <Proof value="4.9" label="Planning rating" icon={Star} />
              <Proof value="2,300+" label="Journeys created" icon={CheckCircle2} />
              <Proof value="24h" label="Planner response" icon={ShieldCheck} />
            </div>
          </div>
        </section>

        <section className="section-shell pb-20 md:pb-28">
          <div className="grid gap-7 lg:grid-cols-[300px_1fr]">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl border border-border bg-white/52 p-5 shadow-sm">
                <div className="mb-5 text-sm font-semibold text-muted-foreground">
                  Step {step + 1} of {steps.length}
                </div>
                <div className="mb-6 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  />
                </div>
                <div className="grid gap-2">
                  {steps.map((item, index) => (
                    <button
                      key={item.title}
                      onClick={() => setStep(index)}
                      className={`rounded-2xl px-4 py-3 text-left transition-all focus-ring ${
                        step === index
                          ? "bg-[#0e1726] text-white"
                          : "text-foreground/68 hover:bg-white"
                      }`}
                    >
                      <div className="text-sm font-bold">{item.title}</div>
                      <div
                        className={`text-xs ${step === index ? "text-white/58" : "text-muted-foreground"}`}
                      >
                        {item.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitError(null);
                setIsSubmitting(true);
                const data = new FormData(event.currentTarget);
                try {
                  await api.createInquiry({
                    full_name: String(data.get("full_name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    phone: String(data.get("phone") ?? ""),
                    whatsapp: String(data.get("whatsapp") ?? ""),
                    preferred_contact: String(data.get("preferred_contact") ?? ""),
                    destinations: selectedDestinations,
                    specific_place: String(data.get("specific_place") ?? ""),
                    experiences: selectedExperiences,
                    travel_styles: selectedStyles,
                    services: selectedServices,
                    preferred_dates: formatDateRange(travelDates),
                    date_from: travelDates?.from?.toISOString() ?? "",
                    date_to: travelDates?.to?.toISOString() ?? "",
                    adults,
                    children,
                    budget: selectedBudget,
                    passport_notes: String(data.get("passport_notes") ?? ""),
                    occasion: String(data.get("occasion") ?? ""),
                    inspiration: selectedInspiration,
                    inspiration_links: String(data.get("inspiration_links") ?? ""),
                    trip_feel: String(data.get("trip_feel") ?? ""),
                    basket_items: [
                      ...(basketPrefill?.filter((i) => i.type !== "package").map((i) => `${i.type}: ${i.name}`) ?? []),
                      ...(basketPrefill?.filter((i) => i.type === "package").map((i) => {
                        const custom = pkgCustomizations[i.slug];
                        const pkg = allPackages.find((p) => p.slug === i.slug);
                        if (!custom || !pkg) return `package: ${i.name}`;
                        const destNames = custom.keptDestSlugs
                          .map((s) => allDestinations.find((d) => d.slug === s)?.name ?? s)
                          .join(", ");
                        const svcNames = custom.keptServiceIds
                          .map((id) => (dbServices as ApiService[] | undefined)?.find((s) => s.id === String(id))?.name ?? String(id))
                          .join(", ");
                        const offerNames = custom.keptOfferIds
                          .map((id) => allOffers.find((o) => o.id === id)?.title ?? String(id))
                          .join(", ");
                        const removedDests = (pkg.destination_slugs ?? [])
                          .filter((s) => !custom.keptDestSlugs.includes(s))
                          .map((s) => allDestinations.find((d) => d.slug === s)?.name ?? s)
                          .join(", ");
                        const removedSvcs = (pkg.service_ids ?? [])
                          .filter((id) => !custom.keptServiceIds.includes(id))
                          .map((id) => (dbServices as ApiService[] | undefined)?.find((s) => s.id === String(id))?.name ?? String(id))
                          .join(", ");
                        const removedOffers = (pkg.offer_ids ?? [])
                          .filter((id) => !custom.keptOfferIds.includes(id))
                          .map((id) => allOffers.find((o) => o.id === id)?.title ?? String(id))
                          .join(", ");
                        return JSON.stringify({
                          type: "package",
                          slug: i.slug,
                          name: i.name,
                          kept: {
                            destinations: destNames || "all",
                            services: svcNames || "all",
                            offers: offerNames || "all",
                          },
                          removed: {
                            destinations: removedDests || "none",
                            services: removedSvcs || "none",
                            offers: removedOffers || "none",
                          },
                        });
                      }) ?? []),
                      ...(offerCode ? [`offer_code: ${offerCode}`] : []),
                    ],
                  });
                  // Capture snapshot before clearing draft
                  setSubmittedSummary({
                    destinations: selectedDestinations,
                    experiences: selectedExperiences,
                    adults,
                    children,
                    budget: selectedBudget,
                    styles: selectedStyles,
                  });
                  clearInquiryDraft(); // wipe draft after successful submit
                  setSubmitted(true);
                } catch (error) {
                  setSubmitError(
                    error instanceof Error
                      ? error.message
                      : "We could not submit your journey brief.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-3xl border border-border bg-[#fbf8f3] p-5 shadow-[var(--shadow-soft)] md:p-8"
            >
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              >
                {step === 0 && (
                  <StepSection
                    eyebrow="Your trip"
                    title="What are you planning?"
                    description="Select destinations, review your basket items, or apply an offer code."
                  >
                    {/* Basket items: packages with customizer, others read-only */}
                    {basketPrefill && basketPrefill.length > 0 && (() => {
                      const packages = basketPrefill.filter((i) => i.type === "package");
                      const otherItems = basketPrefill.filter((i) => i.type !== "package");
                      return (
                        <div className="space-y-4">
                          {/* Per-package customizer */}
                          {packages.map((item) => {
                            const pkg = allPackages.find((p) => p.slug === item.slug);
                            const custom = pkgCustomizations[item.slug];
                            return (
                              <PackageCustomizerCard
                                key={item.slug}
                                item={item}
                                pkg={pkg}
                                custom={custom}
                                allDestinations={allDestinations}
                                allServices={dbServices ?? []}
                                allOffers={allOffers}
                                onChange={(updated) =>
                                  setPkgCustomizations((prev) => ({ ...prev, [item.slug]: updated }))
                                }
                              />
                            );
                          })}
                          {/* Other basket items (destinations, services, offers added individually) */}
                          {otherItems.length > 0 && (
                            <div className="rounded-2xl border border-[#c76b2f]/30 bg-[#fdf5ec] p-4 space-y-3">
                              <p className="text-xs font-black uppercase tracking-widest text-[#c76b2f]">Also in your basket</p>
                              {otherItems.map((it) => (
                                <div key={`${it.type}-${it.slug}`} className="flex items-start gap-3">
                                  {it.image && (
                                    <img src={it.image} alt={it.name} className="size-10 shrink-0 rounded-xl object-cover" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold leading-tight text-foreground">{it.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{it.type}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Offer code */}
                    <div className="rounded-2xl border border-border bg-white/56 p-4">
                      <p className="mb-3 text-sm font-bold">Apply an offer or promo code</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={offerCode}
                          onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                          placeholder="e.g. SUMMER25"
                          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-accent"
                        />
                        {offerCode && (
                          <button type="button" onClick={() => setOfferCode("")} className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-foreground/30">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Destination selection */}
                    <div>
                      <p className="mb-3 text-base font-semibold">Where are you thinking?</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {dynamicDestinations.map((destination) => (
                          <ChoiceCard
                            key={destination.name}
                            active={selectedDestinations.includes(destination.name)}
                            title={destination.name}
                            description={destination.detail}
                            icon={MapPin}
                            onClick={() =>
                              toggle(destination.name, selectedDestinations, setSelectedDestinations)
                            }
                          />
                        ))}
                      </div>
                      {/* Custom / non-existing destination */}
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={customDestInput}
                          onChange={(e) => setCustomDestInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && customDestInput.trim()) {
                              e.preventDefault();
                              const val = customDestInput.trim();
                              if (!selectedDestinations.includes(val)) {
                                setSelectedDestinations((prev) => [...prev, val]);
                                setCustomDestinations((prev) => [...prev, val]);
                              }
                              setCustomDestInput("");
                            }
                          }}
                          placeholder="Add another destination…"
                          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customDestInput.trim()) {
                              const val = customDestInput.trim();
                              if (!selectedDestinations.includes(val)) {
                                setSelectedDestinations((prev) => [...prev, val]);
                                setCustomDestinations((prev) => [...prev, val]);
                              }
                              setCustomDestInput("");
                            }
                          }}
                          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold hover:bg-secondary"
                        >
                          Add
                        </button>
                      </div>
                      {customDestinations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {customDestinations.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#0e1726] px-3 py-1 text-xs font-bold text-white"
                            >
                              {d}
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomDestinations((prev) => prev.filter((x) => x !== d));
                                  setSelectedDestinations((prev) => prev.filter((x) => x !== d));
                                }}
                                className="opacity-70 hover:opacity-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <FloatingField
                      name="specific_place"
                      label="Specific place or package in mind"
                      placeholder="Kyoto, Amalfi, Patagonia..."
                      defaultValue={specificPlace}
                    />
                  </StepSection>
                )}

                {step === 1 && (
                  <StepSection
                    eyebrow="Your preferences"
                    title="How should your journey feel?"
                    description="Tell us about experiences, travel style, and any special occasion."
                  >
                    <div>
                      <div className="mb-3 text-base font-semibold">Moments that matter to you</div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {experienceOptions.map((experience) => (
                          <ChoiceCard
                            key={experience.id}
                            active={selectedExperiences.includes(experience.id)}
                            title={experience.label}
                            icon={experience.icon}
                            onClick={() =>
                              toggle(experience.id, selectedExperiences, setSelectedExperiences)
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-base font-semibold">Travel style</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {dynamicTravelStyles.map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => toggle(style, selectedStyles, setSelectedStyles)}
                            className={`rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-all focus-ring ${
                              selectedStyles.includes(style)
                                ? "border-[#0e1726] bg-[#0e1726] text-white"
                                : "border-border bg-white/56 hover:border-foreground/28"
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <FloatingField
                      name="occasion"
                      label="Celebration or special occasion"
                      placeholder="Honeymoon, anniversary, birthday retreat..."
                    />

                    <div>
                      <div className="mb-3 text-base font-semibold">What would you like help with?</div>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {selectedServices.length > 0
                          ? `${selectedServices.length} service${selectedServices.length !== 1 ? "s" : ""} pre-selected — add or remove below.`
                          : "Select the services you need for your trip. You can also type a custom service."}
                      </p>
                      <GroupedServices
                        selectedServices={selectedServices}
                        onToggle={(service) => toggle(service, selectedServices, setSelectedServices)}
                        dbServices={dbServices}
                        customServiceInput={customServiceInput}
                        onCustomServiceInputChange={setCustomServiceInput}
                        onAddCustomService={(s) => {
                          if (!selectedServices.includes(s)) {
                            setSelectedServices((prev) => [...prev, s]);
                          }
                          setCustomServiceInput("");
                        }}
                      />
                    </div>
                  </StepSection>
                )}

                {step === 2 && (
                  <StepSection
                    eyebrow="Logistics"
                    title="Timing, budget, and travelers."
                    description="Keep it approximate. A planner will refine the route and pricing with you."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-base font-semibold">Preferred travel dates</div>
                        {basketDatePrefilled && travelDates && (
                          <p className="mb-2 text-xs text-[#c76b2f] font-semibold">
                            ✦ Pre-filled from your package — change freely
                          </p>
                        )}
                        <DateRangePicker
                          value={travelDates}
                          onChange={setTravelDates}
                        />
                      </div>
                      <FloatingField
                        name="preferred_contact"
                        label="Preferred contact method"
                        placeholder="WhatsApp, email, phone"
                        icon={MessageCircle}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Stepper label="Adults" value={adults} onChange={setAdults} min={1} />
                      <Stepper label="Children" value={children} onChange={setChildren} min={0} />
                    </div>
                    <div>
                      <div className="mb-3 text-base font-semibold">Budget range</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {dynamicBudgetRanges.map((budget) => (
                          <button
                            key={budget}
                            type="button"
                            onClick={() => setSelectedBudget(budget)}
                            className={`rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-all focus-ring ${
                              selectedBudget === budget
                                ? "border-[#0e1726] bg-[#0e1726] text-white"
                                : "border-border bg-white/56 hover:border-foreground/28"
                            }`}
                          >
                            {budget}
                          </button>
                        ))}
                      </div>
                    </div>
                    <FloatingField
                      name="passport_notes"
                      label="Passport or visa notes"
                      placeholder="Valid, expiring soon, need help..."
                    />
                  </StepSection>
                )}

                {step === 3 && (
                  <StepSection
                    eyebrow="Inspired by"
                    title="Which shared moments should shape your itinerary?"
                    description="Select moments you liked, then add links or notes from anywhere."
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      {inspirationMoments.map((moment) => (
                        <button
                          key={moment}
                          type="button"
                          onClick={() =>
                            toggle(moment, selectedInspiration, setSelectedInspiration)
                          }
                          className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all focus-ring ${
                            selectedInspiration.includes(moment)
                              ? "border-[#0e1726] bg-[#0e1726] text-white"
                              : "border-border bg-white/56 hover:border-foreground/28"
                          }`}
                        >
                          <span className="font-semibold">{moment}</span>
                          <Check className="size-4" />
                        </button>
                      ))}
                    </div>
                    <FloatingField
                      name="inspiration_links"
                      label="Paste inspiration links"
                      placeholder="Instagram, TikTok, hotel, restaurant, video..."
                    />
                    <label className="block">
                      <span className="mb-2 block text-base font-semibold">
                        Tell us what this trip should feel like
                      </span>
                      <textarea
                        name="trip_feel"
                        rows={5}
                        placeholder="A dream moment, favorite destination, pace, food, celebrations, accessibility needs, or anything you want us to protect."
                        className="w-full rounded-2xl border border-border bg-white/58 px-5 py-4 text-base leading-7 outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
                      />
                    </label>
                  </StepSection>
                )}

                {step === 4 && (
                  <StepSection
                    eyebrow="Contact details"
                    title="Where should your travel designer send ideas?"
                    description="No payment and no commitment. Just a careful first response within 24 hours."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <FloatingField name="full_name" label="Full name" required />
                      <FloatingField name="email" label="Email" type="email" required icon={Mail} />
                      <FloatingField name="phone" label="Phone" type="tel" />
                      <FloatingField
                        name="whatsapp"
                        label="WhatsApp number"
                        type="tel"
                        icon={MessageCircle}
                      />
                    </div>
                    {submitError && (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        <p className="font-bold mb-1">Please check the following:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {submitError.split("; ").map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-2xl border border-border bg-white/54 p-5">
                      <div className="mb-4 grid gap-3 text-sm font-semibold text-foreground/72 sm:grid-cols-3">
                        <span className="inline-flex items-center gap-2">
                          <Star className="size-4 fill-[#d7aa73] text-[#d7aa73]" /> 4.9 average
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Users className="size-4 text-accent" /> 2,300+ journeys
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="size-4 text-accent" /> Response within 24h
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0e1726] px-8 text-sm font-bold text-white shadow-[0_16px_42px_rgba(14,23,38,0.18)] transition-all hover:-translate-y-0.5 hover:bg-accent focus-ring sm:w-auto"
                      >
                        {isSubmitting ? "Sending..." : "Create My Itinerary"}{" "}
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </StepSection>
                )}
              </motion.div>

              <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                  className="min-h-12 rounded-full border border-border px-6 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0e1726] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-accent focus-ring"
                  >
                    Continue <ArrowRight className="size-4" />
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function SubmittedState({
  summary,
}: {
  summary: {
    destinations: string[];
    experiences: string[];
    adults: number;
    children: number;
    budget: string;
    styles: string[];
  } | null;
}) {
  const [copied, setCopied] = useState(false);

  function handleDownloadPdf() {
    if (!summary) return;
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const travelers = `${summary.adults} adult${summary.adults !== 1 ? "s" : ""}${summary.children > 0 ? ` + ${summary.children} child${summary.children !== 1 ? "ren" : ""}` : ""}`;

    function badge(text: string) {
      return `<span style="display:inline-block;background:#c76b2f;color:#fff;font-size:11px;font-weight:700;letter-spacing:.05em;padding:3px 12px;border-radius:99px;margin:3px 4px 3px 0">${text}</span>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>JourneyMakers — Your Journey Brief</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#faf6ef;color:#1a1410;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:720px;margin:0 auto;padding:48px 40px;background:#fff;min-height:100vh}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1a1410;padding-bottom:24px;margin-bottom:36px}
  .logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;letter-spacing:-.5px;color:#1a1410}
  .logo span{color:#c76b2f}
  .doc-type{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#888;text-align:right}
  .doc-type strong{display:block;font-size:13px;color:#1a1410;letter-spacing:0;text-transform:none;margin-top:2px}
  .hero{background:linear-gradient(135deg,#1a1410 0%,#2d2016 100%);color:#fff;border-radius:16px;padding:36px 32px;margin-bottom:32px}
  .hero-eyebrow{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#c76b2f;margin-bottom:10px}
  .hero-title{font-family:'Playfair Display',serif;font-size:32px;line-height:1.2;font-weight:700;margin-bottom:8px}
  .hero-subtitle{font-size:14px;color:#c9b99a;line-height:1.6}
  .section{margin-bottom:28px}
  .section-label{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c76b2f;margin-bottom:10px}
  .section-title{font-size:15px;font-weight:600;margin-bottom:8px;color:#1a1410}
  .chips{line-height:2}
  .divider{border:none;border-top:1px solid #ede8e0;margin:24px 0}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .stat-box{background:#faf6ef;border-radius:12px;padding:18px 20px}
  .stat-value{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#1a1410}
  .stat-label{font-size:12px;color:#888;margin-top:3px;font-weight:500}
  .footer{margin-top:48px;padding-top:20px;border-top:1px solid #ede8e0;display:flex;justify-content:space-between;align-items:center}
  .footer-brand{font-family:'Playfair Display',serif;font-size:14px;font-weight:700}
  .footer-info{font-size:11px;color:#888;text-align:right}
  .promise-box{background:#f0ebe3;border-radius:12px;padding:20px 24px;margin:28px 0}
  .promise-box p{font-size:13px;color:#5a4a3a;line-height:1.65}
  .promise-box strong{color:#1a1410}
  @media print{body{background:#fff}.page{padding:32px}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="logo">Journey<span>Makers</span></div>
    <div class="doc-type">Journey Brief<strong>${today}</strong></div>
  </div>

  <div class="hero">
    <div class="hero-eyebrow">Private Travel Design</div>
    <div class="hero-title">Your journey, designed<br>around your moments.</div>
    <div class="hero-subtitle">This brief captures your vision. A dedicated travel designer will reach out within 24 hours with curated ideas, route options, and pricing.</div>
  </div>

  ${summary.destinations.length > 0 ? `
  <div class="section">
    <div class="section-label">Destinations</div>
    <div class="chips">${summary.destinations.map(badge).join("")}</div>
  </div><hr class="divider">` : ""}

  ${summary.experiences.length > 0 ? `
  <div class="section">
    <div class="section-label">Experiences Sought</div>
    <div class="chips">${summary.experiences.map(badge).join("")}</div>
  </div><hr class="divider">` : ""}

  ${summary.styles.length > 0 ? `
  <div class="section">
    <div class="section-label">Travel Style</div>
    <div class="chips">${summary.styles.map((s) => `<span style="display:inline-block;background:#f0ebe3;color:#1a1410;font-size:11px;font-weight:600;padding:3px 12px;border-radius:99px;margin:3px 4px 3px 0;border:1px solid #ddd6cc">${s}</span>`).join("")}</div>
  </div><hr class="divider">` : ""}

  <div class="grid2">
    <div class="stat-box">
      <div class="stat-value">${travelers}</div>
      <div class="stat-label">Travelers</div>
    </div>
    ${summary.budget ? `<div class="stat-box">
      <div class="stat-value">${summary.budget}</div>
      <div class="stat-label">Budget Range</div>
    </div>` : ""}
  </div>

  <div class="promise-box">
    <p><strong>What happens next:</strong> Your brief has been received by our planning team. A travel designer will reach out within 24 hours with first ideas, destination questions, and curated route options — crafted around the moments you described.</p>
  </div>

  <div class="footer">
    <div class="footer-brand">JourneyMakers</div>
    <div class="footer-info">journeymakers.travel<br>hello@journeymakers.travel</div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  async function handleShareLink() {
    const ref = `INQ-${Math.floor(Math.random() * 9000) + 1000}`;
    const url = `https://journeymakers.travel/booking?ref=${ref}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: show prompt
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[linear-gradient(180deg,#f6f1ea,#eee6dc)]">
        <section className="section-shell py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-2xl rounded-3xl border border-border bg-[#fbf8f3] p-10 text-center shadow-[var(--shadow-soft)] md:p-14"
          >
            <CheckCircle2 className="mx-auto mb-6 size-16 text-accent" />
            <h1 className="display-title mb-4 text-4xl">Your journey brief is with us.</h1>
            <p className="mb-8 text-base leading-8 text-muted-foreground">
              A travel designer will respond within 24 hours with first ideas, route questions, and
              the moments we think belong in your itinerary.
            </p>

            {/* Summary card */}
            {summary && (
              <div className="mb-8 rounded-2xl border border-border bg-white/60 p-5 text-left text-sm">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-accent">
                  Your brief summary
                </p>
                <div className="grid gap-2">
                  {summary.destinations.length > 0 && (
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 font-semibold text-muted-foreground">
                        Destinations
                      </span>
                      <span className="font-bold">{summary.destinations.join(", ")}</span>
                    </div>
                  )}
                  {summary.styles.length > 0 && (
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 font-semibold text-muted-foreground">
                        Style
                      </span>
                      <span className="font-bold">{summary.styles.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="w-28 shrink-0 font-semibold text-muted-foreground">
                      Travelers
                    </span>
                    <span className="font-bold">
                      {summary.adults} adult{summary.adults !== 1 ? "s" : ""}
                      {summary.children > 0
                        ? `, ${summary.children} child${summary.children !== 1 ? "ren" : ""}`
                        : ""}
                    </span>
                  </div>
                  {summary.budget && (
                    <div className="flex gap-2">
                      <span className="w-28 shrink-0 font-semibold text-muted-foreground">
                        Budget
                      </span>
                      <span className="font-bold">{summary.budget}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="https://wa.me/15551234567"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
              >
                <MessageCircle className="size-4" /> Continue on WhatsApp
              </a>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-[#f7f2ea]"
              >
                <ArrowRight className="size-4 rotate-90" /> Download Brochure
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleShareLink();
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:bg-[#f7f2ea]"
              >
                {copied ? "✓ Copied!" : "Share link"}
              </button>
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function Proof({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-[#fbf8f3] p-4">
      <Icon className="mb-4 size-5 text-accent" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function StepSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <span className="eyebrow mb-4">{eyebrow}</span>
      <h2 className="display-title mb-4 text-4xl md:text-5xl">{title}</h2>
      <p className="body-copy mb-8">{description}</p>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all focus-ring ${
        active
          ? "border-[#0e1726] bg-[#0e1726] text-white shadow-[0_14px_36px_rgba(14,23,38,0.16)]"
          : "border-border bg-white/58 hover:-translate-y-0.5 hover:border-foreground/28"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <Icon className={`size-5 ${active ? "text-[#d7aa73]" : "text-accent"}`} />
        {active && <Check className="size-4" />}
      </div>
      <div className="text-lg font-semibold">{title}</div>
      {description && (
        <p
          className={`mt-2 text-sm leading-6 ${active ? "text-white/66" : "text-muted-foreground"}`}
        >
          {description}
        </p>
      )}
    </button>
  );
}

function FloatingField({
  name,
  label,
  placeholder,
  type = "text",
  required,
  icon: Icon,
  defaultValue,
}: {
  name?: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-accent" />}
        <input
          name={name ?? label.toLowerCase().replaceAll(" ", "_")}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`min-h-14 w-full rounded-2xl border border-border bg-white/58 px-5 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-accent ${
            Icon ? "pl-11" : ""
          }`}
        />
      </div>
    </label>
  );
}

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between rounded-2xl border border-border bg-white/58 px-5">
      <span className="text-base font-semibold">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid size-10 place-items-center rounded-full border border-border bg-white"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center text-lg font-bold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="grid size-10 place-items-center rounded-full border border-border bg-white"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function GroupedServices({
  selectedServices,
  onToggle,
  dbServices,
  customServiceInput,
  onCustomServiceInputChange,
  onAddCustomService,
}: {
  selectedServices: string[];
  onToggle: (service: string) => void;
  dbServices?: ApiService[];
  customServiceInput: string;
  onCustomServiceInputChange: (v: string) => void;
  onAddCustomService: (v: string) => void;
}) {
  // Group DB services by category; fall back to hardcoded if none loaded
  const groups: { title: string; items: string[] }[] = dbServices && dbServices.length > 0
    ? (() => {
        const map = new Map<string, string[]>();
        for (const svc of dbServices.filter((s) => (s.status ?? "published") === "published")) {
          const cat = svc.category || "Other";
          if (!map.has(cat)) map.set(cat, []);
          map.get(cat)!.push(svc.name);
        }
        return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
      })()
    : serviceGroups;

  const icons = [Sparkles, Plane, Wine, Star, Hotel, Mountain];

  return (
    <div className="rounded-3xl border border-border bg-white/46 p-5">
      <p className="mb-5 text-sm leading-6 text-muted-foreground">
        Choose the support you want. Your planner can adjust this later.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group, index) => {
          const Icon = icons[index % icons.length] ?? Sparkles;
          return (
            <div key={group.title} className="rounded-2xl border border-border bg-[#fbf8f3] p-4">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Icon className="size-4 text-accent" /> {group.title}
              </div>
              <div className="grid gap-2">
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onToggle(item)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all focus-ring ${
                      selectedServices.includes(item)
                        ? "border-[#0e1726] bg-[#0e1726] text-white"
                        : "border-border bg-white/58 hover:border-foreground/28"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Custom / non-existing service */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={customServiceInput}
          onChange={(e) => onCustomServiceInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customServiceInput.trim()) {
              e.preventDefault();
              onAddCustomService(customServiceInput.trim());
            }
          }}
          placeholder="Add a service not listed above…"
          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => customServiceInput.trim() && onAddCustomService(customServiceInput.trim())}
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold hover:bg-secondary"
        >
          Add
        </button>
      </div>
      {/* Show any custom-added services that aren't in the groups */}
      {(() => {
        const allGroupItems = new Set(groups.flatMap((g) => g.items));
        const custom = selectedServices.filter((s) => !allGroupItems.has(s));
        if (custom.length === 0) return null;
        return (
          <div className="mt-3 flex flex-wrap gap-2">
            {custom.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0e1726] px-3 py-1 text-xs font-bold text-white"
              >
                {s}
                <button
                  type="button"
                  onClick={() => onToggle(s)}
                  className="opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Package customizer card ────────────────────────────────────────────────────

type PkgCustomization = {
  keptDestSlugs: string[];
  keptServiceIds: number[];
  keptOfferIds: number[];
};

function PackageCustomizerCard({
  item,
  pkg,
  custom,
  allDestinations,
  allServices,
  allOffers,
  onChange,
}: {
  item: BasketItem;
  pkg: ApiPackage | undefined;
  custom: PkgCustomization | undefined;
  allDestinations: ApiDestination[];
  allServices: ApiService[];
  allOffers: ApiOffer[];
  onChange: (updated: PkgCustomization) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const hasLinkedItems =
    pkg && ((pkg.destination_slugs?.length ?? 0) > 0 || (pkg.service_ids?.length ?? 0) > 0 || (pkg.offer_ids?.length ?? 0) > 0);

  function toggleDest(slug: string) {
    if (!custom) return;
    const next = custom.keptDestSlugs.includes(slug)
      ? custom.keptDestSlugs.filter((s) => s !== slug)
      : [...custom.keptDestSlugs, slug];
    onChange({ ...custom, keptDestSlugs: next });
  }

  function toggleSvc(id: number) {
    if (!custom) return;
    const next = custom.keptServiceIds.includes(id)
      ? custom.keptServiceIds.filter((i) => i !== id)
      : [...custom.keptServiceIds, id];
    onChange({ ...custom, keptServiceIds: next });
  }

  function toggleOffer(id: number) {
    if (!custom) return;
    const next = custom.keptOfferIds.includes(id)
      ? custom.keptOfferIds.filter((i) => i !== id)
      : [...custom.keptOfferIds, id];
    onChange({ ...custom, keptOfferIds: next });
  }

  const removedCount = custom && pkg
    ? (pkg.destination_slugs ?? []).filter((s) => !custom.keptDestSlugs.includes(s)).length +
      (pkg.service_ids ?? []).filter((id) => !custom.keptServiceIds.includes(id)).length +
      (pkg.offer_ids ?? []).filter((id) => !custom.keptOfferIds.includes(id)).length
    : 0;

  return (
    <div className="rounded-2xl border border-[#c76b2f]/30 bg-[#fdf5ec] overflow-hidden">
      {/* Package header */}
      <div className="flex items-center gap-3 p-4">
        {item.image && (
          <img src={item.image} alt={item.name} className="size-12 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-[#c76b2f]">Package</p>
          <p className="text-sm font-bold leading-tight text-foreground">{item.name}</p>
          {item.days && (
            <p className="text-xs text-muted-foreground">
              {item.days} days{item.location ? ` · ${item.location}` : ""}
              {removedCount > 0 && (
                <span className="ml-2 text-[#c76b2f]">· {removedCount} item{removedCount !== 1 ? "s" : ""} removed</span>
              )}
            </p>
          )}
        </div>
        {hasLinkedItems && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full border border-[#c76b2f]/40 px-3 py-1 text-xs font-bold text-[#c76b2f] hover:bg-[#c76b2f]/10"
          >
            {expanded ? "Collapse" : "Customise"}
          </button>
        )}
      </div>

      {/* Customization checkboxes */}
      {expanded && hasLinkedItems && custom && (
        <div className="border-t border-[#c76b2f]/20 px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs font-semibold text-[#59606a]">
            Uncheck anything you don't want included in your inquiry.
          </p>

          {/* Destinations */}
          {(pkg!.destination_slugs ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#c76b2f]">Destinations</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {pkg!.destination_slugs!.map((slug) => {
                  const dest = allDestinations.find((d) => d.slug === slug);
                  const kept = custom.keptDestSlugs.includes(slug);
                  return (
                    <label key={slug} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${kept ? "border-[#c76b2f]/40 bg-white" : "border-border bg-white/40 opacity-60"}`}>
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={() => toggleDest(slug)}
                        className="accent-[#c76b2f]"
                      />
                      <span className="font-medium">{dest?.name ?? slug}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services */}
          {(pkg!.service_ids ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#c76b2f]">Services</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {pkg!.service_ids!.map((id) => {
                  const svc = allServices.find((s) => s.id === String(id));
                  const kept = custom.keptServiceIds.includes(id);
                  return (
                    <label key={id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${kept ? "border-[#c76b2f]/40 bg-white" : "border-border bg-white/40 opacity-60"}`}>
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={() => toggleSvc(id)}
                        className="accent-[#c76b2f]"
                      />
                      <span className="font-medium">{svc?.name ?? `Service #${id}`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Offers */}
          {(pkg!.offer_ids ?? []).length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#c76b2f]">Included Offers</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {pkg!.offer_ids!.map((id) => {
                  const offer = allOffers.find((o) => o.id === id);
                  const kept = custom.keptOfferIds.includes(id);
                  return (
                    <label key={id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${kept ? "border-[#c76b2f]/40 bg-white" : "border-border bg-white/40 opacity-60"}`}>
                      <input
                        type="checkbox"
                        checked={kept}
                        onChange={() => toggleOffer(id)}
                        className="accent-[#c76b2f]"
                      />
                      <div className="min-w-0">
                        <span className="font-medium">{offer?.title ?? `Offer #${id}`}</span>
                        {offer?.code && (
                          <span className="ml-1.5 text-[10px] font-mono font-bold text-[#c76b2f]">{offer.code}</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No linked items — just show as info */}
      {!hasLinkedItems && (
        <div className="border-t border-[#c76b2f]/20 px-4 pb-3 pt-2">
          <p className="text-xs text-[#59606a]">This package has no pre-linked destinations, services, or offers — our team will discuss everything with you directly.</p>
        </div>
      )}
    </div>
  );
}
