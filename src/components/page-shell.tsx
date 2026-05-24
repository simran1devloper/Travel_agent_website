import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="px-6 md:px-8 pt-16 pb-12 max-w-7xl mx-auto">
          {eyebrow && (
            <span className="font-mono text-xs text-accent uppercase tracking-[0.2em] mb-4 block">
              {eyebrow}
            </span>
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-balance mb-6">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted-foreground max-w-2xl text-pretty">{description}</p>
          )}
        </section>
        <div className="px-6 md:px-8 pb-24 max-w-7xl mx-auto">{children}</div>
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
