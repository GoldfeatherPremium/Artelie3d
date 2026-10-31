import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { reviewRefund } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

interface RefundRow {
  id: string;
  order_id: string;
  amount_cents: number;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  orders: { id: string; order_number: string; grand_total_cents: number } | null;
  requested_by: { email: string | null; full_name: string | null } | null;
}

function refundStatusVariant(status: string): "success" | "danger" | "warning" | "info" {
  if (status === "processed") return "success";
  if (status === "rejected") return "danger";
  if (status === "approved") return "info";
  return "warning";
}

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: rows } = await db
    .from("refunds")
    .select(
      "id, order_id, amount_cents, reason, status, admin_note, created_at, orders(order_number, grand_total_cents), requested_by(email, full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const refunds = (rows ?? []) as unknown as RefundRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Refunds</h1>
        <p className="text-body-sm text-fog">Review and process refund requests.</p>
      </div>

      {sp.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {sp.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Refund requests</CardTitle>
          <CardDescription>{refunds.length} refund request(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {refunds.length === 0 ? (
            <EmptyState title="No refunds" description="Refund requests will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell>
                      {refund.orders ? (
                        <Link
                          href={`/admin/orders/${refund.order_id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {refund.orders.order_number}
                        </Link>
                      ) : (
                        <span className="text-fog">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-ink">
                      {formatCurrency(refund.amount_cents / 100)}
                    </TableCell>
                    <TableCell className="max-w-xs text-fog">
                      <div className="line-clamp-2">{refund.reason ?? "—"}</div>
                      {refund.admin_note ? (
                        <p className="mt-1 text-caption text-fog">Admin note: {refund.admin_note}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={refundStatusVariant(refund.status)}>
                        {refund.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(refund.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {refund.status === "requested" ? (
                        <div className="flex flex-col items-end gap-2">
                          <ConfirmButton
                            title="Approve refund"
                            description="Approving processes the refund and reverses the seller ledger for this amount."
                            confirmLabel="Approve"
                            variant="primary"
                            action={reviewRefund.bind(null, refund.id, "approved") as () => Promise<ActionResult>}
                          >
                            Approve
                          </ConfirmButton>
                          <RejectRefundForm refundId={refund.id} />
                        </div>
                      ) : (
                        <span className="text-caption text-fog">No action</span>
                      )}
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

function RejectRefundForm({ refundId }: { refundId: string }) {
  async function reject(formData: FormData): Promise<void> {
    "use server";
    const result = await reviewRefund(refundId, "rejected", formData);
    if (!result.ok) {
      redirect(`/admin/refunds?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <form action={reject} className="flex items-center gap-2">
      <Input
        name="reason"
        placeholder="Reason (sent to customer)"
        required
        aria-label="Rejection reason"
        className="h-9 w-44"
      />
      <Button type="submit" variant="danger" size="sm">
        Reject
      </Button>
    </form>
  );
}
