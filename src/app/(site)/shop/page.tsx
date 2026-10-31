import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { listProducts, listCategories, listBrands } from "@/lib/data/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SectionHeading } from "@/components/motion/section-heading";
import { ShopToolbar } from "@/components/shop/shop-toolbar";
import { PaginationClient } from "@/components/shop/pagination-client";

const SORTS = new Set(["newest", "price-asc", "price-desc", "rating", "bestseller"]);

interface ShopPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams;
  const category = sp.category || null;
  const brand = sp.brand || null;
  const q = sp.q || null;
  const sort = sp.sort && SORTS.has(sp.sort) ? (sp.sort as "newest" | "price-asc" | "price-desc" | "rating" | "bestseller") : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, categories, brands] = await Promise.all([
    listProducts({ categorySlug: category, brandSlug: brand, q, sort, page, pageSize: 12 }),
    listCategories(),
    listBrands(),
  ]);

  const activeCategory = category ? categories.find((c) => c.slug === category) : null;

  return (
    <div className="bg-ivory">
      <div className="container-site py-10 sm:py-14">
        <SectionHeading
          overline={activeCategory ? "Category" : "Shop"}
          title={activeCategory?.name ?? (q ? `Results for “${q}”` : "All products")}
          description={activeCategory?.description ?? undefined}
        />

        {/* Category chips (desktop) */}
        <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
          <Link
            href="/shop"
            className={
              !category
                ? "rounded-full bg-charcoal px-4 py-2 text-body-sm font-medium text-ivory"
                : "rounded-full border border-line bg-paper px-4 py-2 text-body-sm text-ink transition-colors hover:border-bronze"
            }
          >
            All
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/shop/${item.slug}`}
              className={
                item.slug === category
                  ? "rounded-full bg-charcoal px-4 py-2 text-body-sm font-medium text-ivory"
                  : "rounded-full border border-line bg-paper px-4 py-2 text-body-sm text-ink transition-colors hover:border-bronze"
              }
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <ShopToolbar categories={categories} brands={brands} current={{ category, brand, sort: sort ?? null, q, page: String(page) }} total={result.total} />
        </div>

        {result.items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="No products found"
              description="Try adjusting your filters or search terms."
              action={
                <Link href="/shop">
                  <Button variant="outline">Clear filters</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <PaginationClient page={result.page} totalPages={result.totalPages} className="mt-12" />
          </>
        )}
      </div>
    </div>
  );
}
