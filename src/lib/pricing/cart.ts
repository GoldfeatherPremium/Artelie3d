import { clamp } from "@/lib/utils";

export type CartLine = {
  /** Final unit price in integer cents (e.g. from `computeConfigurationPrice`). */
  unitPriceCents: number;
  quantity: number;
  productId: string;
  sellerId?: string;
};

/** Minimal coupon shape consumed by the cart totals calculation (mirrors `coupons`). */
export type CouponLike = {
  code: string;
  discount_type: "percent" | "fixed";
  /** Percent (e.g. 15 = 15%) or fixed discount in integer cents. */
  discount_value: number;
  min_order_cents?: number | null;
  max_discount_cents?: number | null;
  active?: boolean;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
};

export type ComputeCartTotalsOptions = {
  coupon?: CouponLike;
  /** Shipping cost in integer cents (defaults to 0). */
  shippingCents?: number;
  /** Tax rate as a fraction (e.g. 0.07); applied to the post-discount subtotal. */
  taxRate?: number;
};

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode?: string;
};

/**
 * Compute cart totals, entirely in integer cents.
 *
 * - Subtotal is the sum of `unitPriceCents * quantity` per line (lines with a
 *   non-positive quantity or negative unit price contribute nothing).
 * - Percent discounts are `subtotal * discount_value / 100`; fixed discounts use
 *   `discount_value` cents directly. Discounts respect `min_order_cents` and are
 *   capped by `max_discount_cents` and the subtotal.
 * - Coupon `active` (default true) and start/end window are honored when present.
 * - Shipping defaults to 0 unless `shippingCents` is provided.
 * - Tax is computed on the post-discount subtotal and rounded to the nearest cent.
 * - `couponCode` is present whenever a coupon was supplied, even if it did not
 *   apply (e.g. below the minimum order amount).
 */
export function computeCartTotals(
  lines: CartLine[] = [],
  opts: ComputeCartTotalsOptions = {},
): CartTotals {
  const subtotalCents = lines.reduce((sum, line) => {
    if (line.quantity <= 0 || line.unitPriceCents < 0) return sum;
    return sum + line.unitPriceCents * line.quantity;
  }, 0);

  const shippingCents = Math.max(0, opts.shippingCents ?? 0);
  const coupon = opts.coupon;

  let discountCents = 0;
  let couponCode: string | undefined;

  if (coupon) {
    couponCode = coupon.code;
    const isActive = coupon.active !== false;
    const now = Date.now();
    const withinWindow =
      (!coupon.starts_at || new Date(coupon.starts_at).getTime() <= now) &&
      (!coupon.ends_at || new Date(coupon.ends_at).getTime() >= now);

    if (isActive && withinWindow) {
      const meetsMinimum =
        coupon.min_order_cents == null || subtotalCents >= coupon.min_order_cents;

      if (meetsMinimum) {
        if (coupon.discount_type === "percent") {
          discountCents = Math.round((subtotalCents * coupon.discount_value) / 100);
        } else {
          discountCents = Math.round(coupon.discount_value);
        }

        if (coupon.max_discount_cents != null && discountCents > coupon.max_discount_cents) {
          discountCents = coupon.max_discount_cents;
        }

        discountCents = clamp(discountCents, 0, subtotalCents);
      }
    }
  }

  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = opts.taxRate
    ? Math.max(0, Math.round(taxableCents * opts.taxRate))
    : 0;

  const totalCents = subtotalCents - discountCents + shippingCents + taxCents;

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents,
    ...(couponCode !== undefined ? { couponCode } : {}),
  };
}
