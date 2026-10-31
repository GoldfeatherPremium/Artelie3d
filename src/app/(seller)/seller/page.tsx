import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
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
import {
  getSellerAnalytics,
  listSellerOrders,
  type SellerOrderView,
} from "@/app/actions/seller";

function statusVariant(status: string): "success" | "danger" | "neutral" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  return "neutral";
}

function customerLabel(order: SellerOrderView): string {
  return order.customer?.email ?? "Guest";
}

export default async function SellerOverviewPage() {
  await requireRole(["seller"]);
  const user = await getUser();
  const db = createServiceClient();

  const [analytics, orders] = await Promise.all([getSellerAnalytics(), listSellerOrders()]);

  // Current payout balance = last ledger balance for the seller's store.
  let balanceCents = 0;
  if (user) {
    const { data: sp } = await db
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sp) {
      const { data: store } = await db
        .from("stores")
        .select("id")
        .eq("seller_profile_id", (sp as { id: string }).id)
        .maybeSingle();
      if (store) {
        const { data: last } = await db
          .from("seller_ledger")
          .select("balance_after_cents")
          .eq("seller_id", user.id)
          .eq("store_id", (store as { id: string }).id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        balanceCents = ((last as { balance_after_cents?: number } | null)?.balance_after_cents) ?? 0;
      }
    }
  }

  const kpis = [
    { label: "Revenue", value: formatCurrency(analytics.revenueCents / 100), hint: "Net proceeds from your items" },
    { label: "Orders", value: formatCompact(analytics.ordersCount), hint: "Orders containing your products" },
    { label: "Pending products", value: formatCompact(analytics.pendingProducts), hint: "Awaiting moderation" },
    { label: "Payout balance", value: formatCurrency(balanceCents / 100), hint: "Available to request" },
  ];
  const recentOrders = orders.slice(0, 8);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Overview</h1>
        <p className="text-body-sm text-fog">Your store at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-title-lg font-display">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-caption text-fog">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Orders containing at least one of your items</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Orders will appear here once customers purchase your products."
              action={<Link href="/seller/products" className="text-body-sm font-medium text-bronze hover:text-ink">Go to products →</Link>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/seller/orders/${order.id}`} className="font-medium text-ink hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fog">{customerLabel(order)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status)}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.grandTotalCents / 100)}</TableCell>
                    <TableCell className="text-fog">
                      {format(new Date(order.placedAt ?? order.createdAt), "MMM d, yyyy")}
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
