import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";

interface ConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  grand_total_cents: number;
  placed_at: string;
  delivery_method: string | null;
  shipping_address: Record<string, unknown> | null;
  items: {
    id: string;
    title: string;
    sku: string | null;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
    option_summary: string | null;
    image_url: string | null;
  }[];
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderId } = await params;
  const db = createServiceClient();

  const { data } = await db
    .from("orders")
    .select(
      "id, order_number, status, grand_total_cents, placed_at, delivery_method, shipping_address, " +
        "order_items(id, title, sku, unit_price_cents, quantity, line_total_cents, option_summary, image_url)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!data) notFound();

  const order = data as unknown as OrderRow;

  return (
    <div className="bg-ivory">
      <div className="container-site max-w-3xl py-14 sm:py-20">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-display-md text-ink">Thank you</h1>
          <p className="mt-3 text-body-lg text-fog">
            Your order <span className="font-medium text-ink">{order.order_number}</span> has been placed.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Badge variant="success">{order.status.replaceAll("_", " ")}</Badge>
            <span className="text-caption text-fog">
              {new Date(order.placed_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </span>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-paper p-6">
          <h2 className="font-display text-title-lg text-ink">Order summary</h2>
          <ul className="mt-5 grid gap-4">
            {order.items.map((item) => (
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
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <span className="text-body-sm font-medium text-ink">Total</span>
            <span className="font-display text-title-lg text-ink">{`$${(order.grand_total_cents / 100).toFixed(2)}`}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/account/orders">
            <Button variant="outline" size="lg" className="w-full">Track in My Orders</Button>
          </Link>
          <Link href="/shop">
            <Button size="lg" className="w-full">Continue shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
