"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Viewer } from "@/components/configurator/viewer";
import { Button } from "@/components/ui/button";

export interface ShowroomProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  modelConfig: Record<string, unknown> | null;
}

export function ShowroomClient({ products }: { products: ShowroomProduct[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(
    products[0]?.id ?? null,
  );
  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null;
  const [viewKey, setViewKey] = React.useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-h-[420px] overflow-hidden rounded-2xl border border-line bg-paper lg:min-h-[560px]">
        {selected ? (
          <Viewer
            key={viewKey}
            modelConfig={selected.modelConfig}
            materials={{}}
            className="h-full min-h-[420px] lg:min-h-[560px]"
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center p-10 text-center">
            <div>
              <p className="font-display text-title-lg text-ink">No configurable pieces yet</p>
              <p className="mt-2 text-body-sm text-fog">
                Check back soon — live 3D models are being added to the collection.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="flex flex-col">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <h2 className="font-display text-title-md text-ink">Featured pieces</h2>
          <p className="mt-1 text-caption text-fog">
            Select a piece to view it in live 3D.
          </p>
          <div className="mt-4 grid gap-2">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedId(product.id)}
                aria-pressed={selected?.id === product.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                  selected?.id === product.id
                    ? "border-bronze bg-bronze/5"
                    : "border-line bg-ivory/40 hover:border-bronze/50",
                )}
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-stone/50" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{product.name}</span>
                  {selected?.id === product.id ? (
                    <span className="text-caption font-medium text-bronze">Viewing</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Button type="button" variant="outline" onClick={() => setViewKey((k) => k + 1)}>
            <RotateCcw className="h-4 w-4" /> Reset camera
          </Button>
          {selected ? (
            <Link
              href={`/products/${selected.slug}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-charcoal px-7 text-body-md font-medium tracking-wide text-ivory transition-colors hover:bg-ink"
            >
              Customize & price <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
