import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressBook } from "@/components/account/address-book";

export default async function AddressesPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("addresses")
    .select("id, label, full_name, line1, line2, city, region, postal_code, country, phone, is_default")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const addresses = (data ?? []) as unknown as {
    id: string;
    label: string | null;
    full_name: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
    country: string;
    phone: string | null;
    is_default: boolean;
  }[];

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">Addresses</h2>

      {addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No saved addresses" description="Save addresses to speed up checkout." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">{address.label ?? "Address"}</p>
                {address.is_default ? <Badge variant="bronze">Default</Badge> : null}
              </div>
              <div className="mt-2 text-body-sm text-ink/80">
                <p>{address.full_name}</p>
                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
                <p>{address.city}{address.region ? `, ${address.region}` : ""} {address.postal_code ?? ""}</p>
                <p>{address.country}</p>
                {address.phone ? <p>{address.phone}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressBook addresses={addresses} />
    </div>
  );
}
