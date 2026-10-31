import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
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
import { approvePayout, markPayoutPaid, rejectPayout } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

interface PayoutRow {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  note: string | null;
  created_at: string;
  payer: { id: string; full_name: string | null; email: string | null } | null;
  stores: { name: string } | { name: string }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "paid") return "success";
  if (status === "approved") return "info";
  if (status === "rejected" || status === "failed") return "danger";
  return "warning";
}

function sellerLabel(row: PayoutRow): string {
  const profile = first(row.payer);
  return profile?.full_name ?? profile?.email ?? "Seller";
}

export default async function AdminPayoutsPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: rows } = await db
    .from("payouts")
    .select(
      "id, amount_cents, currency, status, period_start, period_end, note, created_at, " +
        "profiles(full_name, email), stores(name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const payouts = (rows ?? []) as unknown as PayoutRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Payouts</h1>
        <p className="text-body-sm text-fog">Review, approve and disburse seller payouts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout requests</CardTitle>
          <CardDescription>{payouts.length} payout(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <EmptyState title="No payouts" description="Seller payout requests will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{sellerLabel(payout)}</div>
                      {payout.note ? (
                        <div className="text-caption text-fog">{payout.note}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-fog">{first(payout.stores)?.name ?? "—"}</TableCell>
                    <TableCell className="font-medium text-ink">
                      {formatCurrency(payout.amount_cents / 100, payout.currency)}
                    </TableCell>
                    <TableCell className="text-fog">
                      {payout.period_start && payout.period_end
                        ? `${format(new Date(payout.period_start), "MMM d")} → ${format(new Date(payout.period_end), "MMM d, yyyy")}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(payout.status)}>{payout.status}</Badge>
                    </TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(payout.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-2">
                        {payout.status === "requested" ? (
                          <>
                            <ConfirmButton
                              title="Approve payout"
                              description="Approving makes the payout eligible for disbursement."
                              confirmLabel="Approve"
                              variant="primary"
                              action={approvePayout.bind(null, payout.id) as () => Promise<ActionResult>}
                            >
                              Approve
                            </ConfirmButton>
                            <ConfirmButton
                              title="Reject payout"
                              description="Provide a reason for the seller."
                              confirmLabel="Reject"
                              variant="danger"
                              notePlaceholder="Reason (sent to the seller)"
                              requireNote
                              action={rejectPayout.bind(null, payout.id) as () => Promise<ActionResult>}
                            >
                              Reject
                            </ConfirmButton>
                          </>
                        ) : null}
                        {payout.status === "approved" ? (
                          <>
                            <ConfirmButton
                              title="Mark as paid"
                              description="Moves funds out of the seller ledger and records a payout ledger entry."
                              confirmLabel="Mark paid"
                              variant="primary"
                              action={markPayoutPaid.bind(null, payout.id) as () => Promise<ActionResult>}
                            >
                              Mark paid
                            </ConfirmButton>
                            <ConfirmButton
                              title="Reject payout"
                              description="Provide a reason for the seller."
                              confirmLabel="Reject"
                              variant="danger"
                              notePlaceholder="Reason (sent to the seller)"
                              requireNote
                              action={rejectPayout.bind(null, payout.id) as () => Promise<ActionResult>}
                            >
                              Reject
                            </ConfirmButton>
                          </>
                        ) : null}
                        {payout.status === "paid" || payout.status === "rejected" || payout.status === "failed" ? (
                          <Link href="/admin/sellers" className="text-caption text-fog hover:text-ink">
                            View seller →
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
