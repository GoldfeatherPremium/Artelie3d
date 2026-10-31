import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/catalog";
import { getProductReviews } from "@/lib/data/reviews";
import { Gallery } from "@/components/product/gallery";
import { ProductConfigure } from "@/components/product/product-configure";
import { AddToCartButton } from "@/components/product/add-to-cart";
import { TrackView } from "@/components/product/track-view";
import { ProductCard } from "@/components/catalog/product-card";
import { WishlistButton } from "@/components/catalog/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { CustomizationSchema } from "@/lib/pricing";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description: product.description ?? `Shop ${product.name} at ATELIER 3D.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description ?? `Shop ${product.name} at ATELIER 3D.`,
      url: appUrl ? `${appUrl}/products/${product.slug}` : undefined,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([getProductReviews(product.id), getRelatedProducts(product, 4)]);

  const schema = (product.customization_schema ?? null) as CustomizationSchema | null;
  const isConfigurable = product.type === "configurable" && schema && schema.groups.length > 0;
  const modelConfig =
    product.model_config && typeof product.model_config === "object"
      ? (product.model_config as Record<string, unknown>)
      : null;

  return (
    <div className="bg-ivory">
      <TrackView slug={product.slug} />

      <div className="container-site py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-caption text-fog">
          <Link href="/" className="transition-colors hover:text-ink">Home</Link>
          <span>/</span>
          {product.category ? (
            <>
              <Link href={`/shop/${product.category.slug}`} className="transition-colors hover:text-ink">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <Reveal>
            <Gallery
              images={product.images.map((img) => ({ url: img.url, altText: img.alt_text }))}
              name={product.name}
            />
          </Reveal>

          {/* Info / configurator */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                {product.brand ? (
                  <Link href="/brands" className="text-caption font-medium uppercase tracking-wider text-bronze transition-colors hover:text-ink">
                    {product.brand.name}
                  </Link>
                ) : null}
                <h1 className="mt-1 font-display text-display-md text-ink">{product.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {product.review_count > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Rating value={product.rating} size={15} />
                      <span className="text-caption text-fog">
                        {product.rating.toFixed(1)} ({product.review_count} review{product.review_count === 1 ? "" : "s"})
                      </span>
                    </span>
                  ) : (
                    <span className="text-caption text-fog">No reviews yet</span>
                  )}
                  <span className="h-3 w-px bg-line" />
                  <Badge variant="neutral">{product.type.replaceAll("_", " ")}</Badge>
                  {product.featured ? <Badge variant="bronze">Featured</Badge> : null}
                </div>
              </div>
              <WishlistButton productId={product.id} className="bg-paper shadow-card" />
            </div>

            <div className="mt-5">
              <Price amountCents={product.sale_price_cents ?? product.base_price_cents} compareAtCents={product.sale_price_cents ? product.base_price_cents : null} size="lg" />
            </div>

            {product.description ? (
              <p className="mt-5 text-body-lg text-ink/80">{product.description}</p>
            ) : null}

            {/* Specs */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {product.materials.length > 0 ? (
                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">Materials</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.materials.map((m) => (
                      <span key={m} className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-caption text-ink">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {product.colors.length > 0 ? (
                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">Colors</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.colors.map((c) => (
                      <span key={c} className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-caption text-ink">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {product.weight_grams ? (
                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">Weight</p>
                  <p className="mt-1 text-body-sm text-ink">{(product.weight_grams / 1000).toFixed(1)} kg</p>
                </div>
              ) : null}
              {product.dimensions && typeof product.dimensions === "object" ? (
                <div>
                  <p className="text-caption font-medium uppercase tracking-wider text-fog">Dimensions</p>
                  <p className="mt-1 text-body-sm text-ink">
                    {Object.entries(product.dimensions as Record<string, unknown>)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-8">
              {isConfigurable ? (
                <ProductConfigure
                  product={{
                    id: product.id,
                    name: product.name,
                    basePriceCents: product.base_price_cents,
                    salePriceCents: product.sale_price_cents,
                    schema,
                    modelConfig,
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-line bg-paper p-5">
                  <p className="mb-4 text-body-sm text-fog">
                    {product.type === "made_to_order" ? "This piece is made to order. Delivery is crafted after purchase." : "This piece ships as photographed."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AddToCartButton productId={product.id} size="lg" />
                    <Link href="/cart">
                      <Button variant="outline" size="lg" className="w-full">View bag</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ul className="mt-8 grid gap-2 text-body-sm text-fog">
              {["Free returns within 30 days", "White-glove delivery available", "Secure checkout & test-mode payments"].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-bronze" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-16 border-t border-line pt-12">
          <SectionHeading overline="Reviews" title={`Customer reviews (${product.review_count})`} />
          {reviews.length === 0 ? (
            <p className="mt-6 text-body-sm text-fog">No published reviews yet.</p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-line bg-paper p-6">
                  <div className="flex items-center justify-between">
                    <Rating value={review.rating} size={15} />
                    {review.verifiedPurchase ? <Badge variant="success">Verified purchase</Badge> : null}
                  </div>
                  {review.title ? <h3 className="mt-3 font-medium text-ink">{review.title}</h3> : null}
                  {review.body ? <p className="mt-2 text-body-sm text-ink/80">{review.body}</p> : null}
                  <p className="mt-4 text-caption text-fog">{review.authorName ?? "Anonymous"} · {new Date(review.createdAt).toLocaleDateString()}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Related */}
        {related.length > 0 ? (
          <section className="mt-16 border-t border-line pt-12">
            <SectionHeading overline="You may also like" title="Related pieces" />
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
