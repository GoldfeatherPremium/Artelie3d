import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency, formatCompact, percentage } from "@/lib/utils";
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

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  grand_total_cents: number;
  items_subtotal_cents: number;
  placed_at: string | null;
  created_at: string;
  user_id: string | null;
  guest_email: string | null;
  customer_email?: string | null;
}

interface LowStockRow {
  id: string;
  name: string;
  sku: string | null;
  inventory_quantity: number;
  low_stock_threshold: number;
  status: string;
}

const REVENUE_STATUS_EXCLUDE = ["cancelled", "pending_payment"];

function customerLabel(order: OrderRow): string {
  if (order.customer_email) return order.customer_email;
  if (order.guest_email) return order.guest_email;
  return "Guest";
}

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const [{ data: orderRows }, { data: refundRows }, { count: customerCount }, { count: sellerCount }, { count: productCount }, { count: pendingProductCount }, { count: pendingSellerCount }, { count: pendingRefundCount }, { data: payoutRows }, { data: lowStockRows }] = await Promise.all([
    db
      .from("orders")
      .select("id, order_number, status, grand_total_cents, items_subtotal_cents, placed_at, created_at, user_id, guest_email, profiles(email)")
      .not("status", "in", `(${REVENUE_STATUS_EXCLUDE.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("refunds").select("amount_cents").eq("status", "processed"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    db.from("seller_profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    db
      .from("seller_profiles")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "submitted", "under_review"]),
    db.from("refunds").select("id", { count: "exact", head: true }).eq("status", "requested"),
    db.from("payouts").select("amount_cents, status").in("status", ["requested", "approved"]),
    db
      .from("products")
      .select("id, name, sku, inventory_quantity, low_stock_threshold, status")
      .neq("status", "draft")
      .lte("inventory_quantity", 5)
      .order("inventory_quantity", { ascending: true })
      .limit(8),
  ]);

  const orders = (orderRows ?? []) as unknown as OrderRow[];
  const revenueCents = orders.reduce((sum, o) => sum + o.grand_total_cents, 0);
  const gmvCents = orders.reduce((sum, o) => sum + o.items_subtotal_cents, 0);
  const processedRefundCents = (refundRows ?? []).reduce((sum, r) => sum + (r as { amount_cents: number }).amount_cents, 0);
  const netRevenueCents = revenueCents - processedRefundCents;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const conversion = percentage(deliveredCount, orders.length);
  const payoutLiabilityCents = (payoutRows ?? []).reduce((sum, p) => sum + (p as { amount_cents: number }).amount_cents, 0);
  const pendingApprovals = (pendingProductCount ?? 0) + (pendingSellerCount ?? 0);
  const lowStock = (lowStockRows ?? []) as unknown as LowStockRow[];
  const recentOrders = orders.slice(0, 8);

  const kpis = [
    { label: "Revenue", value: formatCurrency(revenueCents / 100), hint: "Excluding cancelled & unpaid" },
    { label: "GMV", value: formatCurrency(gmvCents / 100), hint: "Sum of item subtotals" },
    { label: "Net revenue", value: formatCurrency(netRevenueCents / 100), hint: "After processed refunds" },
    { label: "Orders", value: formatCompact(orders.length), hint: "Full orders" },
    { label: "Customers", value: formatCompact(customerCount ?? 0), hint: "Customer role profiles" },
    { label: "Sellers", value: formatCompact(sellerCount ?? 0), hint: "Approved sellers" },
    { label: "Products", value: formatCompact(productCount ?? 0), hint: "Approved products" },
    { label: "Pending approvals", value: formatCompact(pendingApprovals), hint: "Products + sellers" },
    { label: "Refunds pending", value: formatCompact(pendingRefundCount ?? 0), hint: "Requested refunds" },
    { label: "Payout liability", value: formatCurrency(payoutLiabilityCents / 100), hint: "Requested / approved" },
    { label: "Conversion", value: `${conversion.toFixed(1)}%`, hint: "Delivered / revenue orders" },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Dashboard</h1>
        <p className="text-body-sm text-fog">Platform overview at a glance.</p>
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

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest revenue-qualifying orders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <EmptyState title="No orders yet" description="Orders will appear here as customers check out." />
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
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:underline">
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-fog">{customerLabel(order)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" ? "danger" : "neutral"}>
                          {order.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(order.grand_total_cents / 100)}</TableCell>
                      <TableCell className="text-fog">
                        {format(new Date(order.placed_at ?? order.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <CardDescription>Products at or below reorder threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState title="All stocked up" description="No products are low on inventory." />
            ) : (
              <ul className="grid gap-3">
                {lowStock.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/products`} className="truncate font-medium text-ink hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-caption text-fog">SKU {product.sku ?? "—"} · {product.status.replaceAll("_", " ")}</p>
                    </div>
                    <Badge variant={product.inventory_quantity <= 0 ? "danger" : "warning"}>
                      {product.inventory_quantity} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
