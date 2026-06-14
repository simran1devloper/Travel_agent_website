import { ArrowUpRight, MapPin, Package2, Settings2, ShoppingBag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useBasket, writeCheckoutPrefill, type BasketItem } from "@/lib/basket";

const typeConfig: Record<
  BasketItem["type"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  package: { label: "Package", icon: Package2, color: "bg-[#c76b2f]/10 text-[#c76b2f]" },
  destination: { label: "Destination", icon: MapPin, color: "bg-blue-100 text-blue-700" },
  service: { label: "Service", icon: Settings2, color: "bg-emerald-100 text-emerald-700" },
  offer: { label: "Offer", icon: ShoppingBag, color: "bg-purple-100 text-purple-700" },
};

export function BasketSheet() {
  const { items, remove, clear, count } = useBasket();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (count === 0) return null;

  function handleCheckout() {
    writeCheckoutPrefill(items);
    setOpen(false);
    void router.navigate({ to: "/booking" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 min-w-14 items-center gap-2 rounded-full bg-[#0e1726] px-4 text-white shadow-[0_12px_36px_rgba(14,23,38,0.32)] transition-all hover:-translate-y-0.5 hover:bg-[#c76b2f] focus-ring"
        aria-label={`Open package — ${count} item${count !== 1 ? "s" : ""}`}
      >
        <ShoppingBag className="size-5" />
        <span className="grid min-w-[1.25rem] place-items-center rounded-full bg-[#c76b2f] px-1.5 py-0.5 text-xs font-black leading-none text-white">
          {count}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
          <button
            type="button"
            aria-label="Close package"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-auto max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-full sm:max-h-full sm:w-[420px] sm:rounded-l-3xl sm:rounded-tr-none">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-black">My Package</h2>
                <p className="text-xs text-muted-foreground">
                  {count} item{count !== 1 ? "s" : ""} selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 hover:bg-secondary"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-3">
                {items.map((item) => {
                  const cfg = typeConfig[item.type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={`${item.type}-${item.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary">
                          <Icon className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span
                          className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <p className="truncate text-sm font-bold leading-tight">{item.name}</p>
                        {item.days && (
                          <p className="text-xs text-muted-foreground">{item.days} days</p>
                        )}
                        {item.price !== undefined && item.price > 0 && (
                          <p className="text-xs text-muted-foreground">
                            from ₹{item.price.toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.slug, item.type)}
                        className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border p-5">
              <button
                type="button"
                onClick={handleCheckout}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#c76b2f] px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(199,107,47,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#d97a3a] focus-ring"
              >
                Plan My Journey <ArrowUpRight className="size-4" />
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Items will be pre-filled in your inquiry
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
