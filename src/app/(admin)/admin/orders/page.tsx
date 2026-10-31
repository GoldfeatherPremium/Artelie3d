import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/commerce/orders";
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

const FILTERS = ["all", ...ORDER_STATUSES] as const;

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  grand_total_cents: number;
  placed_at: string | null;
  created_at: string;
  user_id: string | null;
  guest_email: string | null;
  profiles: { email: string | null } | { email: string | null }[] | null;
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function orderStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  if (status === "shipped" || status === "ready_to_ship") return "info";
  return "warning";
}

function customerLabel(order: OrderRow): string {
  const profile = firstRow(order.profiles);
  if (profile?.email) return profile.email;
  if (order.guest_email) return order.guest_email;
  return "Guest";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const status = FILTERS.includes((sp.status ?? "all") as (typeof FILTERS)[number]) ? sp.status! : "all";
  const db = createServiceClient();

  let query = db
    .from("orders")
    .select(
      "id, order_number, status, grand_total_cents, placed_at, created_at, user_id, guest_email, profiles(email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: rows } = await query;
  const orders = ((rows ?? []) as unknown) as OrderRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Orders</h1>
        <p className="text-body-sm text-fog">All orders across the platform.</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {FILTERS.map((key) => {
          const active = key === status;
          return (
            <Link
              key={key}
              href={key === "all" ? "/admin/orders" : `/admin/orders?status=${key}`}
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
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {orders.length} order(s){status !== "all" ? ` with status “${status.replaceAll("_", " ")}”` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState title="No orders here" description="No orders match this filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-fog">{customerLabel(order)}</TableCell>
                    <TableCell>{formatCurrency(order.grand_total_cents / 100)}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariant(order.status)}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
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
    </div>
  );
}
