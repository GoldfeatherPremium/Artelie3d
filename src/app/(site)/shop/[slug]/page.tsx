import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SectionHeading } from "@/components/motion/section-heading";
import { PaginationClient } from "@/components/shop/pagination-client";
import { ShopToolbar } from "@/components/shop/shop-toolbar";
import { listCategories, listBrands } from "@/lib/data/catalog";

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

  return (
    <div className="bg-ivory">
      <div className="container-site py-10 sm:py-14">
        <SectionHeading overline="Category" title={category.name} description={category.description ?? undefined} />

        <div className="mt-6 border-t border-line pt-5">
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
