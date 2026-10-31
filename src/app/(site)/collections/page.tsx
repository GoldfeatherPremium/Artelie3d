import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCollections } from "@/lib/data/catalog";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Collections",
  description: "Curated collections from ATELIER 3D designers and brands.",
};

export default async function CollectionsPage() {
  const collections = await listCollections();

  return (
    <div className="bg-ivory">
      <div className="container-site py-12 sm:py-16">
        <SectionHeading overline="Curated" title="Collections" description="Signature lines, seasonal edits and considered groupings from the world's best makers." />

        {collections.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="Collections coming soon" description="We're composing new collections right now." />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection, index) => (
              <Reveal key={collection.id} delay={index * 0.06}>
                <Link href={`/collections/${collection.slug}`} className="group block overflow-hidden rounded-2xl bg-paper shadow-card transition-shadow hover:shadow-raised">
                  <div className="aspect-[4/3] overflow-hidden bg-stone/40">
                    {collection.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collection.hero_image_url}
                        alt={collection.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-title-lg text-fog">{collection.name}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="font-display text-title-md text-ink">{collection.name}</h3>
                      {collection.description ? <p className="mt-1 line-clamp-2 text-body-sm text-fog">{collection.description}</p> : null}
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-bronze transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
