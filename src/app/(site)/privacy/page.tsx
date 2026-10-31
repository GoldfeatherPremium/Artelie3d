import Link from "next/link";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Privacy policy",
  description: "How ATELIER 3D collects, uses and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Policy"
          title="Privacy policy"
          description="What we collect, why we collect it, and how we keep it safe."
        />

        <Reveal className="mt-10 max-w-3xl">
          <p className="text-caption text-fog">Last updated: August 2025</p>

          <div className="prose-editorial mt-8">
            <h2 className="font-display text-title-lg text-ink">Information we collect</h2>
            <p>
              We collect information you provide directly — such as your name, email address,
              shipping and billing addresses, phone number, and saved configurations or room
              designs — along with transaction data (orders, payments and support history). We
              also collect limited technical data (device type, browser, pages visited) to
              understand how the platform is used and to keep it reliable.
            </p>

            <h2 className="font-display text-title-lg text-ink">How we use it</h2>
            <p>
              We use your information to provide and improve our services: process orders and
              payments, deliver products, send transactional updates, support your account,
              personalize your experience, and prevent fraud. We never sell your personal
              information.
            </p>

            <h2 className="font-display text-title-lg text-ink">Payments</h2>
            <p>
              Card payments are processed by our payment provider over encrypted connections. Card
              details never touch our servers. In this demonstration build, payments run in
              sandbox test mode and no real card data is collected.
            </p>

            <h2 className="font-display text-title-lg text-ink">Cookies & local storage</h2>
            <p>
              We use essential cookies and local storage for authentication and cart persistence.
              Optional, privacy-conscious analytics help us measure performance; you can disable
              them in your preferences.
            </p>

            <h2 className="font-display text-title-lg text-ink">Data retention</h2>
            <p>
              We keep account and order records for as long as needed to provide our services and
              meet legal obligations. You may request access to, correction of, or deletion of
              your personal data at any time.
            </p>

            <h2 className="font-display text-title-lg text-ink">Contact</h2>
            <p>
              Privacy questions? Contact us via the{" "}
              <Link href="/contact" className="link-underline text-bronze">
                contact page
              </Link>
              .
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
