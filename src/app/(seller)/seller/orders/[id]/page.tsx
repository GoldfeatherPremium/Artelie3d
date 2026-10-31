import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
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

const ITEM_STATUS_FLOW = [
  "confirmed",
  "processing",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
] as const;

interface OrderItem {
  id: string;
  product_id: string;
  seller_id: string | null;
  store_id: string | null;
  title: string;
  sku: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  option_summary: string | null;
  line_total_cents: number;
  status: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  placed_at: string | null;
  created_at: string;
  delivery_method: string | null;
  guest_email: string | null;
  user_id: string | null;
  profiles: { email: string | null } | { email: string | null }[] | null;
  order_items: OrderItem[];
  order_status_history: {
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
    changed_by: { full_name: string | null } | { full_name: string | null }[] | null;
  }[];
}

function orderStatusVariant(status: string): "success" | "danger" | "neutral" | "warning" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "refunded") return "danger";
  if (status === "pending_payment") return "warning";
  return "neutral";
}

export const dynamic = "force-dynamic";

export default async function SellerOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ itemUpdated?: string; itemError?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  await requireRole(["seller"]);
  const user = await getUser();
  const db = createServiceClient();
  const seller = user ? await resolveSeller(db, user.id) : null;

  const { data } = await db
    .from("orders")
    .select(
      "id, order_number, status, placed_at, created_at, delivery_method, guest_email, user_id, profiles(email), " +
        "order_items(id, product_id, seller_id, store_id, title, sku, image_url, unit_price_cents, quantity, option_summary, line_total_cents, status), " +
        "order_status_history(id, from_status, to_status, note, created_at, changed_by(full_name))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as unknown as OrderDetail;

  const items = order.order_items.filter(
    (item) => item.seller_id === seller?.sellerProfileId || item.store_id === seller?.storeId,
  );
  if (items.length === 0) notFound();

  const sellerTotalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  const customerEmail = (Array.isArray(order.profiles) ? order.profiles[0] : order.profiles)?.email ?? order.guest_email ?? "Guest";
  const itemError = typeof sp.itemError === "string" && sp.itemError.length > 0 ? sp.itemError : undefined;

  async function updateOrderItemStatus(orderItemId: string, formData: FormData): Promise<void> {
    "use server";
    const nextStatus = formData.get("status");
    const nextStatusString = typeof nextStatus === "string" ? nextStatus : "";
    const item = items.find((entry) => entry.id === orderItemId);
    if (!item) {
      redirect(`/seller/orders/${id}?itemError=${encodeURIComponent("Item not found.")}`);
    }
    const currentIndex = ITEM_STATUS_FLOW.indexOf(item.status as (typeof ITEM_STATUS_FLOW)[number]);
    const nextIndex = ITEM_STATUS_FLOW.indexOf(nextStatusString as (typeof ITEM_STATUS_FLOW)[number]);
    if (currentIndex === -1 || nextIndex === -1 || nextIndex <= currentIndex) {
      redirect(
        `/seller/orders/${id}?itemError=${encodeURIComponent(`Cannot move this item from ${item.status} to ${nextStatusString}.`)}`,
      );
    }

    const { error } = await db
      .from("order_items")
      .update({ status: nextStatusString })
      .eq("id", orderItemId)
      .eq("order_id", id);
    if (error) {
      redirect(`/seller/orders/${id}?itemError=${encodeURIComponent(error.message)}`);
    }

    await db.from("order_status_history").insert({
      order_id: id,
      from_status: item.status,
      to_status: nextStatusString,
      note: `Item "${item.title}"`,
      changed_by: user?.id ?? null,
    });

    redirect(`/seller/orders/${id}?itemUpdated=1`);
  }

  const timeline = [...order.order_status_history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/seller/orders" className="text-body-sm text-fog transition-colors hover:text-ink">
            ← All orders
          </Link>
          <h1 className="mt-1 font-display text-display-md text-ink">{order.order_number}</h1>
          <p className="text-body-sm text-fog">
            {customerEmail} · Placed {new Date(order.placed_at ?? order.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={orderStatusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
      </div>

      {sp.itemUpdated ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-body-sm text-success" role="status">
          Item status updated.
        </p>
      ) : null}
      {itemError ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {itemError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your line items</CardTitle>
          <CardDescription>
            {items.length} item(s) · Seller total {formatCurrency(sellerTotalCents / 100)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Line total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const currentIndex = ITEM_STATUS_FLOW.indexOf(item.status as (typeof ITEM_STATUS_FLOW)[number]);
                const nextStatuses = currentIndex >= 0 ? ITEM_STATUS_FLOW.slice(currentIndex + 1) : [];
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="h-12 w-12 shrink-0 rounded-lg bg-stone/50" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{item.title}</p>
                          <p className="text-caption text-fog">
                            {item.sku ? `SKU ${item.sku} · ` : ""}
                            {item.option_summary ? item.option_summary.replaceAll(" | ", " · ") : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price_cents / 100)}</TableCell>
                    <TableCell className="font-medium text-ink">{formatCurrency(item.line_total_cents / 100)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{item.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {nextStatuses.length === 0 ? (
                        <span className="text-caption text-fog">Final status</span>
                      ) : (
                        <form
                          action={updateOrderItemStatus.bind(null, item.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Select name="status" defaultValue={nextStatuses[0]} className="h-9 min-w-40">
                            {nextStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" size="sm" variant="outline">
                            Update
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order status history</CardTitle>
          <CardDescription>Timeline for this order.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative flex gap-3">
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-bronze ring-4 ring-bronze/15" />
                <div>
                  <p className="text-body-sm font-medium capitalize text-ink">{entry.to_status.replaceAll("_", " ")}</p>
                  <p className="text-caption text-fog">
                    {new Date(entry.created_at).toLocaleString()}
                    {entry.changed_by
                      ? ` · ${
                          Array.isArray(entry.changed_by)
                            ? entry.changed_by[0]?.full_name ?? "Team"
                            : entry.changed_by.full_name ?? "Team"
                        }`
                      : ""}
                  </p>
                  {entry.note ? <p className="mt-1 text-caption text-fog">{entry.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
