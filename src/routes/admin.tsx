import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocalAuth } from "@/components/auth-provider";
import { getLocalToken } from "@/lib/local-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { useAdminTabPref } from "@/lib/user-prefs";
import { PageShell } from "@/components/page-shell";
import { StarRating } from "@/components/star-rating";
import { MEDIA } from "@/config/media";
import {
  API_BASE_URL,
  api,
  type ApiMedia,
  type AdminReview,
  type ApiPlanner,
  type PlannerPayload,
  type ApiPackage,
  type ApiDestination,
  type PackagePayload,
  type DestinationPayload,
  type ApiService,
  type ServicePayload,
  type ApiFaq,
  type ApiTestimonial,
  type ApiSiteStat,
  type ApiOffer,
  type OfferPayload,
  type AdminImportResult,
  type ApiInquiry,
  type ApiComment,
} from "@/lib/api";
import { AUTH0_ENABLED } from "@/lib/auth-config";
import { useStorageBackend } from "@/hooks/useStorageBackend";
import { StorageBackendPicker } from "@/components/storage-backend-picker";
import {
  Upload,
  Download,
  Plus,
  Search,
  TrendingUp,
  Users,
  MessageSquare,
  DollarSign,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Image,
  Video,
  Link2,
  Flag,
  CheckCircle2,
  XCircle,
  UserCircle,
  SquareCheck,
  Square,
  ShieldAlert,
  Loader2,
} from "lucide-react";

const PACKAGE_MEDIA_BY_SLUG: Record<string, string> = {
  "bangkok-singapore": MEDIA.destinations["bangkok-singapore"],
  "newyork-citypulse": MEDIA.destinations.newyork,
  "salonei-retreat": MEDIA.destinations.salonei,
  "switzerland-alpine": MEDIA.destinations.switzerland,
  "tokyo-seoul-fusion": MEDIA.destinations["tokyo-seoul"],
  "vietnam-river": MEDIA.destinations.vietnam,
};

const ASSET_MEDIA_BY_NAME: Record<string, string> = {
  "bangkok & singapore.jpeg": MEDIA.destinations["bangkok-singapore"],
  "newyork.jpg": MEDIA.destinations.newyork,
  "salonei.jpeg": MEDIA.destinations.salonei,
  "swizerland.jpeg": MEDIA.destinations.switzerland,
  "tokyo & seoul.jpeg": MEDIA.destinations["tokyo-seoul"],
  "vitenam.jpeg": MEDIA.destinations.vietnam,
};

function resolveAdminMediaUrl(url: string | undefined, slug: string, size = "600/400") {
  if (!url) {
    return (
      PACKAGE_MEDIA_BY_SLUG[slug] ??
      MEDIA.destinations[slug] ??
      `https://picsum.photos/seed/${slug}/${size}`
    );
  }
  if (url.startsWith("/assets/")) {
    const assetName = decodeURIComponent(url.split("/").pop() ?? "").toLowerCase();
    return (
      ASSET_MEDIA_BY_NAME[assetName] ??
      PACKAGE_MEDIA_BY_SLUG[slug] ??
      `https://picsum.photos/seed/${slug}/${size}`
    );
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url);
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — JourneyMakers" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminPage,
});

// ── Bulk-select hook ──────────────────────────────────────────────────────────

function useBulkSelect<T>(items: T[], getId: (item: T) => string) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(getId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  return { selected, toggleOne, toggleAll, clearSelection, allSelected, someSelected };
}

// ── Reusable row-checkbox ─────────────────────────────────────────────────────

function RowCheck({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
      aria-label={checked ? "Deselect" : "Select"}
    >
      {checked ? <SquareCheck className="size-4 text-accent" /> : <Square className="size-4" />}
    </button>
  );
}

function AdminMediaPreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        aria-label={alt}
        className={className}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const img = e.currentTarget;
        img.onerror = null;
        img.src = `https://picsum.photos/seed/${encodeURIComponent(alt)}/600/400`;
      }}
    />
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
      <span className="font-bold text-accent">{count} selected</span>
      <div className="h-4 w-px bg-border" />
      {children}
      <div className="ml-auto">
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

type BulkKind = "packages" | "destinations";
type ImportConflictMode = "skip" | "update";
type ImportPromptState = { kind: BulkKind; file: File } | null;
type BulkDeleteState = { kind: BulkKind; ids: string[] } | null;
type AdminPopupState = {
  title: string;
  tone: "success" | "warning" | "danger";
  message: string;
  details?: string[];
} | null;

const PACKAGE_CSV_FIELDS = [
  "slug",
  "title",
  "location",
  "days",
  "price",
  "category",
  "image_url",
  "tagline",
  "description",
  "rating",
  "review_count",
  "published",
] as const;

const DESTINATION_CSV_FIELDS = [
  "slug",
  "name",
  "image_url",
  "packages_count",
  "tagline",
  "duration",
  "price",
  "rating",
  "review_count",
] as const;

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsvFile(
  filename: string,
  fields: readonly string[],
  rows: Record<string, unknown>[],
) {
  const csv = [
    fields.join(","),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadSelectedPackages(items: ApiPackage[]) {
  downloadCsvFile(
    "selected_packages_bulk_modify.csv",
    PACKAGE_CSV_FIELDS,
    items.map((pkg) => ({
      slug: pkg.slug,
      title: pkg.title,
      location: pkg.location,
      days: pkg.days,
      price: pkg.price,
      category: pkg.category ?? "",
      image_url: pkg.image_url ?? "",
      tagline: pkg.tagline ?? "",
      description: pkg.description ?? "",
      rating: pkg.rating ?? "",
      review_count: pkg.review_count ?? 0,
      published: pkg.published === false ? "false" : "true",
    })),
  );
}

function downloadSelectedDestinations(items: ApiDestination[]) {
  downloadCsvFile(
    "selected_destinations_bulk_modify.csv",
    DESTINATION_CSV_FIELDS,
    items.map((dest) => ({
      slug: dest.slug,
      name: dest.name,
      image_url: dest.image_url ?? "",
      packages_count: dest.packages_count ?? 0,
      tagline: dest.tagline ?? "",
      duration: dest.duration ?? "",
      price: dest.price ?? "",
      rating: dest.rating ?? "",
      review_count: dest.review_count ?? 0,
    })),
  );
}

function summarizeImport(kind: string, result: AdminImportResult): AdminPopupState {
  const imported = result.imported ?? 0;
  const updated = result.updated ?? 0;
  const skipped = result.skipped ?? 0;
  const errors = result.errors ?? [];
  const conflicts = result.conflicts ?? [];
  const hasProblems = errors.length > 0 || conflicts.length > 0;

  return {
    title: hasProblems ? "Import finished with notes" : "Import complete",
    tone: hasProblems ? "warning" : "success",
    message: `${kind}: ${imported} created, ${updated} updated, ${skipped} skipped.`,
    details: [
      ...conflicts.slice(0, 6).map((item) => `Row ${item.row}: ${item.message}`),
      ...errors.slice(0, 6).map((item) => `Row ${item.row}: ${item.message}`),
    ],
  };
}

// ── Session expired / auth error banner ──────────────────────────────────────

function SessionBanner({ error }: { error: Error | null }) {
  if (!error) return null;
  const isAuth =
    error.message.includes("401") ||
    error.message.includes("403") ||
    error.message.toLowerCase().includes("unauthorized") ||
    error.message.toLowerCase().includes("forbidden") ||
    error.message.toLowerCase().includes("admin role");
  if (!isAuth) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
      <ShieldAlert className="size-5 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-bold text-destructive">Session expired or access denied</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {import.meta.env.PROD
            ? "Your session has expired. Please sign in again."
            : "Dev token mismatch — check VITE_ADMIN_TOKEN in your .env"}
        </p>
      </div>
      <a href="/signin" className="ml-auto text-xs font-bold text-accent hover:underline">
        Sign in →
      </a>
    </div>
  );
}

function AdminResultPopup({ popup, onClose }: { popup: AdminPopupState; onClose: () => void }) {
  if (!popup) return null;
  const toneClass =
    popup.tone === "danger"
      ? "text-red-600 bg-red-50"
      : popup.tone === "warning"
        ? "text-amber-700 bg-amber-50"
        : "text-emerald-700 bg-emerald-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${toneClass}`}
            >
              {popup.tone === "danger"
                ? "Needs attention"
                : popup.tone === "warning"
                  ? "Check rows"
                  : "Done"}
            </div>
            <h2 className="text-xl font-black tracking-tight">{popup.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{popup.message}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        {popup.details && popup.details.length > 0 && (
          <div className="mt-5 max-h-48 overflow-y-auto rounded-xl bg-secondary/50 p-3 font-mono text-xs">
            {popup.details.map((detail) => (
              <p key={detail} className="py-1">
                {detail}
              </p>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-foreground py-2.5 text-sm font-bold text-background"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ImportConflictPrompt({
  state,
  onClose,
  onConfirm,
  pending,
}: {
  state: ImportPromptState;
  onClose: () => void;
  onConfirm: (mode: ImportConflictMode) => void;
  pending: boolean;
}) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-accent">Bulk import</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">
              How should matching slugs be handled?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              File: <span className="font-semibold text-foreground">{state.file.name}</span>. If a
              row uses an existing unique slug, choose whether to update that item or skip it.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm("update")}
            className="rounded-2xl border border-accent bg-accent/10 p-4 text-left hover:bg-accent/15 disabled:opacity-60"
          >
            <span className="font-black">Update existing</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Best for bulk modification after editing an exported CSV.
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm("skip")}
            className="rounded-2xl border border-border p-4 text-left hover:bg-secondary disabled:opacity-60"
          >
            <span className="font-black">Skip existing</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Best when importing only new records and avoiding overwrites.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteConfirm({
  state,
  onClose,
  onConfirm,
  pending,
}: {
  state: BulkDeleteState;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <h2 className="text-xl font-black tracking-tight">Delete {state.ids.length} selected?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This will remove the selected {state.kind}. This action cannot be undone from the admin
          panel.
        </p>
        <div className="mt-5 max-h-36 overflow-y-auto rounded-xl bg-secondary/50 p-3 font-mono text-xs">
          {state.ids.map((id) => (
            <p key={id} className="py-1">
              {id}
            </p>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      </div>
    </div>
  );
}

type AdminTab =
  | "overview"
  | "packages"
  | "services"
  | "media"
  | "reviews"
  | "comments"
  | "planners"
  | "content"
  | "offers"
  | "inquiries"
  | "contact"
  | "pages"
  | "settings";

function AdminPage() {
  const { localUser } = useLocalAuth();

  // Local admin / superadmin — grant access immediately
  if (localUser?.role === "admin" || localUser?.role === "superadmin") return <AdminContent />;

  // Local non-admin signed in — show clear denial, not Auth0 gate
  if (localUser) {
    return (
      <PageShell eyebrow="System" title="Admin access required.">
        <p className="mt-2 text-muted-foreground">
          Your account <strong>{localUser.email}</strong> does not have admin privileges.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
          >
            Go to dashboard
          </Link>
          <Link
            to="/signin"
            search={{ mode: "login" }}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-bold"
          >
            Sign in as admin
          </Link>
        </div>
      </PageShell>
    );
  }

  // Not signed in at all — check Auth0
  if (AUTH0_ENABLED) {
    if (typeof window === "undefined") {
      return (
        <PageShell eyebrow="System" title="Checking access...">
          <span />
        </PageShell>
      );
    }
    return <AdminAuthGate />;
  }

  // Dev mode — no auth configured, allow through
  return <AdminContent />;
}

function AdminAuthGate() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <PageShell eyebrow="System" title="Checking access...">
        <span />
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell eyebrow="System" title="Admin sign in required.">
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/signin"
            search={{ mode: "login" }}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
          >
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  return <AdminContent />;
}

function AdminContent() {
  // Persists last-visited tab across refreshes
  const [activeTab, setActiveTab] = useAdminTabPref();

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "inquiries", label: "Inquiries" },
    { key: "packages", label: "Packages" },
    { key: "services", label: "Services" },
    { key: "content", label: "Content" },
    { key: "media", label: "Media" },
    { key: "reviews", label: "Reviews" },
    { key: "comments", label: "Comments" },
    { key: "planners", label: "Planners" },
    { key: "offers", label: "Offers" },
    { key: "pages", label: "Pages" },
    { key: "contact", label: "Contact" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <PageShell eyebrow="System · Command Center" title="Admin">
      {/* Tab bar */}
      <div className="mb-10 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 pb-3 pt-1 text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "inquiries" && <InquiriesTab />}
      {activeTab === "packages" && <PackagesTab />}
      {activeTab === "services" && <ServicesTab />}
      {activeTab === "content" && <ContentTab />}
      {activeTab === "media" && <MediaTab />}
      {activeTab === "reviews" && <ReviewsTab />}
      {activeTab === "comments" && <CommentsTab />}
      {activeTab === "planners" && <PlannersTab />}
      {activeTab === "offers" && <OffersTab />}
      {activeTab === "pages" && <PagesTab />}
      {activeTab === "contact" && <ContactTab />}
      {activeTab === "settings" && <SettingsTab />}
    </PageShell>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const qc = useQueryClient();
  const statsQuery = useQuery({ queryKey: ["admin-stats"], queryFn: api.adminStats });
  const inquiriesQuery = useQuery({ queryKey: ["admin-inquiries"], queryFn: api.adminInquiries });
  const plannersQuery = useQuery({ queryKey: ["planners"], queryFn: api.listPlanners });
  const pkgsOverviewQuery = useQuery({ queryKey: ["admin-packages"], queryFn: api.adminPackages });
  const destsOverviewQuery = useQuery({ queryKey: ["destinations"], queryFn: api.destinations });
  const stats = statsQuery.data;
  const planners = plannersQuery.data ?? [];
  const overviewPackages = pkgsOverviewQuery.data ?? [];
  const overviewDestinations = destsOverviewQuery.data ?? [];
  const [pkgModal, setPkgModal] = useState<{ mode: "add" | "edit"; data: PkgForm } | null>(null);
  const [pkgDeleteSlug, setPkgDeleteSlug] = useState<string | null>(null);

  const savePkg = useMutation({
    mutationFn: (f: PkgForm) => {
      const payload: PackagePayload = {
        slug: f.slug.trim(),
        title: f.title.trim(),
        location: f.location.trim(),
        days: Number(f.days),
        price: Number(f.price),
        category: f.category.trim() || undefined,
        image_url: f.image_url.trim() || (f.media_urls[0] ?? undefined),
        tagline: f.tagline.trim() || undefined,
        description: f.description.trim() || undefined,
        published: f.published,
        card_type: f.card_type,
        destination_slugs: f.destination_slugs,
        service_ids: f.service_ids,
        offer_ids: f.offer_ids,
        media_urls: f.media_urls,
      };
      return pkgModal?.mode === "edit"
        ? api.adminUpdatePackage(f.slug, payload)
        : api.adminCreatePackage(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      setPkgModal(null);
    },
  });

  const deletePkg = useMutation({
    mutationFn: (slug: string) => api.adminDeletePackage(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      setPkgDeleteSlug(null);
    },
  });

  // ── Bulk import state ──
  const [importStatus, setImportStatus] = useState<{
    kind: string;
    imported: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  async function handleImport(kind: string, file: File) {
    setImportStatus(null);
    try {
      const result = await api.adminImportCsv(kind, file);
      setImportStatus({ kind, ...result });
      qc.invalidateQueries({ queryKey: [kind] });
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
    } catch (err) {
      setImportStatus({ kind, imported: 0, errors: [{ row: 0, message: String(err) }] });
    }
  }

  const displayedLeads = inquiriesQuery.data?.length
    ? inquiriesQuery.data.map((lead) => ({
        id: lead.public_id,
        name: lead.full_name,
        destination: lead.destinations?.[0] ?? "Custom",
        budget: lead.budget ?? "TBD",
        status: lead.status,
        date: new Date(lead.created_at).toLocaleDateString(),
        assigned_planner_id: lead.assigned_planner_id,
        planner_name: lead.planner_name ?? null,
      }))
    : [
        {
          id: "INQ-2056",
          name: "Priya Shah",
          destination: "Bali",
          budget: "$10k–$25k",
          status: "New",
          date: "1h ago",
          assigned_planner_id: null,
          planner_name: null,
        },
        {
          id: "INQ-2055",
          name: "James Carter",
          destination: "Iceland",
          budget: "$25k+",
          status: "Assigned",
          date: "3h ago",
          assigned_planner_id: null,
          planner_name: null,
        },
        {
          id: "INQ-2054",
          name: "Mei Tanaka",
          destination: "Greece",
          budget: "$5k–$10k",
          status: "In review",
          date: "1d ago",
          assigned_planner_id: null,
          planner_name: null,
        },
      ];

  const inquiryBulk = useBulkSelect(displayedLeads, (l) => l.id);

  const updateInquiry = useMutation({
    mutationFn: ({
      id,
      status,
      plannerId,
    }: {
      id: string;
      status?: string;
      plannerId?: number | null;
    }) =>
      fetch(`http://localhost:8000/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-token": "dev-admin-token" },
        body: JSON.stringify({ status, assigned_planner_id: plannerId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
  });

  const bulkUpdateInquiries = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      api.adminBulkUpdateInquiries(Array.from(inquiryBulk.selected), status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      inquiryBulk.clearSelection();
    },
  });

  return (
    <>
      <SessionBanner error={statsQuery.error as Error | null} />

      {/* Import result banner */}
      {importStatus && (
        <div
          className={`mb-6 rounded-2xl p-4 text-sm flex items-start gap-3 ${importStatus.errors.length ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}`}
        >
          <div className="flex-1">
            <span className="font-bold">
              {importStatus.errors.length === 0 ? "✓ " : "⚠ "}
              {importStatus.imported} created · {importStatus.updated ?? 0} updated ·{" "}
              {importStatus.skipped ?? 0} skipped ({importStatus.kind})
            </span>
            {((importStatus.conflicts?.length ?? 0) > 0 || importStatus.errors.length > 0) && (
              <ul className="mt-2 space-y-1 font-mono text-xs text-red-700 dark:text-red-400">
                {importStatus.conflicts?.slice(0, 5).map((e) => (
                  <li key={`conflict-${e.row}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {importStatus.errors.slice(0, 5).map((e) => (
                  <li key={`error-${e.row}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {importStatus.errors.length + (importStatus.conflicts?.length ?? 0) > 5 && (
                  <li>
                    …and {importStatus.errors.length + (importStatus.conflicts?.length ?? 0) - 5}{" "}
                    more
                  </li>
                )}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-12">
        <StatCard
          icon={MessageSquare}
          label="Active leads"
          value={String(stats?.active_leads ?? 142)}
          trend="Live"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={String(stats?.customers ?? 3840)}
          trend="Live"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue MTD"
          value={`$${(stats?.revenue_mtd ?? 842000).toLocaleString()}`}
          trend="Live"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion"
          value={`${stats?.conversion ?? 34}%`}
          trend="Live"
        />
      </div>

      {/* Inquiries */}
      <section className="mb-12">
        <SectionHeader title="Recent inquiries">
          <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2 text-sm">
            <Search className="size-3.5 text-muted-foreground" />
            <input placeholder="Search leads…" className="bg-transparent outline-none w-40" />
          </div>
          <button
            onClick={() => api.adminExportInquiriesCsv()}
            className="text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary"
          >
            <Download className="size-3" /> Export CSV
          </button>
        </SectionHeader>

        {/* Bulk bar — shown when rows are selected */}
        <BulkBar count={inquiryBulk.selected.size} onClear={inquiryBulk.clearSelection}>
          <span className="text-xs text-muted-foreground">Set status:</span>
          {["New", "Assigned", "In review", "Quoted", "Won", "Lost"].map((s) => (
            <button
              key={s}
              type="button"
              disabled={bulkUpdateInquiries.isPending}
              onClick={() => bulkUpdateInquiries.mutate({ status: s })}
              className="rounded-full border border-border px-3 py-1 text-xs font-bold hover:bg-secondary disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </BulkBar>

        <div className="border border-border rounded-2xl overflow-hidden mt-3">
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-secondary text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <div className="col-span-1 flex items-center">
              <RowCheck checked={inquiryBulk.allSelected} onToggle={inquiryBulk.toggleAll} />
            </div>
            <div className="col-span-2">ID</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-1">Dest.</div>
            <div className="col-span-1">Budget</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Planner</div>
          </div>
          {displayedLeads.map((l, i) => (
            <div
              key={l.id}
              onClick={() => inquiryBulk.toggleOne(l.id)}
              className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-5 py-4 items-center text-sm cursor-pointer transition-colors ${i > 0 ? "border-t border-border" : ""} ${inquiryBulk.selected.has(l.id) ? "bg-accent/5" : "hover:bg-secondary/40"}`}
            >
              <div
                className="hidden md:flex md:col-span-1 items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <RowCheck
                  checked={inquiryBulk.selected.has(l.id)}
                  onToggle={() => inquiryBulk.toggleOne(l.id)}
                />
              </div>
              <div className="md:col-span-2 font-mono text-xs">{l.id}</div>
              <div className="md:col-span-2 font-medium">{l.name}</div>
              <div className="md:col-span-1 text-muted-foreground text-xs truncate">
                {l.destination}
              </div>
              <div className="md:col-span-1 text-muted-foreground text-xs">{l.budget}</div>
              <div className="md:col-span-2" onClick={(e) => e.stopPropagation()}>
                <select
                  defaultValue={l.status}
                  onChange={(e) => updateInquiry.mutate({ id: l.id, status: e.target.value })}
                  className="text-[10px] font-mono uppercase tracking-widest rounded-full px-2.5 py-1 border border-border bg-background focus:outline-none"
                >
                  {["New", "Assigned", "In review", "Quoted", "Won", "Lost"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3" onClick={(e) => e.stopPropagation()}>
                <select
                  value={l.assigned_planner_id ?? ""}
                  onChange={(e) =>
                    updateInquiry.mutate({
                      id: l.id,
                      plannerId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full text-xs rounded-xl border border-border bg-background px-3 py-1.5 focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {planners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="mb-12">
        <SectionHeader title="Packages">
          <label className="cursor-pointer text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary">
            <Upload className="size-3" /> Bulk import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  handleImport("packages", f);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setPkgModal({ mode: "add", data: emptyPkg() })}
            className="text-xs font-bold tracking-widest uppercase bg-foreground text-background px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-accent"
          >
            <Plus className="size-3" /> New package
          </button>
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overviewPackages.map((p) => (
            <div
              key={p.slug}
              className="border border-border rounded-2xl bg-card/70 p-3 flex gap-3 items-center transition-colors hover:border-accent/40 hover:bg-secondary/25"
            >
              <AdminMediaPreview
                src={resolveAdminMediaUrl(p.image_url, p.slug, "200/200")}
                alt={p.title}
                className="size-16 rounded-xl object-cover shrink-0 bg-secondary"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{p.title}</div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  {p.days}d · ${p.price.toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPkgModal({
                      mode: "edit",
                      data: packageToForm(p),
                    })
                  }
                  className="text-xs font-bold underline hover:text-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPkgDeleteSlug(p.slug)}
                  className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${p.title}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section className="mb-12">
        <SectionHeader title="Destinations" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {overviewDestinations.map((d) => (
            <div key={d.slug} className="border border-border rounded-xl p-3 text-center">
              <AdminMediaPreview
                src={resolveAdminMediaUrl(d.image_url, d.slug, "200/200")}
                alt={d.name}
                className="aspect-square w-full rounded-lg object-cover mb-2"
              />
              <div className="text-xs font-bold">{d.name}</div>
              <div className="text-[10px] text-muted-foreground">{d.packages_count} pkgs</div>
            </div>
          ))}
        </div>
      </section>

      <PackageModal
        modal={pkgModal}
        setModal={setPkgModal}
        onClose={() => setPkgModal(null)}
        onSubmit={(form) => savePkg.mutate(form)}
        isPending={savePkg.isPending}
        isError={savePkg.isError}
      />

      {pkgDeleteSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPkgDeleteSlug(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold">Delete package?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently removes <strong>{pkgDeleteSlug}</strong> and cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPkgDeleteSlug(null)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePkg.isPending}
                onClick={() => deletePkg.mutate(pkgDeleteSlug)}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletePkg.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV templates & bulk tools */}
      <section>
        <SectionHeader title="CSV templates &amp; bulk import">
          <button
            onClick={() => api.adminExportCsv("packages")}
            className="text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary"
          >
            <Download className="size-3" /> Export packages
          </button>
          <button
            onClick={() => api.adminExportCsv("destinations")}
            className="text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary"
          >
            <Download className="size-3" /> Export destinations
          </button>
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CsvCard
            name="packages.csv"
            kind="packages"
            cols="slug, title, location, days, price, category, image_url, tagline, description, rating, review_count, published"
            sample="bali-escape,Bali Escape,Bali,5,49999,Honeymoon,https://…,Tropical paradise,…,4.9,120,true"
            onImport={(f) => handleImport("packages", f)}
          />
          <CsvCard
            name="destinations.csv"
            kind="destinations"
            cols="slug, name, image_url, packages_count, tagline, duration, price, rating, review_count"
            sample="bali,Bali,https://…,14,Tropical renewal,5–10 days,35000,4.9,240"
            onImport={(f) => handleImport("destinations", f)}
          />
          <CsvCard
            name="planners.csv"
            kind="planners"
            cols="name, email, specialty, photo_url"
            sample="Sophia Chen,sophia@journeymakers.com,Luxury Asia,https://…"
            onImport={(f) => handleImport("planners", f)}
          />
        </div>
      </section>
    </>
  );
}

// ── Inquiries tab ─────────────────────────────────────────────────────────────

function InquiriesTab() {
  const qc = useQueryClient();
  const inquiriesQuery = useQuery({ queryKey: ["admin-inquiries"], queryFn: api.adminInquiries });
  const plannersQuery = useQuery({ queryKey: ["planners"], queryFn: api.listPlanners });
  const inquiries = inquiriesQuery.data ?? [];
  const planners = plannersQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<ApiInquiry | null>(null);

  const filtered = inquiries.filter((inq) => {
    const hay = `${inq.full_name} ${inq.email} ${inq.public_id} ${(inq.destinations ?? []).join(" ")}`.toLowerCase();
    const matchSearch = hay.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const bulk = useBulkSelect(filtered, (i) => i.public_id);

  const updateInquiry = useMutation({
    mutationFn: ({ id, status, plannerId }: { id: string; status?: string; plannerId?: number | null }) =>
      fetch(`${API_BASE_URL}/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-token": "dev-admin-token" },
        body: JSON.stringify({ status, assigned_planner_id: plannerId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inquiries"] }),
  });

  const bulkUpdate = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      api.adminBulkUpdateInquiries(Array.from(bulk.selected), status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      bulk.clearSelection();
    },
  });

  const STATUS_OPTIONS = ["New", "Assigned", "In review", "Quoted", "Won", "Lost"];
  const STATUS_COLORS: Record<string, string> = {
    New: "bg-blue-100 text-blue-700",
    Assigned: "bg-amber-100 text-amber-700",
    "In review": "bg-purple-100 text-purple-700",
    Quoted: "bg-cyan-100 text-cyan-700",
    Won: "bg-green-100 text-green-700",
    Lost: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <SessionBanner error={inquiriesQuery.error as Error | null} />

      {/* Header */}
      <div className="rounded-2xl border border-border bg-[#fbf6ee] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Inquiries</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {inquiries.length} total · {inquiries.filter((i) => i.status === "New").length} new
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                placeholder="Search…"
                className="bg-transparent outline-none w-40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold focus:outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="button"
              onClick={() => api.adminExportInquiriesCsv()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-secondary"
            >
              <Download className="size-3" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      <BulkBar count={bulk.selected.size} onClear={bulk.clearSelection}>
        <span className="text-xs text-muted-foreground">Set status:</span>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={bulkUpdate.isPending}
            onClick={() => bulkUpdate.mutate({ status: s })}
            className="rounded-full border border-border px-3 py-1 text-xs font-bold hover:bg-secondary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </BulkBar>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-secondary text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <RowCheck checked={bulk.allSelected} onToggle={bulk.toggleAll} />
          </div>
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Name</div>
          <div className="col-span-1">Email</div>
          <div className="col-span-1">Dest.</div>
          <div className="col-span-1">Budget</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Planner</div>
        </div>
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No inquiries found.</p>
        )}
        {filtered.map((inq, i) => (
          <div
            key={inq.public_id}
            className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-5 py-4 items-center text-sm ${i > 0 ? "border-t border-border" : ""} ${bulk.selected.has(inq.public_id) ? "bg-accent/5" : "hover:bg-secondary/40"}`}
          >
            <div className="hidden md:flex md:col-span-1 items-center" onClick={(e) => e.stopPropagation()}>
              <RowCheck checked={bulk.selected.has(inq.public_id)} onToggle={() => bulk.toggleOne(inq.public_id)} />
            </div>
            <button
              type="button"
              className="md:col-span-2 font-mono text-xs text-left text-accent hover:underline"
              onClick={() => setDetail(inq)}
            >
              {inq.public_id}
            </button>
            <div className="md:col-span-2 font-medium">{inq.full_name}</div>
            <div className="md:col-span-1 text-xs text-muted-foreground truncate">{inq.email}</div>
            <div className="md:col-span-1 text-xs text-muted-foreground truncate">
              {inq.destinations?.[0] ?? "—"}
            </div>
            <div className="md:col-span-1 text-xs text-muted-foreground">{inq.budget ?? "TBD"}</div>
            <div className="md:col-span-2" onClick={(e) => e.stopPropagation()}>
              <select
                defaultValue={inq.status}
                onChange={(e) => updateInquiry.mutate({ id: inq.public_id, status: e.target.value })}
                className="text-[10px] font-mono uppercase tracking-widest rounded-full px-2.5 py-1 border border-border bg-background focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2" onClick={(e) => e.stopPropagation()}>
              <select
                value={inq.assigned_planner_id ?? ""}
                onChange={(e) => updateInquiry.mutate({ id: inq.public_id, plannerId: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-1.5 focus:outline-none focus:border-accent"
              >
                <option value="">Unassigned</option>
                {planners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase text-accent">Inquiry Detail</p>
                <h3 className="text-xl font-black">{detail.public_id}</h3>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-full border border-border p-2">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">{detail.full_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[detail.status] ?? "bg-secondary text-foreground"}`}>{detail.status}</span>
                </div>
                <p className="text-muted-foreground">{detail.email}</p>
                <p className="text-xs text-muted-foreground">{new Date(detail.created_at).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Destinations</p>
                <div className="flex flex-wrap gap-2">
                  {(detail.destinations ?? []).map((d) => (
                    <span key={d} className="rounded-full bg-secondary px-3 py-1 text-xs">{d}</span>
                  ))}
                  {!detail.destinations?.length && <span className="text-muted-foreground text-xs">None specified</span>}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Budget</p>
                <p>{detail.budget ?? "Not specified"}</p>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-3 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assign Planner</p>
                <select
                  value={detail.assigned_planner_id ?? ""}
                  onChange={(e) => {
                    updateInquiry.mutate({ id: detail.public_id, plannerId: e.target.value ? Number(e.target.value) : null });
                    setDetail({ ...detail, assigned_planner_id: e.target.value ? Number(e.target.value) : null });
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {planners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        updateInquiry.mutate({ id: detail.public_id, status: s });
                        setDetail({ ...detail, status: s });
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${detail.status === s ? (STATUS_COLORS[s] ?? "bg-secondary") + " border-transparent" : "border-border hover:bg-secondary"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ── Packages & Destinations tab ───────────────────────────────────────────────

type PkgForm = {
  slug: string;
  title: string;
  location: string;
  days: string;
  price: string;
  category: string;
  image_url: string;
  tagline: string;
  description: string;
  published: boolean;
  card_type: "normal" | "pomplate";
  destination_slugs: string[];
  service_ids: number[];
  offer_ids: number[];
  media_urls: string[];
};
type DestGalleryItem = { type: "photo" | "video"; src: string; caption: string; author: string };
type DestForm = {
  slug: string;
  name: string;
  image_url: string;
  tagline: string;
  duration: string;
  price: string;
  packages_count: string;
  gallery: DestGalleryItem[];
};

const emptyPkg = (): PkgForm => ({
  slug: "",
  title: "",
  location: "",
  days: "",
  price: "",
  category: "",
  image_url: "",
  tagline: "",
  description: "",
  published: true,
  card_type: "normal",
  destination_slugs: [],
  service_ids: [],
  offer_ids: [],
  media_urls: [],
});
const emptyDest = (): DestForm => ({
  slug: "",
  name: "",
  image_url: "",
  tagline: "",
  duration: "",
  price: "",
  packages_count: "0",
  gallery: [],
});

function packageToForm(pkg: ApiPackage): PkgForm {
  return {
    slug: pkg.slug,
    title: pkg.title,
    location: pkg.location,
    days: String(pkg.days),
    price: String(pkg.price),
    category: pkg.category ?? "",
    image_url: pkg.image_url ?? "",
    tagline: pkg.tagline ?? "",
    description: pkg.description ?? "",
    published: pkg.published !== false,
    card_type: pkg.card_type ?? "normal",
    destination_slugs: pkg.destination_slugs ?? [],
    service_ids: pkg.service_ids ?? [],
    offer_ids: pkg.offer_ids ?? [],
    media_urls: pkg.media_urls ?? [],
  };
}

function PackagesTab() {
  const qc = useQueryClient();
  const [section, setSection] = useState<"packages" | "destinations">("packages");

  // ── Bulk import state ──
  const [importStatus, setImportStatus] = useState<(AdminImportResult & { kind: string }) | null>(
    null,
  );
  const [resultPopup, setResultPopup] = useState<AdminPopupState>(null);
  const [importPrompt, setImportPrompt] = useState<ImportPromptState>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<BulkDeleteState>(null);

  async function handleImport(kind: BulkKind, file: File, conflict: ImportConflictMode) {
    setImportStatus(null);
    try {
      const result = await api.adminImportCsv(kind, file, conflict);
      setImportStatus({ kind, ...result });
      setResultPopup(summarizeImport(kind, result));
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      qc.invalidateQueries({ queryKey: ["destinations"] });
    } catch (err) {
      const failed = { kind, imported: 0, errors: [{ row: 0, message: String(err) }] };
      setImportStatus(failed);
      setResultPopup({
        title: "Import failed",
        tone: "danger",
        message: String(err),
      });
    }
  }

  // ── Packages state ──
  const pkgsQuery = useQuery({ queryKey: ["admin-packages"], queryFn: api.adminPackages });
  const pkgs = pkgsQuery.data ?? [];
  const [pkgModal, setPkgModal] = useState<{ mode: "add" | "edit"; data: PkgForm } | null>(null);
  const [pkgDeleteSlug, setPkgDeleteSlug] = useState<string | null>(null);

  const savePkg = useMutation({
    mutationFn: (f: PkgForm) => {
      const payload: PackagePayload = {
        slug: f.slug,
        title: f.title,
        location: f.location,
        days: Number(f.days),
        price: Number(f.price),
        category: f.category || undefined,
        image_url: f.image_url || (f.media_urls[0] ?? undefined),
        tagline: f.tagline || undefined,
        description: f.description || undefined,
        published: f.published,
        card_type: f.card_type,
        destination_slugs: f.destination_slugs,
        service_ids: f.service_ids,
        offer_ids: f.offer_ids,
        media_urls: f.media_urls,
      };
      return pkgModal?.mode === "edit"
        ? api.adminUpdatePackage(f.slug, payload)
        : api.adminCreatePackage(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      setPkgModal(null);
    },
  });

  const deletePkg = useMutation({
    mutationFn: (slug: string) => api.adminDeletePackage(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      setPkgDeleteSlug(null);
    },
  });

  // ── Destinations state ──
  const destsQuery = useQuery({ queryKey: ["destinations"], queryFn: api.destinations });
  const dests = destsQuery.data ?? [];
  const servicesQueryPkg = useQuery({ queryKey: ["services"], queryFn: api.services });
  const allServicesPkg = servicesQueryPkg.data ?? [];
  const offersQueryPkg = useQuery({ queryKey: ["offers"], queryFn: api.offers });
  const allOffersPkg = offersQueryPkg.data ?? [];

  // ── Package-link redirect helpers ──────────────────────────────────────────
  // When the admin clicks "Go to Services/Offers tab to add a new item", we save
  // the current package form to sessionStorage so PackagesTab can restore it when
  // the user switches back after creating the new item.
  const PKG_LINK_KEY = "jm_pkg_link_pending";
  type PkgLinkPending = {
    pkgMode: "add" | "edit";
    pkgForm: PkgForm;
    linkType: "service" | "offer";
    linkedServiceId?: number;
    linkedOfferId?: number;
  };

  const [, setActiveTabFromPkg] = useAdminTabPref();

  // On mount, check if we just returned from Services/Offers tab after creating an item
  useEffect(() => {
    const raw = sessionStorage.getItem(PKG_LINK_KEY);
    if (!raw) return;
    try {
      const pending: PkgLinkPending = JSON.parse(raw);
      if (pending.linkedServiceId !== undefined || pending.linkedOfferId !== undefined) {
        sessionStorage.removeItem(PKG_LINK_KEY);
        const restored = { ...pending.pkgForm };
        if (pending.linkedServiceId !== undefined)
          restored.service_ids = [...restored.service_ids, pending.linkedServiceId];
        if (pending.linkedOfferId !== undefined)
          restored.offer_ids = [...restored.offer_ids, pending.linkedOfferId];
        setPkgModal({ mode: pending.pkgMode, data: restored });
        setSection("packages");
      }
    } catch { /* ignore malformed */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref to hold pkg form when doing same-tab dest redirect
  const pendingDestLinkRef = useRef<{ mode: "add" | "edit"; form: PkgForm } | null>(null);

  const [destModal, setDestModal] = useState<{ mode: "add" | "edit"; data: DestForm } | null>(null);
  const [destDeleteSlug, setDestDeleteSlug] = useState<string | null>(null);

  const saveDest = useMutation({
    mutationFn: (f: DestForm) => {
      const payload: DestinationPayload = {
        slug: f.slug,
        name: f.name,
        image_url: f.image_url || (f.gallery[0]?.src) || undefined,
        tagline: f.tagline || undefined,
        duration: f.duration || undefined,
        price: f.price ? Number(f.price) : undefined,
        packages_count: Number(f.packages_count) || 0,
        gallery: f.gallery.length > 0 ? f.gallery : undefined,
      };
      return destModal?.mode === "edit"
        ? api.adminUpdateDestination(f.slug, payload)
        : api.adminCreateDestination(payload);
    },
    onSuccess: (newDest) => {
      qc.invalidateQueries({ queryKey: ["destinations"] });
      setDestModal(null);
      // If we came from "Add new destination" inside the package modal, restore it
      if (pendingDestLinkRef.current && destModal?.mode === "add") {
        const { mode, form } = pendingDestLinkRef.current;
        pendingDestLinkRef.current = null;
        setPkgModal({
          mode,
          data: { ...form, destination_slugs: [...form.destination_slugs, newDest.slug] },
        });
        setSection("packages");
      }
    },
  });

  const deleteDest = useMutation({
    mutationFn: (slug: string) => api.adminDeleteDestination(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destinations"] });
      setDestDeleteSlug(null);
    },
  });

  // ── Bulk select ──
  const pkgBulk = useBulkSelect(pkgs, (p) => p.slug);
  const destBulk = useBulkSelect(dests, (d) => d.slug);

  const bulkDeletePkgs = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("packages", ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      setBulkDeleteTarget(null);
      pkgBulk.clearSelection();
      setResultPopup({
        title: result.errors?.length ? "Delete finished with notes" : "Packages deleted",
        tone: result.errors?.length ? "warning" : "success",
        message: `${result.deleted} package${result.deleted === 1 ? "" : "s"} deleted.`,
        details: result.errors?.map((item) => `${item.id}: ${item.message}`),
      });
    },
  });
  const bulkDeleteDests = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("destinations", ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["destinations"] });
      setBulkDeleteTarget(null);
      destBulk.clearSelection();
      setResultPopup({
        title: result.errors?.length ? "Delete finished with notes" : "Destinations deleted",
        tone: result.errors?.length ? "warning" : "success",
        message: `${result.deleted} destination${result.deleted === 1 ? "" : "s"} deleted.`,
        details: result.errors?.map((item) => `${item.id}: ${item.message}`),
      });
    },
  });

  return (
    <>
      <SessionBanner error={pkgsQuery.error as Error | null} />
      <AdminResultPopup popup={resultPopup} onClose={() => setResultPopup(null)} />
      <ImportConflictPrompt
        state={importPrompt}
        pending={false}
        onClose={() => setImportPrompt(null)}
        onConfirm={(mode) => {
          if (!importPrompt) return;
          const pending = importPrompt;
          setImportPrompt(null);
          handleImport(pending.kind, pending.file, mode);
        }}
      />
      <BulkDeleteConfirm
        state={bulkDeleteTarget}
        pending={bulkDeletePkgs.isPending || bulkDeleteDests.isPending}
        onClose={() => setBulkDeleteTarget(null)}
        onConfirm={() => {
          if (!bulkDeleteTarget) return;
          if (bulkDeleteTarget.kind === "packages") {
            bulkDeletePkgs.mutate(bulkDeleteTarget.ids);
          } else {
            bulkDeleteDests.mutate(bulkDeleteTarget.ids);
          }
        }}
      />

      {/* Import result banner */}
      {importStatus && (
        <div
          className={`mb-6 rounded-2xl p-4 text-sm flex items-start gap-3 ${importStatus.errors.length ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}`}
        >
          <div className="flex-1">
            <span className="font-bold">
              {importStatus.errors.length === 0 ? "✓ " : "⚠ "}
              {importStatus.imported} row{importStatus.imported !== 1 ? "s" : ""} imported (
              {importStatus.kind})
            </span>
            {importStatus.errors.length > 0 && (
              <ul className="mt-2 space-y-1 font-mono text-xs text-red-700 dark:text-red-400">
                {importStatus.errors.slice(0, 5).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {importStatus.errors.length > 5 && (
                  <li>…and {importStatus.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Section toggle */}
      <div className="mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl border border-border bg-secondary/30 p-1">
          {(["packages", "destinations"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition-all ${
                section === s
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary">
            <Upload className="size-3" /> Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setImportPrompt({ kind: section, file: f });
                  e.target.value = "";
                }
              }}
            />
          </label>
          <button
            onClick={() => api.adminExportCsv(section)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary"
          >
            <Download className="size-3" /> Export CSV
          </button>
          <a
            href={api.csvTemplateUrl(section)}
            download={`${section}_template.csv`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary"
          >
            <Download className="size-3" /> Template
          </a>
          <button
            type="button"
            onClick={() =>
              section === "packages"
                ? setPkgModal({ mode: "add", data: emptyPkg() })
                : setDestModal({ mode: "add", data: emptyDest() })
            }
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background"
          >
            <Plus className="size-4" /> Add {section === "packages" ? "Package" : "Destination"}
          </button>
        </div>
      </div>

      {/* ── Packages list ── */}
      {section === "packages" && (
        <div className="space-y-3">
          <BulkBar count={pkgBulk.selected.size} onClear={pkgBulk.clearSelection}>
            <button
              type="button"
              onClick={() => {
                const selected = pkgs.filter((pkg) => pkgBulk.selected.has(pkg.slug));
                downloadSelectedPackages(selected);
                setResultPopup({
                  title: "Bulk modify CSV downloaded",
                  tone: "success",
                  message:
                    "Edit the selected package rows in the CSV, then use Import CSV and choose Update existing.",
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-bold hover:bg-secondary"
            >
              <Download className="size-3" /> Bulk modify CSV
            </button>
            <button
              type="button"
              disabled={bulkDeletePkgs.isPending}
              onClick={() =>
                setBulkDeleteTarget({ kind: "packages", ids: Array.from(pkgBulk.selected) })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3" /> Delete selected
            </button>
          </BulkBar>
          {pkgsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {pkgs.map((pkg) => (
            <div
              key={pkg.slug}
              onClick={() => pkgBulk.toggleOne(pkg.slug)}
              className={`flex items-start gap-3 rounded-2xl border bg-card p-4 cursor-pointer transition-colors ${pkgBulk.selected.has(pkg.slug) ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"}`}
            >
              <RowCheck
                checked={pkgBulk.selected.has(pkg.slug)}
                onToggle={() => pkgBulk.toggleOne(pkg.slug)}
              />
              <AdminMediaPreview
                src={resolveAdminMediaUrl(pkg.image_url, pkg.slug, "300/220")}
                alt={pkg.title}
                className="h-20 w-28 flex-none rounded-xl object-cover bg-secondary"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold">{pkg.title}</span>
                  {pkg.category && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                      {pkg.category}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pkg.published === false ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}
                  >
                    {pkg.published === false ? "Draft" : "Published"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pkg.location} · {pkg.days} days · ${pkg.price.toLocaleString()}
                </p>
                {pkg.tagline && (
                  <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-1">
                    {pkg.tagline}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() =>
                    setPkgModal({
                      mode: "edit",
                      data: {
                        ...packageToForm(pkg),
                      },
                    })
                  }
                  className="rounded-full border border-border p-2 hover:bg-secondary"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPkgDeleteSlug(pkg.slug)}
                  className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Destinations list ── */}
      {section === "destinations" && (
        <div className="space-y-3">
          <BulkBar count={destBulk.selected.size} onClear={destBulk.clearSelection}>
            <button
              type="button"
              onClick={() => {
                const selected = dests.filter((dest) => destBulk.selected.has(dest.slug));
                downloadSelectedDestinations(selected);
                setResultPopup({
                  title: "Bulk modify CSV downloaded",
                  tone: "success",
                  message:
                    "Edit the selected destination rows in the CSV, then use Import CSV and choose Update existing.",
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-bold hover:bg-secondary"
            >
              <Download className="size-3" /> Bulk modify CSV
            </button>
            <button
              type="button"
              disabled={bulkDeleteDests.isPending}
              onClick={() =>
                setBulkDeleteTarget({ kind: "destinations", ids: Array.from(destBulk.selected) })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3" /> Delete selected
            </button>
          </BulkBar>
          {destsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {dests.map((dest) => (
            <div
              key={dest.slug}
              onClick={() => destBulk.toggleOne(dest.slug)}
              className={`flex items-start gap-3 rounded-2xl border bg-card p-4 cursor-pointer transition-colors ${destBulk.selected.has(dest.slug) ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"}`}
            >
              <RowCheck
                checked={destBulk.selected.has(dest.slug)}
                onToggle={() => destBulk.toggleOne(dest.slug)}
              />
              <AdminMediaPreview
                src={resolveAdminMediaUrl(dest.image_url, dest.slug, "300/220")}
                alt={dest.name}
                className="h-20 w-28 flex-none rounded-xl object-cover bg-secondary"
              />
              <div className="min-w-0 flex-1">
                <span className="text-base font-extrabold">{dest.name}</span>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[
                    dest.duration,
                    dest.price ? `$${dest.price.toLocaleString()}` : null,
                    `${dest.packages_count} packages`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {dest.tagline && (
                  <p className="mt-1 text-xs text-muted-foreground/70">{dest.tagline}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() =>
                    setDestModal({
                      mode: "edit",
                      data: {
                        slug: dest.slug,
                        name: dest.name,
                        image_url: dest.image_url ?? "",
                        tagline: dest.tagline ?? "",
                        duration: dest.duration ?? "",
                        price: dest.price ? String(dest.price) : "",
                        packages_count: String(dest.packages_count),
                        gallery: (dest.gallery ?? []) as DestGalleryItem[],
                      },
                    })
                  }
                  className="rounded-full border border-border p-2 hover:bg-secondary"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDestDeleteSlug(dest.slug)}
                  className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Package modal ── */}
      {pkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPkgModal(null)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-extrabold">
                {pkgModal.mode === "add" ? "Add Package" : "Edit Package"}
              </h2>
              <button
                type="button"
                onClick={() => setPkgModal(null)}
                className="rounded-full p-1.5 hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="max-h-[75vh] overflow-y-auto p-6"
              onSubmit={(e) => {
                e.preventDefault();
                savePkg.mutate(pkgModal.data);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField
                  label="Package slug *"
                  hint={
                    pkgModal.mode === "edit"
                      ? "Cannot change after creation"
                      : "URL-friendly ID, e.g. bali-luxury"
                  }
                >
                  <input
                    required
                    value={pkgModal.data.slug}
                    disabled={pkgModal.mode === "edit"}
                    onChange={(e) =>
                      setPkgModal((m) => m && { ...m, data: { ...m.data, slug: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="bali-luxury-escape"
                  />
                </AdminField>
                <AdminField label="Title *">
                  <input
                    required
                    value={pkgModal.data.title}
                    onChange={(e) =>
                      setPkgModal((m) => m && { ...m, data: { ...m.data, title: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="Bali Luxury Escape"
                  />
                </AdminField>
                <AdminField label="Location *">
                  <input
                    required
                    value={pkgModal.data.location}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, location: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="Indonesia"
                  />
                </AdminField>
                <AdminField label="Category">
                  <input
                    value={pkgModal.data.category}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, category: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="Luxury / Adventure / Signature…"
                  />
                </AdminField>
                <AdminField label="Days *">
                  <input
                    required
                    type="number"
                    min={1}
                    value={pkgModal.data.days}
                    onChange={(e) =>
                      setPkgModal((m) => m && { ...m, data: { ...m.data, days: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="7"
                  />
                </AdminField>
                <AdminField label="Price (USD) *">
                  <input
                    required
                    type="number"
                    min={0}
                    value={pkgModal.data.price}
                    onChange={(e) =>
                      setPkgModal((m) => m && { ...m, data: { ...m.data, price: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="4999"
                  />
                </AdminField>
                <AdminField label="Cover image / video" className="sm:col-span-2">
                  <PackageMediaUpload
                    imageUrl={pkgModal.data.image_url}
                    slug={pkgModal.data.slug || pkgModal.data.title || "package"}
                    title={pkgModal.data.title || "Package media"}
                    onUploaded={(url) =>
                      setPkgModal((m) => m && { ...m, data: { ...m.data, image_url: url } })
                    }
                  />
                  <input
                    value={pkgModal.data.image_url}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, image_url: e.target.value } },
                      )
                    }
                    className="admin-input mt-3"
                    placeholder="https://example.com/photo.jpg or https://example.com/reel.mp4"
                  />
                </AdminField>

                {/* Additional gallery media */}
                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-xs font-semibold text-foreground">Gallery (additional photos &amp; videos)</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Upload or paste links for extra images/videos shown in the package gallery. The first entry also auto-fills the cover if left blank.
                  </p>
                  {pkgModal.data.media_urls.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {pkgModal.data.media_urls.map((url, i) => (
                        <div key={url} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-border bg-secondary">
                          {/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) ? (
                            <div className="flex h-full items-center justify-center">
                              <Video className="size-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img src={resolveAdminMediaUrl(url, pkgModal.data.slug || "pkg", "200/150")} alt="" className="h-full w-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setPkgModal((m) => m && {
                                ...m,
                                data: { ...m.data, media_urls: m.data.media_urls.filter((_, idx) => idx !== i) },
                              })
                            }
                            className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:flex"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <DestinationGalleryUpload
                    slug={pkgModal.data.slug || "package"}
                    onAdded={(urls) =>
                      setPkgModal((m) => {
                        if (!m) return m;
                        const merged = [...m.data.media_urls, ...urls];
                        return {
                          ...m,
                          data: {
                            ...m.data,
                            media_urls: merged,
                            image_url: m.data.image_url || merged[0] || "",
                          },
                        };
                      })
                    }
                  />
                </div>

                <AdminField label="Tagline" className="sm:col-span-2">
                  <input
                    value={pkgModal.data.tagline}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, tagline: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="Short one-line hook"
                  />
                </AdminField>
                <AdminField label="Description" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    value={pkgModal.data.description}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, description: e.target.value } },
                      )
                    }
                    className="admin-input resize-none"
                    placeholder="Full package description…"
                  />
                </AdminField>
                <AdminField label="Status" className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={pkgModal.data.published}
                      onChange={(e) =>
                        setPkgModal(
                          (m) => m && { ...m, data: { ...m.data, published: e.target.checked } },
                        )
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-semibold">Published (visible to customers)</span>
                  </label>
                </AdminField>

                {/* Card type */}
                <AdminField label="Card type" className="sm:col-span-2">
                  <div className="flex gap-3">
                    {(["normal", "pomplate"] as const).map((ct) => (
                      <label key={ct} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 ${pkgModal.data.card_type === ct ? "border-accent bg-accent/5" : "border-border"}`}>
                        <input
                          type="radio"
                          name="card_type"
                          value={ct}
                          checked={pkgModal.data.card_type === ct}
                          onChange={() => setPkgModal((m) => m && { ...m, data: { ...m.data, card_type: ct } })}
                          className="accent-accent"
                        />
                        <span className="text-sm font-semibold capitalize">{ct}</span>
                        {ct === "pomplate" && <span className="text-xs text-muted-foreground">(template layout)</span>}
                      </label>
                    ))}
                  </div>
                </AdminField>

                {/* Linked destinations */}
                <AdminField label="Linked destinations" className="sm:col-span-2">
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-white p-3 space-y-1.5">
                    {dests.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No destinations yet.</p>
                    ) : dests.map((dest) => {
                      const checked = pkgModal.data.destination_slugs.includes(dest.slug);
                      return (
                        <label key={dest.slug} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-0.5 hover:bg-secondary/50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPkgModal((m) => m && {
                                ...m,
                                data: {
                                  ...m.data,
                                  destination_slugs: checked
                                    ? m.data.destination_slugs.filter((s) => s !== dest.slug)
                                    : [...m.data.destination_slugs, dest.slug],
                                },
                              })
                            }
                            className="h-4 w-4 accent-accent"
                          />
                          <span className="text-sm font-medium">{dest.name}</span>
                          <span className="text-xs text-muted-foreground">({dest.slug})</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Save current pkg form, switch to Destinations section, open full add form
                      pendingDestLinkRef.current = { mode: pkgModal.mode, form: pkgModal.data };
                      setPkgModal(null);
                      setSection("destinations");
                      setDestModal({ mode: "add", data: emptyDest() });
                    }}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    <Plus className="size-3.5" /> Add new destination
                  </button>
                </AdminField>

                {/* Linked services */}
                <AdminField label="Linked services" className="sm:col-span-2">
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-white p-3 space-y-1.5">
                    {allServicesPkg.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No services yet.</p>
                    ) : allServicesPkg.map((svc) => {
                      const svcId = Number(svc.id);
                      const checked = pkgModal.data.service_ids.includes(svcId);
                      return (
                        <label key={svc.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-0.5 hover:bg-secondary/50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPkgModal((m) => m && {
                                ...m,
                                data: {
                                  ...m.data,
                                  service_ids: checked
                                    ? m.data.service_ids.filter((id) => id !== svcId)
                                    : [...m.data.service_ids, svcId],
                                },
                              })
                            }
                            className="h-4 w-4 accent-accent"
                          />
                          <span className="text-sm font-medium">{svc.name}</span>
                          {svc.category && <span className="text-xs text-muted-foreground">{svc.category}</span>}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Save pkg form to sessionStorage, switch to Services tab (full form)
                      const pending: PkgLinkPending = {
                        pkgMode: pkgModal.mode,
                        pkgForm: pkgModal.data,
                        linkType: "service",
                      };
                      sessionStorage.setItem(PKG_LINK_KEY, JSON.stringify(pending));
                      setPkgModal(null);
                      setActiveTabFromPkg("services");
                    }}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    <Plus className="size-3.5" /> Add new service
                  </button>
                </AdminField>

                {/* Linked offers */}
                <AdminField label="Linked offers" className="sm:col-span-2">
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-white p-3 space-y-1.5">
                    {allOffersPkg.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No offers yet.</p>
                    ) : allOffersPkg.map((offer) => {
                      const checked = pkgModal.data.offer_ids.includes(offer.id);
                      return (
                        <label key={offer.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-0.5 hover:bg-secondary/50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPkgModal((m) => m && {
                                ...m,
                                data: {
                                  ...m.data,
                                  offer_ids: checked
                                    ? m.data.offer_ids.filter((id) => id !== offer.id)
                                    : [...m.data.offer_ids, offer.id],
                                },
                              })
                            }
                            className="h-4 w-4 accent-accent"
                          />
                          <span className="text-sm font-medium">{offer.title}</span>
                          {offer.badge_label && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                              {offer.badge_label}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Save pkg form to sessionStorage, switch to Offers tab (full form)
                      const pending: PkgLinkPending = {
                        pkgMode: pkgModal.mode,
                        pkgForm: pkgModal.data,
                        linkType: "offer",
                      };
                      sessionStorage.setItem(PKG_LINK_KEY, JSON.stringify(pending));
                      setPkgModal(null);
                      setActiveTabFromPkg("offers");
                    }}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    <Plus className="size-3.5" /> Add new offer
                  </button>
                </AdminField>
              </div>
              {savePkg.isError && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  Save failed. Check all required fields.
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPkgModal(null)}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savePkg.isPending}
                  className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background disabled:opacity-60"
                >
                  {savePkg.isPending
                    ? "Saving…"
                    : pkgModal.mode === "add"
                      ? "Create Package"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Destination modal ── */}
      {destModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDestModal(null)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-extrabold">
                {destModal.mode === "add" ? "Add Destination" : "Edit Destination"}
              </h2>
              <button
                type="button"
                onClick={() => setDestModal(null)}
                className="rounded-full p-1.5 hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="max-h-[75vh] overflow-y-auto p-6"
              onSubmit={(e) => {
                e.preventDefault();
                saveDest.mutate(destModal.data);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField
                  label="Slug *"
                  hint={destModal.mode === "edit" ? "Cannot change after creation" : "e.g. bali"}
                >
                  <input
                    required
                    value={destModal.data.slug}
                    disabled={destModal.mode === "edit"}
                    onChange={(e) =>
                      setDestModal((m) => m && { ...m, data: { ...m.data, slug: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="bali"
                  />
                </AdminField>
                <AdminField label="Name *">
                  <input
                    required
                    value={destModal.data.name}
                    onChange={(e) =>
                      setDestModal((m) => m && { ...m, data: { ...m.data, name: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="Bali"
                  />
                </AdminField>
                <AdminField label="Duration">
                  <input
                    value={destModal.data.duration}
                    onChange={(e) =>
                      setDestModal(
                        (m) => m && { ...m, data: { ...m.data, duration: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="7 Days"
                  />
                </AdminField>
                <AdminField label="Starting price (USD)">
                  <input
                    type="number"
                    min={0}
                    value={destModal.data.price}
                    onChange={(e) =>
                      setDestModal((m) => m && { ...m, data: { ...m.data, price: e.target.value } })
                    }
                    className="admin-input"
                    placeholder="2999"
                  />
                </AdminField>
                <AdminField label="Cover Image URL" className="sm:col-span-2">
                  <input
                    value={destModal.data.image_url}
                    onChange={(e) =>
                      setDestModal(
                        (m) => m && { ...m, data: { ...m.data, image_url: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="https://… or /uploads/image.jpg (auto-set from first gallery upload)"
                  />
                </AdminField>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold text-foreground">Gallery (images &amp; videos)</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Upload 1 or more photos/videos. The first upload will also set the cover image if none is specified.
                  </p>
                  {destModal.data.gallery.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {destModal.data.gallery.map((item, i) => (
                        <div key={item.src} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-border bg-secondary">
                          {item.type === "video" ? (
                            <div className="flex h-full items-center justify-center">
                              <Video className="size-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <img src={resolveAdminMediaUrl(item.src, destModal.data.slug || "dest", "200/150")} alt="" className="h-full w-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setDestModal((m) => m && { ...m, data: { ...m.data, gallery: m.data.gallery.filter((_, idx) => idx !== i) } })}
                            className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:flex"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <DestinationGalleryUpload
                    slug={destModal.data.slug || "destination"}
                    onAdded={(urls) => {
                      const newItems: DestGalleryItem[] = urls.map((url) => ({
                        type: /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) ? "video" : "photo",
                        src: url,
                        caption: "",
                        author: "",
                      }));
                      setDestModal((m) => {
                        if (!m) return m;
                        const merged = [...m.data.gallery, ...newItems];
                        return {
                          ...m,
                          data: {
                            ...m.data,
                            gallery: merged,
                            image_url: m.data.image_url || merged[0]?.src || "",
                          },
                        };
                      });
                    }}
                  />
                </div>
                <AdminField label="Tagline" className="sm:col-span-2">
                  <input
                    value={destModal.data.tagline}
                    onChange={(e) =>
                      setDestModal(
                        (m) => m && { ...m, data: { ...m.data, tagline: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="The island of gods"
                  />
                </AdminField>
              </div>
              {saveDest.isError && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  Save failed. Check all required fields.
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDestModal(null)}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveDest.isPending}
                  className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background disabled:opacity-60"
                >
                  {saveDest.isPending
                    ? "Saving…"
                    : destModal.mode === "add"
                      ? "Create Destination"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirms ── */}
      {pkgDeleteSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPkgDeleteSlug(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold">Delete package?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently removes <strong>{pkgDeleteSlug}</strong> and cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPkgDeleteSlug(null)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePkg.isPending}
                onClick={() => deletePkg.mutate(pkgDeleteSlug)}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deletePkg.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {destDeleteSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDestDeleteSlug(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold">Delete destination?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently removes <strong>{destDeleteSlug}</strong>.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDestDeleteSlug(null)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDest.isPending}
                onClick={() => deleteDest.mutate(destDeleteSlug)}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleteDest.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PackageModal({
  modal,
  setModal,
  onClose,
  onSubmit,
  isPending,
  isError,
}: {
  modal: { mode: "add" | "edit"; data: PkgForm } | null;
  setModal: Dispatch<SetStateAction<{ mode: "add" | "edit"; data: PkgForm } | null>>;
  onClose: () => void;
  onSubmit: (form: PkgForm) => void;
  isPending: boolean;
  isError: boolean;
}) {
  if (!modal) return null;

  const update = (field: keyof PkgForm, value: string | boolean) => {
    setModal((m) => m && { ...m, data: { ...m.data, [field]: value } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold">
              {modal.mode === "add" ? "Add Package" : "Edit Package"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add details manually, upload local media, or paste an image or video URL.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
        <form
          className="max-h-[75vh] overflow-y-auto p-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(modal.data);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField
              label="Package slug *"
              hint={
                modal.mode === "edit"
                  ? "Cannot change after creation"
                  : "URL-friendly ID, e.g. bali-luxury"
              }
            >
              <input
                required
                value={modal.data.slug}
                disabled={modal.mode === "edit"}
                onChange={(e) => update("slug", e.target.value)}
                className="admin-input"
                placeholder="bali-luxury-escape"
              />
            </AdminField>
            <AdminField label="Title *">
              <input
                required
                value={modal.data.title}
                onChange={(e) => update("title", e.target.value)}
                className="admin-input"
                placeholder="Bali Luxury Escape"
              />
            </AdminField>
            <AdminField label="Location *">
              <input
                required
                value={modal.data.location}
                onChange={(e) => update("location", e.target.value)}
                className="admin-input"
                placeholder="Indonesia"
              />
            </AdminField>
            <AdminField label="Category">
              <input
                value={modal.data.category}
                onChange={(e) => update("category", e.target.value)}
                className="admin-input"
                placeholder="Luxury / Adventure / Signature"
              />
            </AdminField>
            <AdminField label="Days *">
              <input
                required
                type="number"
                min={1}
                value={modal.data.days}
                onChange={(e) => update("days", e.target.value)}
                className="admin-input"
                placeholder="7"
              />
            </AdminField>
            <AdminField label="Price (USD) *">
              <input
                required
                type="number"
                min={0}
                value={modal.data.price}
                onChange={(e) => update("price", e.target.value)}
                className="admin-input"
                placeholder="4999"
              />
            </AdminField>
            <AdminField label="Image or video URL" className="sm:col-span-2">
              <PackageMediaUpload
                imageUrl={modal.data.image_url}
                slug={modal.data.slug || modal.data.title || "package"}
                title={modal.data.title || "Package media"}
                onUploaded={(url) => update("image_url", url)}
              />
              <input
                value={modal.data.image_url}
                onChange={(e) => update("image_url", e.target.value)}
                className="admin-input mt-3"
                placeholder="https://example.com/photo.jpg or https://example.com/reel.mp4"
              />
            </AdminField>
            <AdminField label="Tagline" className="sm:col-span-2">
              <input
                value={modal.data.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                className="admin-input"
                placeholder="Short one-line hook"
              />
            </AdminField>
            <AdminField label="Description" className="sm:col-span-2">
              <textarea
                rows={3}
                value={modal.data.description}
                onChange={(e) => update("description", e.target.value)}
                className="admin-input resize-none"
                placeholder="Full package description"
              />
            </AdminField>
            <AdminField label="Status" className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={modal.data.published}
                  onChange={(e) => update("published", e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-semibold">Published</span>
              </label>
            </AdminField>
          </div>
          {isError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              Save failed. Check all required fields.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background disabled:opacity-60"
            >
              {isPending ? "Saving..." : modal.mode === "add" ? "Create Package" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PackageMediaUpload({
  imageUrl,
  slug,
  title,
  onUploaded,
}: {
  imageUrl: string;
  slug: string;
  title: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = imageUrl ? resolveAdminMediaUrl(imageUrl, slug, "600/400") : "";
  const { selected, setSelected, backends, configuredKeys, resolveBackend, pendingConfirm } = useStorageBackend();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    const resolvedBackend = await resolveBackend();
    if (resolvedBackend === null) return; // user cancelled
    setUploading(true);
    try {
      const uploaded = await api.adminUploadMedia(file, title, resolvedBackend);
      onUploaded(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try another file.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/25 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {previewUrl ? (
          <AdminMediaPreview
            src={previewUrl}
            alt={title}
            className="h-24 w-full rounded-lg object-cover bg-secondary sm:w-36"
          />
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:w-36">
            <Image className="size-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-bold">Upload file</p>
          <StorageBackendPicker
            selected={selected}
            onChange={setSelected}
            backends={backends}
            configuredKeys={configuredKeys}
            pendingConfirm={pendingConfirm}
            className="mb-2"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            JPG, PNG, WebP, MP4, or MOV. The URL will be saved below.
          </p>
          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-bold text-background disabled:opacity-60"
            >
              <Upload className="size-3.5" />
              {uploading ? "Uploading..." : imageUrl ? "Replace file" : "Upload file"}
            </button>
            {imageUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => onUploaded("")}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-xs font-bold disabled:opacity-60"
              >
                Clear media
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

function AdminField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {hint && <p className="mb-1 text-[11px] text-muted-foreground/60">{hint}</p>}
      {children}
    </div>
  );
}

// ── Media tab ─────────────────────────────────────────────────────────────────

function MediaTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [assignTarget, setAssignTarget] = useState<ApiMedia | null>(null);
  const [assignType, setAssignType] = useState("package");
  const [assignSlug, setAssignSlug] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadBackend, setUploadBackend] = useState<string>("auto");
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [unconfiguredLabel, setUnconfiguredLabel] = useState<string | null>(null);

  const mediaQuery = useQuery({
    queryKey: ["admin-media", page],
    queryFn: () => api.adminListMedia(page),
  });
  const data = mediaQuery.data;

  const { data: backendsData } = useQuery({
    queryKey: ["storage-backends"],
    queryFn: () =>
      fetch(`${API_BASE_URL}/admin/storage/backends`, {
        headers: { "x-admin-token": "dev-admin-token" },
      }).then((r) => r.json() as Promise<{ backends: { key: string; label: string }[] }>),
  });
  const availableBackends = backendsData?.backends ?? [];
  const configuredBackendKeys = new Set(availableBackends.map((b: { key: string }) => b.key));

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof api.adminUpdateMedia>[1];
    }) => api.adminUpdateMedia(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media"] }),
  });

  const deleteMut = useMutation({
    mutationFn: api.adminDeleteMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media"] }),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const backend = uploadBackend === "auto" ? "" : uploadBackend;
      const url = backend
        ? `${API_BASE_URL}/media?storage_backend=${encodeURIComponent(backend)}`
        : `${API_BASE_URL}/media`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-admin-token": "dev-admin-token" },
        body: form,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail ?? "Upload failed");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-media"] }),
  });

  function saveAlt(id: number) {
    updateMut.mutate({ id, payload: { alt_text: editAlt } });
    setEditingId(null);
  }

  function saveAssign() {
    if (!assignTarget) return;
    updateMut.mutate({
      id: assignTarget.id,
      payload: { owner_type: assignType, owner_slug: assignSlug },
    });
    setAssignTarget(null);
    setAssignSlug("");
  }

  const isImage = (m: ApiMedia) => m.content_type?.startsWith("image/");

  return (
    <div>
      <SectionHeader title="Media assets">
        <span className="text-xs text-muted-foreground">{data?.total ?? 0} files</span>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-accent"
        >
          <Upload className="size-3" /> Upload media
        </button>
        <select
          value={uploadBackend}
          onChange={(e) => setUploadBackend(e.target.value)}
          title="Storage destination"
          className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-accent"
        >
          <option value="auto">Auto (server default)</option>
          {availableBackends.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/mp4,video/quicktime,application/pdf,text/csv,.xlsx,.xls"
          multiple
          onChange={(e) => {
            if (!e.target.files) return;
            const files = Array.from(e.target.files);
            e.target.value = "";
            const effective = uploadBackend === "auto" ? "local" : uploadBackend;
            if (effective !== "local" && !configuredBackendKeys.has(effective)) {
              const labelMap: Record<string, string> = { gdrive: "Google Drive", r2: "Cloudflare R2" };
              setUnconfiguredLabel(labelMap[effective] ?? effective);
              setPendingFiles(files);
            } else {
              for (const f of files) uploadMut.mutate(f);
            }
          }}
        />
      </SectionHeader>

      {unconfiguredLabel && pendingFiles && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="flex-1 text-sm font-semibold text-amber-800">
            {unconfiguredLabel} is not configured. Upload to local storage instead?
          </span>
          <button
            type="button"
            onClick={() => {
              for (const f of pendingFiles) uploadMut.mutate(f);
              setPendingFiles(null); setUnconfiguredLabel(null);
            }}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
          >Yes, use local</button>
          <button
            type="button"
            onClick={() => { setPendingFiles(null); setUnconfiguredLabel(null); }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary"
          >Cancel</button>
        </div>
      )}

      {uploadMut.isError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Upload failed: {uploadMut.error instanceof Error ? uploadMut.error.message : "Unknown error"}
        </div>
      )}

      {mediaQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse aspect-square rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {(data?.items ?? []).map((m) => (
              <div
                key={m.id}
                className="group relative rounded-xl border border-border overflow-hidden bg-secondary"
              >
                {/* Preview */}
                <div className="aspect-square overflow-hidden">
                  {isImage(m) ? (
                    <img
                      src={`http://localhost:8000${m.url}`}
                      alt={m.alt_text ?? m.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Video className="size-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Owner badge */}
                <div className="absolute left-2 top-2">
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                    {m.owner_type ?? "—"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setAssignTarget(m)}
                    className="rounded-full bg-black/60 p-1 hover:bg-accent"
                    title="Assign to package/destination"
                  >
                    <Link2 className="size-3 text-white" />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(m.id)}
                    className="rounded-full bg-red-600/80 p-1 hover:bg-red-600"
                    title="Delete"
                  >
                    <Trash2 className="size-3 text-white" />
                  </button>
                </div>

                {/* Alt text row */}
                <div className="p-2">
                  {editingId === m.id ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveAlt(m.id)}
                        className="flex-1 min-w-0 text-[11px] rounded border border-border bg-background px-1.5 py-0.5 focus:outline-none"
                        placeholder="Alt text"
                      />
                      <button onClick={() => saveAlt(m.id)} className="text-emerald-600">
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setEditAlt(m.alt_text ?? "");
                      }}
                      className="flex w-full items-center gap-1 text-left"
                      title="Click to edit alt text"
                    >
                      <span className="truncate text-[11px] text-muted-foreground flex-1">
                        {m.alt_text || <span className="italic opacity-50">No alt text</span>}
                      </span>
                      <Pencil className="size-2.5 shrink-0 text-muted-foreground/40" />
                    </button>
                  )}
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/50">
                    {m.content_type?.split("/")[0] === "image" ? (
                      <span className="inline-flex items-center gap-1">
                        <Image className="size-2.5" /> {(m.size_bytes / 1024).toFixed(0)} KB
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Video className="size-2.5" /> {(m.size_bytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(data?.pages ?? 1) > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-full border border-border p-2 hover:bg-secondary disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-xs text-muted-foreground">
                Page {data?.page} of {data?.pages}
              </span>
              <button
                disabled={page === data?.pages}
                onClick={() => setPage(page + 1)}
                className="rounded-full border border-border p-2 hover:bg-secondary disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAssignTarget(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-extrabold tracking-tight">Assign media</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold">Owner type</label>
                <select
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="package">Package</option>
                  <option value="destination">Destination</option>
                  <option value="admin">Admin (general)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Slug / identifier</label>
                <input
                  value={assignSlug}
                  onChange={(e) => setAssignSlug(e.target.value)}
                  placeholder="e.g. bangkok-singapore"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setAssignTarget(null)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveAssign}
                className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-bold text-background hover:bg-accent"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reviews tab ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "flagged"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function ReviewsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () => api.adminListReviews(filter === "all" ? undefined : filter),
  });
  const reviews = reviewsQuery.data ?? [];

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof api.adminUpdateReview>[1];
    }) => api.adminUpdateReview(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setEditingId(null);
      setFlaggingId(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.adminDeleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => api.adminReplyToReview(id, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setReplyingId(null);
      setReplyText("");
    },
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => api.adminVerifyReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "approve" | "reject" }) =>
      api.adminBulkReviews(ids, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setSelected(new Set());
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === reviews.length) setSelected(new Set());
    else setSelected(new Set(reviews.map((r) => r.public_id)));
  }

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700",
    approved: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-red-500/15 text-red-600",
    flagged: "bg-orange-500/15 text-orange-700",
  };

  return (
    <div>
      {/* Filters + bulk */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setFilter(s);
                setSelected(new Set());
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
                filter === s ? "bg-foreground text-background" : "hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <button
              onClick={() => bulkMut.mutate({ ids: Array.from(selected), action: "approve" })}
              disabled={bulkMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" /> Approve all
            </button>
            <button
              onClick={() => bulkMut.mutate({ ids: Array.from(selected), action: "reject" })}
              disabled={bulkMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
            >
              <XCircle className="size-3.5" /> Reject all
            </button>
          </div>
        )}
      </div>

      {/* Select all row */}
      {reviews.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {selected.size === reviews.length ? (
              <SquareCheck className="size-4 text-accent" />
            ) : (
              <Square className="size-4" />
            )}
            Select all ({reviews.length})
          </button>
        </div>
      )}

      {reviewsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border p-5 h-32" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <AdminEmptyState message={`No ${filter === "all" ? "" : filter + " "}reviews.`} />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewModerationCard
              key={review.public_id}
              review={review}
              selected={selected.has(review.public_id)}
              onSelect={() => toggleSelect(review.public_id)}
              editingBody={editingId === review.public_id}
              editBody={editBody}
              onEditBodyChange={setEditBody}
              onStartEdit={() => {
                setEditingId(review.public_id);
                setEditBody(review.body);
              }}
              onSaveEdit={() =>
                updateMut.mutate({ id: review.public_id, payload: { body: editBody } })
              }
              onCancelEdit={() => setEditingId(null)}
              flagging={flaggingId === review.public_id}
              flagReason={flagReason}
              onFlagReasonChange={setFlagReason}
              onStartFlag={() => {
                setFlaggingId(review.public_id);
                setFlagReason("");
              }}
              onSaveFlag={() =>
                updateMut.mutate({
                  id: review.public_id,
                  payload: { status: "flagged", flag_reason: flagReason },
                })
              }
              onCancelFlag={() => setFlaggingId(null)}
              onApprove={() =>
                updateMut.mutate({ id: review.public_id, payload: { status: "approved" } })
              }
              onReject={() =>
                updateMut.mutate({ id: review.public_id, payload: { status: "rejected" } })
              }
              onDelete={() => deleteMut.mutate(review.public_id)}
              replying={replyingId === review.public_id}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onStartReply={() => {
                setReplyingId(review.public_id);
                setReplyText((review as unknown as { admin_reply?: string }).admin_reply ?? "");
              }}
              onSaveReply={() => replyMut.mutate({ id: review.public_id, reply: replyText })}
              onCancelReply={() => {
                setReplyingId(null);
                setReplyText("");
              }}
              onToggleVerify={() => verifyMut.mutate(review.public_id)}
              statusColor={statusColor}
              loading={
                updateMut.isPending ||
                deleteMut.isPending ||
                replyMut.isPending ||
                verifyMut.isPending
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewModerationCard({
  review,
  selected,
  onSelect,
  editingBody,
  editBody,
  onEditBodyChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  flagging,
  flagReason,
  onFlagReasonChange,
  onStartFlag,
  onSaveFlag,
  onCancelFlag,
  onApprove,
  onReject,
  onDelete,
  replying,
  replyText,
  onReplyTextChange,
  onStartReply,
  onSaveReply,
  onCancelReply,
  onToggleVerify,
  statusColor,
  loading,
}: {
  review: AdminReview;
  selected: boolean;
  onSelect: () => void;
  editingBody: boolean;
  editBody: string;
  onEditBodyChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  flagging: boolean;
  flagReason: string;
  onFlagReasonChange: (v: string) => void;
  onStartFlag: () => void;
  onSaveFlag: () => void;
  onCancelFlag: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  replying: boolean;
  replyText: string;
  onReplyTextChange: (v: string) => void;
  onStartReply: () => void;
  onSaveReply: () => void;
  onCancelReply: () => void;
  onToggleVerify: () => void;
  statusColor: Record<string, string>;
  loading: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${selected ? "border-accent bg-accent/5" : "border-border"}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button type="button" onClick={onSelect} className="mt-0.5 shrink-0">
          {selected ? (
            <SquareCheck className="size-4 text-accent" />
          ) : (
            <Square className="size-4 text-muted-foreground/50" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-bold text-sm">{review.customer_name}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">
              {review.package_title ?? review.package_slug}
            </span>
            <span className="text-muted-foreground text-xs">·</span>
            <StarRating value={review.rating} readonly size="sm" />
            <span
              className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusColor[review.status] ?? "bg-secondary"}`}
            >
              {review.status}
            </span>
          </div>

          {/* Body */}
          {editingBody ? (
            <div className="space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => onEditBodyChange(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveEdit}
                  disabled={loading}
                  className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background hover:bg-accent disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-bold hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
          )}

          {/* Flag reason */}
          {review.flag_reason && !flagging && (
            <p className="mt-2 rounded-lg bg-orange-50 px-3 py-1.5 text-xs text-orange-700">
              <Flag className="mr-1 inline size-3" /> {review.flag_reason}
            </p>
          )}

          {/* Flag input */}
          {flagging && (
            <div className="mt-3 space-y-2">
              <input
                autoFocus
                value={flagReason}
                onChange={(e) => onFlagReasonChange(e.target.value)}
                placeholder="Reason for flagging (e.g. spam, offensive content)…"
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveFlag}
                  disabled={loading || !flagReason.trim()}
                  className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  Flag
                </button>
                <button
                  onClick={onCancelFlag}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-bold hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Admin reply input */}
          {replying && (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                rows={3}
                placeholder="Write your reply as JourneyMakers…"
                className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={onSaveReply}
                  disabled={loading || !replyText.trim()}
                  className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background hover:bg-accent disabled:opacity-50"
                >
                  Save reply
                </button>
                <button
                  onClick={onCancelReply}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-bold hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Date + action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
            <div className="ml-auto flex gap-1.5 flex-wrap">
              {review.status !== "approved" && (
                <button
                  onClick={onApprove}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="size-3" /> Approve
                </button>
              )}
              {review.status !== "rejected" && (
                <button
                  onClick={onReject}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="size-3" /> Reject
                </button>
              )}
              <button
                onClick={onToggleVerify}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-full border border-green-300 px-3 py-1 text-[11px] font-bold text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3" />{" "}
                {(review as unknown as { verified?: boolean }).verified ? "Unverify" : "Verify"}
              </button>
              {!replying && (
                <button
                  onClick={onStartReply}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-3 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                  <MessageSquare className="size-3" /> Reply
                </button>
              )}
              {!flagging && (
                <button
                  onClick={onStartFlag}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-full border border-orange-300 px-3 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  <Flag className="size-3" /> Flag
                </button>
              )}
              {!editingBody && (
                <button
                  onClick={onStartEdit}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:bg-secondary"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={loading}
                className="rounded-full border border-red-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comments tab ──────────────────────────────────────────────────────────────

const COMMENT_STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;

function CommentsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const commentsQuery = useQuery({
    queryKey: ["admin-comments", filter],
    queryFn: () => api.adminListComments(filter === "all" ? undefined : filter),
  });
  const comments = commentsQuery.data ?? [];

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.adminUpdateComment(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-comments"] }),
  });

  const deleteMut = useMutation({
    mutationFn: api.adminDeleteComment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-comments"] }),
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Comments</h2>
        <div className="flex gap-2">
          {COMMENT_STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all ${
                filter === f
                  ? "bg-foreground text-background"
                  : "border border-border hover:border-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {commentsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments found.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.public_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{c.name}</span>
                    {c.email && (
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[c.status] ?? "bg-secondary text-foreground"}`}>
                      {c.status}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {c.entity_type} / {c.entity_slug}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {c.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => updateMut.mutate({ id: c.public_id, status: "approved" })}
                      disabled={updateMut.isPending}
                      className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800 hover:bg-green-200 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {c.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => updateMut.mutate({ id: c.public_id, status: "rejected" })}
                      disabled={updateMut.isPending}
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this comment?")) deleteMut.mutate(c.public_id);
                    }}
                    disabled={deleteMut.isPending}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Planners tab ──────────────────────────────────────────────────────────────

const EMPTY_PLANNER: PlannerPayload = { name: "", email: "", specialty: "", photo_url: "" };

function PlannersTab() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPlanner | null>(null);
  const [form, setForm] = useState<PlannerPayload>(EMPTY_PLANNER);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const plannersQuery = useQuery({ queryKey: ["planners"], queryFn: api.listPlanners });
  const planners = plannersQuery.data ?? [];

  const createMut = useMutation({
    mutationFn: () => api.createPlanner(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planners"] });
      closeForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: () => api.updatePlanner(editing!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planners"] });
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.deletePlanner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planners"] });
      setDeleteConfirm(null);
    },
  });

  const plannerBulk = useBulkSelect(planners, (p) => String(p.id));
  const bulkDeletePlanners = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("planners", ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planners"] });
      plannerBulk.clearSelection();
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_PLANNER);
    setFormOpen(true);
  }
  function openEdit(p: ApiPlanner) {
    setEditing(p);
    setForm({
      name: p.name,
      email: p.email,
      specialty: p.specialty ?? "",
      photo_url: p.photo_url ?? "",
    });
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_PLANNER);
  }

  const submitting = createMut.isPending || updateMut.isPending;
  const canSubmit = form.name.trim().length >= 2 && form.email.includes("@") && !submitting;

  return (
    <div>
      <SectionHeader title="Planners & staff">
        <span className="text-xs text-muted-foreground">{planners.length} planners</span>
        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary">
          <Upload className="size-3" /> Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                await api.adminImportCsv("planners", f);
                qc.invalidateQueries({ queryKey: ["planners"] });
                e.target.value = "";
              }
            }}
          />
        </label>
        <button
          onClick={() => api.adminExportCsv("planners")}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-secondary"
        >
          <Download className="size-3" /> Export CSV
        </button>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-accent"
        >
          <Plus className="size-3" /> Add planner
        </button>
      </SectionHeader>

      <BulkBar count={plannerBulk.selected.size} onClear={plannerBulk.clearSelection}>
        <button
          type="button"
          disabled={bulkDeletePlanners.isPending}
          onClick={() => bulkDeletePlanners.mutate(Array.from(plannerBulk.selected))}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-3" /> Delete selected
        </button>
      </BulkBar>

      {plannersQuery.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border h-28" />
          ))}
        </div>
      ) : planners.length === 0 ? (
        <AdminEmptyState message="No planners yet. Add your first team member." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {planners.map((p) => (
            <div
              key={p.id}
              onClick={() => plannerBulk.toggleOne(String(p.id))}
              className={`rounded-2xl border p-5 flex gap-3 items-start cursor-pointer transition-colors ${plannerBulk.selected.has(String(p.id)) ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"}`}
            >
              <RowCheck
                checked={plannerBulk.selected.has(String(p.id))}
                onToggle={() => plannerBulk.toggleOne(String(p.id))}
              />
              {/* Avatar */}
              <div className="shrink-0">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle className="size-7 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <p className="font-extrabold tracking-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                {p.specialty && (
                  <p className="mt-1 text-xs font-semibold text-accent">{p.specialty}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:bg-secondary"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  {deleteConfirm === p.id ? (
                    <>
                      <button
                        onClick={() => deleteMut.mutate(p.id)}
                        disabled={deleteMut.isPending}
                        className="rounded-full bg-red-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Confirm delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-[11px] font-bold text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-extrabold tracking-tight">
                {editing ? "Edit planner" : "Add planner"}
              </h3>
              <button onClick={closeForm} className="rounded-full p-1.5 hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmit) return;
                if (editing) {
                  updateMut.mutate();
                } else {
                  createMut.mutate();
                }
              }}
            >
              <Field label="Full name *" id="pl-name">
                <input
                  id="pl-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Maya Rao"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Email *" id="pl-email">
                <input
                  id="pl-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="maya@journeymakers.travel"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Specialty" id="pl-spec">
                <input
                  id="pl-spec"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g. Asia journeys, Alpine luxury"
                  className={inputCls}
                />
              </Field>
              <Field label="Photo URL" id="pl-photo">
                <input
                  id="pl-photo"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://…"
                  className={inputCls}
                />
              </Field>
              {form.photo_url && (
                <img
                  src={form.photo_url}
                  alt="preview"
                  className="size-16 rounded-full object-cover border border-border"
                />
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-bold text-background hover:bg-accent disabled:opacity-40"
                >
                  {submitting ? "Saving…" : editing ? "Update" : "Add planner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none";

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold">
        {label}
      </label>
      {children}
    </div>
  );
}

function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h2 className="text-xl font-bold tracking-tighter">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon className="size-4 text-accent" />
        <span className="text-[10px] font-mono text-accent">{trend}</span>
      </div>
      <div className="text-2xl font-extrabold tracking-tighter">{value}</div>
      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

function CsvCard({
  name,
  kind,
  cols,
  sample,
  onImport,
}: {
  name: string;
  kind: string;
  cols: string;
  sample: string;
  onImport?: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm font-bold">{name}</span>
        <div className="flex items-center gap-2">
          {onImport && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    onImport(f);
                    e.target.value = "";
                  }
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs font-bold tracking-widest uppercase inline-flex items-center gap-1 hover:text-accent"
              >
                <Upload className="size-3" /> Import
              </button>
            </>
          )}
          <a
            href={api.csvTemplateUrl(kind)}
            download={`${kind}_template.csv`}
            className="text-xs font-bold tracking-widest uppercase inline-flex items-center gap-1 hover:text-accent"
          >
            <Download className="size-3" /> Template
          </a>
        </div>
      </div>
      <div className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-x-auto">
        <div className="text-muted-foreground">{cols}</div>
        <div className="mt-1 text-foreground/70">{sample}</div>
      </div>
    </div>
  );
}

// ── Services tab ──────────────────────────────────────────────────────────────

const SERVICE_STATUS = ["published", "draft", "hidden"] as const;
const SERVICE_DISPLAY_FILTERS = [
  { key: "homepage", label: "Homepage" },
  { key: "services_page", label: "Services page" },
  { key: "hero_card", label: "Hero services card" },
  { key: "footer", label: "Footer services" },
] as const;

function serviceToForm(service?: ApiService): ServicePayload {
  return {
    id: service?.id ?? "",
    name: service?.name ?? "",
    category: service?.category ?? "",
    short_description: service?.short_description ?? service?.description ?? "",
    description: service?.description ?? "",
    detailed_description: service?.detailed_description ?? service?.description ?? "",
    image_url:
      service?.image_url ?? service?.gallery?.find((item) => item.type === "photo")?.src ?? "",
    icon_url: service?.icon_url ?? "",
    image_alt: service?.image_alt ?? service?.name ?? "",
    price: service?.price ?? undefined,
    rating: service?.rating ?? 5,
    review_count: service?.review_count ?? 0,
    highlight: service?.highlight ?? "",
    badge_text: service?.badge_text ?? "",
    cta_text: service?.cta_text ?? "Explore",
    cta_link: service?.cta_link ?? "/services",
    show_homepage: service?.show_homepage ?? true,
    show_services_page: service?.show_services_page ?? true,
    show_hero_card: service?.show_hero_card ?? false,
    show_footer: service?.show_footer ?? false,
    status: service?.status ?? "published",
    gallery: service?.gallery ?? [],
    sort_order: service?.sort_order ?? 0,
  };
}

function ServicesTab() {
  const qc = useQueryClient();
  const [, setActiveTab] = useAdminTabPref();
  const servicesQ = useQuery({ queryKey: ["services"], queryFn: api.services });
  const services = servicesQ.data ?? [];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [display, setDisplay] = useState("all");
  const [editing, setEditing] = useState<ServicePayload | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const bulk = useBulkSelect(services, (s) => s.id);

  // Check if we arrived here via "Add new service" from a package modal
  const PKG_LINK_KEY = "jm_pkg_link_pending";
  const pkgLinkPending: { linkType: string; pkgForm: { title?: string } } | null = (() => {
    try {
      const raw = sessionStorage.getItem(PKG_LINK_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p.linkType === "service" && !p.linkedServiceId ? p : null;
    } catch { return null; }
  })();

  // Auto-open create drawer when redirected from package modal
  useEffect(() => {
    if (pkgLinkPending) openCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
  const filtered = services.filter((service) => {
    const haystack =
      `${service.name} ${service.category ?? ""} ${service.description}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || service.category === category;
    const matchesStatus = status === "all" || (service.status ?? "published") === status;
    const matchesDisplay =
      display === "all" ||
      (display === "homepage" && service.show_homepage !== false) ||
      (display === "services_page" && service.show_services_page !== false) ||
      (display === "hero_card" && service.show_hero_card === true) ||
      (display === "footer" && service.show_footer === true);
    return matchesQuery && matchesCategory && matchesStatus && matchesDisplay;
  });

  const saveService = useMutation({
    mutationFn: (payload: ServicePayload) =>
      drawerMode === "create" ? api.createService(payload) : api.updateService(payload.id, payload),
    onSuccess: (newSvc) => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setEditing(null);
      // If we came from "Add new service" inside a package modal, link back and return
      if (drawerMode === "create") {
        try {
          const raw = sessionStorage.getItem(PKG_LINK_KEY);
          if (raw) {
            const pending = JSON.parse(raw);
            if (pending.linkType === "service" && !pending.linkedServiceId) {
              pending.linkedServiceId = Number(newSvc.id);
              sessionStorage.setItem(PKG_LINK_KEY, JSON.stringify(pending));
              setActiveTab("packages");
              return;
            }
          }
        } catch { /* ignore */ }
      }
    },
  });
  const deleteService = useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("services", ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      bulk.clearSelection();
    },
  });
  const quickUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServicePayload> }) =>
      api.updateService(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  function openCreate() {
    setDrawerMode("create");
    setEditing(serviceToForm());
  }

  function openEdit(service: ApiService) {
    setDrawerMode("edit");
    setEditing(serviceToForm(service));
  }

  return (
    <div className="space-y-6">
      <SessionBanner error={servicesQ.error as Error | null} />
      {pkgLinkPending && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 px-5 py-3 text-sm font-medium text-accent">
          You're creating a service to link into package{" "}
          <strong>{pkgLinkPending.pkgForm?.title || "your package"}</strong>.
          Fill in the full details below and save — you'll be taken straight back to the package form.
        </div>
      )}
      <div className="rounded-2xl border border-border bg-[#fbf6ee] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-black">Services Management</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Add, edit, organize, and publish travel services shown on the homepage and Services
              page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-extrabold text-white"
            >
              <Plus className="size-4" /> Add New Service
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold hover:bg-secondary">
              <Upload className="size-4" /> Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void api
                      .adminImportCsv("services", file)
                      .then(() => qc.invalidateQueries({ queryKey: ["services"] }));
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => api.adminExportCsv("services")}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold hover:bg-secondary"
            >
              <Download className="size-4" /> Export CSV
            </button>
            <button
              type="button"
              disabled={bulk.selected.size === 0 || bulkDelete.isPending}
              onClick={() => bulkDelete.mutate(Array.from(bulk.selected))}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="size-4" /> Bulk Delete
            </button>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold hover:bg-secondary"
            >
              Preview Services Page
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by service name"
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent"
            />
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">All statuses</option>
            {SERVICE_STATUS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">All display locations</option>
            {SERVICE_DISPLAY_FILTERS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BulkBar count={bulk.selected.size} onClear={bulk.clearSelection}>
        <button
          type="button"
          onClick={() => bulkDelete.mutate(Array.from(bulk.selected))}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="size-3" /> Delete selected
        </button>
      </BulkBar>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="hidden grid-cols-[44px_76px_68px_1.1fr_0.8fr_1.4fr_80px_80px_1fr_90px_80px_150px] gap-3 border-b border-border bg-[#f7f2ea] px-4 py-3 text-[11px] font-black uppercase text-muted-foreground xl:grid">
          <span>
            <RowCheck checked={bulk.allSelected} onToggle={bulk.toggleAll} />
          </span>
          <span>Image</span>
          <span>Icon</span>
          <span>Name</span>
          <span>Category</span>
          <span>Short Description</span>
          <span>Rating</span>
          <span>Reviews</span>
          <span>Display</span>
          <span>Status</span>
          <span>Order</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((service) => (
            <div
              key={service.id}
              className={`grid gap-3 px-4 py-4 xl:grid-cols-[44px_76px_68px_1.1fr_0.8fr_1.4fr_80px_80px_1fr_90px_80px_150px] xl:items-center ${bulk.selected.has(service.id) ? "bg-accent/5" : ""}`}
            >
              <RowCheck
                checked={bulk.selected.has(service.id)}
                onToggle={() => bulk.toggleOne(service.id)}
              />
              <AdminMediaPreview
                src={resolveAdminMediaUrl(service.image_url, service.id, "160/110")}
                alt={service.image_alt || service.name}
                className="h-14 w-20 rounded-lg object-cover"
              />
              <div className="grid size-12 place-items-center overflow-hidden rounded-lg border border-border bg-[#f7f2ea]">
                {service.icon_url ? (
                  <img
                    src={resolveAdminMediaUrl(service.icon_url, service.id, "80/80")}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Image className="size-5 text-accent" />
                )}
              </div>
              <div>
                <div className="font-black">{service.name}</div>
                {service.badge_text && (
                  <span className="mt-1 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                    {service.badge_text}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-muted-foreground">
                {service.category || "General"}
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                {service.short_description || service.description}
              </div>
              <div className="text-sm font-black">★ {(service.rating ?? 0).toFixed(1)}</div>
              <div className="text-sm font-bold">{service.review_count ?? 0}</div>
              <div className="flex flex-wrap gap-1">
                {[
                  service.show_homepage !== false && "Home",
                  service.show_services_page !== false && "Services",
                  service.show_hero_card && "Hero",
                  service.show_footer && "Footer",
                ]
                  .filter(Boolean)
                  .map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-[#f7f2ea] px-2 py-1 text-[10px] font-bold"
                    >
                      {label}
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  quickUpdate.mutate({
                    id: service.id,
                    data: {
                      status:
                        (service.status ?? "published") === "published" ? "hidden" : "published",
                    },
                  })
                }
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${service.status === "hidden" ? "bg-red-50 text-red-600" : service.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {service.status ?? "published"}
              </button>
              <div className="text-sm font-bold">{service.sort_order ?? 0}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  className="rounded-full border border-border p-2 hover:bg-secondary"
                  aria-label="Edit"
                >
                  <Pencil className="size-3.5" />
                </button>
                <Link
                  to="/services"
                  className="rounded-full border border-border p-2 hover:bg-secondary"
                  aria-label="Preview"
                >
                  <Search className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const copy = serviceToForm(service);
                    copy.id = `${copy.id}-copy`;
                    copy.name = `${copy.name} Copy`;
                    setDrawerMode("create");
                    setEditing(copy);
                  }}
                  className="rounded-full border border-border p-2 hover:bg-secondary"
                  aria-label="Duplicate"
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteService.mutate(service.id)}
                  className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm font-semibold text-muted-foreground">
              No services match the selected filters.
            </div>
          )}
        </div>
      </div>

      {editing && (
        <ServiceEditorDrawer
          mode={drawerMode}
          value={editing}
          pending={saveService.isPending}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={(payload) => saveService.mutate(payload)}
        />
      )}
    </div>
  );
}

function ServiceEditorDrawer({
  mode,
  value,
  pending,
  onChange,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  value: ServicePayload;
  pending: boolean;
  onChange: Dispatch<SetStateAction<ServicePayload | null>>;
  onClose: () => void;
  onSave: (payload: ServicePayload) => void;
}) {
  const { selected: assetBackend, setSelected: setAssetBackend, backends: assetBackends, configuredKeys: assetConfiguredKeys, resolveBackend: resolveAssetBackend, pendingConfirm: assetPendingConfirm } = useStorageBackend();

  function update<K extends keyof ServicePayload>(key: K, next: ServicePayload[K]) {
    onChange((current) => (current ? { ...current, [key]: next } : current));
  }

  async function uploadServiceAsset(file: File, key: "image_url" | "icon_url") {
    const resolvedBackend = await resolveAssetBackend();
    if (resolvedBackend === null) return;
    const uploaded = await api.adminUploadMedia(file, value.name || value.id || "service", resolvedBackend);
    update(key, uploaded.url);
    if (key === "image_url" && !value.image_alt) update("image_alt", value.name);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase text-accent">
              {mode === "create" ? "Add New Service" : "Edit Service"}
            </p>
            <h3 className="text-2xl font-black">Service Details</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-2">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6">
          <AdminFormSection title="Basic Information">
            <AdminTextInput
              label="Service Name"
              value={value.name}
              onChange={(v) => update("name", v)}
            />
            <AdminTextInput
              label="Service Slug"
              value={value.id}
              onChange={(v) => update("id", v.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
            />
            <AdminTextInput
              label="Service Category"
              value={value.category ?? ""}
              onChange={(v) => update("category", v)}
            />
            <AdminNumberInput
              label="Starting Price (₹, leave 0 for 'Contact us')"
              value={value.price ?? 0}
              min={0}
              step={100}
              onChange={(v) => update("price", v === 0 ? undefined : v)}
            />
            <AdminTextInput
              label="Short Description"
              value={value.short_description ?? ""}
              onChange={(v) => update("short_description", v)}
              className="sm:col-span-2"
            />
            <AdminTextarea
              label="Detailed Description"
              value={value.description ?? ""}
              onChange={(v) => update("description", v)}
              className="sm:col-span-2"
            />
          </AdminFormSection>

          <AdminFormSection title="Media">
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Upload destination</p>
              <StorageBackendPicker
                selected={assetBackend}
                onChange={setAssetBackend}
                backends={assetBackends}
                configuredKeys={assetConfiguredKeys}
                pendingConfirm={assetPendingConfirm}
              />
            </div>
            <ServiceAssetUpload
              label="Service Image Upload"
              url={value.image_url ?? ""}
              onUpload={(file) => void uploadServiceAsset(file, "image_url")}
              onRemove={() => update("image_url", "")}
            />
            <ServiceAssetUpload
              label="Service Icon Upload"
              url={value.icon_url ?? ""}
              onUpload={(file) => void uploadServiceAsset(file, "icon_url")}
              onRemove={() => update("icon_url", "")}
            />
            <AdminTextInput
              label="Image Alt Text"
              value={value.image_alt ?? ""}
              onChange={(v) => update("image_alt", v)}
              className="sm:col-span-2"
            />
            <p className="text-xs font-semibold text-muted-foreground sm:col-span-2">
              Recommended image size: 1200 x 800 px.
            </p>

            {/* Gallery — additional photos/videos */}
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-semibold text-foreground">Gallery (additional photos &amp; videos)</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Upload or paste links for extra images/videos shown in the service detail gallery.
              </p>
              {(value.gallery ?? []).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {(value.gallery ?? []).map((item, i) => (
                    <div key={item.src} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-border bg-secondary">
                      {item.type === "video" ? (
                        <div className="flex h-full items-center justify-center">
                          <Video className="size-6 text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={resolveAdminMediaUrl(item.src, value.id ?? "svc", "200/150")} alt="" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => update("gallery", (value.gallery ?? []).filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:flex"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <DestinationGalleryUpload
                slug={value.id ?? "service"}
                onAdded={(urls) => {
                  const newItems = urls.map((url) => ({
                    type: (/\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) ? "video" : "photo") as "photo" | "video",
                    src: url,
                    caption: "",
                    author: "",
                  }));
                  update("gallery", [...(value.gallery ?? []), ...newItems]);
                }}
              />
            </div>
          </AdminFormSection>

          <AdminFormSection title="Trust / Marketing Content">
            <AdminNumberInput
              label="Rating"
              value={value.rating ?? 5}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => update("rating", v)}
            />
            <AdminNumberInput
              label="Review Count"
              value={value.review_count ?? 0}
              min={0}
              step={1}
              onChange={(v) => update("review_count", v)}
            />
            <AdminTextInput
              label="Badge Text"
              value={value.badge_text ?? ""}
              onChange={(v) => update("badge_text", v)}
            />
            <AdminTextarea
              label="Highlight Quote"
              value={value.highlight ?? ""}
              onChange={(v) => update("highlight", v)}
              className="sm:col-span-2"
            />
          </AdminFormSection>

          <AdminFormSection title="CTA">
            <AdminTextInput
              label="CTA Text"
              value={value.cta_text ?? ""}
              onChange={(v) => update("cta_text", v)}
            />
            <AdminTextInput
              label="CTA Link"
              value={value.cta_link ?? ""}
              onChange={(v) => update("cta_link", v)}
            />
          </AdminFormSection>

          <AdminFormSection title="Display Control">
            <ServiceToggle
              label="Show on Homepage"
              checked={value.show_homepage ?? true}
              onChange={(v) => update("show_homepage", v)}
            />
            <ServiceToggle
              label="Show on Services Page"
              checked={value.show_services_page ?? true}
              onChange={(v) => update("show_services_page", v)}
            />
            <ServiceToggle
              label="Show in Hero Services Card"
              checked={value.show_hero_card ?? false}
              onChange={(v) => update("show_hero_card", v)}
            />
            <ServiceToggle
              label="Show in Footer Services"
              checked={value.show_footer ?? false}
              onChange={(v) => update("show_footer", v)}
            />
            <label className="text-sm font-bold">
              Status
              <select
                value={value.status ?? "published"}
                onChange={(e) => update("status", e.target.value as ServicePayload["status"])}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              >
                {SERVICE_STATUS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <AdminNumberInput
              label="Sort Order"
              value={value.sort_order ?? 0}
              step={1}
              onChange={(v) => update("sort_order", v)}
            />
          </AdminFormSection>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background/95 p-5 backdrop-blur sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave({ ...value, status: "draft" })}
            className="min-h-12 flex-1 rounded-full border border-border px-5 text-sm font-bold disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave({ ...value, status: "published" })}
            className="min-h-12 flex-1 rounded-full bg-accent px-5 text-sm font-black text-white disabled:opacity-50"
          >
            Publish Service
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-full border border-border px-5 text-sm font-bold"
          >
            Cancel
          </button>
        </div>
      </aside>
    </div>
  );
}

function AdminFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white/55 p-5">
      <h4 className="mb-4 text-sm font-black uppercase text-foreground">{title}</h4>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function AdminTextInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`text-sm font-bold ${className}`}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function AdminTextarea({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`text-sm font-bold ${className}`}>
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function AdminNumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function ServiceToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-background px-3 text-sm font-bold">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[#c76b2f]"
      />
    </label>
  );
}

function ServiceAssetUpload({
  label,
  url,
  onUpload,
  onRemove,
}: {
  label: string;
  url: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="mb-2 text-sm font-bold">{label}</p>
      {url ? (
        <AdminMediaPreview
          src={resolveAdminMediaUrl(url, label, "320/220")}
          alt={label}
          className="mb-3 h-32 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="mb-3 grid h-32 place-items-center rounded-lg border border-dashed border-border text-xs font-bold text-muted-foreground">
          No asset selected
        </div>
      )}
      <div className="flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-3 py-2 text-xs font-bold text-background">
          <Upload className="size-3.5" /> Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-border px-3 py-2 text-xs font-bold"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

type ContentEditorField = {
  section: string;
  key: string;
  label: string;
  fallback: string;
  input?: "text" | "textarea" | "url" | "image" | "status";
};

const ABOUT_SECTION_FIELDS: ContentEditorField[] = [
  {
    section: "about_section",
    key: "label",
    label: "Section label",
    fallback: "About JourneyMakers",
  },
  {
    section: "about_section",
    key: "heading",
    label: "Main heading",
    fallback: "We plan journeys that feel personal, smooth, and memorable.",
    input: "textarea",
  },
  {
    section: "about_section",
    key: "short_description",
    label: "Hero card description",
    fallback:
      "JourneyMakers helps travelers plan smooth, personalized, and memorable trips. We exist to make travel easier and stress-free by handling destination planning, packages, hotels, flights, transfers, and on-trip support.",
    input: "textarea",
  },
  {
    section: "about_section",
    key: "detailed_description",
    label: "Homepage about description",
    fallback:
      "JourneyMakers helps travelers plan customized trips across India and international destinations. From itinerary planning and hotel bookings to flights, transfers, sightseeing, honeymoon packages, family tours, group travel, and corporate retreats, we handle every detail with care and expert support.",
    input: "textarea",
  },
  {
    section: "about_section",
    key: "purpose",
    label: "Purpose line",
    fallback: "We make travel easier, more meaningful, and stress-free.",
    input: "textarea",
  },
  {
    section: "about_section",
    key: "highlight_1",
    label: "Highlight 1",
    fallback: "Personalized trip planning",
  },
  {
    section: "about_section",
    key: "highlight_2",
    label: "Highlight 2",
    fallback: "End-to-end support",
  },
  {
    section: "about_section",
    key: "highlight_3",
    label: "Highlight 3",
    fallback: "For couples, families, groups, and corporate travelers",
  },
  {
    section: "about_section",
    key: "highlight_4",
    label: "Highlight 4",
    fallback: "Crafted journeys, not generic packages",
  },
  {
    section: "about_section",
    key: "cta_text",
    label: "CTA text",
    fallback: "Discover Our Story",
  },
  {
    section: "about_section",
    key: "cta_link",
    label: "CTA link",
    fallback: "/about",
    input: "url",
  },
  {
    section: "about_section",
    key: "image",
    label: "About image",
    fallback: "",
    input: "image",
  },
  {
    section: "about_section",
    key: "status",
    label: "Status",
    fallback: "published",
    input: "status",
  },
];

const CONTACT_CARD_FIELDS: ContentEditorField[] = [
  {
    section: "contact_card",
    key: "company_name",
    label: "Company name",
    fallback: "JourneyMakers",
  },
  {
    section: "contact_card",
    key: "agent_name",
    label: "Travel expert name",
    fallback: "JourneyMakers",
  },
  {
    section: "contact_card",
    key: "agent_role",
    label: "Travel expert role",
    fallback: "Travel Expert",
  },
  {
    section: "contact_card",
    key: "whatsapp",
    label: "WhatsApp number",
    fallback: "+91 98765 43210",
  },
  {
    section: "contact_card",
    key: "phone",
    label: "Phone number",
    fallback: "+91 98765 43210",
  },
  {
    section: "contact_card",
    key: "email",
    label: "Email address",
    fallback: "hello@journeymakers.com",
  },
  {
    section: "contact_card",
    key: "location",
    label: "Company location",
    fallback: "JourneyMakers Travel Desk",
  },
  {
    section: "contact_card",
    key: "response_text",
    label: "Response copy",
    fallback: "Get itinerary, package details, and pricing in minutes.",
    input: "textarea",
  },
  {
    section: "contact_card",
    key: "response_time",
    label: "Response time",
    fallback: "Fast response",
  },
  {
    section: "contact_card",
    key: "guidance_text",
    label: "Guidance text",
    fallback: "Personalized guidance",
  },
  {
    section: "contact_card",
    key: "discussion_text",
    label: "Discussion text",
    fallback: "Free itinerary discussion",
  },
  {
    section: "contact_card",
    key: "cta_text",
    label: "WhatsApp CTA text",
    fallback: "Chat on WhatsApp",
  },
  {
    section: "contact_card",
    key: "whatsapp_message",
    label: "WhatsApp pre-filled message",
    fallback: "Hi JourneyMakers, I want to plan a trip. Please share package details.",
    input: "textarea",
  },
];

function FocusedContentEditor({
  page,
  title,
  subtitle,
  previewHref,
  fields,
}: {
  page: string;
  title: string;
  subtitle: string;
  previewHref: string;
  fields: ContentEditorField[];
}) {
  const qc = useQueryClient();
  const { data: allContent, error } = useQuery({
    queryKey: ["admin-content"],
    queryFn: api.adminContent,
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const { selected: cmsBackend, setSelected: setCmsBackend, backends: cmsBackends, configuredKeys: cmsConfiguredKeys, resolveBackend: resolveCmsBackend, pendingConfirm: cmsPendingConfirm } = useStorageBackend();

  function editKey(field: ContentEditorField) {
    return `${page}.${field.section}.${field.key}`;
  }

  function storedValue(field: ContentEditorField) {
    return allContent?.[page]?.[field.section]?.[field.key]?.value ?? field.fallback;
  }

  function valueFor(field: ContentEditorField) {
    const key = editKey(field);
    return key in edits ? edits[key] : storedValue(field);
  }

  function updateField(field: ContentEditorField, value: string) {
    setEdits((prev) => ({ ...prev, [editKey(field)]: value }));
    setSaved(false);
    setSaveError("");
  }

  async function uploadAsset(field: ContentEditorField, file: File) {
    const resolvedBackend = await resolveCmsBackend();
    if (resolvedBackend === null) return;
    const key = editKey(field);
    setUploadingKey(key);
    setSaveError("");
    try {
      const uploaded = await api.adminUploadMedia(file, `${title} ${field.label}`, resolvedBackend);
      updateField(field, uploaded.url);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function saveChanges() {
    const updates = Object.entries(edits).map(([key, value]) => {
      const [updatePage, section, ...keyParts] = key.split(".");
      return { page: updatePage, section, key: keyParts.join("."), value };
    });
    if (!updates.length) return;

    setSaving(true);
    setSaveError("");
    try {
      await api.adminUpdateContent(updates);
      setEdits({});
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["content"] });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SessionBanner error={error as Error | null} />
      <div className="rounded-2xl border border-border bg-[#fbf6ee] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-accent">CMS content</p>
            <h2 className="mt-1 text-2xl font-black">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(edits).length > 0 && (
              <span className="text-xs font-bold text-muted-foreground">
                {Object.keys(edits).length} unsaved
              </span>
            )}
            {saved && <span className="text-xs font-black text-emerald-700">Saved</span>}
            <a
              href={previewHref}
              className="inline-flex min-h-10 items-center rounded-full border border-border bg-white px-4 text-xs font-bold"
            >
              Preview
            </a>
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || Object.keys(edits).length === 0}
              className="inline-flex min-h-10 items-center rounded-full bg-foreground px-5 text-xs font-extrabold text-background disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        {saveError && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {saveError}
          </p>
        )}

        {fields.some((f) => f.input === "image") && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Image upload destination</p>
            <StorageBackendPicker
              selected={cmsBackend}
              onChange={setCmsBackend}
              backends={cmsBackends}
              configuredKeys={cmsConfiguredKeys}
              pendingConfirm={cmsPendingConfirm}
            />
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const value = valueFor(field);
            const key = editKey(field);

            if (field.input === "image") {
              return (
                <div key={key} className="md:col-span-2">
                  <ServiceAssetUpload
                    label={field.label}
                    url={value}
                    onUpload={(file) => void uploadAsset(field, file)}
                    onRemove={() => updateField(field, "")}
                  />
                  <input
                    value={value}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="/assets/about.jpg or https://..."
                  />
                  {uploadingKey === key && (
                    <p className="mt-2 text-xs font-bold text-accent">Uploading image...</p>
                  )}
                </div>
              );
            }

            if (field.input === "status") {
              return (
                <label key={key} className="text-sm font-bold">
                  {field.label}
                  <select
                    value={value}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
              );
            }

            if (field.input === "textarea") {
              return (
                <AdminTextarea
                  key={key}
                  label={field.label}
                  value={value}
                  onChange={(next) => updateField(field, next)}
                  className="md:col-span-2"
                />
              );
            }

            return (
              <AdminTextInput
                key={key}
                label={field.label}
                value={value}
                onChange={(next) => updateField(field, next)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AboutSectionEditor() {
  return (
    <FocusedContentEditor
      page="home"
      title="About Section Management"
      subtitle="Edit the What We Do hero card and the homepage About section from one place."
      previewHref="/"
      fields={ABOUT_SECTION_FIELDS}
    />
  );
}

function ContactTab() {
  return (
    <FocusedContentEditor
      page="contact"
      title="Contact Management"
      subtitle="Edit the Talk to a Travel Expert hero card and Contact page contact details."
      previewHref="/contact"
      fields={CONTACT_CARD_FIELDS}
    />
  );
}

// ── Content tab — About / FAQs / Testimonials / Site Stats ───────────────────

function ContentTab() {
  const [section, setSection] = useState<"about" | "faqs" | "testimonials" | "stats">("about");
  const qc = useQueryClient();

  // ── Bulk import state ──
  const [importStatus, setImportStatus] = useState<{
    kind: string;
    imported: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  async function handleImport(kind: string, file: File) {
    setImportStatus(null);
    try {
      const result = await api.adminImportCsv(kind, file);
      setImportStatus({ kind, ...result });
      qc.invalidateQueries({ queryKey: [kind] });
    } catch (err) {
      setImportStatus({ kind, imported: 0, errors: [{ row: 0, message: String(err) }] });
    }
  }

  // ── FAQs ────────────────────────────────────────────────────────────────────
  const faqsQ = useQuery({ queryKey: ["faqs"], queryFn: api.faqs });
  const [editFaq, setEditFaq] = useState<Partial<ApiFaq> | null>(null);
  const createFaq = useMutation({
    mutationFn: (data: { question: string; answer: string }) => api.createFaq(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faqs"] });
      setEditFaq(null);
    },
  });
  const updateFaq = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApiFaq> }) => api.updateFaq(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faqs"] });
      setEditFaq(null);
    },
  });
  const deleteFaq = useMutation({
    mutationFn: (id: number) => api.deleteFaq(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faqs"] }),
  });

  // ── Testimonials ─────────────────────────────────────────────────────────────
  const testimonialsQ = useQuery({ queryKey: ["testimonials"], queryFn: api.testimonials });
  const [editTest, setEditTest] = useState<Partial<ApiTestimonial> | null>(null);
  const createTest = useMutation({
    mutationFn: (data: { name: string; role: string; quote: string; location?: string }) =>
      api.createTestimonial(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testimonials"] });
      setEditTest(null);
    },
  });

  // ── Bulk select (after queries so data is available) ──
  const faqBulk = useBulkSelect(faqsQ.data ?? [], (f) => String(f.id));
  const testBulk = useBulkSelect(testimonialsQ.data ?? [], (t) => String(t.id));

  const bulkDeleteFaqs = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("faqs", ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faqs"] });
      faqBulk.clearSelection();
    },
  });
  const bulkDeleteTests = useMutation({
    mutationFn: (ids: string[]) => api.adminBulkDelete("testimonials", ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testimonials"] });
      testBulk.clearSelection();
    },
  });
  const updateTest = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApiTestimonial> }) =>
      api.updateTestimonial(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testimonials"] });
      setEditTest(null);
    },
  });
  const deleteTest = useMutation({
    mutationFn: (id: number) => api.deleteTestimonial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["testimonials"] }),
  });

  // ── Site Stats ──────────────────────────────────────────────────────────────
  const statsQ = useQuery({ queryKey: ["site-stats"], queryFn: api.siteStats });
  const [statsEdit, setStatsEdit] = useState<ApiSiteStat[] | null>(null);
  const saveStats = useMutation({
    mutationFn: (items: ApiSiteStat[]) =>
      api.updateSiteStats(
        items.map((s) => ({ value: s.value, label: s.label, sort_order: s.sort_order })),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-stats"] });
      setStatsEdit(null);
    },
  });

  const sectionTabs: { key: typeof section; label: string }[] = [
    { key: "about", label: "About Section" },
    { key: "faqs", label: "FAQs" },
    { key: "testimonials", label: "Testimonials" },
    { key: "stats", label: "Site Stats" },
  ];

  return (
    <div className="space-y-8">
      {/* Import result banner */}
      {importStatus && (
        <div
          className={`rounded-2xl p-4 text-sm flex items-start gap-3 ${importStatus.errors.length ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"}`}
        >
          <div className="flex-1">
            <span className="font-bold">
              {importStatus.errors.length === 0 ? "✓ " : "⚠ "}
              {importStatus.imported} row{importStatus.imported !== 1 ? "s" : ""} imported (
              {importStatus.kind})
            </span>
            {importStatus.errors.length > 0 && (
              <ul className="mt-2 space-y-1 font-mono text-xs text-red-700 dark:text-red-400">
                {importStatus.errors.slice(0, 5).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {importStatus.errors.length > 5 && (
                  <li>…and {importStatus.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-border pb-1">
        {sectionTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
              section === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "about" && <AboutSectionEditor />}

      {/* ── FAQs ── */}
      {section === "faqs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-bold">FAQs ({faqsQ.data?.length ?? 0})</h3>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                <Upload className="size-3" /> Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleImport("faqs", f);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <button
                onClick={() => api.adminExportCsv("faqs")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary"
              >
                <Download className="size-3" /> Export CSV
              </button>
              <button
                onClick={() => setEditFaq({ question: "", answer: "", sort_order: 0 })}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
              >
                <Plus className="size-3.5" /> Add FAQ
              </button>
            </div>
          </div>
          {editFaq && !editFaq.id && (
            <div className="border border-accent rounded-xl p-4 space-y-3">
              <input
                placeholder="Question"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={editFaq.question ?? ""}
                onChange={(e) => setEditFaq((v) => ({ ...v!, question: e.target.value }))}
              />
              <textarea
                placeholder="Answer"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={editFaq.answer ?? ""}
                onChange={(e) => setEditFaq((v) => ({ ...v!, answer: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    createFaq.mutate({ question: editFaq.question!, answer: editFaq.answer! })
                  }
                  className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditFaq(null)}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <BulkBar count={faqBulk.selected.size} onClear={faqBulk.clearSelection}>
            <button
              type="button"
              disabled={bulkDeleteFaqs.isPending}
              onClick={() => bulkDeleteFaqs.mutate(Array.from(faqBulk.selected))}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3" /> Delete selected
            </button>
          </BulkBar>
          <div className="grid gap-3">
            {faqsQ.data?.map((f) =>
              editFaq?.id === f.id ? (
                <div key={f.id} className="border border-accent rounded-xl p-4 space-y-3">
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-bold"
                    value={editFaq.question ?? ""}
                    onChange={(e) => setEditFaq((v) => ({ ...v!, question: e.target.value }))}
                  />
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    value={editFaq.answer ?? ""}
                    onChange={(e) => setEditFaq((v) => ({ ...v!, answer: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateFaq.mutate({
                          id: f.id,
                          data: { question: editFaq.question, answer: editFaq.answer },
                        })
                      }
                      className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditFaq(null)}
                      className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={f.id}
                  onClick={() => faqBulk.toggleOne(String(f.id))}
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${faqBulk.selected.has(String(f.id)) ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"}`}
                >
                  <RowCheck
                    checked={faqBulk.selected.has(String(f.id))}
                    onToggle={() => faqBulk.toggleOne(String(f.id))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{f.question}</div>
                    <div className="text-sm text-muted-foreground mt-1">{f.answer}</div>
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditFaq({ ...f })}
                      className="rounded-full border border-border p-2 hover:bg-secondary"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFaq.mutate(f.id)}
                      className="rounded-full border border-destructive/30 p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ── Testimonials ── */}
      {section === "testimonials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-bold">Testimonials ({testimonialsQ.data?.length ?? 0})</h3>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">
                <Upload className="size-3" /> Import CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleImport("testimonials", f);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <button
                onClick={() => api.adminExportCsv("testimonials")}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary"
              >
                <Download className="size-3" /> Export CSV
              </button>
              <button
                onClick={() => setEditTest({ name: "", role: "", quote: "", location: "" })}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
              >
                <Plus className="size-3.5" /> Add Testimonial
              </button>
            </div>
          </div>
          {editTest && !editTest.id && (
            <div className="border border-accent rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Name"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  value={editTest.name ?? ""}
                  onChange={(e) => setEditTest((v) => ({ ...v!, name: e.target.value }))}
                />
                <input
                  placeholder="Role / Title"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  value={editTest.role ?? ""}
                  onChange={(e) => setEditTest((v) => ({ ...v!, role: e.target.value }))}
                />
              </div>
              <textarea
                placeholder="Quote"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={editTest.quote ?? ""}
                onChange={(e) => setEditTest((v) => ({ ...v!, quote: e.target.value }))}
              />
              <input
                placeholder="Location (optional)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={editTest.location ?? ""}
                onChange={(e) => setEditTest((v) => ({ ...v!, location: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    createTest.mutate({
                      name: editTest.name!,
                      role: editTest.role!,
                      quote: editTest.quote!,
                      location: editTest.location,
                    })
                  }
                  className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditTest(null)}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {testimonialsQ.data?.map((t) =>
              editTest?.id === t.id ? (
                <div key={t.id} className="border border-accent rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                      value={editTest.name ?? ""}
                      onChange={(e) => setEditTest((v) => ({ ...v!, name: e.target.value }))}
                    />
                    <input
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                      value={editTest.role ?? ""}
                      onChange={(e) => setEditTest((v) => ({ ...v!, role: e.target.value }))}
                    />
                  </div>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    value={editTest.quote ?? ""}
                    onChange={(e) => setEditTest((v) => ({ ...v!, quote: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    value={editTest.location ?? ""}
                    onChange={(e) => setEditTest((v) => ({ ...v!, location: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateTest.mutate({
                          id: t.id,
                          data: {
                            name: editTest.name,
                            role: editTest.role,
                            quote: editTest.quote,
                            location: editTest.location,
                          },
                        })
                      }
                      className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditTest(null)}
                      className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={t.id}
                  onClick={() => testBulk.toggleOne(String(t.id))}
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${testBulk.selected.has(String(t.id)) ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"}`}
                >
                  <RowCheck
                    checked={testBulk.selected.has(String(t.id))}
                    onToggle={() => testBulk.toggleOne(String(t.id))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-accent">
                      {t.role} · {t.location}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">"{t.quote}"</div>
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditTest({ ...t })}
                      className="rounded-full border border-border p-2 hover:bg-secondary"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTest.mutate(t.id)}
                      className="rounded-full border border-destructive/30 p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
          <BulkBar count={testBulk.selected.size} onClear={testBulk.clearSelection}>
            <button
              type="button"
              disabled={bulkDeleteTests.isPending}
              onClick={() => bulkDeleteTests.mutate(Array.from(testBulk.selected))}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3" /> Delete selected
            </button>
          </BulkBar>
        </div>
      )}

      {/* ── CSV Templates ── */}
      {section !== "stats" && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
            CSV Templates
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CsvCard
              name="services.csv"
              kind="services"
              cols="id, name, description, rating, review_count, highlight, sort_order"
              sample="visa-assistance,Visa Guidance & Partner Assistance,Document checklist guidance.,4.8,320,Clear guidance without approval guarantees.,1"
            />
            <CsvCard
              name="faqs.csv"
              kind="faqs"
              cols="question, answer, sort_order"
              sample="How far ahead to book?,3–6 months for peak season.,1"
            />
            <CsvCard
              name="testimonials.csv"
              kind="testimonials"
              cols="name, role, quote, location, sort_order"
              sample="Priya Sharma,Honeymooner · Bali,Magical experience.,Mumbai,1"
            />
          </div>
        </div>
      )}

      {/* ── Site Stats ── */}
      {section === "stats" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Site Stats</h3>
            {statsEdit ? (
              <div className="flex gap-2">
                <button
                  onClick={() => saveStats.mutate(statsEdit)}
                  className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
                >
                  Save All
                </button>
                <button
                  onClick={() => setStatsEdit(null)}
                  className="rounded-full border border-border px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStatsEdit(statsQ.data ? [...statsQ.data] : [])}
                className="rounded-full border border-border px-4 py-2 text-xs font-bold"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">These appear in the homepage stats strip.</p>
          {(statsEdit ?? statsQ.data ?? []).map((stat, i) => (
            <div
              key={stat.id}
              className="flex items-center gap-3 rounded-xl border border-border p-4"
            >
              {statsEdit ? (
                <>
                  <input
                    className="w-24 rounded-lg border border-border px-3 py-2 text-sm font-black"
                    value={statsEdit[i]?.value ?? ""}
                    onChange={(e) =>
                      setStatsEdit((v) =>
                        v ? v.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)) : v,
                      )
                    }
                  />
                  <input
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                    value={statsEdit[i]?.label ?? ""}
                    onChange={(e) =>
                      setStatsEdit((v) =>
                        v ? v.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)) : v,
                      )
                    }
                  />
                </>
              ) : (
                <>
                  <div className="w-24 text-2xl font-black">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Offers tab ────────────────────────────────────────────────────────────────

const EMPTY_OFFER: OfferPayload = {
  title: "",
  subtitle: "",
  code: "",
  description: "",
  offer_type: "percent",
  discount_value: 0,
  badge_label: "Special Offer",
  badge_color: "accent",
  applies_to: "all",
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

const BADGE_COLOR_STYLES: Record<string, string> = {
  accent: "bg-accent text-white",
  red: "bg-red-500 text-white",
  green: "bg-emerald-500 text-white",
  gold: "bg-amber-400 text-amber-900",
};

function OffersTab() {
  const qc = useQueryClient();
  const [, setActiveTab] = useAdminTabPref();
  const [modal, setModal] = useState<{
    mode: "add" | "edit";
    id?: number;
    data: OfferPayload;
  } | null>(null);
  const offersQuery = useQuery({ queryKey: ["admin-offers"], queryFn: api.adminOffers });
  const offers = offersQuery.data ?? [];

  // Check if we arrived here via "Add new offer" from a package modal
  const PKG_LINK_KEY = "jm_pkg_link_pending";
  const pkgLinkPending: { linkType: string; pkgForm: { title?: string } } | null = (() => {
    try {
      const raw = sessionStorage.getItem(PKG_LINK_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p.linkType === "offer" && !p.linkedOfferId ? p : null;
    } catch { return null; }
  })();

  // Auto-open add modal when redirected from package modal
  useEffect(() => {
    if (pkgLinkPending) openAdd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMut = useMutation({
    mutationFn: (data: OfferPayload) => api.adminCreateOffer(data),
    onSuccess: (newOffer) => {
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["offers"] });
      setModal(null);
      // If we came from "Add new offer" inside a package modal, link back and return
      try {
        const raw = sessionStorage.getItem(PKG_LINK_KEY);
        if (raw) {
          const pending = JSON.parse(raw);
          if (pending.linkType === "offer" && !pending.linkedOfferId) {
            pending.linkedOfferId = newOffer.id;
            sessionStorage.setItem(PKG_LINK_KEY, JSON.stringify(pending));
            setActiveTab("packages");
            return;
          }
        }
      } catch { /* ignore */ }
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OfferPayload> }) =>
      api.adminUpdateOffer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["offers"] });
      setModal(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.adminDeleteOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["offers"] });
    },
  });

  const [formData, setFormData] = useState<OfferPayload>(EMPTY_OFFER);

  function openAdd() {
    setFormData(EMPTY_OFFER);
    setModal({ mode: "add", data: EMPTY_OFFER });
  }

  function openEdit(offer: ApiOffer) {
    const data: OfferPayload = {
      title: offer.title,
      subtitle: offer.subtitle,
      code: offer.code ?? "",
      description: offer.description,
      offer_type: offer.offer_type,
      discount_value: offer.discount_value,
      badge_label: offer.badge_label,
      badge_color: offer.badge_color,
      applies_to: offer.applies_to,
      valid_from: offer.valid_from,
      valid_until: offer.valid_until,
      max_uses: offer.max_uses,
      is_active: offer.is_active,
      is_featured: offer.is_featured,
      sort_order: offer.sort_order,
    };
    setFormData(data);
    setModal({ mode: "edit", id: offer.id, data });
  }

  function handleSubmit() {
    if (modal?.mode === "add") {
      createMut.mutate(formData);
    } else if (modal?.mode === "edit" && modal.id != null) {
      updateMut.mutate({ id: modal.id, data: formData });
    }
  }

  function formatDiscount(offer: ApiOffer) {
    switch (offer.offer_type) {
      case "percent":
        return `${offer.discount_value}% OFF`;
      case "fixed":
        return `₹${offer.discount_value.toLocaleString()} OFF`;
      case "free_upgrade":
        return "FREE UPGRADE";
      case "flash":
        return `${offer.discount_value}% FLASH`;
    }
  }

  return (
    <div>
      <SessionBanner error={offersQuery.error as Error | null} />
      {pkgLinkPending && (
        <div className="mb-4 rounded-2xl border border-accent/40 bg-accent/5 px-5 py-3 text-sm font-medium text-accent">
          You're creating an offer to link into package{" "}
          <strong>{pkgLinkPending.pkgForm?.title || "your package"}</strong>.
          Fill in the full details below and save — you'll be taken straight back to the package form.
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Offers & Promotions</h3>
          <p className="text-sm text-muted-foreground">
            {offers.length} offer{offers.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-accent"
        >
          <Plus className="size-4" /> Add Offer
        </button>
      </div>

      {offersQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border p-5 h-28" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <AdminEmptyState message="No offers yet. Create one to get started." />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`rounded-2xl border p-5 transition-colors ${offer.is_active ? "border-border" : "border-border/50 opacity-60"}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${BADGE_COLOR_STYLES[offer.badge_color] ?? BADGE_COLOR_STYLES.accent}`}
                    >
                      {offer.badge_label}
                    </span>
                    <span className="text-xl font-black tracking-tighter">
                      {formatDiscount(offer)}
                    </span>
                    {offer.is_featured && (
                      <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold uppercase">
                        Featured
                      </span>
                    )}
                    {!offer.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm">{offer.title}</p>
                  {offer.subtitle && (
                    <p className="text-xs text-accent font-semibold mt-0.5">{offer.subtitle}</p>
                  )}
                  {offer.code && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Code: {offer.code}
                    </p>
                  )}
                  {offer.max_uses != null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>
                          {offer.current_uses} / {offer.max_uses} used
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden w-48">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{
                            width: `${Math.min(100, (offer.current_uses / offer.max_uses) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {(offer.valid_from || offer.valid_until) && (
                    <p className="mt-1 text-[10px] font-mono text-muted-foreground">
                      {offer.valid_from && `From ${offer.valid_from}`}
                      {offer.valid_from && offer.valid_until && " · "}
                      {offer.valid_until && `Until ${offer.valid_until}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      updateMut.mutate({ id: offer.id, data: { is_active: !offer.is_active } })
                    }
                    disabled={updateMut.isPending}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${offer.is_active ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-border text-muted-foreground hover:bg-secondary"}`}
                  >
                    {offer.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => openEdit(offer)}
                    className="rounded-full border border-border p-2 hover:bg-secondary"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(offer.id)}
                    disabled={deleteMut.isPending}
                    className="rounded-full border border-red-200 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h3 className="text-lg font-extrabold">
                {modal.mode === "add" ? "Create Offer" : "Edit Offer"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="rounded-full p-1.5 hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-bold">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  placeholder="e.g. Early Bird Special"
                />
              </div>
              {/* Subtitle */}
              <div>
                <label className="mb-1.5 block text-sm font-bold">Subtitle</label>
                <input
                  value={formData.subtitle ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, subtitle: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  placeholder="Short tagline"
                />
              </div>
              {/* Offer type + discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Type</label>
                  <select
                    value={formData.offer_type}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        offer_type: e.target.value as OfferPayload["offer_type"],
                      }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed (₹)</option>
                    <option value="free_upgrade">Free Upgrade</option>
                    <option value="flash">Flash</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Discount value</label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, discount_value: Number(e.target.value) }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
              {/* Promo code */}
              <div>
                <label className="mb-1.5 block text-sm font-bold">Promo code</label>
                <input
                  value={formData.code ?? ""}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, code: e.target.value || undefined }))
                  }
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-mono focus:border-accent focus:outline-none"
                  placeholder="e.g. EARLYBIRD25"
                />
              </div>
              {/* Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Badge label</label>
                  <input
                    value={formData.badge_label ?? ""}
                    onChange={(e) => setFormData((f) => ({ ...f, badge_label: e.target.value }))}
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Badge color</label>
                  <select
                    value={formData.badge_color ?? "accent"}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        badge_color: e.target.value as OfferPayload["badge_color"],
                      }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="accent">Accent (orange)</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
              </div>
              {/* Valid from/until */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Valid from</label>
                  <input
                    type="date"
                    value={formData.valid_from ?? ""}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, valid_from: e.target.value || undefined }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Valid until</label>
                  <input
                    type="date"
                    value={formData.valid_until ?? ""}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, valid_until: e.target.value || undefined }))
                    }
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              {/* Max uses */}
              <div>
                <label className="mb-1.5 block text-sm font-bold">Max uses (optional)</label>
                <input
                  type="number"
                  value={formData.max_uses ?? ""}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      max_uses: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-bold">Description</label>
                <textarea
                  value={formData.description ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              {/* Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active ?? true}
                    onChange={(e) => setFormData((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured ?? false}
                    onChange={(e) => setFormData((f) => ({ ...f, is_featured: e.target.checked }))}
                    className="rounded"
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="flex gap-3 border-t border-border p-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-bold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending || !formData.title.trim()}
                className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-bold text-background hover:bg-accent disabled:opacity-40"
              >
                {modal.mode === "add" ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pages tab (site content CMS) ──────────────────────────────────────────────

function PagesTab() {
  const qc = useQueryClient();
  const { data: allContent } = useQuery({
    queryKey: ["admin-content"],
    queryFn: api.adminContent,
  });

  const [activePage, setActivePage] = useState<string>("home");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local edits buffer: { "page.section.key": newValue }
  const [edits, setEdits] = useState<Record<string, string>>({});

  const pages = Object.keys(allContent ?? {});
  const pageData = allContent?.[activePage] ?? {};

  function getEditKey(section: string, key: string) {
    return `${activePage}.${section}.${key}`;
  }

  function getValue(section: string, key: string): string {
    const editKey = getEditKey(section, key);
    if (editKey in edits) return edits[editKey];
    return (
      (allContent?.[activePage]?.[section]?.[key] as { value: string } | undefined)?.value ?? ""
    );
  }

  function handleChange(section: string, key: string, value: string) {
    setEdits((prev) => ({ ...prev, [getEditKey(section, key)]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const updates = Object.entries(edits).map(([k, value]) => {
      const [page, section, ...keyParts] = k.split(".");
      return { page, section, key: keyParts.join("."), value };
    });
    try {
      await api.adminUpdateContent(updates);
      setEdits({});
      setSaved(true);
      // Invalidate all content caches
      qc.invalidateQueries({ queryKey: ["content"] });
      qc.invalidateQueries({ queryKey: ["admin-content"] });
    } finally {
      setSaving(false);
    }
  }

  const PAGE_LABELS: Record<string, string> = {
    home: "Home",
    footer: "Footer",
    contact: "Contact",
    packages: "Packages",
    destinations: "Destinations",
    services: "Services",
    global: "Global / Brand",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Page list */}
      <div className="flex flex-col gap-1">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pages
        </p>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => {
              setActivePage(p);
              setEdits({});
              setSaved(false);
            }}
            className={`rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-colors ${
              activePage === p
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {PAGE_LABELS[p] ?? p}
          </button>
        ))}
      </div>

      {/* Field editors */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{PAGE_LABELS[activePage] ?? activePage}</h3>
          <div className="flex items-center gap-3">
            {Object.keys(edits).length > 0 && (
              <span className="text-xs text-muted-foreground">
                {Object.keys(edits).length} unsaved change
                {Object.keys(edits).length !== 1 ? "s" : ""}
              </span>
            )}
            {saved && <span className="text-xs font-bold text-green-600">✓ Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(edits).length === 0}
              className="rounded-full bg-foreground px-5 py-2 text-xs font-extrabold text-background transition-colors hover:bg-accent disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        <div className="grid gap-8">
          {activePage === "contact" && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-accent">
                    Contact card
                  </p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    These values power the hero contact card and Contact page details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    CONTACT_CARD_FIELDS.forEach((field) =>
                      handleChange(field.section, field.key, ""),
                    );
                  }}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {CONTACT_CARD_FIELDS.map((field) => {
                  const editKey = getEditKey(field.section, field.key);
                  const current =
                    editKey in edits
                      ? getValue(field.section, field.key)
                      : getValue(field.section, field.key) || field.fallback;
                  return (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-xs font-bold text-foreground/70">
                        {field.label}
                      </label>
                      {field.input === "textarea" ? (
                        <textarea
                          rows={3}
                          value={current}
                          onChange={(e) => handleChange(field.section, field.key, e.target.value)}
                          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
                        />
                      ) : (
                        <input
                          type="text"
                          value={current}
                          onChange={(e) => handleChange(field.section, field.key, e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.entries(pageData)
            .filter(([section]) => !(activePage === "contact" && section === "contact_card"))
            .map(([section, fields]) => (
              <div key={section} className="rounded-2xl border border-border p-5">
                <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  {section.replace(/_/g, " ")}
                </p>
                <div className="grid gap-4">
                  {Object.entries(
                    fields as Record<
                      string,
                      { value: string; label: string; value_type: string; sort_order: number }
                    >,
                  )
                    .sort((a, b) => (a[1].sort_order ?? 0) - (b[1].sort_order ?? 0))
                    .map(([key, meta]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-xs font-bold text-foreground/70">
                          {meta.label || key}
                        </label>
                        {meta.value_type === "text" &&
                        (getValue(section, key).length > 80 ||
                          key.includes("body") ||
                          key.includes("description") ||
                          key.includes("tagline") ||
                          key.includes("subtitle")) ? (
                          <textarea
                            rows={3}
                            value={getValue(section, key)}
                            onChange={(e) => handleChange(section, key, e.target.value)}
                            className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-foreground resize-y"
                          />
                        ) : (
                          <input
                            type="text"
                            value={getValue(section, key)}
                            onChange={(e) => handleChange(section, key, e.target.value)}
                            className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-foreground"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

const STORAGE_BACKEND_META: Record<string, { label: string; description: string }> = {
  local: { label: "Local server", description: "Files saved on the server disk. No extra setup needed." },
  gdrive: { label: "Google Drive", description: "Files uploaded to the connected Google Drive account." },
  r2: { label: "Cloudflare R2", description: "S3-compatible object storage with global CDN." },
};

function SettingsTab() {
  const queryClient = useQueryClient();
  const { localUser } = useLocalAuth();
  const isSuperAdmin = localUser?.role === "superadmin";

  // Build headers: always include dev-admin-token; also attach JWT so the
  // backend can verify is_superadmin from DB on write endpoints.
  const ADMIN_HEADERS = (() => {
    const h: Record<string, string> = { "x-admin-token": "dev-admin-token" };
    const jwt = getLocalToken();
    if (jwt) h["Authorization"] = `Bearer ${jwt}`;
    return h;
  })();

  const { data: sysData, refetch: refetchSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () =>
      fetch(`${API_BASE_URL}/admin/system-settings`, { headers: ADMIN_HEADERS })
        .then((r) => r.json() as Promise<{
          settings: Record<string, string>;
          is_superadmin: boolean;
          secrets_store: { backend: string; available: string };
        }>),
  });

  const { data: backends } = useQuery({
    queryKey: ["storage-backends"],
    queryFn: () =>
      fetch(`${API_BASE_URL}/admin/storage/backends`, { headers: ADMIN_HEADERS })
        .then((r) => r.json() as Promise<{ backends: { key: string; label: string }[] }>),
  });

  const { data: gdriveStatus, refetch: refetchGdrive } = useQuery({
    queryKey: ["gdrive-status"],
    queryFn: () =>
      fetch(`${API_BASE_URL}/admin/gdrive/status`, { headers: ADMIN_HEADERS })
        .then((r) => r.json() as Promise<{ connected: boolean }>),
  });

  const settings = sysData?.settings ?? {};
  const secretsStoreInfo = sysData?.secrets_store;
  const availableKeys = new Set((backends?.backends ?? []).map((b) => b.key));
  const isConnected = gdriveStatus?.connected ?? false;

  const SECRETS_STORE_META: Record<string, { label: string; description: string; secure: boolean }> = {
    SQLiteSecretsStore: {
      label: "SQLite (local DB)",
      description: "Credentials stored in local database. Set SECRETS_ENCRYPTION_KEY in backend/.env for encryption at rest.",
      secure: false,
    },
    CloudflareKVSecretsStore: {
      label: "Cloudflare Workers KV",
      description: "Credentials stored in Cloudflare's encrypted KV store. Ideal for Cloudflare-hosted backends.",
      secure: true,
    },
    InfisicalSecretsStore: {
      label: "Infisical",
      description: "Credentials stored in Infisical secrets manager (end-to-end encrypted, free forever plan).",
      secure: true,
    },
  };

  // ── Default backend selector ──────────────────────────────────────────────
  const [selectedDefault, setSelectedDefault] = useState<string>("");
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultMsg, setDefaultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings["storage.default_backend"]) {
      setSelectedDefault(settings["storage.default_backend"]);
    }
  }, [settings]);

  async function handleSaveDefault() {
    if (!selectedDefault) return;
    setSavingDefault(true);
    setDefaultMsg(null);
    try {
      // Regular admins use the restricted endpoint; superadmins use the full one
      const endpoint = isSuperAdmin
        ? `${API_BASE_URL}/admin/system-settings`
        : `${API_BASE_URL}/admin/system-settings/storage-default`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ "storage.default_backend": selectedDefault }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { detail?: string };
        setDefaultMsg(d.detail ?? "Failed to save.");
      } else {
        setDefaultMsg("Default backend saved.");
        void refetchSettings();
        void queryClient.invalidateQueries({ queryKey: ["storage-backends"] });
      }
    } catch {
      setDefaultMsg("Could not reach the API.");
    } finally {
      setSavingDefault(false);
    }
  }

  // ── R2 credentials form ───────────────────────────────────────────────────
  const [r2Form, setR2Form] = useState({
    "r2.account_id": "",
    "r2.access_key_id": "",
    "r2.secret_access_key": "",
    "r2.bucket": "",
    "r2.public_url": "",
  });
  const [r2Saving, setR2Saving] = useState(false);
  const [r2Msg, setR2Msg] = useState<string | null>(null);
  const [r2Success, setR2Success] = useState(false);

  useEffect(() => {
    setR2Form((prev) => ({
      "r2.account_id": settings["r2.account_id"] || prev["r2.account_id"],
      "r2.access_key_id": settings["r2.access_key_id"] || prev["r2.access_key_id"],
      "r2.secret_access_key": settings["r2.secret_access_key"] === "••••••••" ? prev["r2.secret_access_key"] : (settings["r2.secret_access_key"] || prev["r2.secret_access_key"]),
      "r2.bucket": settings["r2.bucket"] || prev["r2.bucket"],
      "r2.public_url": settings["r2.public_url"] || prev["r2.public_url"],
    }));
  }, [settings]);

  async function handleSaveR2() {
    setR2Saving(true);
    setR2Msg(null);
    setR2Success(false);
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(r2Form)) {
      if (v && v !== "••••••••") payload[k] = v;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-settings`, {
        method: "PATCH",
        headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json()) as { detail?: string };
        setR2Msg(d.detail ?? "Failed to save.");
      } else {
        setR2Success(true);
        setR2Msg("R2 credentials saved. R2 is now available as a storage backend.");
        void refetchSettings();
        void queryClient.invalidateQueries({ queryKey: ["storage-backends"] });
      }
    } catch {
      setR2Msg("Could not reach the API.");
    } finally {
      setR2Saving(false);
    }
  }

  // ── DB backend form ───────────────────────────────────────────────────────
  const [dbBackend, setDbBackend] = useState("local-sqlite");
  const [neonUrl, setNeonUrl] = useState("");
  const [gdriveDbRefreshToken, setGdriveDbRefreshToken] = useState("");
  const [gdriveDbFileId, setGdriveDbFileId] = useState("");
  const [r2DbKey, setR2DbKey] = useState("db/journeymakers.sqlite3");
  const [dbSaving, setDbSaving] = useState(false);
  const [dbMsg, setDbMsg] = useState<string | null>(null);
  const [dbSuccess, setDbSuccess] = useState(false);

  useEffect(() => {
    if (settings["db.backend"]) setDbBackend(settings["db.backend"]);
    if (settings["db.gdrive_file_id"]) setGdriveDbFileId(settings["db.gdrive_file_id"]);
    if (settings["db.r2_key"]) setR2DbKey(settings["db.r2_key"]);
  }, [settings]);

  async function handleSaveDbBackend() {
    setDbSaving(true);
    setDbMsg(null);
    setDbSuccess(false);
    const payload: Record<string, string> = { "db.backend": dbBackend };
    if (dbBackend === "neon-postgres" && neonUrl) payload["db.neon_url"] = neonUrl;
    if (dbBackend === "gdrive-sqlite") {
      if (gdriveDbRefreshToken) payload["db.gdrive_refresh_token"] = gdriveDbRefreshToken;
      if (gdriveDbFileId) payload["db.gdrive_file_id"] = gdriveDbFileId;
    }
    if (dbBackend === "r2-sqlite" && r2DbKey) payload["db.r2_key"] = r2DbKey;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-settings`, {
        method: "PATCH",
        headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json()) as { detail?: string };
        setDbMsg(d.detail ?? "Failed to save.");
      } else {
        setDbSuccess(true);
        setDbMsg("DB backend saved. Restart the server to apply the change.");
        void refetchSettings();
      }
    } catch {
      setDbMsg("Could not reach the API.");
    } finally {
      setDbSaving(false);
    }
  }

  // ── Google OAuth app credentials form ────────────────────────────────────
  const [googleForm, setGoogleForm] = useState({ "google.client_id": "", "google.client_secret": "" });
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [googleSuccess, setGoogleSuccess] = useState(false);

  useEffect(() => {
    setGoogleForm((prev) => ({
      "google.client_id": settings["google.client_id"] || prev["google.client_id"],
      "google.client_secret": settings["google.client_secret"] === "••••••••" ? prev["google.client_secret"] : (settings["google.client_secret"] || prev["google.client_secret"]),
    }));
  }, [settings]);

  async function handleSaveGoogle() {
    setGoogleSaving(true);
    setGoogleMsg(null);
    setGoogleSuccess(false);
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(googleForm)) {
      if (v && v !== "••••••••") payload[k] = v;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-settings`, {
        method: "PATCH",
        headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json()) as { detail?: string };
        setGoogleMsg(d.detail ?? "Failed to save.");
      } else {
        setGoogleSuccess(true);
        setGoogleMsg("Google OAuth credentials saved. You can now connect Google Drive.");
        void refetchSettings();
      }
    } catch {
      setGoogleMsg("Could not reach the API.");
    } finally {
      setGoogleSaving(false);
    }
  }

  // ── GDrive OAuth ──────────────────────────────────────────────────────────
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [gdriveMsg, setGdriveMsg] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setGdriveMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gdrive/authorize`, { headers: ADMIN_HEADERS });
      const data = (await res.json()) as { url?: string; detail?: string };
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700");
        setGdriveMsg("Complete the Google sign-in in the popup, then click 'Refresh status'.");
      } else {
        setGdriveMsg(data.detail ?? "Failed to get authorization URL. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET above or in backend/.env.");
      }
    } catch {
      setGdriveMsg("Could not reach the API. Make sure the backend is running.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setGdriveMsg(null);
    try {
      await fetch(`${API_BASE_URL}/admin/gdrive/disconnect`, {
        method: "DELETE",
        headers: ADMIN_HEADERS,
      });
      setGdriveMsg("Google Drive disconnected.");
      void refetchGdrive();
    } catch {
      setGdriveMsg("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  const DefaultBackendSection = (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-sm font-bold">Default storage backend for uploads</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        New uploads will use this backend unless overridden per-upload.
      </p>
      <div className="flex flex-col gap-2.5">
        {(["local", "gdrive", "r2"] as const).map((key) => {
          const live = availableKeys.has(key);
          const meta = STORAGE_BACKEND_META[key];
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                selectedDefault === key
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-border/80"
              } ${!live ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="default_backend"
                value={key}
                checked={selectedDefault === key}
                disabled={!live}
                onChange={() => setSelectedDefault(key)}
                className="accent-accent"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold">{meta.label}</span>
                {!live && <span className="ml-2 text-xs text-muted-foreground">(not configured)</span>}
              </div>
            </label>
          );
        })}
      </div>
      {defaultMsg && (
        <p className="mt-3 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
          {defaultMsg}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleSaveDefault()}
        disabled={savingDefault || !selectedDefault}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
      >
        {savingDefault ? "Saving…" : "Save default"}
      </button>
    </div>
  );

  // Non-superadmin: show only the storage-default picker, filtered to configured backends only
  if (!isSuperAdmin) {
    const configuredBackends = (["local", "gdrive", "r2"] as const).filter((k) =>
      availableKeys.has(k),
    );
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-bold">Default storage backend for uploads</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            New uploads will use this backend unless overridden per-upload.
          </p>
          <div className="flex flex-col gap-2.5">
            {configuredBackends.map((key) => {
              const meta = STORAGE_BACKEND_META[key];
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                    selectedDefault === key
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="default_backend"
                    value={key}
                    checked={selectedDefault === key}
                    onChange={() => setSelectedDefault(key)}
                    className="accent-accent"
                  />
                  <span className="text-sm font-semibold">{meta.label}</span>
                </label>
              );
            })}
          </div>
          {defaultMsg && (
            <p className="mt-3 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
              {defaultMsg}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSaveDefault()}
            disabled={savingDefault || !selectedDefault}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {savingDefault ? "Saving…" : "Save default"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-2xl border border-border bg-[#fbf6ee] p-5">
        <h2 className="text-xl font-black mb-1">System Settings</h2>
        <p className="text-xs text-muted-foreground">
          Super admin controls — storage backends, credentials, and integrations.
        </p>
      </div>

      {/* Secrets store status */}
      {secretsStoreInfo && (() => {
        const meta = SECRETS_STORE_META[secretsStoreInfo.backend];
        const isSecure = meta?.secure ?? false;
        return (
          <div className={`rounded-2xl border p-5 ${isSecure ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/60"}`}>
            <div className="flex items-center gap-3">
              <span className={`size-2.5 rounded-full shrink-0 ${isSecure ? "bg-green-500" : "bg-amber-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-bold">
                  Secrets store:{" "}
                  <span className={isSecure ? "text-green-700" : "text-amber-700"}>
                    {meta?.label ?? secretsStoreInfo.backend}
                  </span>
                </p>
                <p className={`mt-0.5 text-xs ${isSecure ? "text-green-700" : "text-amber-700"}`}>
                  {meta?.description ?? "Unknown secrets backend."}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${isSecure ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {isSecure ? "Encrypted" : "Plain / local"}
              </span>
            </div>
            {!isSecure && (
              <p className="mt-3 text-xs text-amber-700">
                <span className="font-semibold">To upgrade:</span> Set{" "}
                <code className="rounded bg-amber-100 px-1 font-mono">SECRETS_BACKEND=infisical</code> or{" "}
                <code className="rounded bg-amber-100 px-1 font-mono">SECRETS_BACKEND=cloudflare_kv</code>{" "}
                in <code className="rounded bg-amber-100 px-1 font-mono">backend/.env</code>, or set{" "}
                <code className="rounded bg-amber-100 px-1 font-mono">SECRETS_ENCRYPTION_KEY</code> to encrypt at rest.
              </p>
            )}
          </div>
        );
      })()}

      {/* Storage backends status overview */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base font-bold">Storage backends</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Shows which backends are configured and available.
        </p>
        <div className="grid gap-3">
          {(["local", "gdrive", "r2"] as const).map((key) => {
            const live = availableKeys.has(key);
            const meta = STORAGE_BACKEND_META[key];
            const isCurrent = settings["storage.default_backend"] === key || (!settings["storage.default_backend"] && key === "local");
            return (
              <div
                key={key}
                className={`flex items-start gap-3 rounded-xl border p-4 ${live ? "border-green-200 bg-green-50/50" : "border-border bg-secondary/20"}`}
              >
                <span className={`mt-0.5 size-2 shrink-0 rounded-full ${live ? "bg-green-500" : "bg-gray-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {live ? "Available" : "Not configured"}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                      Default
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Default backend selector — admin uploads */}
      {DefaultBackendSection}

      {/* Default backend selector — user uploads */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-bold">Default storage backend for user uploads</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Images/videos uploaded by users (travel memories, reviews) go to this backend.
        </p>
        <UserUploadBackendSection
          availableKeys={availableKeys}
          currentValue={settings["storage.user_default_backend"] || "local"}
          onSave={async (val) => {
            await fetch(`${API_BASE_URL}/admin/system-settings`, {
              method: "PATCH",
              headers: { ...ADMIN_HEADERS, "content-type": "application/json" },
              body: JSON.stringify({ "storage.user_default_backend": val }),
            });
            void refetchSettings();
          }}
        />
      </div>

      {/* Google OAuth app credentials */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-bold">Google OAuth — app credentials</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Enter your Google Cloud OAuth 2.0 client credentials. These are stored securely and used
          for Drive integration. Create them at{" "}
          <span className="font-mono">console.cloud.google.com → APIs &amp; Services → Credentials</span>.
        </p>
        <div className="grid gap-3">
          {([
            { key: "google.client_id" as const, label: "Client ID", placeholder: "*.apps.googleusercontent.com" },
            { key: "google.client_secret" as const, label: "Client Secret", placeholder: settings["google.client_secret"] === "••••••••" ? "Already saved — leave blank to keep" : "GOCSPX-…", type: "password" as const },
          ]).map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
              <input
                type={type ?? "text"}
                value={googleForm[key]}
                onChange={(e) => setGoogleForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          ))}
        </div>
        {googleMsg && (
          <p className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${googleSuccess ? "bg-green-50 text-green-800" : "bg-destructive/10 text-destructive"}`}>
            {googleMsg}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSaveGoogle()}
          disabled={googleSaving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {googleSaving ? "Saving…" : "Save Google credentials"}
        </button>
      </div>

      {/* Google Drive OAuth */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#4285f4]/10">
            <svg viewBox="0 0 87.3 78" className="size-4">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z" fill="#00ac47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335"/>
              <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.45-4.45 1.2z" fill="#00832d"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
              <path d="M73.4 26.5l-12.65-21.8C59.95 3.1 58.8 2 57.45 1.2L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold">Google Drive — Connect</h3>
            <p className="text-xs text-muted-foreground">Link a Google account to use Drive as a storage backend</p>
          </div>
          <span
            className={`ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            <span className={`size-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        {gdriveMsg && (
          <p className="mb-3 rounded-xl bg-accent/10 px-4 py-2.5 text-sm text-accent font-medium">
            {gdriveMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {!isConnected ? (
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={connecting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4285f4] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3367d6] disabled:opacity-60 transition-colors"
            >
              {connecting ? "Opening…" : "Connect Google Drive"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4285f4] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3367d6] disabled:opacity-60 transition-colors"
              >
                {connecting ? "Opening…" : "Switch Google account"}
              </button>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-destructive hover:border-destructive disabled:opacity-60 transition-colors"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void refetchGdrive()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh status
          </button>
        </div>
      </div>

      {/* Database backend selector */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-bold">Database backend</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Where the application database (SQLite or Postgres) is stored. Change takes effect after a server restart.
        </p>
        <div className="flex flex-col gap-2.5 mb-4">
          {([
            { key: "local-sqlite", label: "Local SQLite", desc: "Stored on the server filesystem (default, zero config)" },
            { key: "gdrive-sqlite", label: "Google Drive SQLite", desc: "SQLite file stored in Google Drive, synced on every write" },
            { key: "r2-sqlite", label: "Cloudflare R2 SQLite", desc: "SQLite file stored in Cloudflare R2, synced on every write" },
            { key: "neon-postgres", label: "Neon Postgres", desc: "Serverless Postgres — requires NEON_DATABASE_URL and separate schema setup" },
          ] as const).map(({ key, label, desc }) => (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                dbBackend === key ? "border-accent bg-accent/5" : "border-border hover:border-border/80"
              }`}
            >
              <input
                type="radio"
                name="db_backend"
                value={key}
                checked={dbBackend === key}
                onChange={() => setDbBackend(key)}
                className="mt-0.5 accent-accent"
              />
              <div>
                <span className="text-sm font-semibold">{label}</span>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {dbBackend === "neon-postgres" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold">Neon DATABASE_URL</label>
            <input
              type="password"
              value={neonUrl}
              onChange={(e) => setNeonUrl(e.target.value)}
              placeholder="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
              className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        )}

        {dbBackend === "gdrive-sqlite" && (
          <div className="mb-4 grid gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold">GDrive Refresh Token</label>
              <input
                type="password"
                value={gdriveDbRefreshToken}
                onChange={(e) => setGdriveDbRefreshToken(e.target.value)}
                placeholder="Paste long-lived refresh token (from OAuth flow)"
                className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">GDrive File ID (optional — leave blank to auto-create)</label>
              <input
                type="text"
                value={gdriveDbFileId}
                onChange={(e) => setGdriveDbFileId(e.target.value)}
                placeholder="1abc…XYZ"
                className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </div>
        )}

        {dbBackend === "r2-sqlite" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold">R2 Object Key</label>
            <input
              type="text"
              value={r2DbKey}
              onChange={(e) => setR2DbKey(e.target.value)}
              placeholder="db/journeymakers.sqlite3"
              className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">Uses the R2 credentials configured below.</p>
          </div>
        )}

        {dbMsg && (
          <p className={`mb-3 rounded-xl px-4 py-2.5 text-sm font-medium ${dbSuccess ? "bg-green-50 text-green-800" : "bg-destructive/10 text-destructive"}`}>
            {dbMsg}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSaveDbBackend()}
          disabled={dbSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {dbSaving ? "Saving…" : "Save DB backend"}
        </button>
      </div>

      {/* Cloudflare R2 credentials form */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-bold">Cloudflare R2 — credentials</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Credentials are stored securely — no env file or server restart needed.
        </p>

        <div className="grid gap-3">
          {([
            { key: "r2.account_id", label: "Account ID", placeholder: "e.g. abc123def456…" },
            { key: "r2.access_key_id", label: "Access Key ID", placeholder: "R2 API token key" },
            { key: "r2.secret_access_key", label: "Secret Access Key", placeholder: settings["r2.secret_access_key"] === "••••••••" ? "Already saved — leave blank to keep" : "R2 API token secret", type: "password" },
            { key: "r2.bucket", label: "Bucket name", placeholder: "my-journeymakers-bucket" },
            { key: "r2.public_url", label: "Public URL", placeholder: "https://pub-abc.r2.dev" },
          ] as { key: keyof typeof r2Form; label: string; placeholder: string; type?: string }[]).map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
              <input
                type={type ?? "text"}
                value={r2Form[key]}
                onChange={(e) => setR2Form((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-secondary/10 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          ))}
        </div>

        {r2Msg && (
          <p className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${r2Success ? "bg-green-50 text-green-800" : "bg-destructive/10 text-destructive"}`}>
            {r2Msg}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSaveR2()}
          disabled={r2Saving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {r2Saving ? "Saving…" : "Save R2 credentials"}
        </button>
      </div>
    </div>
  );
}

function UserUploadBackendSection({
  availableKeys,
  currentValue,
  onSave,
}: {
  availableKeys: Set<string>;
  currentValue: string;
  onSave: (val: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { setSelected(currentValue); }, [currentValue]);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {(["local", "gdrive", "r2"] as const).map((key) => {
          const live = availableKeys.has(key);
          const meta = STORAGE_BACKEND_META[key];
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                selected === key ? "border-accent bg-accent/5" : "border-border hover:border-border/80"
              } ${!live ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="user_default_backend"
                value={key}
                checked={selected === key}
                disabled={!live}
                onChange={() => setSelected(key)}
                className="accent-accent"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold">{meta.label}</span>
                {!live && <span className="ml-2 text-xs text-muted-foreground">(not configured)</span>}
              </div>
            </label>
          );
        })}
      </div>
      {msg && <p className="mt-3 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{msg}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setMsg(null);
          await onSave(selected);
          setMsg("User upload backend saved.");
          setSaving(false);
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-80 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </>
  );
}

// ── Destination gallery multi-upload ─────────────────────────────────────────

function DestinationGalleryUpload({
  slug,
  onAdded,
}: {
  slug: string;
  onAdded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const { resolveBackend } = useStorageBackend();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    const resolvedBackend = await resolveBackend();
    if (resolvedBackend === null) return;
    setUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const result = await api.adminUploadMedia(file, slug, resolvedBackend);
        uploadedUrls.push(result.url);
      }
      if (uploadedUrls.length > 0) onAdded(uploadedUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addLink() {
    const url = linkInput.trim();
    if (!url) return;
    onAdded([url]);
    setLinkInput("");
  }

  return (
    <div className="space-y-2">
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 p-5 hover:border-accent/60 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </div>
        ) : (
          <>
            <Image className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload images / videos</p>
            <p className="text-xs text-muted-foreground/70">JPG, PNG, WebP, MP4 — up to 50 MB each</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <input
          type="url"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
          placeholder="Or paste a photo / video URL…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={addLink}
          disabled={!linkInput.trim()}
          className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-40"
        >
          Add link
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}

