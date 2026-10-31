import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { listProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/motion/section-heading";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

export const metadata = {
  title: "Search",
  description: "Search the ATELIER 3D collection.",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = q ? await listProducts({ q, page, pageSize: 24 }) : null;

  return (
    <div className="bg-ivory">
      <div className="container-site py-12 sm:py-16">
        <SectionHeading overline="Search" title={q ? `Results for “${q}”` : "Search"} description={q ? undefined : "Type a query in the search bar above."} />

        {!q ? (
          <div className="mt-10">
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title="Start typing to search" description="Search by name, material or SKU." />
          </div>
        ) : result && result.items.length > 0 ? (
          <>
            <p className="mt-4 text-body-sm text-fog">{result.total} result{result.total === 1 ? "" : "s"}</p>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-10">
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="No results"
              description={`We couldn't find anything for “${q}”. Try a different term.`}
              action={
                <Link href="/shop">
                  <Button variant="outline">Browse all products</Button>
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
