import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency, formatCompact } from "@/lib/utils";
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

export const dynamic = "force-dynamic";

interface CommissionRow {
  id: string;
  gross_amount_cents: number;
  commission_rate: number;
  commission_amount_cents: number;
  net_amount_cents: number;
  status: string;
  currency: string;
  created_at: string;
  orders: { order_number: string } | null;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
  stores: { name: string } | { name: string }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function sellerLabel(row: CommissionRow): string {
  const profile = first(row.profiles);
  return profile?.full_name ?? profile?.email ?? "Seller";
}

export default async function AdminCommissionsPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const { data: rows } = await db
    .from("commissions")
    .select(
      "id, gross_amount_cents, commission_rate, commission_amount_cents, net_amount_cents, status, currency, created_at, " +
        "orders(order_number), profiles(full_name, email), stores(name)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const commissions = (rows ?? []) as unknown as CommissionRow[];

  const totalGross = commissions.reduce((sum, row) => sum + row.gross_amount_cents, 0);
  const totalCommission = commissions.reduce((sum, row) => sum + row.commission_amount_cents, 0);
  const totalNet = commissions.reduce((sum, row) => sum + row.net_amount_cents, 0);

  const kpis = [
    { label: "Gross merchandise", value: formatCurrency(totalGross / 100) },
    { label: "Platform commission", value: formatCurrency(totalCommission / 100) },
    { label: "Seller net proceeds", value: formatCurrency(totalNet / 100) },
    { label: "Commission records", value: formatCompact(commissions.length) },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Commissions</h1>
        <p className="text-body-sm text-fog">Platform commission across orders.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-title-lg font-display">{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission records</CardTitle>
          <CardDescription>{commissions.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <EmptyState title="No commissions" description="Commission records appear after orders are placed." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-fog">{row.orders?.order_number ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium text-ink">{sellerLabel(row)}</div>
                    </TableCell>
                    <TableCell className="text-fog">{first(row.stores)?.name ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(row.gross_amount_cents / 100, row.currency)}</TableCell>
                    <TableCell>{(Number(row.commission_rate) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="font-medium text-ink">
                      {formatCurrency(row.commission_amount_cents / 100, row.currency)}
                    </TableCell>
                    <TableCell>{formatCurrency(row.net_amount_cents / 100, row.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "paid" ? "success" : row.status === "reversed" ? "danger" : "neutral"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(row.created_at), "MMM d, yyyy")}
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
