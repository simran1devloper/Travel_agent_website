import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompareList } from "@/lib/user-prefs";
import { api, type ApiPackage } from "@/lib/api";

export function PackageCompareDrawer() {
  const { slugs, clear, toggle } = useCompareList();
  const pkgsQuery = useQuery({ queryKey: ["packages"], queryFn: api.packages });
  const all: ApiPackage[] = pkgsQuery.data ?? [];
  const selected = slugs
    .map((s) => all.find((p) => p.slug === s))
    .filter((p): p is ApiPackage => Boolean(p));

  // Close on Escape
  useEffect(() => {
    if (slugs.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slugs.length, clear]);

  if (slugs.length === 0) return null;

  const rows: { label: string; key: keyof ApiPackage; format: (v: unknown) => string }[] = [
    { label: "Price", key: "price", format: (v) => `₹${(v as number).toLocaleString("en-IN")}` },
    { label: "Duration", key: "days", format: (v) => `${v as number} days` },
    { label: "Category", key: "category", format: (v) => (v as string | undefined) ?? "—" },
    { label: "Rating", key: "rating", format: (v) => (v != null ? `${v as number} ★` : "—") },
    { label: "Reviews", key: "review_count", format: (v) => `${v as number} reviews` },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
      <div className="section-shell py-4">
        {slugs.length === 1 && (
          <p className="text-sm text-muted-foreground">Select 1 more package to compare</p>
        )}
        {selected.length >= 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <td className="font-bold text-muted-foreground pr-6 py-2 w-28">Compare</td>
                  {selected.map((p) => (
                    <th key={p.slug} className="text-left font-extrabold pb-2 pr-8">
                      <div className="flex items-center gap-2">
                        {p.title}
                        <button
                          type="button"
                          onClick={() => toggle(p.slug)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="text-muted-foreground font-semibold py-2 pr-6">{row.label}</td>
                    {selected.map((p) => (
                      <td key={p.slug} className="py-2 pr-8 font-bold">
                        {row.format(p[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground">{slugs.length}/3 selected</span>
          <button
            type="button"
            onClick={clear}
            className="text-xs font-bold text-destructive hover:underline"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
