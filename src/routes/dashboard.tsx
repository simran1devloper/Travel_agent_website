import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { ReviewForm } from "@/components/review-form";
import { MemoryForm } from "@/components/memory-form";
import { StarRating } from "@/components/star-rating";
import { useLocalAuth } from "@/components/auth-provider";
import { api, type ApiReview, type ApiMemory } from "@/lib/api";
import {
  Heart,
  MapPin,
  Calendar,
  Download,
  BookOpen,
  Camera,
  Star,
  Trash2,
  Globe,
  Lock,
  Plus,
  Pencil,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — JourneyMakers" },
      { name: "description", content: "Track inquiries, manage wishlist, memories and reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Tab = "overview" | "memories" | "reviews";

function DashboardPage() {
  const { localUser, auth0Enabled } = useLocalAuth();
  if (localUser) return <DashboardContent />;

  if (auth0Enabled) {
    if (typeof window === "undefined") {
      return (
        <PageShell eyebrow="Traveler access" title="Checking your session..." children={null} />
      );
    }
    return <DashboardAuthGate />;
  }
  return <DashboardContent />;
}

function DashboardAuthGate() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <PageShell eyebrow="Traveler access" title="Checking your session..." children={null} />;
  }

  if (!isAuthenticated) {
    return (
      <PageShell eyebrow="Traveler access" title="Sign in to view your dashboard.">
        <Link
          to="/signin"
          search={{ mode: "login" }}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background"
        >
          Sign in
        </Link>
      </PageShell>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { localUser } = useLocalAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [memoryFormOpen, setMemoryFormOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ slug: string; title: string } | null>(null);

  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const data = dashboardQuery.data;

  const wishlist = data?.wishlist.map((item) => ({
    slug: item.slug,
    title: item.title,
    image: item.image_url ?? "",
    days: item.days,
    price: item.price,
  })) ?? [];

  const recentInquiries = data?.inquiries.map((item) => ({
    id: item.public_id,
    destination: item.destinations?.[0] ?? "Custom journey",
    status: item.status,
    date: new Date(item.created_at).toLocaleDateString(),
  })) ?? [];

  const reviews: ApiReview[] = data?.reviews ?? [];
  const memories: ApiMemory[] = data?.memories ?? [];

  const customerName = data?.customer.name ?? "Aarav";

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "memories", label: "Memories", count: memories.length },
    { key: "reviews", label: "Reviews", count: reviews.length },
  ];

  return (
    <PageShell eyebrow={`Welcome back, ${customerName}`} title="Your travel archive.">
      {/* Moderator / admin shortcut */}
      {(localUser?.role === "moderator" || localUser?.role === "admin" || localUser?.role === "superadmin") && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-5 py-3">
          <MessageSquare className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium flex-1">You have moderator access.</p>
          <Link
            to="/moderator"
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background hover:opacity-80"
          >
            Open Moderation Panel
          </Link>
        </div>
      )}

      {/* Tab navigation */}
      <div className="mb-10 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 border-b-2 px-4 pb-3 pt-1 text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <Stat
              label="Active inquiries"
              value={String(recentInquiries.filter((i) => i.status !== "Completed").length)}
            />
            <Stat label="Wishlist" value={String(wishlist.length)} />
            <Stat label="Memories" value={String(memories.length)} />
            <Stat label="Reviews" value={String(reviews.length)} />
          </div>

          <section className="mb-16">
            <h2 className="text-2xl font-bold tracking-tighter mb-6">Recent inquiries</h2>
            {recentInquiries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <MapPin className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="font-bold">No journey briefs yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Plan your first trip and track its progress here.</p>
                <Link to="/booking" className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-bold text-background">Plan a journey</Link>
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden">
                {recentInquiries.map((i, idx) => (
                  <div
                    key={i.id}
                    className={`flex flex-wrap items-center justify-between gap-4 p-5 ${idx > 0 ? "border-t border-border" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <MapPin className="size-4 text-accent" />
                      <div>
                        <div className="font-bold">{i.destination}</div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                          {i.id} · {i.date}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-secondary font-medium">
                      {i.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tighter">Wishlist</h2>
              <Link
                to="/packages"
                className="text-sm font-bold border-b-2 border-foreground pb-1 hover:text-accent hover:border-accent"
              >
                Add more
              </Link>
            </div>
            {wishlist.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Heart className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="font-bold">No saved journeys yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Browse packages and save the ones you love.</p>
                <Link to="/packages" className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white">Explore packages</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {wishlist.map((p) => (
                  <div key={p.slug} className="border border-border rounded-2xl overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Heart className="size-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold">{p.title}</h3>
                        <Heart className="size-4 text-accent fill-accent" />
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        {p.days} days · ${p.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tighter mb-6">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded-full text-sm font-medium hover:bg-secondary">
                <Download className="size-4" /> Download brochures
              </button>
              <button
                onClick={() => setMemoryFormOpen(true)}
                className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded-full text-sm font-medium hover:bg-secondary"
              >
                <Camera className="size-4" /> Share a memory
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded-full text-sm font-medium hover:bg-secondary"
              >
                <Star className="size-4" /> Write a review
              </button>
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-3 rounded-full text-sm font-bold tracking-widest uppercase hover:bg-accent transition-colors"
              >
                <Calendar className="size-4" /> Plan new trip
              </Link>
            </div>
          </section>
        </>
      )}

      {/* Memories tab */}
      {activeTab === "memories" && (
        <MemoriesTab memories={memories} onCreateClick={() => setMemoryFormOpen(true)} />
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <ReviewsTab
          reviews={reviews}
          onWriteClick={(slug, title) => setReviewTarget({ slug, title })}
          wishlist={wishlist}
        />
      )}

      {/* Modals */}
      <MemoryForm open={memoryFormOpen} onClose={() => setMemoryFormOpen(false)} />
      {reviewTarget && (
        <ReviewForm
          packageSlug={reviewTarget.slug}
          packageTitle={reviewTarget.title}
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </PageShell>
  );
}

// ── Memories tab ─────────────────────────────────────────────────────────────

function MemoriesTab({
  memories,
  onCreateClick,
}: {
  memories: ApiMemory[];
  onCreateClick: () => void;
}) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: api.deleteMemory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">My journey memories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture the moments that made each trip unforgettable.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background hover:bg-accent transition-colors"
        >
          <Plus className="size-4" /> New memory
        </button>
      </div>

      {memories.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-10 text-muted-foreground/40" />}
          title="No memories yet"
          description="After your trips, capture the highlights here — photos, stories, and the moments that stayed with you."
          action={
            <button
              type="button"
              onClick={onCreateClick}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background hover:bg-accent"
            >
              Share your first memory
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((mem) => (
            <MemoryCard
              key={mem.public_id}
              memory={mem}
              onDelete={() => deleteMutation.mutate(mem.public_id)}
              deleting={deleteMutation.isPending && deleteMutation.variables === mem.public_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryCard({
  memory,
  onDelete,
  deleting,
}: {
  memory: ApiMemory;
  onDelete: () => void;
  deleting: boolean;
}) {
  const coverUrl = memory.media_urls?.[0];
  const hasDates = memory.travel_date_from || memory.travel_date_to;

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-background">
      {/* Cover image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {coverUrl ? (
          <img
            src={coverUrl.startsWith("/") ? `http://localhost:8000${coverUrl}` : coverUrl}
            alt={memory.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Camera className="size-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute right-3 top-3 flex gap-1">
          {memory.is_public ? (
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Globe className="size-3" /> Public
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Lock className="size-3" /> Private
            </span>
          )}
        </div>
        {memory.media_urls?.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
            +{memory.media_urls.length - 1} more
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-extrabold tracking-tight">{memory.title}</h3>
        {memory.destination && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {memory.destination}
          </p>
        )}
        {hasDates && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {memory.travel_date_from ?? ""}
            {memory.travel_date_from && memory.travel_date_to ? " → " : ""}
            {memory.travel_date_to ?? ""}
          </p>
        )}
        {memory.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{memory.description}</p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {new Date(memory.created_at).toLocaleDateString()}
          </span>
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews tab ───────────────────────────────────────────────────────────────

function ReviewsTab({
  reviews,
  onWriteClick,
  wishlist,
}: {
  reviews: ApiReview[];
  onWriteClick: (slug: string, title: string) => void;
  wishlist: { slug: string; title: string }[];
}) {
  const qc = useQueryClient();
  const [selectedSlug, setSelectedSlug] = useState(wishlist[0]?.slug ?? "");

  const deleteMutation = useMutation({
    mutationFn: api.deleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const selectedPackage = wishlist.find((p) => p.slug === selectedSlug);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter">My reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your honest experiences help future travelers choose with confidence.
          </p>
        </div>
        {wishlist.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-[#c76b2f] focus:outline-none"
            >
              {wishlist.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                selectedPackage && onWriteClick(selectedPackage.slug, selectedPackage.title)
              }
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:bg-accent transition-colors"
            >
              <Pencil className="size-3.5" /> Write review
            </button>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="size-10 text-muted-foreground/40" />}
          title="No reviews yet"
          description="Rate your completed journeys and share what made them memorable. Your insight helps others plan with confidence."
          action={
            wishlist.length > 0 && selectedPackage ? (
              <button
                type="button"
                onClick={() => onWriteClick(selectedPackage.slug, selectedPackage.title)}
                className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background hover:bg-accent"
              >
                Write your first review
              </button>
            ) : (
              <Link
                to="/packages"
                className="rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background hover:bg-accent"
              >
                Explore packages
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.public_id}
              review={review}
              onDelete={() => deleteMutation.mutate(review.public_id)}
              deleting={deleteMutation.isPending && deleteMutation.variables === review.public_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onDelete,
  deleting,
}: {
  review: ApiReview;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{review.package_title ?? review.package_slug}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <StarRating value={review.rating} readonly size="sm" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{review.body}</p>
      {review.media_urls?.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {review.media_urls.map((url) => (
            <img
              key={url}
              src={url.startsWith("/") ? `http://localhost:8000${url}` : url}
              alt="Review media"
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-2xl p-5">
      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="text-3xl font-extrabold tracking-tighter">{value}</div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
      {icon}
      <div className="max-w-sm">
        <p className="text-lg font-extrabold tracking-tight">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
