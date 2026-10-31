import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { RoomDesignerLazy } from "@/components/room-designer/room-designer-lazy";

export const metadata = {
  title: "Room Designer",
  description: "Design rooms with real ATELIER 3D products in your browser.",
};

const STEPS = [
  {
    title: "Pick a room",
    body: "Start from living room, bedroom, dining room, home office or studio templates.",
  },
  {
    title: "Style the space",
    body: "Change wall and floor finishes and set the room dimensions.",
  },
  {
    title: "Place furniture",
    body: "Add real products from the catalog — move, rotate and scale them freely.",
  },
  {
    title: "Save & share",
    body: "Save your design, reopen it anytime and add configured pieces to your bag.",
  },
];

export default function RoomDesignerPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Room Designer"
          title="Design whole rooms in your browser"
          description="A practical 3D room planner that works with the real catalog — no downloads, no AR required."
        />

        <Reveal className="mt-10">
          <RoomDesignerLazy />
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <div className="h-full rounded-2xl border border-line bg-paper p-6 shadow-card">
                <p className="font-display text-display-md text-bronze">0{index + 1}</p>
                <h3 className="mt-3 font-display text-title-md text-ink">{step.title}</h3>
                <p className="mt-2 text-body-sm text-fog">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-charcoal p-8 text-ivory sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="font-display text-display-md">Your rooms live in your account</h2>
              <p className="mt-3 text-body-sm text-ivory/70">
                Design here in your browser, then sign in to keep a persistent library of
                saved room designs inside your account.
              </p>
            </div>
            <Link href="/account/rooms">
              <Button size="lg" variant="secondary">
                Open saved rooms <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
