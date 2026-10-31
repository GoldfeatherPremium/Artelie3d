import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listBrands } from "@/lib/data/catalog";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Brands",
  description: "The brands that make ATELIER 3D's collection possible.",
};

export default async function BrandsPage() {
  const brands = await listBrands();

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Brands"
          title="The brands we carry"
          description="Established names and emerging studios with a shared standard of craft."
          align="center"
        />

        {brands.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="Brands coming soon" description="Brand profiles will appear here as they are onboarded." />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand, index) => (
              <Reveal key={brand.id} delay={index * 0.06}>
                <Link
                  href={`/shop?brand=${brand.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-bronze/60"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone/50 font-display text-title-md text-ink">
                    {brand.name.charAt(0)}
                  </div>
                  <h2 className="mt-5 font-display text-title-lg text-ink group-hover:text-bronze">
                    {brand.name}
                  </h2>
                  <p className="mt-2 flex-1 text-body-sm text-fog">
                    {brand.description ?? `A brand available at ATELIER 3D.`}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-body-sm font-medium text-bronze">
                    Shop {brand.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
