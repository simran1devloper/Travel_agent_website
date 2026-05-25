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
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { api } from "@/lib/api";
import { useInquiryDraft, clearInquiryDraft } from "@/lib/user-prefs";
import { loadHeroSearch, clearHeroSearch } from "@/lib/search-state";

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

  // ── Hero search prefill — once, on mount ─────────────────────────────────
  const heroSearch = loadHeroSearch();

  const [step, setStep] = useState(hasDraft ? draft.step : 0);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(() => {
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
  const [selectedServices, setSelectedServices] = useState<string[]>(
    hasDraft ? draft.selectedServices : [],
  );
  const [adults, setAdults] = useState(hasDraft ? draft.adults : 2);
  const [children, setChildren] = useState(hasDraft ? draft.children : 0);

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
    { title: "Destination", label: "Where do you want to go?" },
    { title: "Experiences", label: "What moments matter?" },
    { title: "Style", label: "How should it feel?" },
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
                    preferred_dates: String(data.get("preferred_dates") ?? ""),
                    adults,
                    children,
                    budget: selectedBudget,
                    passport_notes: String(data.get("passport_notes") ?? ""),
                    occasion: String(data.get("occasion") ?? ""),
                    inspiration: selectedInspiration,
                    inspiration_links: String(data.get("inspiration_links") ?? ""),
                    trip_feel: String(data.get("trip_feel") ?? ""),
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
                    eyebrow="Dream destination"
                    title="Where should the story begin?"
                    description="Choose a destination, or leave room for a planner to surprise you."
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      {destinationIdeas.map((destination) => (
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
                    <FloatingField
                      name="specific_place"
                      label="Specific place in mind"
                      placeholder="Kyoto, Amalfi, Patagonia..."
                    />
                  </StepSection>
                )}

                {step === 1 && (
                  <StepSection
                    eyebrow="Experiences"
                    title="What kind of moments matter to you?"
                    description="This is the most useful signal for our designers."
                  >
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
                  </StepSection>
                )}

                {step === 2 && (
                  <StepSection
                    eyebrow="Travel style"
                    title="What kind of traveler are you on this trip?"
                    description="Choose more than one if the trip has multiple moods."
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {travelStyles.map((style) => (
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
                    <GroupedServices
                      selectedServices={selectedServices}
                      onToggle={(service) => toggle(service, selectedServices, setSelectedServices)}
                    />
                  </StepSection>
                )}

                {step === 3 && (
                  <StepSection
                    eyebrow="Logistics"
                    title="Timing, budget, and travelers."
                    description="Keep it approximate. A planner will refine the route and pricing with you."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <FloatingField
                        name="preferred_dates"
                        label="Preferred dates"
                        placeholder="Oct 12 - Oct 28"
                        icon={CalendarDays}
                      />
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
                        {budgetRanges.map((budget) => (
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
                    <div className="grid gap-5 md:grid-cols-2">
                      <FloatingField
                        name="passport_notes"
                        label="Passport or visa notes"
                        placeholder="Valid, expiring soon, need help..."
                      />
                      <FloatingField
                        name="occasion"
                        label="Celebration or occasion"
                        placeholder="Honeymoon, birthday, retreat..."
                      />
                    </div>
                  </StepSection>
                )}

                {step === 4 && (
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

                {step === 5 && (
                  <StepSection
                    eyebrow="Contact details"
                    title="Where should your travel designer send ideas?"
                    description="No payment and no commitment. Just a careful first response within 24 hours."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <FloatingField label="Full name" required />
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
    const lines = [
      "JourneyMakers — Journey Brief",
      "================================",
      "",
      `Destinations: ${summary.destinations.join(", ") || "Open to ideas"}`,
      `Experiences: ${summary.experiences.join(", ") || "—"}`,
      `Travel styles: ${summary.styles.join(", ") || "—"}`,
      `Travelers: ${summary.adults} adult${summary.adults !== 1 ? "s" : ""}${summary.children > 0 ? `, ${summary.children} child${summary.children !== 1 ? "ren" : ""}` : ""}`,
      `Budget: ${summary.budget || "—"}`,
      "",
      "A travel designer will respond within 24 hours.",
      "journeymakers.travel",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journeymakers-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
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
                <ArrowRight className="size-4 rotate-90" /> Download brief
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
}: {
  name?: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
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
}: {
  selectedServices: string[];
  onToggle: (service: string) => void;
}) {
  const icons = [Sparkles, Plane, Wine];

  return (
    <div className="rounded-3xl border border-border bg-white/46 p-5">
      <h3 className="mb-2 text-xl font-semibold">What would you like help with?</h3>
      <p className="mb-5 text-sm leading-6 text-muted-foreground">
        Choose the support you want. Your planner can adjust this later.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {serviceGroups.map((group, index) => {
          const Icon = icons[index] ?? Sparkles;
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
    </div>
  );
}
