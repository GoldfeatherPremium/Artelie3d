"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { listRecentlyViewedProducts } from "@/app/actions/customer";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";

export default function RecentlyViewedPage() {
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof listRecentlyViewedProducts>>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem("atelier_recent");
      const slugs: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      listRecentlyViewedProducts(slugs.slice(0, 12)).then((rows) => {
        if (!cancelled) setItems(rows);
      });
    } catch {
      // ignore
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">Recently viewed</h2>
      <p className="mt-1 text-body-sm text-fog">Pieces you explored recently — stored privately in your browser.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-stone/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Clock className="h-6 w-6" />}
            title="Nothing here yet"
            description="Products you view will appear here."
            action={<Link href="/shop" className="inline-flex items-center gap-1 text-body-sm font-medium text-bronze hover:text-ink">Browse products <ArrowRight className="h-3.5 w-3.5" /></Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link href={`/products/${item.slug}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden rounded-xl bg-stone/40">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-caption text-fog">{item.name}</div>
                  )}
                </div>
                <p className="mt-3 line-clamp-1 text-title-sm font-medium text-ink transition-colors group-hover:text-bronze">{item.name}</p>
                <Price amountCents={item.salePriceCents ?? item.basePriceCents} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
