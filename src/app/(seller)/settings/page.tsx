import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getSellerContext } from "@/app/actions/seller";
import { StoreSettingsForm, SellerProfileForm, PayoutRequestForm } from "@/components/seller/seller-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function SellerSettingsPage() {
  await requireRole(["seller"]);
  const ctx = await getSellerContext();
  const user = await getUser();

  // Current payout balance = last ledger balance for the seller's store.
  let balanceCents = 0;
  if (user && ctx.store) {
    const db = createServiceClient();
    const { data: last } = await db
      .from("seller_ledger")
      .select("balance_after_cents")
      .eq("seller_id", user.id)
      .eq("store_id", ctx.store.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    balanceCents = ((last as { balance_after_cents?: number } | null)?.balance_after_cents) ?? 0;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Settings</h1>
        <p className="text-body-sm text-fog">Manage your store, seller profile, and payouts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store settings</CardTitle>
          <CardDescription>Name, slug, description, and logo for your storefront.</CardDescription>
        </CardHeader>
        <CardContent>
          <StoreSettingsForm
            initialName={ctx.store?.name ?? ""}
            initialSlug={ctx.store?.slug ?? ""}
            initialDescription={ctx.store?.description ?? ""}
            initialLogoUrl={ctx.store?.logo_url ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller profile</CardTitle>
          <CardDescription>Business and contact details used for verification and payouts.</CardDescription>
        </CardHeader>
        <CardContent>
          <SellerProfileForm
            initialBusinessName={ctx.profile?.business_name ?? ""}
            initialLegalName={ctx.profile?.legal_name ?? ""}
            initialContactEmail={ctx.profile?.contact_email ?? ""}
            initialPhone={ctx.profile?.phone ?? ""}
            initialCountry={ctx.profile?.country ?? ""}
            initialTaxId={ctx.profile?.tax_id ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request payout</CardTitle>
          <CardDescription>Request a payout of your available balance. An admin reviews each request.</CardDescription>
        </CardHeader>
        <CardContent>
          <PayoutRequestForm balanceCents={balanceCents} />
        </CardContent>
      </Card>
    </div>
  );
}
