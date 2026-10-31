"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  url: string;
  altText: string | null;
}

interface GalleryProps {
  images: GalleryImage[];
  name: string;
}

export function Gallery({ images, name }: GalleryProps) {
  const [active, setActive] = React.useState(0);
  const list = images.length > 0 ? images : [{ url: "", altText: null }];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="grid gap-3">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-stone/40">
        {current.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.altText ?? name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-title-md text-fog">
            {name}
          </div>
        )}
      </div>
      {list.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {list.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              className={cn(
                "aspect-square overflow-hidden rounded-lg bg-stone/40 ring-2 transition",
                index === active ? "ring-bronze" : "ring-transparent hover:ring-bronze/40",
              )}
            >
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
