import Link from "next/link";
import { Heart } from "lucide-react";
import { requireWishlist, listWishlist, toggleWishlist } from "@/app/actions/wishlist";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { RemoveWishlistItem } from "@/components/catalog/remove-wishlist-item";

export default async function WishlistPage() {
  await requireWishlist();
  const items = await listWishlist();

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">Wishlist</h2>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here."
            action={<Link href="/shop" className="text-body-sm font-medium text-bronze hover:text-ink">Browse products →</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {items.map((item) => {
            if (!item.product) return null;
            return (
              <li key={item.id} className="flex gap-4 rounded-2xl border border-line bg-paper p-4">
                {item.product.imageUrl ? (
                  <Link href={`/products/${item.product.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.product.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  </Link>
                ) : (
                  <span className="h-20 w-20 shrink-0 rounded-xl bg-stone/50" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${item.product.slug}`} className="line-clamp-1 text-title-sm font-medium text-ink transition-colors hover:text-bronze">
                        {item.product.name}
                      </Link>
                      <div className="mt-1">
                        <Price amountCents={item.product.salePriceCents ?? item.product.basePriceCents} size="sm" />
                      </div>
                    </div>
                    <RemoveWishlistItem productId={item.product.id} />
                  </div>
                  <div className="mt-auto pt-3">
                    <Badge variant={item.product.status === "approved" ? "success" : "neutral"}>{item.product.status}</Badge>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
