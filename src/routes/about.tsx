import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — JourneyMakers" },
      {
        name: "description",
        content: "A small collective of planners building the future of high-intent travel.",
      },
      { property: "og:title", content: "About — JourneyMakers" },
      { property: "og:description", content: "A small collective of planners." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="A small collective of planners."
      description="Eighteen of us across three cities. We plan fewer trips, more carefully."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-8 max-w-5xl">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tighter">Our belief</h2>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            Travel is a sensory dialogue. Not just a ticket, but a collection of textures, scents,
            and quiet moments that linger long after the return flight.
          </p>
          <p className="text-muted-foreground leading-relaxed text-pretty">
            We refuse to scale the way a booking platform does. Every journey is touched by a
            planner who has been to the country — usually within the year.
          </p>
        </div>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tighter">By the numbers</h2>
          <dl className="space-y-4">
            <div className="flex justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Founded</dt>
              <dd className="font-mono font-bold">2018</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Journeys completed</dt>
              <dd className="font-mono font-bold">12,000+</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Destinations covered</dt>
              <dd className="font-mono font-bold">124</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Concierge rating</dt>
              <dd className="font-mono font-bold">98%</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <dt className="text-muted-foreground">Offices</dt>
              <dd className="font-mono font-bold">Mumbai · Lisbon · Tokyo</dd>
            </div>
          </dl>
        </div>
      </div>
    </PageShell>
  );
}
