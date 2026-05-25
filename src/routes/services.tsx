import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { MediaStrip } from "@/components/media-collage";
import { api } from "@/lib/api";
import { useContent } from "@/lib/use-content";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — JourneyMakers" },
      {
        name: "description",
        content:
          "Visa concierge, hotel & flight booking, honeymoon packages, corporate retreats, and bespoke planning.",
      },
      { property: "og:title", content: "Services — JourneyMakers" },
      { property: "og:description", content: "Everything we orchestrate, end-to-end." },
      { property: "og:url", content: "/services" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { c } = useContent("services");
  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: api.services,
  });

  const services = servicesQuery.data ?? [];

  if (servicesQuery.isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );

  // Build service gallery from services that have gallery items
  const serviceGallery = services.flatMap((s) =>
    s.gallery.map((g) => ({ src: g.src, caption: g.caption, service: s.name })),
  );

  return (
    <PageShell
      eyebrow={c("hero", "eyebrow", "What we orchestrate")}
      title={c("hero", "title", "Twelve services. One concierge.")}
      description={c("hero", "body", "From visa filings to private aviation, every detail handled by a single planner.")}
    >
      {serviceGallery.length > 0 && (
        <div className="mt-8 mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="font-mono text-xs text-accent uppercase tracking-[0.2em] block mb-1">
                Seen by our travelers
              </span>
              <p className="text-sm text-muted-foreground">
                Real moments from every service — swipe to explore.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] hidden md:block">
              Click any photo to expand
            </span>
          </div>
          <MediaStrip items={serviceGallery} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-2xl overflow-hidden">
        {services.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.32, 0.72, 0, 1] }}
            className="bg-background p-8 hover:bg-secondary transition-colors group"
          >
            <div className="font-mono text-[10px] text-accent uppercase tracking-widest mb-4">
              [{String(i + 1).padStart(2, "0")}]
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">
              {s.name}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
              <span className="text-amber-400">★</span>
              <span>{s.rating.toFixed(1)}</span>
              <span className="text-border">·</span>
              <span>{s.review_count} reviews</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty mb-3">
              {s.description}
            </p>
            <p className="text-xs text-foreground/70 italic leading-relaxed border-l-2 border-accent/40 pl-3">
              "{s.highlight}"
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          to="/booking"
          className="inline-flex items-center bg-foreground text-background px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase hover:bg-accent transition-colors"
        >
          Start an inquiry
        </Link>
      </div>
    </PageShell>
  );
}
