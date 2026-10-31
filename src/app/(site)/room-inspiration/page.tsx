import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "@/lib/data/catalog";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Room inspiration",
  description: "Interior inspiration and how to use the ATELIER 3D Room Designer.",
};

const ROMANCE = [
  {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80",
    alt: "A calm living room with a tailored sofa",
    label: "Living room",
  },
  {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
    alt: "A restful bedroom with natural textures",
    label: "Bedroom",
  },
  {
    src: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=80",
    alt: "A warm dining room with wooden furniture",
    label: "Dining room",
  },
  {
    src: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
    alt: "A focused home office",
    label: "Home office",
  },
  {
    src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    alt: "A compact studio apartment",
    label: "Studio apartment",
  },
  {
    src: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1000&q=80",
    alt: "A sculptural corner with designer furniture",
    label: "Statement corner",
  },
];

export default async function RoomInspirationPage() {
  const featured = await getFeaturedProducts(4);

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Inspiration"
          title="Room inspiration"
          description="Ideas for every room — and the tools to make them real in 3D."
          align="center"
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROMANCE.map((room, index) => (
            <Reveal key={room.label} delay={index * 0.05}>
              <div className="group overflow-hidden rounded-2xl border border-line bg-paper">
                <div className="aspect-[4/3] overflow-hidden bg-stone/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={room.src}
                    alt={room.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-display text-title-md text-ink">{room.label}</p>
                    <p className="text-caption text-fog">Preset room template</p>
                  </div>
                  <Link href="/account/rooms" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5">
                    Design <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {featured.length > 0 ? (
          <div className="mt-16">
            <SectionHeading
              overline="Shop the look"
              title="Featured pieces"
              description="Start with a piece you love, then build the room around it."
            />
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
              {featured.map((product, index) => (
                <Reveal key={product.id} delay={index * 0.05}>
                  <Link href={`/products/${product.slug}`} className="group block">
                    <div className="aspect-square overflow-hidden rounded-xl bg-stone/40">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt_text ?? product.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <p className="mt-3 font-display text-title-sm text-ink group-hover:text-bronze">{product.name}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        ) : null}

        <Reveal className="mt-16">
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-charcoal p-8 text-ivory sm:p-12 lg:flex-row">
            <div className="max-w-xl">
              <p className="text-caption font-medium uppercase tracking-[0.18em] text-bronze">Room Designer</p>
              <h2 className="mt-2 font-display text-display-md">Build the room yourself</h2>
              <p className="mt-3 text-body-sm text-ivory/70">
                Choose a room template, apply wall and floor finishes, and place real products
                from the catalog. Save your design and revisit it any time.
              </p>
            </div>
            <Link href="/account/rooms">
              <Button size="lg" variant="secondary">Open the Room Designer</Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
