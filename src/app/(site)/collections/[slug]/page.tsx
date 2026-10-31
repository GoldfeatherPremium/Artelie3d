import { notFound } from "next/navigation";
import { getCollectionBySlug, listProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/motion/section-heading";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  return {
    title: `${collection.name} — Collection`,
    description: collection.description ?? `Explore the ${collection.name} collection at ATELIER 3D.`,
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const result = await listProducts({ collectionSlug: collection.slug, pageSize: 24 });

  return (
    <div className="bg-ivory">
      {collection.hero_image_url ? (
        <div className="relative h-72 w-full overflow-hidden sm:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collection.hero_image_url} alt={collection.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 container-site pb-8">
            <p className="text-caption font-medium uppercase tracking-[0.2em] text-ivory/80">Collection</p>
            <h1 className="mt-1 font-display text-display-lg text-paper">{collection.name}</h1>
          </div>
        </div>
      ) : (
        <div className="container-site py-12">
          <SectionHeading overline="Collection" title={collection.name} description={collection.description ?? undefined} />
        </div>
      )}

      <div className="container-site py-12">
        {result.items.length === 0 ? (
          <EmptyState title="This collection is being composed" description="New pieces are on their way." />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
