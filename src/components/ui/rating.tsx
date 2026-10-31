"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
  readOnly?: boolean;
}

function Rating({ value, onChange, size = 16, className, readOnly = !onChange }: RatingProps) {
  const [hover, setHover] = React.useState<number | null>(null);
  const active = hover ?? value;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `Rated ${value} out of 5` : "Rating"}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(active);
        const partial = !filled && star - 1 < active && active < star;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(null)}
            className={cn(
              "relative inline-flex transition-transform",
              !readOnly && "cursor-pointer hover:scale-110",
            )}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(
                "text-stone",
                filled && "fill-bronze text-bronze",
                !filled && !partial && "fill-transparent",
              )}
            />
            {partial && (
              <Star
                style={{ width: size * (active - (star - 1)), height: size }}
                className="absolute inset-y-0 left-0 overflow-hidden fill-bronze text-bronze"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Rating };
