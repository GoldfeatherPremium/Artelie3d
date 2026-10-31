import Link from "next/link";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "FAQs",
  description: "Answers to common questions about ordering, customization, delivery, returns and accounts at ATELIER 3D.",
};

const FAQ_ITEMS: AccordionItem[] = [
  {
    value: "customize",
    label: "How do I customize a piece?",
    content: (
      <p>
        Open any product marked “Customizable” and you will land on its live 3D view. Choose
        fabrics, woods, finishes and sizes from the options below the viewer — the model and the
        price update in real time. Add the configured piece to your bag when you are happy with it.
      </p>
    ),
  },
  {
    value: "price-currency",
    label: "Are prices in USD?",
    content: (
      <p>
        Yes. All prices on the platform are shown in US dollars (USD) unless clearly stated
        otherwise on the product page. Any customization surcharges are added to the displayed
        price before checkout.
      </p>
    ),
  },
  {
    value: "materials",
    label: "Which fabrics and finishes are available?",
    content: (
      <p>
        Availability varies by product. On configurable pieces, the option groups on the product
        page list every fabric, wood and finish we currently offer for that design, together with
        any price difference. Standard pieces ship as photographed.
      </p>
    ),
  },
  {
    value: "delivery-times",
    label: "How long does delivery take?",
    content: (
      <p>
        In-stock, standard pieces typically ship within 2–5 business days. Made-to-order and
        configured pieces are crafted after purchase and usually take 6–10 weeks. You will see an
        estimated ship date at checkout and receive tracking once your piece leaves the studio.
        See the{" "}
        <Link href="/shipping-policy" className="link-underline text-bronze">
          shipping policy
        </Link>{" "}
        for details.
      </p>
    ),
  },
  {
    value: "white-glove",
    label: "Do you offer white-glove delivery?",
    content: (
      <p>
        Yes. At checkout you can choose white-glove delivery: our team brings the piece into your
        home, places it in the room of your choice, assembles it and removes all packaging. Some
        oversized pieces may require staircase delivery — our concierge will confirm before
        dispatch.
      </p>
    ),
  },
  {
    value: "tracking",
    label: "Can I track my order?",
    content: (
      <p>
        Yes. When your order ships, you will receive a confirmation email with a tracking link.
        Signed-in customers can also track every order from{" "}
        <Link href="/account/orders" className="link-underline text-bronze">
          your account
        </Link>
        .
      </p>
    ),
  },
  {
    value: "returns",
    label: "What is your return policy?",
    content: (
      <p>
        You have 30 days from delivery to return most items for a full refund. Pieces must be in
        their original condition and packaging. Customized and made-to-order pieces are final
        sale unless they arrive damaged or defective. More detail lives in our{" "}
        <Link href="/returns-policy" className="link-underline text-bronze">
          returns policy
        </Link>
        .
      </p>
    ),
  },
  {
    value: "free-returns",
    label: "Are returns free?",
    content: (
      <p>
        Yes. For eligible items, we provide a prepaid return label and arrange the pickup. The
        original shipping cost is refunded as well. We even cover the cost of our team coming to
        collect a white-glove delivery.
      </p>
    ),
  },
  {
    value: "refunds",
    label: "When will I see my refund?",
    content: (
      <p>
        Once your return arrives and passes inspection (usually within 3–5 business days), we
        issue the refund to your original payment method. Depending on your bank, it can take
        5–10 business days to appear on your statement.
      </p>
    ),
  },
  {
    value: "cancel-order",
    label: "Can I cancel or change my order?",
    content: (
      <p>
        You can cancel or change an order free of charge as long as it has not entered
        production or shipped. Once a configured or made-to-order piece enters production, it
        cannot be cancelled. Contact us via the{" "}
        <Link href="/contact" className="link-underline text-bronze">
          contact page
        </Link>{" "}
        or your account’s order details as soon as possible.
      </p>
    ),
  },
  {
    value: "guest-checkout",
    label: "Do I need an account to buy?",
    content: (
      <p>
        No — guest checkout is available. That said, an account lets you track orders, save
        configurations, design rooms and reorder faster. Creating an account only takes a moment.
      </p>
    ),
  },
  {
    value: "payments",
    label: "Is my payment secure?",
    content: (
      <p>
        Yes. Payments are processed by our payment provider over encrypted connections; card
        details never touch our servers. We also support test-mode payments in this demonstration
        build, so you can explore the full flow without real charges.
      </p>
    ),
  },
  {
    value: "room-designer",
    label: "How does the Room Designer work?",
    content: (
      <p>
        The Room Designer lets you build a floor plan and place real products from the catalog in
        it, then save the result to your account. Start a design from{" "}
        <Link href="/room-inspiration" className="link-underline text-bronze">
          room inspiration
        </Link>{" "}
        or open{" "}
        <Link href="/account/rooms" className="link-underline text-bronze">
          your rooms
        </Link>{" "}
        after signing in.
      </p>
    ),
  },
];

export default function FaqsPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Help"
          title="Frequently asked questions"
          description="Everything you need to know about ordering, customizing, delivery and returns."
          align="center"
        />

        <div className="mx-auto mt-10 max-w-3xl">
          <Reveal>
            <Accordion items={FAQ_ITEMS} type="single" defaultValue={["customize"]} />
          </Reveal>
        </div>

        <Reveal className="mx-auto mt-12 max-w-3xl text-center">
          <div className="rounded-3xl bg-paper p-8 shadow-card">
            <h2 className="font-display text-title-lg text-ink">Still have questions?</h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-fog">
              Our team is happy to help — reach out and we will reply within one business day.
            </p>
            <Link href="/contact" className="mt-6 inline-block">
              <Button size="lg" variant="primary">
                Contact us
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
