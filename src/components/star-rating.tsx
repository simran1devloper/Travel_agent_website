import { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
};

export function StarRating({ value, onChange, readonly = false, size = "md" }: Props) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-6";

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-transform focus-visible:outline-none ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= active
                ? "fill-[#c76b2f] text-[#c76b2f]"
                : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
