import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { reviewSeller } from "@/app/actions/admin";

interface SellerRow {
  id: string;
  user_id: string;
  business_name: string;
  contact_email: string | null;
  country: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  profile: { email: string | null; full_name: string | null } | null;
  stores: { id: string; name: string; status: string } | { id: string; name: string; status: string }[] | null;
}

const FILTERS = ["all", "pending", "submitted", "under_review", "approved", "rejected", "suspended"] as const;

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function sellerStatusVariant(status: string): "warning" | "success" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected" || status === "suspended") return "danger";
  return "warning";
}

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const status = FILTERS.includes((sp.status ?? "all") as (typeof FILTERS)[number]) ? sp.status! : "all";
  const db = createServiceClient();

  let query = db
    .from("seller_profiles")
    .select("id, user_id, business_name, contact_email, country, status, rejection_reason, created_at, profiles(email, full_name), stores(id, name, status)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: rows } = await query;
  const sellers = (rows ?? []) as unknown as SellerRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Sellers</h1>
        <p className="text-body-sm text-fog">Seller applications and store status.</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {FILTERS.map((key) => {
          const active = key === status;
          return (
            <Link
              key={key}
              href={key === "all" ? "/admin/sellers" : `/admin/sellers?status=${key}`}
              role="tab"
              aria-selected={active}
              className={`px-4 py-2.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze ${
                active ? "border-b-2 border-charcoal font-medium text-ink" : "text-fog hover:text-ink"
              }`}
            >
              {key.replaceAll("_", " ")}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller profiles</CardTitle>
          <CardDescription>{sellers.length} seller profile(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <EmptyState title="No sellers here" description="No seller profiles match this filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => {
                  const store = firstRow(seller.stores);
                  const isPending = seller.status === "pending" || seller.status === "submitted" || seller.status === "under_review";
                  return (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="font-medium text-ink">{seller.business_name}</div>
                        {seller.rejection_reason ? (
                          <p className="mt-0.5 max-w-xs text-caption text-danger">{seller.rejection_reason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-fog">
                        <div>{seller.contact_email ?? seller.profile?.email ?? "—"}</div>
                        <div className="text-caption">{seller.profile?.full_name ?? ""}</div>
                      </TableCell>
                      <TableCell>
                        {store ? (
                          <div>
                            <div className="font-medium text-ink">{store.name}</div>
                            <Badge variant={store.status === "active" ? "success" : "danger"}>{store.status}</Badge>
                          </div>
                        ) : (
                          <span className="text-caption text-fog">No store</span>
                        )}
                      </TableCell>
                      <TableCell className="text-fog">{seller.country ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={sellerStatusVariant(seller.status)}>{seller.status.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-fog">{format(new Date(seller.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {isPending ? (
                            <>
                              <ConfirmButton
                                title="Approve seller"
                                description={`${seller.business_name} will be approved and their store activated.`}
                                confirmLabel="Approve"
                                variant="primary"
                                action={reviewSeller.bind(null, seller.id, "approved") as () => Promise<ActionResult>}
                              >
                                Approve
                              </ConfirmButton>
                              <ConfirmButton
                                title="Reject seller"
                                description={`${seller.business_name} will be rejected.`}
                                confirmLabel="Reject"
                                variant="danger"
                                notePlaceholder="Reason (sent to the seller)"
                                requireNote
                                action={reviewSeller.bind(null, seller.id, "rejected") as () => Promise<ActionResult>}
                              >
                                Reject
                              </ConfirmButton>
                            </>
                          ) : seller.status === "rejected" ? (
                            <ConfirmButton
                              title="Re-approve seller"
                              description={`${seller.business_name} will be approved and their store activated.`}
                              confirmLabel="Approve"
                              action={reviewSeller.bind(null, seller.id, "approved") as () => Promise<ActionResult>}
                            >
                              Approve
                            </ConfirmButton>
                          ) : (
                            <span className="text-caption text-fog">No action</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
