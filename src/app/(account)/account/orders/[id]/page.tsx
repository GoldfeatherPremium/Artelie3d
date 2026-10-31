import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { OrderActions } from "@/components/account/order-actions";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const user = await requireUser();
  const db = createServiceClient();

  const { data } = await db
    .from("orders")
    .select(
      "id, order_number, status, grand_total_cents, items_subtotal_cents, discounts_total_cents, shipping_total_cents, tax_total_cents, placed_at, paid_at, delivery_method, shipping_address, tracking_ref, coupon_code, " +
        "order_items(id, title, sku, unit_price_cents, quantity, line_total_cents, option_summary, image_url, status), " +
        "order_status_history(id, from_status, to_status, note, created_at, changed_by(full_name)), " +
        "payments(id, status, provider, amount_cents, created_at)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  const order = data as unknown as {
    id: string;
    order_number: string;
    status: string;
    grand_total_cents: number;
    items_subtotal_cents: number;
    discounts_total_cents: number;
    shipping_total_cents: number;
    tax_total_cents: number;
    placed_at: string;
    paid_at: string | null;
    delivery_method: string | null;
    shipping_address: Record<string, unknown> | null;
    tracking_ref: string | null;
    coupon_code: string | null;
    order_items: {
      id: string;
      title: string;
      sku: string | null;
      unit_price_cents: number;
      quantity: number;
      line_total_cents: number;
      option_summary: string | null;
      image_url: string | null;
      status: string;
    }[];
    order_status_history: {
      id: string;
      from_status: string | null;
      to_status: string;
      note: string | null;
      created_at: string;
      changed_by: { full_name: string | null } | { full_name: string | null }[] | null;
    }[];
    payments: { id: string; status: string; provider: string; amount_cents: number; created_at: string }[];
  };

  const shipping = order.shipping_address as Record<string, unknown> | null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-body-sm text-fog transition-colors hover:text-ink">← All orders</Link>
          <h2 className="mt-1 font-display text-title-lg text-ink">{order.order_number}</h2>
          <p className="text-caption text-fog">Placed {new Date(order.placed_at).toLocaleString()}</p>
        </div>
        <Badge variant="bronze">{order.status.replaceAll("_", " ")}</Badge>
      </div>

      <OrderActions orderId={order.id} status={order.status} maxRefundCents={order.grand_total_cents} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-paper p-6">
          <h3 className="font-display text-title-lg text-ink">Items</h3>
          <ul className="mt-4 grid gap-4">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex gap-4">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="h-16 w-16 shrink-0 rounded-lg bg-stone/50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-ink">{item.title}</p>
                  {item.option_summary ? (
                    <p className="mt-0.5 line-clamp-2 text-caption text-fog">{item.option_summary.replaceAll(" | ", " · ")}</p>
                  ) : null}
                  <p className="mt-1 text-caption text-fog">
                    {item.sku ? `SKU ${item.sku} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
                <Price amountCents={item.line_total_cents} size="sm" />
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-body-sm">
            <div className="flex justify-between"><dt className="text-fog">Subtotal</dt><dd className="text-ink">{`$${(order.items_subtotal_cents / 100).toFixed(2)}`}</dd></div>
            <div className="flex justify-between"><dt className="text-fog">Shipping</dt><dd className="text-ink">{`$${(order.shipping_total_cents / 100).toFixed(2)}`}</dd></div>
            {order.discounts_total_cents > 0 ? (
              <div className="flex justify-between"><dt className="text-fog">Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd className="text-success">−{`$${(order.discounts_total_cents / 100).toFixed(2)}`}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt className="text-fog">Taxes</dt><dd className="text-ink">{`$${(order.tax_total_cents / 100).toFixed(2)}`}</dd></div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="font-medium text-ink">Total</dt><dd className="font-display text-title-md text-ink">{`$${(order.grand_total_cents / 100).toFixed(2)}`}</dd></div>
          </dl>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-line bg-paper p-6">
            <h3 className="font-display text-title-lg text-ink">Delivery</h3>
            <dl className="mt-4 grid gap-2 text-body-sm">
              <div className="flex justify-between"><dt className="text-fog">Method</dt><dd className="capitalize text-ink">{(order.delivery_method ?? "standard").replaceAll("-", " ")}</dd></div>
              {order.tracking_ref ? <div className="flex justify-between"><dt className="text-fog">Tracking</dt><dd className="text-ink">{order.tracking_ref}</dd></div> : null}
              {shipping ? (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-fog">Ship to</p>
                  <p className="mt-1 text-ink">{String(shipping.fullName ?? "")}</p>
                  <p className="text-ink">{String(shipping.line1 ?? "")}{shipping.line2 ? `, ${String(shipping.line2)}` : ""}</p>
                  <p className="text-ink">{String(shipping.city ?? "")}{shipping.region ? `, ${String(shipping.region)}` : ""} {String(shipping.postalCode ?? "")}</p>
                  <p className="text-ink">{String(shipping.country ?? "")}</p>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-6">
            <h3 className="font-display text-title-lg text-ink">Timeline</h3>
            <ol className="mt-4 grid gap-4">
              {[...order.order_status_history]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-3">
                    <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-bronze ring-4 ring-bronze/15" />
                    <div>
                      <p className="text-body-sm font-medium capitalize text-ink">{entry.to_status.replaceAll("_", " ")}</p>
                      <p className="text-caption text-fog">
                        {new Date(entry.created_at).toLocaleString()}
                        {entry.changed_by ? ` · ${Array.isArray(entry.changed_by) ? entry.changed_by[0]?.full_name ?? "Team" : entry.changed_by.full_name ?? "Team"}` : ""}
                      </p>
                      {entry.note ? <p className="mt-1 text-caption text-fog">{entry.note}</p> : null}
                    </div>
                  </li>
                ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-6">
            <h3 className="font-display text-title-lg text-ink">Payment</h3>
            {order.payments.length === 0 ? (
              <p className="mt-3 text-body-sm text-fog">No payment record.</p>
            ) : (
              <ul className="mt-3 grid gap-2 text-body-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2">
                    <span className="capitalize text-fog">{payment.provider} · <span className="capitalize">{payment.status}</span></span>
                    <span className="text-ink">{`$${(payment.amount_cents / 100).toFixed(2)}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
