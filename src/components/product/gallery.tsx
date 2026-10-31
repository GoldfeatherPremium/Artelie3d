"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { hasProductAssets, localProductImages } from "@/lib/data/assets";

interface GalleryImage {
  url: string;
  altText: string | null;
}

interface GalleryProps {
  images: GalleryImage[];
  name: string;
  slug: string;
}

/**
 * Product gallery. When a generated local set exists for the product slug it is
 * used as the canonical gallery (hero, front, side, detail, lifestyle) so every
 * product carries a consistent, original photography set. Otherwise it falls
 * back to the database-provided images.
 */
export function Gallery({ images, name, slug }: GalleryProps) {
  const [active, setActive] = React.useState(0);

  const local = React.useMemo(() => {
    if (!hasProductAssets(slug)) return null;
    return localProductImages(slug) as string[];
  }, [slug]);

  const list: GalleryImage[] = React.useMemo(() => {
    if (local) {
      return local.map((url) => ({ url, altText: `${name} — ${url.includes("/front.") ? "front view" : url.includes("/side.") ? "side view" : url.includes("/detail.") ? "material detail" : url.includes("/lifestyle.") ? "in the room" : "studio view"}` }));
    }
    return images.length > 0 ? images : [{ url: "", altText: null }];
  }, [local, images, name]);

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
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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
