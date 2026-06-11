import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarCheck,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { MEDIA } from "@/config/media";
import { api } from "@/lib/api";
import { useContent } from "@/lib/use-content";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — JourneyMakers" },
      {
        name: "description",
        content:
          "Start a conversation with a JourneyMakers planner about the places, moods, and moments you want your next journey to hold.",
      },
      { property: "og:title", content: "Contact — JourneyMakers" },
      {
        property: "og:description",
        content: "Tell us the kind of moments you want to experience.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const journeyTypes = ["Food journey", "Nature escape", "City energy", "Wellness reset"];

const contactPaths = [
  {
    icon: MessageCircle,
    title: "Quick questions",
    body: "WhatsApp a planner when the idea is still forming.",
    action: "+1 (555) 123-4567",
  },
  {
    icon: Mail,
    title: "Custom itinerary",
    body: "Share dates, moods, and the memories you want built in.",
    action: "concierge@journeymakers.travel",
  },
  {
    icon: Phone,
    title: "Private consultation",
    body: "Book a focused call for celebrations, groups, or complex routing.",
    action: "Schedule a call",
  },
];

const proof = [
  { value: "4.9", label: "average traveler rating" },
  { value: "2,300+", label: "curated journeys planned" },
  { value: "84", label: "countries explored by planners" },
];

const recentRequests = [
  "Tokyo food journey",
  "Swiss winter escape",
  "Vietnam photography route",
  "Bali wellness anniversary",
];

function ContactPage() {
  const { c } = useContent("contact");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: destinationsData = [] } = useQuery({
    queryKey: ["destinations"],
    queryFn: api.destinations,
  });

  const featured = destinationsData[3] ?? destinationsData[0];
  const moments = destinationsData.slice(0, 3).map((destination) => ({
    destination: destination.name,
    image:
      MEDIA.destinations?.[destination.slug] ??
      destination.image_url ??
      `https://picsum.photos/seed/${destination.slug}/800/600`,
    caption:
      (destination.gallery as Array<{ caption?: string }> | undefined)?.[0]?.caption ??
      destination.tagline ??
      destination.name,
    author:
      (destination.gallery as Array<{ author?: string }> | undefined)?.[0]?.author ??
      "JourneyMakers traveler",
  }));

  const cmsProof = [
    {
      value: c("stats", "stat_1_value", "4.9"),
      label: c("stats", "stat_1_label", "average traveler rating"),
    },
    {
      value: c("stats", "stat_2_value", "2,300+"),
      label: c("stats", "stat_2_label", "curated journeys planned"),
    },
    {
      value: c("stats", "stat_3_value", "84"),
      label: c("stats", "stat_3_label", "countries explored by planners"),
    },
  ];

  const contactCompany = c("contact_card", "company_name", "JourneyMakers");
  const contactAgentName = c("contact_card", "agent_name", "JourneyMakers");
  const contactAgentRole = c("contact_card", "agent_role", "Travel Expert");
  const contactWhatsapp = c(
    "contact_card",
    "whatsapp",
    c("whatsapp", "number", "+1 (555) 123-4567"),
  );
  const contactPhone = c("contact_card", "phone", c("phone_contact", "action", "Schedule a call"));
  const contactEmail = c(
    "contact_card",
    "email",
    c("email_contact", "address", "concierge@journeymakers.travel"),
  );
  const contactResponseText = c(
    "contact_card",
    "response_text",
    "Get itinerary, package details, and pricing in minutes.",
  );
  const contactResponseTime = c("contact_card", "response_time", "Fast response");
  const contactInitials =
    contactAgentName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JM";

  const cmsContactPaths = [
    {
      icon: MessageCircle,
      title: c("whatsapp", "title", "Quick questions"),
      body: c("whatsapp", "body", "WhatsApp a planner when the idea is still forming."),
      action: contactWhatsapp,
    },
    {
      icon: Mail,
      title: c("email_contact", "title", "Custom itinerary"),
      body: c("email_contact", "body", "Share dates, moods, and the memories you want built in."),
      action: contactEmail,
    },
    {
      icon: Phone,
      title: c("phone_contact", "title", "Private consultation"),
      body: c(
        "phone_contact",
        "body",
        "Book a focused call for celebrations, groups, or complex routing.",
      ),
      action: contactPhone,
    },
  ];

  return (
    <>
      <SiteNav />
      <main>
        <section className="relative overflow-hidden bg-[#0e1726] text-white">
          <img
            src={
              featured
                ? (MEDIA.destinations?.[featured.slug] ??
                  featured.image_url ??
                  `https://picsum.photos/seed/${featured.slug}/800/600`)
                : MEDIA.heroPoster
            }
            alt={featured?.name ?? "JourneyMakers"}
            className="absolute inset-0 h-full w-full object-cover opacity-72"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,23,38,0.9),rgba(14,23,38,0.58)_48%,rgba(14,23,38,0.72)),linear-gradient(180deg,rgba(14,23,38,0.12),rgba(14,23,38,0.9))]" />
          <div className="section-shell relative grid gap-10 py-16 md:py-20 lg:grid-cols-[0.96fr_1.04fr] lg:items-end">
            <div>
              <span className="eyebrow mb-5 text-[#d7aa73]">
                {c("hero", "eyebrow", "Start the conversation")}
              </span>
              <h1 className="mb-7 max-w-4xl text-balance text-5xl font-black leading-[1.02] md:text-7xl">
                {c("hero", "title", "Tell us the kind of moments you want to experience.")}
              </h1>
              <p className="max-w-2xl text-lg leading-9 text-white/76">
                {c(
                  "hero",
                  "body",
                  "Every unforgettable journey starts as a feeling. A planner will personally respond within 24 hours and shape the first route around what you want to remember.",
                )}
              </p>

              <div className="mt-9 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
                {cmsProof.map((item) => (
                  <div key={item.label} className="border-l border-white/18 pl-4">
                    <div className="text-3xl font-black">{item.value}</div>
                    <div className="text-sm font-semibold leading-6 text-white/62">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                {moments.slice(0, 2).map((moment) => (
                  <MomentTile key={moment.caption} {...moment} compact />
                ))}
              </div>
              {moments[2] && <MomentTile {...moments[2]} />}
            </div>
          </div>
        </section>

        <section className="section-shell grid gap-10 py-16 md:py-20 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="premium-card rounded-2xl p-6 md:p-7">
              <div className="mb-5 flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-full bg-[#0e1726] text-base font-black text-white">
                  {contactInitials}
                </div>
                <div>
                  <div className="text-lg font-extrabold">{contactAgentName}</div>
                  <div className="text-sm font-semibold text-muted-foreground">
                    {contactAgentRole}
                  </div>
                </div>
              </div>
              <Quote className="mb-4 size-7 text-accent" />
              <p className="mb-5 text-xl font-semibold leading-9 text-foreground">
                "
                {c(
                  "hero",
                  "quote",
                  "We believe the best itineraries are built around memories, not checklists.",
                )}
                "
              </p>
              <div className="flex items-center gap-2 text-sm font-bold text-[#8a6144]">
                <Star className="size-4 fill-[#d7aa73] text-[#d7aa73]" />
                {contactCompany} · {contactResponseTime}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{contactResponseText}</p>
            </div>

            <div className="grid gap-4">
              {cmsContactPaths.map((path) => {
                const Icon = path.icon;
                return (
                  <div
                    key={path.title}
                    className="rounded-2xl border border-border bg-white/45 p-5"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f2e5d6] text-accent">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold">{path.title}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">{path.body}</p>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-foreground">{path.action}</div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="rounded-2xl border border-border bg-[#fbf8f3] p-5 shadow-[var(--shadow-soft)] md:p-8">
            <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end">
              <div>
                <span className="eyebrow mb-3">Journey brief</span>
                <h2 className="text-3xl font-black leading-tight md:text-4xl">
                  Start with the feeling.
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f2e5d6] px-4 py-2 text-sm font-extrabold text-[#7a512f]">
                <Sparkles className="size-4" /> 12 journeys planned this week
              </div>
            </div>

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitError(null);
                setSubmitMessage(null);
                setIsSubmitting(true);
                const data = new FormData(event.currentTarget);
                try {
                  await api.createContact({
                    name: String(data.get("name") ?? ""),
                    contact: String(data.get("contact") ?? ""),
                    destination: String(data.get("destination") ?? ""),
                    message: String(data.get("message") ?? ""),
                    journey_types: data.getAll("journey_types").map(String),
                  });
                  event.currentTarget.reset();
                  setSubmitMessage("Your message is with our planning team.");
                } catch (error) {
                  setSubmitError(
                    error instanceof Error ? error.message : "We could not send your message.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="grid gap-5"
            >
              <div>
                <label className="mb-3 block text-sm font-extrabold text-foreground">
                  What kind of journey are you imagining?
                </label>
                <div className="flex flex-wrap gap-2">
                  {journeyTypes.map((type) => (
                    <label
                      key={type}
                      className="cursor-pointer rounded-full border border-border bg-white/58 px-4 py-2 text-sm font-bold text-muted-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-[#f2e5d6] has-[:checked]:text-foreground"
                    >
                      <input
                        type="checkbox"
                        name="journey_types"
                        value={type}
                        className="sr-only"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field name="name" label="Your name" placeholder="Your name" />
                <Field
                  name="contact"
                  label="Email or WhatsApp"
                  type="text"
                  placeholder="you@example.com"
                />
              </div>
              <Field
                name="destination"
                label="Where are you drawn to?"
                placeholder="Japan, Switzerland, Vietnam..."
              />
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-foreground">
                  Tell us about the journey you are imagining.
                </label>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Places, moods, experiences, celebrations, dream moments..."
                  className="w-full rounded-xl border border-border bg-white/64 px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
                />
              </div>
              {submitMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {submitMessage}
                </div>
              )}
              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {submitError}
                </div>
              )}
              <button
                disabled={isSubmitting}
                className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-extrabold text-background transition-all hover:-translate-y-0.5 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Talk to a Planner"}
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </form>

            <div className="mt-8 rounded-2xl bg-[#0e1726] p-5 text-white">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[#d7aa73]">
                <CalendarCheck className="size-4" /> Recently requested
              </div>
              <div className="flex flex-wrap gap-2">
                {recentRequests.map((request) => (
                  <span
                    key={request}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
                  >
                    {request}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#eee6dc] py-16 md:py-20">
          <div className="section-shell">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <span className="eyebrow mb-4">Recent traveler moments</span>
                <h2 className="display-title text-4xl md:text-5xl">
                  Conversations that became journeys.
                </h2>
              </div>
              <p className="max-w-md text-base leading-8 text-muted-foreground">
                A softer handoff before the footer, carrying the same story-led rhythm into the end
                of the page.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {moments.map((moment) => (
                <article
                  key={`recent-${moment.caption}`}
                  className="overflow-hidden rounded-2xl border border-border bg-[#fbf8f3] shadow-[var(--shadow-soft)]"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={moment.image}
                      alt={moment.caption}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <div className="mb-3 text-sm font-extrabold text-accent">
                      {moment.destination}
                    </div>
                    <p className="mb-4 text-lg font-semibold leading-8">"{moment.caption}"</p>
                    <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                      <Heart className="size-4 text-accent" /> Planned from a saved moment
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}

function MomentTile({
  image,
  caption,
  author,
  destination,
  compact = false,
}: {
  image: string;
  caption: string;
  author: string;
  destination: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/14 shadow-2xl shadow-black/20 ${
        compact ? "aspect-[4/3]" : "min-h-[420px]"
      }`}
    >
      <img
        src={image}
        alt={caption}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-3 text-sm font-extrabold text-[#d7aa73]">{destination}</div>
        <p className={compact ? "text-base font-bold leading-6" : "text-2xl font-black leading-9"}>
          "{caption}"
        </p>
        {!compact && <div className="mt-4 text-sm font-bold text-white/66">{author}</div>}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-extrabold text-foreground">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-white/64 px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
      />
    </div>
  );
}
