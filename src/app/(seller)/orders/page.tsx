import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SellerContext {
  sellerProfileId: string;
  storeId: string | null;
}

async function resolveSeller(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<SellerContext | null> {
  const { data: sellerRow } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const seller = sellerRow as { id: string } | null;
  if (!seller) return null;

  const { data: storeRow } = await db
    .from("stores")
    .select("id")
    .eq("seller_profile_id", seller.id)
    .maybeSingle();
  const store = storeRow as { id: string } | null;

  return { sellerProfileId: seller.id, storeId: store?.id ?? null };
}

interface OrderItemRow {
  id: string;
  order_id: string;
  seller_id: string | null;
  title: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  status: string;
  orders: {
    id: string;
    order_number: string;
    status: string;
    placed_at: string | null;
    created_at: string;
    guest_email: string | null;
    user_id: string | null;
  } | null;
}

interface SellerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  timestamp: string;
  customerEmail: string;
  itemCount: number;
  totalSellerCents: number;
}

function orderStatusVariant(status: string): "success" | "danger" | "neutral" | "warning" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  if (status === "pending_payment") return "warning";
  return "neutral";
}

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
  await requireRole(["seller"]);
  const user = await getUser();
  const db = createServiceClient();
  const seller = user ? await resolveSeller(db, user.id) : null;

  const summaries = new Map<string, SellerOrderSummary>();

  if (seller) {
    const { data: rows } = await db
      .from("order_items")
      .select(
        "id, order_id, seller_id, title, quantity, unit_price_cents, line_total_cents, status, " +
          "orders(id, order_number, status, placed_at, created_at, guest_email, user_id)",
      )
      .eq("seller_id", seller.sellerProfileId);

    const itemRows = (rows ?? []) as unknown as OrderItemRow[];

    const userIds = [
      ...new Set(
        itemRows
          .map((row) => row.orders?.user_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const emailById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profileRows } = await db
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const profile of (profileRows ?? []) as { id: string; email: string | null }[]) {
        if (profile.email) emailById.set(profile.id, profile.email);
      }
    }

    for (const row of itemRows) {
      const order = row.orders;
      if (!order) continue;
      const existing = summaries.get(order.id);
      if (existing) {
        existing.itemCount += 1;
        existing.totalSellerCents += row.line_total_cents;
      } else {
        summaries.set(order.id, {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          timestamp: order.placed_at ?? order.created_at,
          customerEmail: emailById.get(order.user_id ?? "") ?? order.guest_email ?? "Guest",
          itemCount: 1,
          totalSellerCents: row.line_total_cents,
        });
      }
    }
  }

  const orders = [...summar.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Orders</h1>
        <p className="text-body-sm text-fog">Orders containing items from your store.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller orders</CardTitle>
          <CardDescription>{orders.length} order(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When customers buy your products, the orders will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Your items</TableHead>
                  <TableHead>Your total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/seller/orders/${order.id}`} className="font-medium text-ink hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fog">{order.customerEmail}</TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell className="font-medium text-ink">{formatCurrency(order.totalSellerCents / 100)}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-fog">{format(new Date(order.timestamp), "MMM d, yyyy")}</TableCell>
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
