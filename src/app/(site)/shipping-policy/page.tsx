import Link from "next/link";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Shipping policy",
  description: "How delivery works at ATELIER 3D — processing times, shipping methods, white-glove service and tracking.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Policy"
          title="Shipping policy"
          description="How we get your piece from the studio to your doorstep."
        />

        <Reveal className="mt-10 max-w-3xl">
          <p className="text-caption text-fog">Last updated: August 2025</p>

          <div className="prose-editorial mt-8">
            <h2 className="font-display text-title-lg text-ink">Processing times</h2>
            <p>
              In-stock standard pieces are packed and handed to the carrier within 2–5 business
              days of payment confirmation. Configurable and made-to-order pieces are crafted
              after purchase; the exact production window (typically 6–10 weeks) is shown on the
              product page and at checkout. Estimated ship dates are always visible before you
              confirm your order.
            </p>

            <h2 className="font-display text-title-lg text-ink">Shipping methods</h2>
            <ul className="mt-4 grid gap-2 text-body-md text-ink/80">
              <li>
                <strong className="text-ink">Standard delivery</strong> — curbside drop-off by a
                freight or parcel carrier. Available for most smaller pieces.
              </li>
              <li>
                <strong className="text-ink">White-glove delivery</strong> — our team carries the
                piece inside, places it in the room you choose, assembles it and removes all
                packaging. Available at checkout on eligible items.
              </li>
              <li>
                <strong className="text-ink">Express shipping</strong> — offered on select
                in-stock items at an additional cost, where the carrier supports it.
              </li>
            </ul>

            <h2 className="font-display text-title-lg text-ink">Shipping costs</h2>
            <p>
              Shipping is calculated at checkout based on destination, weight and selected method.
              White-glove and express options carry a service fee. We often run free standard
              shipping promotions — any active offer is applied automatically when you check out.
            </p>

            <h2 className="font-display text-title-lg text-ink">Delivery areas</h2>
            <p>
              We currently ship across the continental United States. Orders to Alaska, Hawaii,
              U.S. territories and international addresses are handled on a case-by-case basis —
              contact us before ordering and we will confirm options and estimated timelines.
            </p>

            <h2 className="font-display text-title-lg text-ink">Tracking your order</h2>
            <p>
              Once your order ships you will receive an email with a tracking link. Signed-in
              customers can also follow every order under{" "}
              <Link href="/account/orders" className="link-underline text-bronze">
                your account orders
              </Link>
              . Tracking can take up to 48 hours to show movement after dispatch.
            </p>

            <h2 className="font-display text-title-lg text-ink">Damaged or missing items</h2>
            <p>
              If anything arrives damaged, or a part is missing, notify us within 7 days of
              delivery with photos and your order number. We will replace or repair the piece at
              no cost, or arrange a full refund if you prefer. Packaging should be kept until the
              item is confirmed in good condition.
            </p>

            <h2 className="font-display text-title-lg text-ink">Delays</h2>
            <p>
              Occasionally carriers or production schedules cause delays. We monitor every order
              and will email you if anything changes materially. You can cancel without penalty
              if an estimated ship date slips by more than 14 days before your item enters
              production.
            </p>

            <h2 className="font-display text-title-lg text-ink">Questions</h2>
            <p>
              For anything else, reach out via the{" "}
              <Link href="/contact" className="link-underline text-bronze">
                contact page
              </Link>{" "}
              — the team is happy to walk through options for your specific order.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
