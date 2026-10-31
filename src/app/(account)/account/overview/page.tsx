import Link from "next/link";
import { ArrowRight, ShoppingCart, Save, Sofa, Bell } from "lucide-react";
import { requireUser, getProfile } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";

export default async function OverviewPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const [profile, orders, configs, rooms, notifications] = await Promise.all([
    getProfile(),
    db.from("orders").select("id, order_number, status, grand_total_cents, placed_at").eq("user_id", user.id).order("placed_at", { ascending: false }).limit(5),
    db.from("product_configurations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("rooms").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("notifications").select("id").eq("user_id", user.id).is("read_at", null).limit(20),
  ]);

  const recentOrders = (orders.data ?? []) as { id: string; order_number: string; status: string; grand_total_cents: number; placed_at: string }[];
  const unread = (notifications.data ?? []).length;

  const cards = [
    { href: "/account/orders", label: "Orders", value: recentOrders.length, icon: ShoppingCart },
    { href: "/account/configurations", label: "Saved configurations", value: configs.count ?? 0, icon: Save },
    { href: "/account/rooms", label: "Room designs", value: rooms.count ?? 0, icon: Sofa },
    { href: "/account/notifications", label: "Unread notifications", value: unread, icon: Bell },
  ];

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-line bg-paper p-6">
        <p className="text-caption uppercase tracking-wider text-bronze">Welcome back</p>
        <h2 className="mt-1 font-display text-title-lg text-ink">
          {profile?.full_name ?? "Customer"}
        </h2>
        <p className="mt-1 text-body-sm text-fog">{profile?.email ?? user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-2xl border border-line bg-paper p-5 transition-shadow hover:shadow-raised">
            <card.icon className="h-5 w-5 text-bronze" />
            <p className="mt-4 font-display text-display-md text-ink">{card.value}</p>
            <p className="mt-1 flex items-center gap-1 text-body-sm text-fog">
              {card.label} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-title-lg text-ink">Recent orders</h3>
          <Link href="/account/orders" className="text-body-sm font-medium text-bronze transition-colors hover:text-ink">View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-body-sm text-fog">No orders yet — explore the collection to get started.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-bronze/50">
                  <div>
                    <p className="text-body-sm font-medium text-ink">{order.order_number}</p>
                    <p className="text-caption text-fog">{new Date(order.placed_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral">{order.status.replaceAll("_", " ")}</Badge>
                    <span className="font-medium text-ink">{`$${(order.grand_total_cents / 100).toFixed(2)}`}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
