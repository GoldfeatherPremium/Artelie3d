import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SectionHeading } from "@/components/motion/section-heading";
import { PaginationClient } from "@/components/shop/pagination-client";
import { ShopToolbar } from "@/components/shop/shop-toolbar";
import { listCategories, listBrands } from "@/lib/data/catalog";
import { categoryBanner } from "@/lib/data/assets";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string; brand?: string }>;
}

const SORTS = new Set(["newest", "price-asc", "price-desc", "rating", "bestseller"]);

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.name} — Shop`,
    description: category.description ?? `Shop ${category.name} at ATELIER 3D.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const sort = sp.sort && SORTS.has(sp.sort) ? (sp.sort as "newest" | "price-asc" | "price-desc" | "rating" | "bestseller") : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const brand = sp.brand || null;

  const [result, categories, brands] = await Promise.all([
    listProducts({ categorySlug: category.slug, brandSlug: brand, sort, page, pageSize: 12 }),
    listCategories(),
    listBrands(),
  ]);

  const banner = categoryBanner(category.slug) ?? category.image_url;

  return (
    <div className="bg-ivory">
      {banner ? (
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt={category.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 container-site pb-6">
            <p className="text-caption font-medium uppercase tracking-[0.2em] text-ivory/80">Category</p>
            <h1 className="mt-1 font-display text-display-lg text-paper">{category.name}</h1>
          </div>
        </div>
      ) : (
        <div className="container-site pt-10 sm:pt-14">
          <SectionHeading overline="Category" title={category.name} description={category.description ?? undefined} />
        </div>
      )}

      <div className="container-site py-10 sm:py-14">
        <div className="border-t border-line pt-5">
          <ShopToolbar categories={categories} brands={brands} current={{ category: category.slug, brand, sort: sort ?? null, page: String(page) }} total={result.total} />
        </div>

        {result.items.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="No products in this category yet" description="Check back soon — new pieces are added regularly." />
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
