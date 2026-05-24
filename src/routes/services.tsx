import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { MediaStrip } from "@/components/media-collage";
import { services, serviceGallery } from "@/lib/mock-data";

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
  return (
    <PageShell
      eyebrow="What we orchestrate"
      title="Twelve services. One concierge."
      description="From visa filings to private aviation, every detail handled by a single planner."
    >
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
              <span>{s.reviewCount} reviews</span>
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
