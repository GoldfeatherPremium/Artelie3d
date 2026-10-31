import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function OrdersPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("orders")
    .select("id, order_number, status, grand_total_cents, placed_at, order_items(id, title, quantity, option_summary)")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false });

  const orders = (data ?? []) as unknown as {
    id: string;
    order_number: string;
    status: string;
    grand_total_cents: number;
    placed_at: string;
    order_items: { id: string; title: string; quantity: number; option_summary: string | null }[];
  }[];

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">My orders</h2>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No orders yet" description="When you place an order it will appear here." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="block rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-raised">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{order.order_number}</p>
                    <p className="text-caption text-fog">{new Date(order.placed_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={order.status === "delivered" ? "success" : order.status === "cancelled" || order.status === "refunded" ? "neutral" : "bronze"}>
                      {order.status.replaceAll("_", " ")}
                    </Badge>
                    <span className="font-display text-title-md text-ink">{`$${(order.grand_total_cents / 100).toFixed(2)}`}</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="line-clamp-1 text-body-sm text-fog">
                    {order.order_items.map((item) => item.title).join(", ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
