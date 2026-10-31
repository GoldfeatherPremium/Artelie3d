import Link from "next/link";
import { ArrowRight, Compass, Eye, Layers, Palette } from "lucide-react";
import { HeroScene } from "@/components/home/hero-scene";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/catalog/product-card";
import {
  getFeaturedProducts,
  getBestsellers,
  listCategories,
  listCollections,
  listBrands,
} from "@/lib/data/catalog";
import { categoryBanner, collectionBanner, interiorImage, localHeroFor } from "@/lib/data/assets";

const EDITORIAL_INTERIORS = ["living-luxury", "bedroom-japandi", "dining-contemporary"];

const STEPS = [
  {
    icon: Compass,
    title: "Choose a piece",
    body: "Browse the collection and open any product in its live 3D view.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Swap fabrics, woods, metals and finishes — watch every change in real time.",
  },
  {
    icon: Eye,
    title: "See it in your space",
    body: "Place and arrange your pieces in a virtual room before you commit.",
  },
  {
    icon: Layers,
    title: "Order with confidence",
    body: "Transparent pricing, secure checkout and white-glove delivery.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "The 3D configurator is unlike anything I have used. I designed our entire living room virtually before buying a single piece.",
    name: "Amara Chen",
    role: "Interior Designer, Chicago",
  },
  {
    quote:
      "Being able to see the exact fabric and finish on the sofa — from every angle — made a significant purchase feel effortless.",
    name: "James Okafor",
    role: "Homeowner, Austin",
  },
  {
    quote:
      "ATELIER 3D is the first furniture platform that feels like the future. The room designer saved us from a costly mistake.",
    name: "Sofia Marek",
    role: "Architect, London",
  },
];

export default async function HomePage() {
  const [featured, bestsellers, categories, collections, brands] = await Promise.all([
    getFeaturedProducts(6),
    getBestsellers(4),
    listCategories(true),
    listCollections(),
    listBrands(),
  ]);

  const heroProduct = featured.find((p) => p.type === "configurable" && p.model_config) ?? featured[0] ?? null;
  const customizeDemo = [...featured, ...bestsellers].find((p) => p.type === "configurable" && p.model_config) ?? null;

  const editorialImages = EDITORIAL_INTERIORS.map((id) => interiorImage(id)).filter((src): src is string => Boolean(src));

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero 3D experience */}
      {/* ------------------------------------------------------------------ */}
      <HeroScene product={heroProduct} />

      {/* ------------------------------------------------------------------ */}
      {/* Featured collections */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Curated" title="Featured collections" description="Seasonal edits and signature lines from the world's leading designers." />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 3).map((collection, index) => (
              <Reveal key={collection.id} delay={index * 0.08}>
                <Link href={`/collections/${collection.slug}`} className="group block overflow-hidden rounded-2xl bg-paper shadow-card transition-shadow hover:shadow-raised">
                  <div className="aspect-[4/3] overflow-hidden bg-stone/40">
                    {(collectionBanner(collection.slug) ?? collection.hero_image_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collectionBanner(collection.slug) ?? collection.hero_image_url!}
                        alt={collection.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-caption text-fog">Collection</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className="font-display text-title-md text-ink">{collection.name}</h3>
                      {collection.description ? (
                        <p className="mt-1 line-clamp-1 text-body-sm text-fog">{collection.description}</p>
                      ) : null}
                    </div>
                    <ArrowRight className="h-5 w-5 text-bronze transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Shop by category */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-paper py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Browse" title="Shop by category" align="center" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((category, index) => (
              <Reveal key={category.id} delay={index * 0.06}>
                <Link href={`/shop/${category.slug}`} className="group relative block overflow-hidden rounded-2xl">
                  <div className="aspect-[3/4] overflow-hidden bg-stone/50">
                    {(categoryBanner(category.slug) ?? category.image_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={categoryBanner(category.slug) ?? category.image_url!}
                        alt={category.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-title-lg text-fog">
                        {category.name}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5 pt-14">
                    <h3 className="font-display text-title-lg text-paper">{category.name}</h3>
                    {typeof category.product_count === "number" ? (
                      <p className="text-caption text-paper/80">{category.product_count} pieces</p>
                    ) : null}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Interactive customization demonstration */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.18em] text-bronze">The configurator</p>
            <h2 className="font-display text-display-md text-ink">Customization, live</h2>
            <p className="mt-4 text-body-lg text-fog">
              Every configurable piece responds instantly. Change the fabric, the wood,
              the finish — and watch the piece and its price update in real time.
            </p>
            <ul className="mt-8 grid gap-4">
              {STEPS.map((step) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bronze/15 text-bronze">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-title-sm font-medium text-ink">{step.title}</h3>
                    <p className="mt-1 text-body-sm text-fog">{step.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <Link href={customizeDemo ? `/products/${customizeDemo.slug}` : "/shop"}>
                <Button size="lg" variant="outline">
                  {customizeDemo ? `Customize ${customizeDemo.name}` : "Explore configurable pieces"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            {customizeDemo ? (
              <div className="overflow-hidden rounded-3xl border border-line bg-paper shadow-raised">
                <div className="relative h-[26rem]">
                  {(localHeroFor(customizeDemo.slug) ?? customizeDemo.images[0]?.url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={localHeroFor(customizeDemo.slug) ?? customizeDemo.images[0]!.url}
                      alt={customizeDemo.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <Badge variant="bronze" className="absolute left-4 top-4 bg-paper/85 backdrop-blur-sm">
                    Customizable
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-caption uppercase tracking-wider text-fog">{customizeDemo.brand?.name ?? "ATELIER"}</p>
                    <h3 className="font-display text-title-md text-ink">{customizeDemo.name}</h3>
                  </div>
                  <Link href={`/products/${customizeDemo.slug}`} className="text-body-sm font-medium text-bronze transition-colors hover:text-ink">
                    Open 3D →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-stone text-fog">
                No configurable product available right now.
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Best-selling products */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-paper py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Most loved" title="Best sellers" description="The pieces our customers cannot stop talking about." />
          <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {bestsellers.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.05} className="min-w-0">
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/shop">
              <Button variant="outline" size="lg">
                View all products <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Design inspiration gallery */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Inspiration" title="Design inspiration" align="center" />
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {editorialImages.map((src, index) => (
              <Reveal key={src} delay={index * 0.08}>
                <div className="group overflow-hidden rounded-2xl bg-stone/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Interior design inspiration" loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How customization works */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-paper py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Process" title="How customization works" align="center" />
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.07}>
                <div className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ivory text-bronze ring-1 ring-line">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-caption font-medium text-bronze">0{index + 1}</p>
                  <h3 className="mt-1 text-title-sm font-medium text-ink">{step.title}</h3>
                  <p className="mt-2 text-body-sm text-fog">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured designers and brands */}
      {/* ------------------------------------------------------------------ */}
      {brands.length > 0 ? (
        <section className="bg-ivory py-20 sm:py-24">
          <div className="container-site">
            <SectionHeading overline="Designers & brands" title="Crafted by the best" />
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {brands.map((brand, index) => (
                <Reveal key={brand.id} delay={index * 0.04}>
                  <Link
                    href="/brands"
                    className="rounded-full border border-line bg-paper px-6 py-3 text-body-sm font-medium text-ink transition-colors hover:border-bronze hover:text-bronze"
                  >
                    {brand.name}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Testimonials */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-charcoal py-20 text-ivory sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Stories" title="Loved by people who love good design" align="center" className="text-ivory [&_h2]:text-ivory [&_p]:text-ivory/70" />
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {TESTIMONIALS.map((t, index) => (
              <Reveal key={t.name} delay={index * 0.08}>
                <figure className="flex h-full flex-col">
                  <blockquote className="flex-1 font-display text-body-lg leading-relaxed text-ivory/90">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-ivory/15 pt-4">
                    <p className="font-medium text-ivory">{t.name}</p>
                    <p className="text-caption text-ivory/60">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Sell on ATELIER */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-paper py-20 sm:py-24">
        <div className="container-site">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ivory p-8 sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="text-caption font-medium uppercase tracking-[0.18em] text-bronze">For makers</p>
              <h2 className="mt-2 font-display text-display-md text-ink">Sell on ATELIER 3D</h2>
              <p className="mt-3 text-body-lg text-fog">
                Reach discerning customers with immersive 3D product experiences.
                Manage products, orders and payouts from one elegant dashboard.
              </p>
            </div>
            <Link href="/sell">
              <Button size="lg" variant="primary">
                Become a seller <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Newsletter */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-ivory py-20 sm:py-24">
        <div className="container-site max-w-2xl text-center">
          <SectionHeading overline="Stay in touch" title="Join the newsletter" description="New collections, design stories and early access — once a week, never spam." align="center" />
          <div className="mt-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
