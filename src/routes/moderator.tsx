import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocalAuth } from "@/components/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { api, type ModeratorReview, type ModeratorInquiry, type ModeratorMedia } from "@/lib/api";
import { AUTH0_ENABLED } from "@/lib/auth-config";
import { CheckCircle2, XCircle, MessageSquare, FileText, ChevronLeft, ChevronRight, Image } from "lucide-react";

export const Route = createFileRoute("/moderator")({
  head: () => ({
    meta: [{ title: "Moderation — JourneyMakers" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: ModeratorPage,
});

// ── Auth gate ────────────────────────────────────────────────────────────────

function ModeratorPage() {
  const { localUser } = useLocalAuth();

  if (localUser?.role === "admin" || localUser?.role === "moderator" || localUser?.role === "superadmin") {
    return <ModeratorContent />;
  }

  if (localUser) {
    return (
      <PageShell eyebrow="System" title="Moderator access required.">
        <p className="mt-2 text-muted-foreground">
          Your account <strong>{localUser.email}</strong> does not have moderator privileges.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
          >
            Go to dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  if (AUTH0_ENABLED) {
    return <ModeratorAuthGate />;
  }

  return <ModeratorContent />;
}

function ModeratorAuthGate() {
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
      <PageShell eyebrow="System" title="Sign in required.">
        <div className="mt-6">
          <Link
            to="/signin"
            search={{ mode: "login" }}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
          >
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  return <ModeratorContent />;
}

// ── Main content ─────────────────────────────────────────────────────────────

type ModTab = "reviews" | "inquiries" | "media";

const TAB_ICONS: Record<ModTab, React.ReactNode> = {
  reviews: <MessageSquare className="size-4" />,
  inquiries: <FileText className="size-4" />,
  media: <Image className="size-4" />,
};

function ModeratorContent() {
  const [activeTab, setActiveTab] = useState<ModTab>("reviews");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">JourneyMakers</p>
            <h1 className="text-xl font-bold">Moderation Panel</h1>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
          {(["reviews", "inquiries", "media"] as ModTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_ICONS[tab]}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "reviews" && <ReviewsPanel />}
        {activeTab === "inquiries" && <InquiriesPanel />}
        {activeTab === "media" && <MediaPanel />}
      </div>
    </div>
  );
}

// ── Reviews panel ─────────────────────────────────────────────────────────────

const REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  flagged: "bg-orange-100 text-orange-800",
};

function ReviewsPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["mod-reviews", page],
    queryFn: () => api.moderatorReviews(page),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: string; moderation_note?: string } }) =>
      api.moderatorPatchReview(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-reviews"] }),
  });

  function setStatus(r: ModeratorReview, status: string) {
    patchMut.mutate({ id: r.public_id, payload: { status, moderation_note: noteMap[r.public_id] ?? r.moderation_note ?? "" } });
  }

  function saveNote(r: ModeratorReview) {
    patchMut.mutate({ id: r.public_id, payload: { moderation_note: noteMap[r.public_id] ?? "" } });
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reviews <span className="text-muted-foreground text-sm font-normal">({total})</span></h2>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && (!data?.items?.length) && (
        <p className="text-sm text-muted-foreground">No reviews found.</p>
      )}

      <div className="space-y-3">
        {data?.items?.map((r) => (
          <div key={r.public_id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.customer_name ?? "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.package_slug} · {r.rating}★ · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${REVIEW_STATUS_COLORS[r.status] ?? "bg-muted text-muted-foreground"}`}>
                {r.status}
              </span>
            </div>

            <p className="text-sm text-foreground">{r.body}</p>

            {/* Moderation note */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add moderation note…"
                value={noteMap[r.public_id] ?? r.moderation_note ?? ""}
                onChange={(e) => setNoteMap((m) => ({ ...m, [r.public_id]: e.target.value }))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => saveNote(r)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Save note
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={r.status === "approved" || patchMut.isPending}
                onClick={() => setStatus(r, "approved")}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
              >
                <CheckCircle2 className="size-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={r.status === "rejected" || patchMut.isPending}
                onClick={() => setStatus(r, "rejected")}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
              >
                <XCircle className="size-3.5" /> Reject
              </button>
              <button
                type="button"
                disabled={r.status === "flagged" || patchMut.isPending}
                onClick={() => setStatus(r, "flagged")}
                className="flex items-center gap-1.5 rounded-lg border border-orange-400 px-4 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-40"
              >
                Flag
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

// ── Inquiries panel ───────────────────────────────────────────────────────────

function InquiriesPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["mod-inquiries", page],
    queryFn: () => api.moderatorInquiries(page),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.moderatorPatchInquiry(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-inquiries"] }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inquiries <span className="text-muted-foreground text-sm font-normal">({total})</span></h2>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && (!data?.items?.length) && (
        <p className="text-sm text-muted-foreground">No inquiries found.</p>
      )}

      <div className="space-y-3">
        {data?.items?.map((inq) => (
          <div key={inq.public_id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{inq.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {inq.email} · {new Date(inq.created_at).toLocaleDateString()}
                  {inq.planner_name && ` · Planner: ${inq.planner_name}`}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {inq.status}
              </span>
            </div>

            {inq.destinations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {inq.destinations.map((d) => (
                  <span key={d} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    {d}
                  </span>
                ))}
              </div>
            )}

            {inq.budget && (
              <p className="text-sm text-muted-foreground">Budget: {inq.budget}</p>
            )}

            {inq.moderator_note && (
              <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                <strong>Note:</strong> {inq.moderator_note}
              </p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add moderator note…"
                value={noteMap[inq.public_id] ?? ""}
                onChange={(e) => setNoteMap((m) => ({ ...m, [inq.public_id]: e.target.value }))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                disabled={patchMut.isPending}
                onClick={() => patchMut.mutate({ id: inq.public_id, note: noteMap[inq.public_id] ?? "" })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

// ── Media panel ───────────────────────────────────────────────────────────────

const MEDIA_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function MediaPanel() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["mod-media", page, statusFilter],
    queryFn: () => api.moderatorMedia(page, statusFilter),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.moderatorPatchMedia(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-media"] }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const isImage = (ct: string | null) => ct?.startsWith("image/") ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          User Media <span className="text-muted-foreground text-sm font-normal">({total})</span>
        </h2>
        <div className="flex items-center gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && !data?.items?.length && (
        <p className="text-sm text-muted-foreground">No media found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items?.map((m: ModeratorMedia) => (
          <div key={m.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Preview */}
            <div className="relative bg-muted h-40 flex items-center justify-center">
              {isImage(m.content_type) ? (
                <img src={m.url} alt={m.filename} className="h-full w-full object-cover" />
              ) : m.content_type?.startsWith("video/") ? (
                <video src={m.url} className="h-full w-full object-cover" muted />
              ) : (
                <FileText className="size-10 text-muted-foreground/40" />
              )}
              <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold ${MEDIA_STATUS_COLORS[m.moderation_status] ?? "bg-muted text-muted-foreground"}`}>
                {m.moderation_status}
              </span>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground truncate" title={m.filename}>{m.filename}</p>
              <p className="text-xs text-muted-foreground">
                {m.size_bytes ? `${(m.size_bytes / 1024).toFixed(1)} KB` : "—"} · {new Date(m.created_at).toLocaleDateString()}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={m.moderation_status === "approved" || patchMut.isPending}
                  onClick={() => patchMut.mutate({ id: m.id, status: "approved" })}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40"
                >
                  <CheckCircle2 className="size-3.5" /> Approve
                </button>
                <button
                  type="button"
                  disabled={m.moderation_status === "rejected" || patchMut.isPending}
                  onClick={() => patchMut.mutate({ id: m.id, status: "rejected" })}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                >
                  <XCircle className="size-3.5" /> Reject
                </button>
              </div>

              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                View full size
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

// ── Shared pagination ─────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
      >
        <ChevronLeft className="size-3.5" /> Prev
      </button>
      <span className="text-muted-foreground">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
      >
        Next <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
