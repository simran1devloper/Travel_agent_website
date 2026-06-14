import { useCallback, useRef, useState } from "react";
import { ImagePlus, Video, X, AlertCircle, Loader2, Link } from "lucide-react";
import { api } from "@/lib/api";

type UploadState = "idle" | "uploading" | "done" | "error";

type FileEntry = {
  key: string;
  file: File;
  previewUrl: string;
  state: UploadState;
  progress: number;
  uploadedUrl?: string;
  error?: string;
};

type Props = {
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
  accept?: string;
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
]);
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function MediaUpload({
  onUrlsChange,
  maxFiles = 6,
  accept = "image/*,video/mp4,video/quicktime",
}: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [linkUrls, setLinkUrls] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Use a ref so upload callbacks always see the latest linkUrls without stale closure
  const linkUrlsRef = useRef<string[]>([]);
  linkUrlsRef.current = linkUrls;

  const uploadedUrls = (current: FileEntry[]) =>
    current.filter((e) => e.state === "done" && e.uploadedUrl).map((e) => e.uploadedUrl!);

  const fireChange = useCallback(
    (fileEntries: FileEntry[], links: string[]) => {
      onUrlsChange([...uploadedUrls(fileEntries), ...links]);
    },
    [onUrlsChange],
  );

  const startUpload = useCallback(
    async (entry: FileEntry, current: FileEntry[]) => {
      const updateEntry = (key: string, patch: Partial<FileEntry>, all: FileEntry[]) => {
        const next = all.map((e) => (e.key === key ? { ...e, ...patch } : e));
        onUrlsChange([...uploadedUrls(next), ...linkUrlsRef.current]);
        return next;
      };

      try {
        const url = await api.uploadUserMediaWithProgress(entry.file, (pct) => {
          setEntries((prev) => updateEntry(entry.key, { progress: pct }, prev));
        });
        setEntries((prev) =>
          updateEntry(entry.key, { state: "done", progress: 100, uploadedUrl: url }, prev),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setEntries((prev) => updateEntry(entry.key, { state: "error", error: msg }, prev));
      }
    },
    [onUrlsChange],
  );

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const valid: FileEntry[] = [];
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.has(file.type)) continue;
        if (file.size > MAX_SIZE_BYTES) continue;
        const entry: FileEntry = {
          key: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          state: "uploading",
          progress: 0,
        };
        valid.push(entry);
      }
      if (!valid.length) return;
      setEntries((prev) => {
        const slots = maxFiles - prev.length;
        const toAdd = valid.slice(0, slots);
        const next = [...prev, ...toAdd];
        toAdd.forEach((e) => startUpload(e, next));
        return next;
      });
    },
    [maxFiles, startUpload],
  );

  const removeEntry = (key: string) => {
    setEntries((prev) => {
      const removed = prev.find((e) => e.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = prev.filter((e) => e.key !== key);
      fireChange(next, linkUrlsRef.current);
      return next;
    });
  };

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const next = [...linkUrls, url];
    setLinkUrls(next);
    setLinkInput("");
    fireChange(entries, next);
  };

  const removeLink = (url: string) => {
    const next = linkUrls.filter((u) => u !== url);
    setLinkUrls(next);
    fireChange(entries, next);
  };

  const isVideo = (entry: FileEntry) => entry.file.type.startsWith("video/");
  const canAdd = entries.length < maxFiles;

  return (
    <div className="space-y-3">
      {canAdd && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c76b2f] ${
            dragging
              ? "border-[#c76b2f] bg-[#c76b2f]/5"
              : "border-border bg-secondary/40 hover:border-[#c76b2f]/50"
          }`}
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">Drop photos or videos here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, PNG, WebP, MP4, MOV · max 50 MB · {maxFiles - entries.length} slot
              {maxFiles - entries.length !== 1 ? "s" : ""} left
            </p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="group relative aspect-square overflow-hidden rounded-xl bg-secondary"
            >
              {isVideo(entry) ? (
                <div className="flex h-full items-center justify-center bg-foreground/10">
                  <Video className="size-8 text-muted-foreground" />
                </div>
              ) : (
                <img src={entry.previewUrl} alt="preview" className="h-full w-full object-cover" />
              )}

              {entry.state === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                  <Loader2 className="size-5 animate-spin text-white" />
                  <span className="text-xs font-bold text-white">{entry.progress}%</span>
                </div>
              )}
              {entry.state === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/80 p-2">
                  <AlertCircle className="size-5 text-white" />
                  <span className="text-center text-[10px] font-bold leading-tight text-white">
                    {entry.error}
                  </span>
                </div>
              )}

              {entry.state !== "uploading" && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.key)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* URL link input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Or paste a photo / video URL…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c76b2f]/40"
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

      {linkUrls.length > 0 && (
        <div className="space-y-1.5">
          {linkUrls.map((url) => (
            <div
              key={url}
              className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2"
            >
              <Link className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</span>
              <button
                type="button"
                onClick={() => removeLink(url)}
                className="shrink-0 rounded-full p-0.5 hover:bg-secondary"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
