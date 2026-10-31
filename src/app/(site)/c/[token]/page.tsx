import { notFound } from "next/navigation";
import { Check, Share2 } from "lucide-react";
import Link from "next/link";
import { getPublicConfiguration } from "@/app/actions/configurations";
import { Viewer } from "@/components/configurator/viewer";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { buildMaterialMap } from "@/lib/pricing";

interface SharedConfigPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharedConfigPageProps) {
  const { token } = await params;
  const config = await getPublicConfiguration(token);
  if (!config) return {};
  return {
    title: `${config.name} — ${config.product.name}`,
    description: "A shared ATELIER 3D product configuration.",
  };
}

export default async function SharedConfigPage({ params }: SharedConfigPageProps) {
  const { token } = await params;
  const config = await getPublicConfiguration(token);
  if (!config) notFound();

  const materials = buildMaterialMap(config.product.customizationSchema, config.options);

  return (
    <div className="bg-ivory">
      <div className="container-site py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-paper to-ivory">
              <div className="h-96 w-full">
                <Viewer modelConfig={config.product.modelConfig} materials={materials} />
              </div>
            </div>
          </div>

          <div>
            <Badge variant="bronze">Shared configuration</Badge>
            <h1 className="mt-3 font-display text-display-md text-ink">{config.name}</h1>
            <p className="mt-2 text-body-lg text-fog">
              <Link href={`/products/${config.product.slug}`} className="text-bronze transition-colors hover:text-ink">
                {config.product.name}
              </Link>
            </p>

            <div className="mt-6 rounded-2xl border border-line bg-paper p-6">
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-fog">Price</span>
                <Price amountCents={config.unitPriceCents} size="lg" />
              </div>
              {config.optionSummary ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">Specifications</p>
                  <p className="mt-2 text-body-sm text-ink">{config.optionSummary.replaceAll(" | ", " · ")}</p>
                </div>
              ) : null}
              <ul className="mt-4 grid gap-1.5 border-t border-line pt-4 text-body-sm text-fog">
                {Object.entries(config.options).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-bronze" />
                    <span className="capitalize">{key.replaceAll("_", " ")}</span>
                    <span className="text-ink">: {value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <AddToCartButton productId={config.product.id} configuration={config.options} size="lg" />
              <Link href={`/products/${config.product.slug}`}>
                <Button variant="outline" size="lg" className="w-full">
                  Customize
                </Button>
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-caption text-fog">
              <Share2 className="h-3.5 w-3.5" /> Anyone with this link can view the configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
