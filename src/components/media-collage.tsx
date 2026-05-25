import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ApiGalleryItem as GalleryItem } from "@/lib/api";

type CollageProps = {
  items: GalleryItem[];
  totalCount?: number;
  className?: string;
};

export function MediaCollage({ items, totalCount, className = "" }: CollageProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const visible = items.slice(0, 5);
  const extra = Math.max(0, (totalCount ?? items.length) - visible.length);

  function openAt(i: number) {
    setActiveIdx(i);
    setOpen(true);
  }

  function prev() {
    setActiveIdx((i) => Math.max(0, i - 1));
  }
  function next() {
    setActiveIdx((i) => Math.min(visible.length - 1, i + 1));
  }

  const current = visible[activeIdx];

  return (
    <>
      <div
        className={`grid gap-1.5 h-[340px] md:h-[420px] ${className}`}
        style={{ gridTemplateColumns: "1.4fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
      >
        {visible.map((item, i) => (
          <CollageTile
            key={i}
            item={item}
            index={i}
            isFirst={i === 0}
            extra={i === visible.length - 1 ? extra : 0}
            onClick={openAt}
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-white/10 gap-0">
          <DialogTitle className="sr-only">{current?.caption}</DialogTitle>
          <div className="relative" style={{ aspectRatio: "4/3" }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={activeIdx}
                src={current?.src}
                alt={current?.caption}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {current?.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-5 border border-white/20">
                  <Play className="size-8 text-white fill-white" />
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white font-semibold text-base">{current?.caption}</p>
              <p className="text-white/60 text-sm mt-1">📍 {current?.author}</p>
            </div>

            {activeIdx > 0 && (
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2.5 rounded-full text-white transition-all border border-white/10"
                aria-label="Previous"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            {activeIdx < visible.length - 1 && (
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2.5 rounded-full text-white transition-all border border-white/10"
                aria-label="Next"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          <div className="flex gap-2 p-3 overflow-x-auto bg-black/90">
            {visible.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 w-16 h-11 rounded-lg overflow-hidden transition-all ring-2 ${
                  i === activeIdx
                    ? "ring-accent opacity-100"
                    : "ring-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {extra > 0 && (
              <div className="shrink-0 w-16 h-11 rounded-lg bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold">
                +{extra}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollageTile({
  item,
  index,
  isFirst,
  extra,
  onClick,
}: {
  item: GalleryItem;
  index: number;
  isFirst: boolean;
  extra: number;
  onClick: (i: number) => void;
}) {
  return (
    <motion.button
      onClick={() => onClick(index)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-2xl bg-black/20 cursor-pointer group ${isFirst ? "row-span-2" : ""}`}
      aria-label={item.caption}
    >
      <img
        src={item.src}
        alt={item.caption}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />

      {item.type === "video" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/45 backdrop-blur-sm rounded-full p-2.5 border border-white/20 transition-transform duration-300 group-hover:scale-110">
            <Play className="size-4 text-white fill-white" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <p className="text-white text-[11px] font-semibold truncate leading-tight">
          {item.type === "video" && "▶ "}
          {item.caption}
        </p>
        <p className="text-white/60 text-[10px] truncate mt-0.5">{item.author}</p>
      </div>

      {extra > 0 && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <span className="text-white text-3xl font-extrabold tracking-tight">+{extra}</span>
          <span className="text-white/60 text-[10px] uppercase tracking-[0.2em] mt-1">more</span>
        </div>
      )}
    </motion.button>
  );
}

type StripProps = {
  items: { src: string; caption: string; service?: string }[];
  className?: string;
};

export function MediaStrip({ items, className = "" }: StripProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  function openAt(i: number) {
    setActiveIdx(i);
    setOpen(true);
  }

  const current = items[activeIdx];

  return (
    <>
      <div className={`flex gap-3 overflow-x-auto pb-2 ${className}`}>
        {items.map((item, i) => (
          <motion.button
            key={i}
            onClick={() => openAt(i)}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className="relative shrink-0 w-40 h-28 rounded-xl overflow-hidden bg-black/10 group cursor-pointer"
            aria-label={item.caption}
          >
            <img
              src={item.src}
              alt={item.caption}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              {item.service && (
                <span className="text-[9px] uppercase tracking-[0.2em] text-accent font-semibold block mb-0.5">
                  {item.service}
                </span>
              )}
              <p className="text-white text-[10px] font-medium truncate">{item.caption}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95 border-white/10">
          <DialogTitle className="sr-only">{current?.caption}</DialogTitle>
          <div className="relative aspect-video">
            <img src={current?.src} alt={current?.caption} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              {current?.service && (
                <span className="text-accent text-[10px] uppercase tracking-[0.2em] block mb-1">
                  {current.service}
                </span>
              )}
              <p className="text-white font-semibold">{current?.caption}</p>
            </div>
            {activeIdx > 0 && (
              <button
                onClick={() => setActiveIdx((i) => i - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white transition-all"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            {activeIdx < items.length - 1 && (
              <button
                onClick={() => setActiveIdx((i) => i + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white transition-all"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
