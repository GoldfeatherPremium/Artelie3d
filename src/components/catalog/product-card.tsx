import Link from "next/link";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { WishlistButton } from "./wishlist-button";
import type { CatalogProduct } from "@/lib/data/catalog";

export function ProductCard({ product, className }: { product: CatalogProduct; className?: string }) {
  const image = product.images[0];
  const discount =
    product.sale_price_cents != null && product.sale_price_cents < product.base_price_cents
      ? Math.round((1 - product.sale_price_cents / product.base_price_cents) * 100)
      : 0;

  return (
    <div className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-stone/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt_text ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-caption text-fog">No image</div>
        )}
        <WishlistButton productId={product.id} className="absolute right-3 top-3 bg-paper/85 backdrop-blur-sm" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 ? <Badge variant="danger">{discount}% off</Badge> : null}
          {product.type === "configurable" ? <Badge variant="bronze">Customizable</Badge> : null}
          {product.type === "made_to_order" ? <Badge variant="info">Made to order</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        {product.brand ? (
          <p className="text-caption uppercase tracking-wider text-fog">{product.brand.name}</p>
        ) : null}
        <Link href={`/products/${product.slug}`} className="line-clamp-1 text-title-sm font-medium text-ink transition-colors hover:text-bronze">
          {product.name}
        </Link>
        {product.review_count > 0 ? (
          <div className="flex items-center gap-1.5">
            <Rating value={product.rating} size={13} />
            <span className="text-caption text-fog">({product.review_count})</span>
          </div>
        ) : null}
        <div className="mt-1">
          <Price amountCents={product.sale_price_cents ?? product.base_price_cents} compareAtCents={product.sale_price_cents ? product.base_price_cents : null} size="md" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="aspect-[4/5] animate-pulse rounded-xl bg-stone/50" />
      <div className="space-y-2 pt-4">
        <div className="h-3 w-20 animate-pulse rounded bg-stone/50" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-stone/50" />
        <div className="h-4 w-16 animate-pulse rounded bg-stone/50" />
      </div>
    </div>
  );
}
