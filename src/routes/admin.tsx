import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocalAuth } from "@/components/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { PageShell } from "@/components/page-shell";
import { StarRating } from "@/components/star-rating";
import { packages, destinations } from "@/lib/mock-data";
import {
  api,
  type ApiMedia,
  type AdminReview,
  type ApiPlanner,
  type PlannerPayload,
  type ApiPackage,
  type ApiDestination,
  type PackagePayload,
  type DestinationPayload,
} from "@/lib/api";
import { AUTH0_ENABLED } from "@/lib/auth-config";
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
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — JourneyMakers" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminPage,
});

type AdminTab = "overview" | "packages" | "media" | "reviews" | "planners";

function AdminPage() {
  const { localUser } = useLocalAuth();

  // Local admin — grant access immediately
  if (localUser?.role === "admin") return <AdminContent />;

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
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "packages", label: "Packages" },
    { key: "media", label: "Media" },
    { key: "reviews", label: "Reviews" },
    { key: "planners", label: "Planners" },
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
      {activeTab === "packages" && <PackagesTab />}
      {activeTab === "media" && <MediaTab />}
      {activeTab === "reviews" && <ReviewsTab />}
      {activeTab === "planners" && <PlannersTab />}
    </PageShell>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const qc = useQueryClient();
  const statsQuery = useQuery({ queryKey: ["admin-stats"], queryFn: api.adminStats });
  const inquiriesQuery = useQuery({ queryKey: ["admin-inquiries"], queryFn: api.adminInquiries });
  const plannersQuery = useQuery({ queryKey: ["planners"], queryFn: api.listPlanners });
  const stats = statsQuery.data;
  const planners = plannersQuery.data ?? [];

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

  return (
    <>
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
          <button className="text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary">
            <Download className="size-3" /> Export CSV
          </button>
        </SectionHeader>
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-secondary text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <div className="col-span-2">ID</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-2">Destination</div>
            <div className="col-span-1">Budget</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Planner</div>
          </div>
          {displayedLeads.map((l, i) => (
            <div
              key={l.id}
              className={`grid grid-cols-2 md:grid-cols-12 gap-2 px-5 py-4 items-center text-sm ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="md:col-span-2 font-mono text-xs">{l.id}</div>
              <div className="md:col-span-2 font-medium">{l.name}</div>
              <div className="md:col-span-2 text-muted-foreground">{l.destination}</div>
              <div className="md:col-span-1 text-muted-foreground text-xs">{l.budget}</div>
              <div className="md:col-span-2">
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
              <div className="md:col-span-3">
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
          <button className="text-xs font-bold tracking-widest uppercase border border-border px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-secondary">
            <Upload className="size-3" /> Bulk import CSV
          </button>
          <button className="text-xs font-bold tracking-widest uppercase bg-foreground text-background px-4 py-2 rounded-full inline-flex items-center gap-2 hover:bg-accent">
            <Plus className="size-3" /> New package
          </button>
        </SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((p) => (
            <div
              key={p.slug}
              className="border border-border rounded-2xl p-4 flex gap-4 items-center"
            >
              <img
                src={p.image}
                alt={p.title}
                className="size-16 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{p.title}</div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  {p.days}d · ${p.price.toLocaleString()}
                </div>
              </div>
              <button className="text-xs font-bold underline hover:text-accent">Edit</button>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section className="mb-12">
        <SectionHeader title="Destinations" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {destinations.map((d) => (
            <div key={d.slug} className="border border-border rounded-xl p-3 text-center">
              <img
                src={d.image}
                alt={d.name}
                className="aspect-square w-full rounded-lg object-cover mb-2"
              />
              <div className="text-xs font-bold">{d.name}</div>
              <div className="text-[10px] text-muted-foreground">{d.packagesCount} pkgs</div>
            </div>
          ))}
        </div>
      </section>

      {/* CSV templates */}
      <section>
        <SectionHeader title="CSV import templates" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CsvCard
            name="packages.csv"
            cols="title, destination, days, price, category, image, description"
            sample="Bali Escape,Bali,5,49999,Honeymoon,image.jpg,Beautiful Bali package"
          />
          <CsvCard
            name="destinations.csv"
            cols="slug, name, image, packagesCount, tagline"
            sample="bali,Bali,bali.jpg,14,Tropical renewal"
          />
        </div>
      </section>
    </>
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
};
type DestForm = {
  slug: string;
  name: string;
  image_url: string;
  tagline: string;
  duration: string;
  price: string;
  packages_count: string;
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
});
const emptyDest = (): DestForm => ({
  slug: "",
  name: "",
  image_url: "",
  tagline: "",
  duration: "",
  price: "",
  packages_count: "0",
});

function PackagesTab() {
  const qc = useQueryClient();
  const [section, setSection] = useState<"packages" | "destinations">("packages");

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
        image_url: f.image_url || undefined,
        tagline: f.tagline || undefined,
        description: f.description || undefined,
        published: f.published,
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
  const [destModal, setDestModal] = useState<{ mode: "add" | "edit"; data: DestForm } | null>(null);
  const [destDeleteSlug, setDestDeleteSlug] = useState<string | null>(null);

  const saveDest = useMutation({
    mutationFn: (f: DestForm) => {
      const payload: DestinationPayload = {
        slug: f.slug,
        name: f.name,
        image_url: f.image_url || undefined,
        tagline: f.tagline || undefined,
        duration: f.duration || undefined,
        price: f.price ? Number(f.price) : undefined,
        packages_count: Number(f.packages_count) || 0,
      };
      return destModal?.mode === "edit"
        ? api.adminUpdateDestination(f.slug, payload)
        : api.adminCreateDestination(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destinations"] });
      setDestModal(null);
    },
  });

  const deleteDest = useMutation({
    mutationFn: (slug: string) => api.adminDeleteDestination(slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destinations"] });
      setDestDeleteSlug(null);
    },
  });

  return (
    <>
      {/* Section toggle */}
      <div className="mb-8 flex items-center justify-between">
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

      {/* ── Packages list ── */}
      {section === "packages" && (
        <div className="grid gap-4">
          {pkgsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {pkgs.map((pkg) => (
            <div
              key={pkg.slug}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4"
            >
              {pkg.image_url && (
                <img
                  src={pkg.image_url}
                  alt={pkg.title}
                  className="h-20 w-28 flex-none rounded-xl object-cover"
                />
              )}
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
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPkgModal({
                      mode: "edit",
                      data: {
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
        <div className="grid gap-4">
          {destsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {dests.map((dest) => (
            <div
              key={dest.slug}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4"
            >
              {dest.image_url && (
                <img
                  src={dest.image_url}
                  alt={dest.name}
                  className="h-20 w-28 flex-none rounded-xl object-cover"
                />
              )}
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
              <div className="flex shrink-0 gap-2">
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
                <AdminField label="Image URL" className="sm:col-span-2">
                  <input
                    value={pkgModal.data.image_url}
                    onChange={(e) =>
                      setPkgModal(
                        (m) => m && { ...m, data: { ...m.data, image_url: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="https://… or /assets/image.jpg"
                  />
                </AdminField>
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
                <AdminField label="Image URL" className="sm:col-span-2">
                  <input
                    value={destModal.data.image_url}
                    onChange={(e) =>
                      setDestModal(
                        (m) => m && { ...m, data: { ...m.data, image_url: e.target.value } },
                      )
                    }
                    className="admin-input"
                    placeholder="https://… or /assets/image.jpg"
                  />
                </AdminField>
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

  const mediaQuery = useQuery({
    queryKey: ["admin-media", page],
    queryFn: () => api.adminListMedia(page),
  });
  const data = mediaQuery.data;

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
      const res = await fetch("http://localhost:8000/media", {
        method: "POST",
        headers: { "x-admin-token": "dev-admin-token" },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
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
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/mp4,video/quicktime"
          multiple
          onChange={(e) => {
            if (!e.target.files) return;
            for (const f of Array.from(e.target.files)) uploadMut.mutate(f);
            e.target.value = "";
          }}
        />
      </SectionHeader>

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
              statusColor={statusColor}
              loading={updateMut.isPending || deleteMut.isPending}
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
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-accent"
        >
          <Plus className="size-3" /> Add planner
        </button>
      </SectionHeader>

      {plannersQuery.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border h-28" />
          ))}
        </div>
      ) : planners.length === 0 ? (
        <AdminEmptyState message="No planners yet. Add your first team member." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planners.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border p-5 flex gap-4 items-start">
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
              <div className="flex-1 min-w-0">
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

function CsvCard({ name, cols, sample }: { name: string; cols: string; sample: string }) {
  return (
    <div className="border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm font-bold">{name}</span>
        <button className="text-xs font-bold tracking-widest uppercase inline-flex items-center gap-1 hover:text-accent">
          <Download className="size-3" /> Template
        </button>
      </div>
      <div className="bg-secondary rounded-lg p-3 font-mono text-xs overflow-x-auto">
        <div className="text-muted-foreground">{cols}</div>
        <div className="mt-1">{sample}</div>
      </div>
    </div>
  );
}
