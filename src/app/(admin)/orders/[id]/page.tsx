import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/commerce/orders";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { updateOrderStatusAdmin, adminRequestRefund } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

interface OrderDetailData {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  user_id: string | null;
  guest_email: string | null;
  items_subtotal_cents: number;
  discounts_total_cents: number;
  shipping_total_cents: number;
  tax_total_cents: number;
  grand_total_cents: number;
  coupon_code: string | null;
  delivery_method: string | null;
  tracking_ref: string | null;
  placed_at: string | null;
  paid_at: string | null;
  created_at: string;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  profiles:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
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
  refunds: {
    id: string;
    amount_cents: number;
    reason: string | null;
    status: string;
    admin_note: string | null;
    processed_at: string | null;
    created_at: string;
  }[];
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

function refundStatusVariant(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "processed") return "success";
  if (status === "rejected") return "danger";
  if (status === "approved") return "info";
  return "warning";
}

function addressLines(address: Record<string, unknown> | null): string[] {
  if (!address) return [];
  const lines: string[] = [];
  if (typeof address.fullName === "string" && address.fullName) lines.push(address.fullName);
  if (typeof address.line1 === "string" && address.line1) lines.push(address.line1);
  if (typeof address.line2 === "string" && address.line2) lines.push(address.line2);
  const parts: string[] = [];
  if (typeof address.city === "string" && address.city) parts.push(address.city);
  if (typeof address.region === "string" && address.region) parts.push(address.region);
  if (typeof address.postalCode === "string" && address.postalCode) parts.push(address.postalCode);
  if (parts.length) lines.push(parts.join(", "));
  if (typeof address.country === "string" && address.country) lines.push(address.country);
  if (typeof address.phone === "string" && address.phone) lines.push(`Phone: ${address.phone}`);
  return lines;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  await requireRole(["admin"]);
  const { id } = await params;
  const db = createServiceClient();

  const { data } = await db
    .from("orders")
    .select(
      "id, order_number, status, currency, user_id, guest_email, items_subtotal_cents, discounts_total_cents, shipping_total_cents, tax_total_cents, grand_total_cents, coupon_code, delivery_method, tracking_ref, placed_at, paid_at, created_at, shipping_address, billing_address, " +
        "profiles(full_name, email), " +
        "order_items(id, title, sku, unit_price_cents, quantity, line_total_cents, option_summary, image_url, status), " +
        "order_status_history(id, from_status, to_status, note, created_at, changed_by(full_name)), " +
        "payments(id, status, provider, amount_cents, created_at), " +
        "refunds(id, amount_cents, reason, status, admin_note, processed_at, created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const order = (data as unknown) as OrderDetailData;
  const profile = firstRow(order.profiles);
  const customerEmail = order.user_id ? profile?.email : undefined;
  const displayEmail = customerEmail ?? order.guest_email ?? "—";
  const customerName = profile?.full_name;
  const shipping = addressLines(order.shipping_address);
  const billing = addressLines(order.billing_address);
  const targets = ORDER_STATUSES.filter((status) => status !== order.status);
  const timeline = [...order.order_status_history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-body-sm text-fog transition-colors hover:text-ink">
            ← All orders
          </Link>
          <h1 className="mt-1 font-display text-display-md text-ink">{order.order_number}</h1>
          <p className="text-caption text-fog">
            Placed {format(new Date(order.placed_at ?? order.created_at), "MMM d, yyyy, h:mm a")}
          </p>
        </div>
        <Badge variant={orderStatusVariant(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>Snapshotted line items for this order</CardDescription>
          </CardHeader>
          <CardContent>
            {order.order_items.length === 0 ? (
              <EmptyState title="No items" description="This order has no line items." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-ink">{item.title}</div>
                        {item.option_summary ? (
                          <p className="mt-0.5 line-clamp-2 text-caption text-fog">
                            {item.option_summary.replaceAll(" | ", " · ")}
                          </p>
                        ) : null}
                        <p className="text-caption text-fog">
                          {item.sku ? `SKU ${item.sku} · ` : ""}status {item.status}
                        </p>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price_cents / 100)}</TableCell>
                      <TableCell className="font-medium text-ink">
                        {formatCurrency(item.line_total_cents / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-fog">Subtotal</dt>
                <dd className="text-ink">{formatCurrency(order.items_subtotal_cents / 100)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fog">Shipping</dt>
                <dd className="text-ink">{formatCurrency(order.shipping_total_cents / 100)}</dd>
              </div>
              {order.discounts_total_cents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-fog">
                    Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                  </dt>
                  <dd className="text-success">−{formatCurrency(order.discounts_total_cents / 100)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-fog">Taxes</dt>
                <dd className="text-ink">{formatCurrency(order.tax_total_cents / 100)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="font-display text-title-md text-ink">
                  {formatCurrency(order.grand_total_cents / 100)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-6 content-start">
          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-body-sm">
                <div>
                  <p className="text-fog">Customer</p>
                  <p className="font-medium text-ink">{customerName ?? "Guest"}</p>
                  <p className="text-fog">{displayEmail}</p>
                </div>
                {order.delivery_method ? (
                  <div className="border-t border-line pt-2">
                    <p className="text-fog">Method</p>
                    <p className="text-ink">{order.delivery_method.replaceAll("-", " ")}</p>
                  </div>
                ) : null}
                {order.tracking_ref ? (
                  <div className="border-t border-line pt-2">
                    <p className="text-fog">Tracking</p>
                    <p className="text-ink">{order.tracking_ref}</p>
                  </div>
                ) : null}
                {shipping.length > 0 ? (
                  <div className="border-t border-line pt-2">
                    <p className="text-fog">Ship to</p>
                    <div className="mt-1 text-ink">
                      {shipping.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                {billing.length > 0 ? (
                  <div className="border-t border-line pt-2">
                    <p className="text-fog">Bill to</p>
                    <div className="mt-1 text-ink">
                      {billing.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <EmptyState title="No payments" description="No payment record exists for this order." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="capitalize">{payment.provider}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "succeeded" ? "success" : payment.status === "failed" ? "danger" : "neutral"}>
                            {payment.status.replaceAll("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount_cents / 100)}</TableCell>
                        <TableCell className="text-fog">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Refunds</CardTitle>
              <CardDescription>Existing refund requests and a new refund form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {order.refunds.length > 0 ? (
                  <ul className="grid gap-3">
                    {order.refunds.map((refund) => (
                      <li
                        key={refund.id}
                        className="rounded-lg border border-line bg-ivory/40 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-ink">
                            {formatCurrency(refund.amount_cents / 100)}
                          </span>
                          <Badge variant={refundStatusVariant(refund.status)}>
                            {refund.status.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        {refund.reason ? (
                          <p className="mt-1 text-caption text-fog">{refund.reason}</p>
                        ) : null}
                        {refund.admin_note ? (
                          <p className="mt-1 text-caption text-fog">Admin note: {refund.admin_note}</p>
                        ) : null}
                        <p className="mt-1 text-caption text-fog">
                          {format(new Date(refund.created_at), "MMM d, yyyy")}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-fog">No refunds have been requested for this order.</p>
                )}

                <form action={adminRequestRefund.bind(null, order.id)} className="grid gap-4 rounded-lg border border-line p-4">
                  <Field label="Amount (USD)" htmlFor="refund-amount" hint="Leave below the order total for a partial refund.">
                    <Input
                      id="refund-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Reason" htmlFor="refund-reason">
                    <Textarea
                      id="refund-reason"
                      name="reason"
                      placeholder="Why is this amount being refunded?"
                    />
                  </Field>
                  <div>
                    <Button type="submit" variant="outline" size="sm">
                      Request refund
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>Move the order to another status</CardDescription>
          </CardHeader>
          <CardContent>
            {targets.length === 0 ? (
              <p className="text-body-sm text-fog">No further transitions available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <ConfirmButton
                    key={target}
                    title={`Set status to ${target.replaceAll("_", " ")}`}
                    description={`Order ${order.order_number} will move to “${target.replaceAll("_", " ")}”.`}
                    confirmLabel="Update status"
                    variant={target === "cancelled" || target === "refunded" ? "danger" : "outline"}
                    size="sm"
                    notePlaceholder="Internal note (optional)"
                    action={updateOrderStatusAdmin.bind(null, order.id, target) as () => Promise<ActionResult>}
                  >
                    {target.replaceAll("_", " ")}
                  </ConfirmButton>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <EmptyState title="No history" description="No status transitions recorded yet." />
            ) : (
              <ol className="grid gap-4">
                {timeline.map((entry) => (
                  <li key={entry.id} className="relative flex gap-3">
                    <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-bronze ring-4 ring-bronze/15" />
                    <div>
                      <p className="text-body-sm font-medium capitalize text-ink">
                        {entry.to_status.replaceAll("_", " ")}
                      </p>
                      <p className="text-caption text-fog">
                        {new Date(entry.created_at).toLocaleString()}
                        {entry.changed_by
                          ? ` · ${Array.isArray(entry.changed_by) ? entry.changed_by[0]?.full_name ?? "Team" : entry.changed_by.full_name ?? "Team"}`
                          : ""}
                      </p>
                      {entry.note ? <p className="mt-1 text-caption text-fog">{entry.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
