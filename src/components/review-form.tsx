import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/star-rating";
import { MediaUpload } from "@/components/media-upload";

type Props = {
  packageSlug: string;
  packageTitle: string;
  open: boolean;
  onClose: () => void;
};

export function ReviewForm({ packageSlug, packageTitle, open, onClose }: Props) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      api.submitReview(packageSlug, {
        rating,
        title: title.trim() || undefined,
        body,
        trip_date: tripDate || undefined,
        media_urls: mediaUrls,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews", packageSlug] });
      qc.invalidateQueries({ queryKey: ["review-stats", packageSlug] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Great",
    5: "Exceptional",
  };

  const bodyOk = body.trim().length >= 10;
  const canSubmit = rating > 0 && bodyOk && !mutation.isPending;

  const missing: string[] = [];
  if (rating === 0) missing.push("a star rating");
  if (!bodyOk)
    missing.push(
      `${10 - body.trim().length} more character${10 - body.trim().length === 1 ? "" : "s"} in your review`,
    );

  function handleClose() {
    if (mutation.isPending) return;
    if (mutation.isSuccess) {
      setRating(0);
      setTitle("");
      setTripDate("");
      setBody("");
      setMediaUrls([]);
      mutation.reset();
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Write a review
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tighter">{packageTitle}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Success state */}
        {mutation.isSuccess ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle2 className="size-12 text-[#c76b2f]" />
            <div>
              <p className="text-xl font-extrabold tracking-tighter">Review submitted</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Thank you — your experience helps future travelers choose with confidence.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            className="space-y-6 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            {/* Star rating */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Overall rating{" "}
                <span className="font-normal text-red-500">{rating === 0 ? "· required" : ""}</span>
              </label>
              <div
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${rating === 0 ? "bg-red-50 ring-1 ring-red-200" : "bg-transparent"}`}
              >
                <StarRating value={rating} onChange={setRating} size="lg" />
                {rating > 0 ? (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {ratingLabels[rating]}
                  </span>
                ) : (
                  <span className="text-xs text-red-400">Tap a star</span>
                )}
              </div>
            </div>

            {/* When did you travel? */}
            <div>
              <label className="mb-2 block text-sm font-bold" htmlFor="trip-date">
                When did you travel?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="trip-date"
                type="month"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm focus:border-[#c76b2f] focus:outline-none"
              />
            </div>

            {/* Review title */}
            <div>
              <label className="mb-2 block text-sm font-bold" htmlFor="review-title">
                Review title <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="review-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Summarize your experience in a sentence…"
                className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-[#c76b2f] focus:outline-none"
              />
            </div>

            {/* Review body */}
            <div>
              <label className="mb-2 block text-sm font-bold" htmlFor="review-body">
                Your experience
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Share the moments that stood out, what you'd recommend, and what surprised you…"
                className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-[#c76b2f] focus:outline-none"
              />
              <p
                className={`mt-1 text-right text-[11px] ${body.length < 10 ? "text-muted-foreground/50" : "text-muted-foreground"}`}
              >
                {body.length} / 2000
              </p>
            </div>

            {/* Optional media */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Add photos or videos{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <MediaUpload onUrlsChange={setMediaUrls} maxFiles={4} />
            </div>

            {/* Error */}
            {mutation.isError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                Something went wrong. Please try again.
              </p>
            )}

            {/* Validation hint */}
            {missing.length > 0 && !mutation.isPending && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
                Still needed: {missing.join(" and ")}
              </p>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-full border border-border py-3 text-sm font-bold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-bold text-background disabled:opacity-40"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit review"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
