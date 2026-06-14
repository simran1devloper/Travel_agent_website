import type { StorageBackend } from "@/hooks/useStorageBackend";

const BACKEND_META: Record<string, { short: string; icon: string }> = {
  local: { short: "Local", icon: "💾" },
  gdrive: { short: "Drive", icon: "📂" },
  r2: { short: "R2", icon: "☁️" },
};

interface Props {
  selected: string;
  onChange: (key: string) => void;
  backends: StorageBackend[];
  configuredKeys: Set<string>;
  pendingConfirm: null | { label: string; onYes: () => void; onNo: () => void };
  className?: string;
}

const ALL_OPTIONS = [
  { key: "local", label: "Local server" },
  { key: "gdrive", label: "Google Drive" },
  { key: "r2", label: "Cloudflare R2" },
];

export function StorageBackendPicker({
  selected,
  onChange,
  configuredKeys,
  pendingConfirm,
  className = "",
}: Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {ALL_OPTIONS.map((opt) => {
          const configured = configuredKeys.has(opt.key);
          const meta = BACKEND_META[opt.key] ?? { short: opt.key, icon: "🗄️" };
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              title={configured ? opt.label : `${opt.label} (not configured)`}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                selected === opt.key
                  ? "border-accent bg-accent/10 text-accent"
                  : configured
                  ? "border-border bg-white text-foreground hover:border-foreground/30"
                  : "border-dashed border-border/60 bg-white/50 text-muted-foreground"
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.short}</span>
              {!configured && <span className="text-[10px] text-amber-500">!</span>}
            </button>
          );
        })}
      </div>

      {pendingConfirm && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="flex-1 text-xs font-semibold text-amber-800">
            {pendingConfirm.label} is not configured. Upload to local storage instead?
          </span>
          <button
            type="button"
            onClick={pendingConfirm.onYes}
            className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={pendingConfirm.onNo}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-foreground hover:bg-secondary"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
