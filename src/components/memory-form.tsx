import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, X, Globe, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { MediaUpload } from "@/components/media-upload";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MemoryForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      api.createMemory({
        title,
        description: description || undefined,
        destination: destination || undefined,
        travel_date_from: dateFrom || undefined,
        travel_date_to: dateTo || undefined,
        is_public: isPublic,
        media_urls: mediaUrls,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["public-memories"] });
    },
  });

  const canSubmit = title.trim().length >= 2 && !mutation.isPending;

  function handleClose() {
    if (mutation.isPending) return;
    if (mutation.isSuccess) {
      setTitle("");
      setDescription("");
      setDestination("");
      setDateFrom("");
      setDateTo("");
      setIsPublic(false);
      setMediaUrls([]);
      mutation.reset();
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-background shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 shrink-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Share a journey memory
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tighter">Create your memory</h2>
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
              <p className="text-xl font-extrabold tracking-tighter">Memory saved</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isPublic
                  ? "Your memory is now visible on the public feed — inspiring future travelers."
                  : "Your memory is saved privately in your dashboard."}
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
            className="overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="space-y-5 p-6">
              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="mem-title">
                  Memory title <span className="text-[#c76b2f]">*</span>
                </label>
                <input
                  id="mem-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunrise over Santorini"
                  className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-[#c76b2f] focus:outline-none"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="mem-desc">
                  What made this trip special?{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="mem-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the moments, people, or places that stayed with you…"
                  className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-[#c76b2f] focus:outline-none"
                />
              </div>

              {/* Destination + dates row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-2 block text-sm font-bold" htmlFor="mem-dest">
                    Destination
                  </label>
                  <input
                    id="mem-dest"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Tokyo"
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-[#c76b2f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="mem-from">
                    From
                  </label>
                  <input
                    id="mem-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm focus:border-[#c76b2f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold" htmlFor="mem-to">
                    To
                  </label>
                  <input
                    id="mem-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm focus:border-[#c76b2f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Photos / videos */}
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Photos & videos{" "}
                  <span className="font-normal text-muted-foreground">(optional · max 6)</span>
                </label>
                <MediaUpload onUrlsChange={setMediaUrls} maxFiles={6} />
              </div>

              {/* Privacy toggle */}
              <div>
                <p className="mb-2 text-sm font-bold">Visibility</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      !isPublic
                        ? "border-[#c76b2f] bg-[#c76b2f]/8"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <Lock
                      className={`size-4 ${!isPublic ? "text-[#c76b2f]" : "text-muted-foreground"}`}
                    />
                    <div>
                      <p className="text-sm font-bold">Private</p>
                      <p className="text-[11px] text-muted-foreground">Only visible to you</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      isPublic
                        ? "border-[#c76b2f] bg-[#c76b2f]/8"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    <Globe
                      className={`size-4 ${isPublic ? "text-[#c76b2f]" : "text-muted-foreground"}`}
                    />
                    <div>
                      <p className="text-sm font-bold">Public</p>
                      <p className="text-[11px] text-muted-foreground">Inspire other travelers</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Error */}
              {mutation.isError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  Something went wrong. Please try again.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-border p-6 shrink-0">
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
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save memory"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
