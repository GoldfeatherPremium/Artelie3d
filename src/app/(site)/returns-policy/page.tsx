import Link from "next/link";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Returns policy",
  description: "How returns work at ATELIER 3D — eligibility, timelines and refunds.",
};

export default function ReturnsPolicyPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Policy"
          title="Returns policy"
          description="We want you to love your piece. If you don't, here is how returns work."
        />

        <Reveal className="mt-10 max-w-3xl">
          <p className="text-caption text-fog">Last updated: August 2025</p>

          <div className="prose-editorial mt-8">
            <h2 className="font-display text-title-lg text-ink">30-day returns</h2>
            <p>
              You have 30 days from delivery to return most items purchased on ATELIER 3D for a
              full refund. Items must be in their original condition, with all original packaging
              and accessories. To start a return, open the order in your account and request a
              return, or contact us with your order number.
            </p>

            <h2 className="font-display text-title-lg text-ink">Free return shipping</h2>
            <p>
              For eligible items we provide a prepaid return label and arrange pickup. The original
              shipping cost is refunded as well, and we cover the cost of collecting a
              white-glove delivery.
            </p>

            <h2 className="font-display text-title-lg text-ink">Customized & made-to-order pieces</h2>
            <p>
              Configurable and made-to-order pieces are crafted specifically for you and are final
              sale unless they arrive damaged, defective or materially different from the
              configuration you ordered. If anything is wrong with a customized piece, contact us
              within 7 days of delivery and we will make it right.
            </p>

            <h2 className="font-display text-title-lg text-ink">Damaged or defective items</h2>
            <p>
              If your order arrives damaged or defective, notify us within 7 days with photos and
              your order number. We will send a replacement, arrange a repair, or issue a full
              refund — your choice. Keep the original packaging until the issue is resolved.
            </p>

            <h2 className="font-display text-title-lg text-ink">Refund timing</h2>
            <p>
              Once your return arrives and passes inspection — usually within 3–5 business days —
              we issue the refund to your original payment method. Depending on your bank it can
              take 5–10 business days to appear on your statement.
            </p>

            <h2 className="font-display text-title-lg text-ink">Contact</h2>
            <p>
              Questions about a return? Reach us via the{" "}
              <Link href="/contact" className="link-underline text-bronze">
                contact page
              </Link>{" "}
              and we will help.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
