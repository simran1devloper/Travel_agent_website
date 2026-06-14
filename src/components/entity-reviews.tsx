/**
 * Reusable review section for destinations and services.
 * Shows approved reviews and a "Write a review" modal form.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2, CheckCircle2, X, PenLine } from "lucide-react";
import { api, type ApiReview, type ReviewPayload } from "@/lib/api";
import { MediaUpload } from "@/components/media-upload";

type EntityType = "destination" | "service";

// ── Public section used in destination modal ───────────────────────────────────

export function DestinationReviewsSection({ slug, name }: { slug: string; name: string }) {
  return <EntityReviewsSection entityType="destination" entitySlug={slug} entityName={name} />;
}

export function ServiceReviewsSection({ slug, name }: { slug: string; name: string }) {
  return <EntityReviewsSection entityType="service" entitySlug={slug} entityName={name} />;
}

// ── Core component ─────────────────────────────────────────────────────────────

function EntityReviewsSection({
  entityType,
  entitySlug,
  entityName,
}: {
  entityType: EntityType;
  entitySlug: string;
  entityName: string;
}) {
  const [showForm, setShowForm] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["entity-reviews", entityType, entitySlug],
    queryFn: () => api.getEntityReviews(entityType, entitySlug),
  });

  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Traveler Reviews</h3>
          {avg !== null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {avg} ★ · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white hover:-translate-y-0.5 transition-all"
        >
          <PenLine className="size-3.5" />
          Write a Review
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Be the first to share your experience!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <EntityReviewCard key={r.public_id} review={r} />
          ))}
        </div>
      )}

      {showForm && (
        <EntityReviewForm
          entityType={entityType}
          entitySlug={entitySlug}
          entityName={entityName}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────

function EntityReviewCard({ review }: { review: ApiReview }) {
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const name: string = (review as ApiReview & { customer_name?: string }).customer_name ?? "Traveler";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="rounded-2xl border border-border/70 bg-white/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
      </div>
      {review.title && <p className="mt-2 text-sm font-semibold">{review.title}</p>}
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
      {review.admin_reply && (
        <div className="mt-3 rounded-xl bg-secondary/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">
            JourneyMakers Response
          </p>
          <p className="text-xs text-muted-foreground">{review.admin_reply}</p>
        </div>
      )}
    </div>
  );
}

// ── Review submission form ─────────────────────────────────────────────────────

function EntityReviewForm({
  entityType,
  entitySlug,
  entityName,
  onClose,
}: {
  entityType: EntityType;
  entitySlug: string;
  entityName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ReviewPayload = {
        rating,
        title: title.trim() || undefined,
        body,
        trip_date: tripDate || undefined,
        media_urls: mediaUrls,
      };
      return api.submitEntityReview(entityType, entitySlug, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-reviews", entityType, entitySlug] });
    },
  });

  const canSubmit = rating > 0 && body.trim().length >= 10 && !mutation.isPending;

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Exceptional",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#fbf8f3] shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-bold">Review: {entityName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        {mutation.isSuccess ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <p className="font-semibold">Thank you for your review!</p>
            <p className="text-sm text-muted-foreground">It will appear after a brief moderation check.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
            className="space-y-4 px-6 py-5"
          >
            {/* Star picker */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rating <span className="text-red-500">*</span>
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`size-7 transition-colors ${
                        star <= (hover || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                {(hover || rating) > 0 && (
                  <span className="ml-2 text-sm font-semibold text-accent">
                    {ratingLabels[hover || rating]}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarise your experience"
                maxLength={200}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Review <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={4}
                minLength={10}
                maxLength={2000}
                required
                className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                When did you travel?
              </label>
              <input
                type="month"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Photos / Videos (optional)
              </p>
              <MediaUpload onUrlsChange={(urls) => setMediaUrls(urls)} />
              {mediaUrls.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{mediaUrls.length} file(s) attached</p>
              )}
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-500">
                {(mutation.error as Error).message || "Failed to submit. Please try again."}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
