"use server";

import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createOrderFromCheckout, updateOrderStatus, type AddressInput } from "@/lib/commerce/orders";
import { couponCodeSchema } from "@/lib/validation";
import { getPaymentProvider } from "@/lib/payments";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface CheckoutContext {
  user: { id: string; email: string | null } | null;
  provider: "test" | "stripe" | "custom";
  addresses: {
    id: string;
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string | null;
    country: string;
    phone: string | null;
    isDefault: boolean;
  }[];
}

export async function getCheckoutContext(): Promise<CheckoutContext> {
  const user = await getUser();
  const provider = getPaymentProvider().id;

  let addresses: CheckoutContext["addresses"] = [];
  if (user) {
    const db = createServiceClient();
    const { data } = await db
      .from("addresses")
      .select("id, full_name, line1, line2, city, region, postal_code, country, phone, is_default")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    addresses = ((data ?? []) as unknown as {
      id: string;
      full_name: string;
      line1: string;
      line2: string | null;
      city: string;
      region: string | null;
      postal_code: string | null;
      country: string;
      phone: string | null;
      is_default: boolean;
    }[]).map((a) => ({
      id: a.id,
      fullName: a.full_name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      region: a.region,
      postalCode: a.postal_code,
      country: a.country,
      phone: a.phone,
      isDefault: a.is_default,
    }));
  }

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    provider,
    addresses,
  };
}

interface CouponView {
  code: string;
  discountType: string;
  discountValue: number;
  minOrderCents: number | null;
  maxDiscountCents: number | null;
  active: boolean;
  expired: boolean;
  usageExhausted: boolean;
}

/** Lightweight display check; the authoritative coupon is applied at order creation. */
export async function validateCoupon(code: string): Promise<ActionResult & { coupon?: CouponView }> {
  const parsed = couponCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: "Invalid coupon code" };

  const db = createServiceClient();
  const { data, error } = await db.from("coupons").select("*").eq("code", parsed.data.toUpperCase()).maybeSingle();
  if (error || !data) return { ok: false, error: "Coupon not found" };

  const c = data as {
    code: string;
    discount_type: string;
    discount_value: number;
    min_order_cents: number | null;
    max_discount_cents: number | null;
    usage_limit: number | null;
    used_count: number;
    active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  };

  const now = new Date();
  const expired = Boolean(
    (c.ends_at && now > new Date(c.ends_at)) || (c.starts_at && now < new Date(c.starts_at)),
  );
  const usageExhausted = c.usage_limit !== null && c.used_count >= c.usage_limit;

  if (!c.active || expired || usageExhausted) {
    return { ok: false, error: expired ? "Coupon has expired" : usageExhausted ? "Coupon usage limit reached" : "Coupon is inactive" };
  }

  return {
    ok: true,
    coupon: {
      code: c.code,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minOrderCents: c.min_order_cents,
      maxDiscountCents: c.max_discount_cents,
      active: c.active,
      expired,
      usageExhausted,
    },
  };
}

export interface CompleteCheckoutInput {
  cartId: string;
  guestEmail?: string;
  shippingAddress: AddressInput;
  billingAddress?: AddressInput;
  deliveryMethod: string;
  couponCode?: string;
  idempotencyKey: string;
}

export interface CompleteCheckoutResult {
  ok: true;
  orderId: string;
  orderNumber: string;
  grandTotalCents: number;
  provider: string;
}

/**
 * Create the order (server-validated pricing, inventory, coupon) and, in
 * sandbox/test mode, finalize the simulated payment server-side. Real providers
 * (stripe/custom) require external webhook confirmation — never a client flag.
 */
export async function completeCheckout(
  input: CompleteCheckoutInput,
): Promise<CompleteCheckoutResult | { ok: false; error: string }> {
  try {
    const user = await getUser();

    const result = await createOrderFromCheckout({
      cartId: input.cartId,
      userId: user?.id ?? null,
      guestEmail: input.guestEmail || undefined,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      deliveryMethod: input.deliveryMethod,
      couponCode: input.couponCode,
      idempotencyKey: input.idempotencyKey,
    });

    const provider = getPaymentProvider();

    // Sandbox finalization: simulate the provider webhook server-side.
    if (provider.id === "test") {
      const db = createServiceClient();

      await provider.handleEvent({
        type: "payment.succeeded",
        data: { order_id: result.orderId, order_number: result.orderNumber, idempotency_key: input.idempotencyKey },
      });

      await db
        .from("payments")
        .update({
          status: "succeeded",
          provider_payment_id: `test_${input.idempotencyKey}`,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", result.orderId)
        .eq("idempotency_key", input.idempotencyKey);

      await db.from("orders").update({ paid_at: new Date().toISOString() }).eq("id", result.orderId);

      await updateOrderStatus(result.orderId, "confirmed", "Payment received (sandbox)", user?.id ?? null);

      return {
        ok: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        grandTotalCents: result.grandTotalCents,
        provider: provider.id,
      };
    }

    return {
      ok: false,
      error:
        "This environment is not configured for sandbox payment completion. Set PAYMENT_PROVIDER=test for a test-mode checkout, or configure a real provider with its webhook.",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Checkout failed. Please try again." };
  }
}
