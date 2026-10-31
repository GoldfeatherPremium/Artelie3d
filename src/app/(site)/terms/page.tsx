import Link from "next/link";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata = {
  title: "Terms of service",
  description: "The terms that govern your use of ATELIER 3D.",
};

export default function TermsPage() {
  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="Legal"
          title="Terms of service"
          description="Please read these terms carefully before using ATELIER 3D."
        />

        <Reveal className="mt-10 max-w-3xl">
          <p className="text-caption text-fog">Last updated: August 2025</p>

          <div className="prose-editorial mt-8">
            <h2 className="font-display text-title-lg text-ink">Acceptance</h2>
            <p>
              By accessing or using ATELIER 3D you agree to these terms. If you do not agree,
              please do not use the platform. These terms apply to shoppers, sellers and guests
              alike.
            </p>

            <h2 className="font-display text-title-lg text-ink">Accounts</h2>
            <p>
              You are responsible for safeguarding your account credentials and for all activity
              under your account. You must provide accurate information. Sellers agree to meet
              the platform's quality and moderation standards; unapproved sellers may not publish
              products.
            </p>

            <h2 className="font-display text-title-lg text-ink">Orders & payments</h2>
            <p>
              All prices are shown in USD unless stated otherwise. Your order is confirmed when
              payment is authorized. In this demonstration build, payments run in sandbox test
              mode — no real charges are made. Cancelation and return rights are described in the
              shipping and returns policies.
            </p>

            <h2 className="font-display text-title-lg text-ink">Intellectual property</h2>
            <p>
              The platform, its design, text, graphics and software are owned by ATELIER 3D or its
              licensors. Products are sold by independent sellers, who retain rights in their
              designs as provided by law.
            </p>

            <h2 className="font-display text-title-lg text-ink">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, ATELIER 3D is not liable for indirect,
              incidental or consequential damages arising from use of the platform. Nothing here
              limits rights that cannot be limited by law.
            </p>

            <h2 className="font-display text-title-lg text-ink">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use after changes constitutes
              acceptance. Questions? See the{" "}
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
