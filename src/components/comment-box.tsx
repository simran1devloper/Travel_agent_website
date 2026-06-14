import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { api, type ApiComment, type CommentPayload } from "@/lib/api";

type EntityType = "package" | "destination" | "service";

type Props = {
  entityType: EntityType;
  entitySlug: string;
  className?: string;
};

export function CommentBox({ entityType, entitySlug, className = "" }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", entityType, entitySlug],
    queryFn: () => api.getEntityComments(entityType, entitySlug),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CommentPayload = {
        entity_type: entityType,
        entity_slug: entitySlug,
        name: name.trim(),
        email: email.trim() || undefined,
        body: body.trim(),
      };
      return api.submitComment(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", entityType, entitySlug] });
      setName("");
      setEmail("");
      setBody("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    },
  });

  const canSubmit = name.trim().length >= 2 && body.trim().length >= 5 && !mutation.isPending;

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="size-5 text-accent" />
          Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
          )}
        </h3>
        {comments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {showComments ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {showComments ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {/* Existing comments */}
      {showComments && (
        <div className="mb-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((c) => <CommentCard key={c.public_id} comment={c} />)
          )}
        </div>
      )}

      {/* Submit form */}
      {submitted ? (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="size-4 shrink-0" />
          Thanks! Your comment has been submitted for review and will appear after approval.
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={120}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts, experiences, or questions..."
              rows={4}
              minLength={5}
              maxLength={2000}
              required
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{body.length}/2000</p>
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-500">
              {(mutation.error as Error).message || "Failed to submit. Please try again."}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {mutation.isPending ? "Submitting..." : "Post Comment"}
          </button>
        </form>
      )}
    </div>
  );
}

function CommentCard({ comment }: { comment: ApiComment }) {
  const date = new Date(comment.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const initials = comment.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-secondary/20 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{comment.name}</span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{comment.body}</p>
      </div>
    </div>
  );
}
