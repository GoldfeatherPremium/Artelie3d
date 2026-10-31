import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listStores } from "@/lib/data/catalog";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Designers",
  description: "Meet the independent designers and makers behind ATELIER 3D.",
};

export default async function DesignersPage() {
  const stores = await listStores();

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Makers"
          title="Designers & studios"
          description="Independent designers and makers whose work is sold on the platform."
          align="center"
        />

        {stores.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="Designers coming soon" description="Studios will appear here as they join the platform." />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store, index) => (
              <Reveal key={store.id} delay={index * 0.06}>
                <Link
                  href={`/shop?brand=all`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-bronze/60"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bronze/15 font-display text-title-md text-bronze">
                    {store.name.charAt(0)}
                  </div>
                  <h2 className="mt-5 font-display text-title-lg text-ink group-hover:text-bronze">
                    {store.name}
                  </h2>
                  <p className="mt-2 flex-1 text-body-sm text-fog">
                    {store.description ?? `The studio behind a curated collection on ATELIER 3D.`}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-body-sm font-medium text-bronze">
                    Browse the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
