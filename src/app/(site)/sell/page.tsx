import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { requestSellerOnboarding } from "@/app/actions/seller";
import { SectionHeading } from "@/components/motion/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export const metadata = {
  title: "Sell with ATELIER 3D",
  description: "Join ATELIER 3D as a designer or maker.",
};

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const role = await getUserRole();
  const user = await getUser();

  let existingStatus: string | null = null;
  if (user) {
    const db = createServiceClient();
    const { data } = await db
      .from("seller_profiles")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    existingStatus = (data as { status: string } | null)?.status ?? null;
  }

  async function apply(formData: FormData): Promise<void> {
    "use server";
    const result = await requestSellerOnboarding(formData);
    if (!result.ok) {
      redirect(`/sell?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/sell?submitted=1");
  }

  const isSeller = role === "seller" || role === "admin";
  const submitted = existingStatus === "submitted" || existingStatus === "under_review";

  return (
    <div className="bg-ivory">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          overline="For makers"
          title="Sell with ATELIER 3D"
          description="A curated marketplace with live 3D product presentation, transparent commissions and white-glove fulfillment support."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{isSeller ? "Your seller status" : "Apply to become a seller"}</CardTitle>
                <CardDescription>
                  {isSeller
                    ? `Your application status: ${existingStatus ?? role}.`
                    : "Tell us about your business — a platform administrator will review and approve it."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSeller ? (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={existingStatus === "approved" ? "success" : "warning"}>
                        {existingStatus ?? role}
                      </Badge>
                    </div>
                    <p className="text-body-sm text-fog">
                      {existingStatus === "approved"
                        ? "Your store is approved. You can now manage products, orders and payouts."
                        : "Your application is under review. You will be notified once a decision is made."}
                    </p>
                    <div>
                      <Link href="/seller">
                        <Button>Go to seller dashboard</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form action={apply} className="grid gap-5 sm:grid-cols-2">
                    <Field label="Business name" htmlFor="sell-business" className="sm:col-span-2">
                      <Input id="sell-business" name="business_name" required maxLength={200} placeholder="Atelier Maison" />
                    </Field>
                    <Field label="Legal name" htmlFor="sell-legal" hint="Optional, for verification.">
                      <Input id="sell-legal" name="legal_name" maxLength={200} />
                    </Field>
                    <Field label="Contact email" htmlFor="sell-email">
                      <Input id="sell-email" name="contact_email" type="email" required placeholder="you@studio.com" />
                    </Field>
                    <Field label="Phone" htmlFor="sell-phone">
                      <Input id="sell-phone" name="phone" maxLength={40} />
                    </Field>
                    <Field label="Country (ISO code)" htmlFor="sell-country" hint="Two-letter code, e.g. US.">
                      <Input id="sell-country" name="country" defaultValue="US" maxLength={2} />
                    </Field>
                    <Field label="Tax ID" htmlFor="sell-tax" className="sm:col-span-2">
                      <Input id="sell-tax" name="tax_id" maxLength={60} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button type="submit" size="lg">Submit application</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-2">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-line bg-paper p-6">
                <p className="font-display text-title-md text-ink">Why sell here</p>
                <ul className="mt-3 grid gap-2 text-body-sm text-fog">
                  <li>· Live 3D product viewers and configurators.</li>
                  <li>· Transparent platform commission (set per store).</li>
                  <li>· Seller dashboard with orders, analytics and payouts.</li>
                  <li>· Moderation keeps the catalog curated and trusted.</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-charcoal p-6 text-ivory">
                <p className="font-display text-title-md text-ivory">Questions?</p>
                <p className="mt-2 text-body-sm text-ivory/70">
                  The team is happy to walk you through onboarding.
                </p>
                <Link href="/contact" className="mt-4 inline-block text-body-sm font-medium text-bronze transition-colors hover:text-ivory">
                  Contact us →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
