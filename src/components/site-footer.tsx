import { Link } from "@tanstack/react-router";
import { CreditCard, Instagram, Linkedin, Mail, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type ApiService, type ContentPage } from "@/lib/api";

function useFooterContent() {
  const { data } = useQuery<ContentPage>({
    queryKey: ["content", "footer"],
    queryFn: () => api.content("footer"),
    staleTime: 5 * 60 * 1000,
  });
  function c(section: string, key: string, fallback = ""): string {
    return data?.[section]?.[key] ?? fallback;
  }
  return { c };
}

export function SiteFooter() {
  const { c } = useFooterContent();
  const { data: footerServices = [] } = useQuery<ApiService[]>({
    queryKey: ["services", "footer"],
    queryFn: api.services,
    staleTime: 5 * 60 * 1000,
  });
  const serviceLinks = footerServices
    .filter((service) => (service.status ?? "published") === "published")
    .filter((service) => service.show_footer === true)
    .slice(0, 3);
  return (
    <footer className="border-t border-border bg-[#0e1726] px-6 pb-8 pt-20 text-background md:px-8">
      <div className="mx-auto mb-14 grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-background text-xs font-black text-foreground">
              {c("brand", "logo_text", "JM")}
            </div>
            <span className="text-xl font-extrabold uppercase leading-none tracking-normal">
              {c("brand", "name", "JourneyMakers")}
            </span>
          </div>
          <p className="max-w-md text-base leading-8 text-background/68">
            {c(
              "brand",
              "tagline",
              "Building the future of high-intent travel. Every mile a memory, every journey a masterpiece.",
            )}
          </p>
          <div className="mt-8 grid gap-3 text-sm text-background/72 sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#d7aa73]" />{" "}
              {c("brand", "trust_1", "IATA partner desk")}
            </span>
            <span className="inline-flex items-center gap-2">
              <CreditCard className="size-4 text-[#d7aa73]" />{" "}
              {c("brand", "trust_2", "Secure payments")}
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4 text-[#d7aa73]" /> {c("brand", "trust_3", "24/7 concierge")}
            </span>
          </div>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-2xl border border-white/12 bg-white/[0.06] p-6"
        >
          <h4 className="mb-3 text-2xl font-extrabold leading-tight">
            {c("newsletter", "title", "Private departures, first.")}
          </h4>
          <p className="mb-6 text-sm leading-7 text-background/64">
            {c(
              "newsletter",
              "body",
              "Receive limited-seat journeys, visa updates, and planner notes before they reach the public calendar.",
            )}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder={c("newsletter", "placeholder", "Email address")}
              className="min-h-12 flex-1 rounded-full border border-white/14 bg-white/10 px-5 text-base text-white outline-none placeholder:text-white/46 focus:border-[#d7aa73]"
            />
            <button className="min-h-12 rounded-full bg-accent px-6 text-sm font-extrabold text-white shadow-[0_14px_35px_rgba(199,107,47,0.25)] transition-all hover:-translate-y-0.5">
              {c("newsletter", "cta_label", "Join")}
            </button>
          </div>
        </form>
      </div>

      <div className="mx-auto mb-14 grid max-w-7xl grid-cols-2 gap-8 border-y border-white/10 py-10 md:grid-cols-4">
        <div>
          <h5 className="mb-5 text-sm font-extrabold">Company</h5>
          <ul className="space-y-3 text-sm text-background/64">
            <li>
              <Link to="/about" className="hover:text-white">
                Our Story
              </Link>
            </li>
            <li>
              <Link to="/packages" className="hover:text-white">
                Packages
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-white">
                Services
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mb-5 text-sm font-extrabold">Destinations</h5>
          <ul className="space-y-3 text-sm text-background/64">
            <li>
              <Link to="/destinations" className="hover:text-white">
                Asia circuits
              </Link>
            </li>
            <li>
              <Link to="/destinations" className="hover:text-white">
                Alpine retreats
              </Link>
            </li>
            <li>
              <Link to="/destinations" className="hover:text-white">
                City escapes
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mb-5 text-sm font-extrabold">Services</h5>
          <ul className="space-y-3 text-sm text-background/64">
            {(serviceLinks.length
              ? serviceLinks
              : [
                  { id: "tour-packages", name: "Curated Tour Packages", cta_link: "/services" },
                  { id: "visa-assistance", name: "Visa Guidance", cta_link: "/services" },
                  { id: "custom-trip", name: "Custom Trip Planning", cta_link: "/services" },
                ]
            ).map((service) => (
              <li key={service.id}>
                <a href={service.cta_link || "/services"} className="hover:text-white">
                  {service.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="mb-5 text-sm font-extrabold">Social</h5>
          <ul className="space-y-3 text-sm text-background/64">
            <li>
              <span className="inline-flex items-center gap-2 hover:text-white">
                <Instagram className="size-4" /> Instagram
              </span>
            </li>
            <li>
              <span className="inline-flex items-center gap-2 hover:text-white">
                <Linkedin className="size-4" /> LinkedIn
              </span>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                Planner desk
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-background/50 md:flex-row">
        <span>{c("brand", "copyright", "© 2026 JourneyMakers Collective")}</span>
        <div className="flex flex-wrap justify-center gap-4">
          <span>Verified operators</span>
          <span>Protected payments</span>
          <span>Global emergency desk</span>
        </div>
      </div>
    </footer>
  );
}
