import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSellerPayouts } from "@/app/actions/seller";

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "paid") return "success";
  if (status === "approved") return "info";
  if (status === "rejected" || status === "failed") return "danger";
  return "warning";
}

export const dynamic = "force-dynamic";

export default async function SellerPayoutsPage() {
  await requireRole(["seller"]);
  const payouts = await listSellerPayouts();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-ink">Payouts</h1>
          <p className="text-body-sm text-fog">Your payout requests and their status.</p>
        </div>
        <Link href="/seller/settings" className="inline-flex h-9 items-center rounded-full border border-charcoal/20 px-3 text-body-sm font-medium text-ink transition-colors hover:border-charcoal/50 hover:bg-charcoal/5">
          Request a payout
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>{payouts.length} request(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <EmptyState
              title="No payouts yet"
              description="Request a payout from Settings when you have an available balance."
              action={
                <Link href="/seller/settings" className="text-body-sm font-medium text-bronze hover:text-ink">
                  Go to settings →
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium text-ink">
                      {formatCurrency(payout.amountCents / 100, payout.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(payout.status)}>{payout.status}</Badge>
                    </TableCell>
                    <TableCell className="text-fog">
                      {payout.periodStart && payout.periodEnd
                        ? `${format(new Date(payout.periodStart), "MMM d")} → ${format(new Date(payout.periodEnd), "MMM d, yyyy")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-fog">{payout.note ?? "—"}</TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(payout.createdAt), "MMM d, yyyy")}
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
