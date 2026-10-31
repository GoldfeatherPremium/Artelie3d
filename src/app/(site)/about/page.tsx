import Link from "next/link";
import { ArrowRight, Compass, Eye, Layers, Palette } from "lucide-react";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About us",
  description:
    "The story behind ATELIER 3D — a platform for discovering, customizing and purchasing beautifully designed furniture through immersive 3D experiences.",
};

const VALUES = [
  {
    icon: Compass,
    title: "Considered design",
    body: "Every piece begins with a maker who cares about proportion, material and how a home actually gets lived in.",
  },
  {
    icon: Palette,
    title: "Made to be yours",
    body: "Fabrics, woods and finishes are choices, not fixed specs. We believe the last word on a room belongs to you.",
  },
  {
    icon: Eye,
    title: "Honest visualization",
    body: "See the exact piece you are buying — from every angle, in your light, in your room — before it ever ships.",
  },
  {
    icon: Layers,
    title: "Built for the long term",
    body: "We work with makers who construct for decades, and we stand behind every order with white-glove care.",
  },
];

const CRAFT_STEPS = [
  {
    title: "Material selection",
    body: "Solid hardwoods, natural fibers and metals that age with grace. Nothing veneered over a secret.",
  },
  {
    title: "Prototyping",
    body: "Full-scale prototypes are built, sat in, and refined until the proportions feel inevitable.",
  },
  {
    title: "Hand finishing",
    body: "Joinery, seams and surfaces are finished by hand — the details that make a piece feel made, not manufactured.",
  },
  {
    title: "Digital twin",
    body: "Each design is captured as an accurate 3D model so you can preview it live before committing.",
  },
];

const ABOUT_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80",
    alt: "A light-filled living room with considered furniture arrangements",
  },
  {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    alt: "Detail of a tailored sofa in a calm interior",
  },
  {
    src: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8?auto=format&fit=crop&w=1200&q=80",
    alt: "Close view of upholstery and wood detailing",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-ivory">
      {/* Hero */}
      <section className="container-site py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="mb-3 text-caption font-medium uppercase tracking-[0.18em] text-bronze">Our story</p>
            <h1 className="font-display text-display-xl text-ink">The future of how we buy furniture</h1>
            <p className="mt-5 max-w-xl text-body-lg text-fog">
              ATELIER 3D was built on a simple frustration: buying furniture means making a
              significant decision in the dark. We set out to close the gap between the
              catalog and the room — with tools that let you see, customize and arrange
              the real thing before it arrives.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/showroom">
                <Button size="lg" variant="primary">
                  Visit the showroom <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/brands">
                <Button size="lg" variant="outline">
                  Meet the makers
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-2xl bg-stone/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ABOUT_IMAGES[0].src}
                  alt={ABOUT_IMAGES[0].alt}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="mt-8 grid gap-4">
                <div className="overflow-hidden rounded-2xl bg-stone/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ABOUT_IMAGES[1].src}
                    alt={ABOUT_IMAGES[1].alt}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl bg-stone/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ABOUT_IMAGES[2].src}
                    alt={ABOUT_IMAGES[2].alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Why we exist */}
      <section className="bg-paper py-20 sm:py-28">
        <div className="container-site grid items-start gap-12 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              overline="Why"
              title="A marketplace that respects the buyer"
              description="Furniture is one of the last big purchases made with grainy photos and a leap of faith. We built the alternative."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-6">
              <p className="text-body-lg text-ink/80">
                We curate independent designers and makers who share a standard: honest
                materials, thoughtful construction and a point of view. Every listing on
                the platform is vetted, and every configurable piece is shown live in 3D
                so there are no surprises between the screen and the doorstep.
              </p>
              <p className="text-body-lg text-ink/80">
                For makers, we remove the friction of selling online — product pages,
                payments, commission tracking and delivery logistics, handled. What
                remains is the work they are best at: making pieces people keep for a
                lifetime.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-28">
        <div className="container-site">
          <SectionHeading overline="Values" title="What we stand for" align="center" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.07}>
                <div className="h-full rounded-2xl border border-line bg-paper p-6 shadow-card">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bronze/15 text-bronze">
                    <value.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-title-md text-ink">{value.title}</h3>
                  <p className="mt-2 text-body-sm text-fog">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Craftsmanship */}
      <section className="bg-charcoal py-20 text-ivory sm:py-28">
        <div className="container-site">
          <SectionHeading
            overline="Craftsmanship"
            title="How a piece comes to be"
            description="From raw material to digital twin, four stages separate a piece worth keeping from a piece worth replacing."
            align="center"
            className="text-ivory [&_h2]:text-ivory [&_p]:text-ivory/70"
          />
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {CRAFT_STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.07}>
                <div>
                  <p className="font-display text-display-md text-bronze">0{index + 1}</p>
                  <h3 className="mt-2 text-title-sm font-medium text-ivory">{step.title}</h3>
                  <p className="mt-2 text-body-sm text-ivory/70">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-paper py-16 sm:py-20">
        <div className="container-site">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ivory p-8 sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="text-caption font-medium uppercase tracking-[0.18em] text-bronze">See it for yourself</p>
              <h2 className="mt-2 font-display text-display-md text-ink">Explore the showroom</h2>
              <p className="mt-3 text-body-lg text-fog">
                Tour featured pieces in live 3D, or meet the designers and brands behind the collection.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/showroom">
                <Button size="lg" variant="primary">
                  Open the 3D showroom <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/designers">
                <Button size="lg" variant="outline">
                  Browse designers
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
