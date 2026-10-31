import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { computeConfigurationPrice, type CustomizationSchema } from "@/lib/pricing";
import { checkoutSchema, couponCodeSchema } from "@/lib/validation";
import { generateOrderNumber } from "@/lib/utils";
import { clearCart, normalizeConfiguration, summarizeConfiguration } from "./cart";
import { accrueCommissionsForOrder } from "@/lib/ledger";

/**
 * Commerce domain errors. Typed, carries a stable machine `code`.
 */
export class CommerceError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CommerceError";
    this.code = code;
  }
}

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "processing",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancellation_requested",
  "cancelled",
  "refund_pending",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type AddressInput = CheckoutPayload["shippingAddress"];

export interface CheckoutInput {
  cartId: string;
  userId: string | null;
  guestEmail?: string;
  shippingAddress: AddressInput;
  billingAddress?: AddressInput;
  deliveryMethod: string;
  couponCode?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  grandTotalCents: number;
}

export interface UpdateOrderStatusResult {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface RefundResult {
  refundId: string;
  status: "requested";
}

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  base_price_cents: number;
  sale_price_cents: number | null;
  inventory_quantity: number;
  customization_schema: CustomizationSchema | null;
  seller_id: string;
  store_id: string;
}

interface VariantRow {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_cents: number;
  inventory_quantity: number;
}

interface ImageRow {
  product_id: string;
  url: string;
}

interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_cents: number | null;
  max_discount_cents: number | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

interface CartLineJoined {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  configuration: unknown;
  option_summary: string | null;
  unit_price_cents: number;
  currency: string;
  products: ProductRow | null;
}

interface OrderItemDraft {
  product_id: string;
  variant_id: string | null;
  seller_id: string;
  store_id: string;
  title: string;
  sku: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  configuration: unknown;
  option_summary: string | null;
  line_total_cents: number;
}

interface CreationContext {
  orderId: string | null;
  couponId: string | null;
  couponIncremented: boolean;
  couponRedemptionInserted: boolean;
  decrementedProducts: Map<string, number>;
  decrementedVariants: Map<string, number>;
  notificationIds: string[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function safeNotify(
  db: SupabaseClient,
  notification: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    link?: string;
  },
): Promise<void> {
  const { error } = await db.from("notifications").insert(notification);
  // Notifications are best-effort; never fail the primary operation.
  if (error) {
    // no-op
  }
}

/**
 * Best-effort compensation when order creation fails part-way. The app layer
 * cannot open a real DB transaction, so we undo each partial side effect:
 * restore inventory, decrement coupon usage, drop ledger/notification/coupon
 * rows and finally delete the order row (which cascades to order_items,
 * order_status_history, payments and commissions).
 */
async function rollbackOrderCreation(
  db: SupabaseClient,
  ctx: CreationContext,
): Promise<void> {
  for (const [productId, demand] of ctx.decrementedProducts) {
    const { data: current } = await db
      .from("products")
      .select("inventory_quantity")
      .eq("id", productId)
      .maybeSingle();
    if (current) {
      await db
        .from("products")
        .update({ inventory_quantity: current.inventory_quantity + demand })
        .eq("id", productId);
    }
  }
  for (const [variantId, demand] of ctx.decrementedVariants) {
    const { data: current } = await db
      .from("product_variants")
      .select("inventory_quantity")
      .eq("id", variantId)
      .maybeSingle();
    if (current) {
      await db
        .from("product_variants")
        .update({ inventory_quantity: current.inventory_quantity + demand })
        .eq("id", variantId);
    }
  }

  if (ctx.couponId && ctx.couponIncremented) {
    const { data: current } = await db
      .from("coupons")
      .select("used_count")
      .eq("id", ctx.couponId)
      .maybeSingle();
    if (current) {
      await db
        .from("coupons")
        .update({ used_count: Math.max(0, (current.used_count ?? 0) - 1) })
        .eq("id", ctx.couponId);
    }
  }

  if (ctx.orderId) {
    if (ctx.couponRedemptionInserted) {
      await db.from("coupon_redemptions").delete().eq("order_id", ctx.orderId);
    }
    await db.from("seller_ledger").delete().eq("order_id", ctx.orderId);
    if (ctx.notificationIds.length > 0) {
      await db.from("notifications").delete().in("id", ctx.notificationIds);
    }
    await db.from("orders").delete().eq("id", ctx.orderId);
  }
}

/**
 * Create an order from a cart. Re-reads cart lines server-side, recomputes
 * prices with the pricing engine, validates inventory, applies a coupon,
 * snapshots order items, decrements inventory, clears the cart, creates a
 * pending payment row, accrues commissions/ledger and notifies the customer.
 * On any failure a CommerceError is thrown and partial work is rolled back.
 */
export async function createOrderFromCheckout(
  input: CheckoutInput,
): Promise<CreateOrderResult> {
  if (!input.cartId) throw new CommerceError("CART_REQUIRED", "cartId is required");
  if (!input.idempotencyKey) {
    throw new CommerceError("IDEMPOTENCY_KEY_REQUIRED", "idempotencyKey is required");
  }
  if (!input.userId && !input.guestEmail) {
    throw new CommerceError("CONTACT_REQUIRED", "A user or guest email is required");
  }

  const db = createServiceClient();
  const ctx: CreationContext = {
    orderId: null,
    couponId: null,
    couponIncremented: false,
    couponRedemptionInserted: false,
    decrementedProducts: new Map(),
    decrementedVariants: new Map(),
    notificationIds: [],
  };

  try {
    // Resolve the customer email (profile email wins for signed-in users).
    let email = input.guestEmail ?? "";
    if (input.userId) {
      const { data: profile } = await db
        .from("profiles")
        .select("email")
        .eq("id", input.userId)
        .maybeSingle();
      email = profile ? ((profile as { email: string | null }).email ?? "") : email;
    }
    if (!email) throw new CommerceError("CONTACT_REQUIRED", "A contact email is required");

    const payload = {
      email,
      shippingAddress: input.shippingAddress,
      deliveryMethod: input.deliveryMethod,
      ...(input.billingAddress ? { billingAddress: input.billingAddress } : {}),
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new CommerceError("INVALID_CHECKOUT", `Invalid checkout data: ${detail}`);
    }
    const checkout = parsed.data;

    // Idempotency: a payment row with this key already exists → replay the order.
    const { data: priorPayment } = await db
      .from("payments")
      .select("order_id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (priorPayment?.order_id) {
      const { data: priorOrder } = await db
        .from("orders")
        .select("id, order_number, grand_total_cents")
        .eq("id", priorPayment.order_id)
        .maybeSingle();
      if (priorOrder) {
        return {
          orderId: priorOrder.id,
          orderNumber: priorOrder.order_number,
          grandTotalCents: priorOrder.grand_total_cents,
        };
      }
    }

    // Cart ownership + server-side re-read of cart lines.
    const { data: cartRow } = await db
      .from("carts")
      .select("id, user_id")
      .eq("id", input.cartId)
      .maybeSingle();
    if (!cartRow) throw new CommerceError("CART_NOT_FOUND", "Cart not found");
    if (input.userId && cartRow.user_id !== input.userId) {
      throw new CommerceError("CART_OWNER_MISMATCH", "Cart does not belong to this user");
    }

    const { data: lines, error: linesError } = await db
      .from("cart_items")
      .select(
        "id, product_id, variant_id, quantity, configuration, option_summary, unit_price_cents, currency, " +
          "products(id, name, sku, base_price_cents, sale_price_cents, inventory_quantity, customization_schema, seller_id, store_id)",
      )
      .eq("cart_id", input.cartId);
    if (linesError) throw new CommerceError("CART_READ_FAILED", linesError.message);
    const joined = ((lines ?? []) as unknown) as CartLineJoined[];
    if (joined.length === 0) throw new CommerceError("EMPTY_CART", "Cart is empty");

    // First product image per product (snapshot for order_items).
    const productIds = [...new Set(joined.map((line) => line.product_id))];
    const { data: imageRows } = await db
      .from("product_images")
      .select("product_id, url")
      .in("product_id", productIds)
      .order("position", { ascending: true });
    const imageByProduct = new Map<string, string>();
    for (const image of (imageRows ?? []) as ImageRow[]) {
      if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.url);
    }

    const variantIds = joined
      .filter((line) => line.variant_id)
      .map((line) => line.variant_id as string);
    let variantById = new Map<string, VariantRow>();
    if (variantIds.length > 0) {
      const { data: variantRows } = await db
        .from("product_variants")
        .select("id, product_id, name, sku, price_cents, inventory_quantity")
        .in("id", variantIds);
      variantById = new Map(
        (variantRows ?? []).map((variant) => [variant.id, variant as VariantRow]),
      );
    }

    // Recompute prices server-side. Never trust client-supplied prices.
    const drafts: OrderItemDraft[] = [];
    const productDemand = new Map<string, number>();
    const variantDemand = new Map<string, number>();
    let subtotalCents = 0;

    for (const line of joined) {
      const product = line.products;
      if (!product) throw new CommerceError("PRODUCT_NOT_FOUND", `Product ${line.product_id} not found`);

      const configuration = normalizeConfiguration(line.configuration);
      const variant = line.variant_id ? variantById.get(line.variant_id) : undefined;
      let unitPriceCents: number;
      let optionSummary = line.option_summary;

      if (variant) {
        unitPriceCents = variant.price_cents;
        if (!optionSummary) optionSummary = summarizeConfiguration(configuration);
      } else {
        const priced = computeConfigurationPrice(
          {
            base_price_cents: product.base_price_cents,
            sale_price_cents: product.sale_price_cents,
            customization_schema: product.customization_schema,
          },
          configuration ?? {},
        );
        unitPriceCents = priced.unitPriceCents;
        optionSummary = priced.optionSummary;
      }

      const qty = line.quantity;
      const lineTotalCents = unitPriceCents * qty;
      subtotalCents += lineTotalCents;

      productDemand.set(product.id, (productDemand.get(product.id) ?? 0) + qty);
      if (line.variant_id) {
        variantDemand.set(line.variant_id, (variantDemand.get(line.variant_id) ?? 0) + qty);
      }

      drafts.push({
        product_id: product.id,
        variant_id: line.variant_id,
        seller_id: product.seller_id,
        store_id: product.store_id,
        title: variant ? `${product.name} — ${variant.name}` : product.name,
        sku: variant?.sku ?? product.sku,
        image_url: imageByProduct.get(product.id) ?? null,
        unit_price_cents: unitPriceCents,
        quantity: qty,
        configuration: line.configuration,
        option_summary: optionSummary,
        line_total_cents: lineTotalCents,
      });
    }

    // Inventory validation (aggregated per product / variant).
    for (const [productId, demand] of productDemand) {
      const product = joined.find((line) => line.products?.id === productId)?.products;
      if (!product || product.inventory_quantity < demand) {
        throw new CommerceError(
          "INSUFFICIENT_INVENTORY",
          `Insufficient inventory for product ${productId}`,
        );
      }
    }
    for (const [variantId, demand] of variantDemand) {
      const variant = variantById.get(variantId);
      if (!variant || variant.inventory_quantity < demand) {
        throw new CommerceError(
          "INSUFFICIENT_INVENTORY",
          `Insufficient inventory for variant ${variantId}`,
        );
      }
    }

    // Coupon validation + discount.
    let discountCents = 0;
    let couponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (input.couponCode) {
      const parsedCode = couponCodeSchema.safeParse(input.couponCode);
      if (!parsedCode.success) throw new CommerceError("INVALID_COUPON_CODE", "Invalid coupon code");
      const code = parsedCode.data.toUpperCase();
      const { data: coupon } = await db.from("coupons").select("*").eq("code", code).maybeSingle();
      if (!coupon) throw new CommerceError("COUPON_NOT_FOUND", `Coupon ${code} not found`);
      const c = coupon as CouponRow;
      const now = new Date();
      if (!c.active) throw new CommerceError("COUPON_INACTIVE", "Coupon is inactive");
      if (c.starts_at && now < new Date(c.starts_at)) {
        throw new CommerceError("COUPON_NOT_STARTED", "Coupon is not active yet");
      }
      if (c.ends_at && now > new Date(c.ends_at)) {
        throw new CommerceError("COUPON_EXPIRED", "Coupon has expired");
      }
      if (c.usage_limit !== null && c.used_count >= c.usage_limit) {
        throw new CommerceError("COUPON_LIMIT_REACHED", "Coupon usage limit reached");
      }
      if (c.min_order_cents !== null && subtotalCents < c.min_order_cents) {
        throw new CommerceError("COUPON_MIN_ORDER", `Minimum order of ${c.min_order_cents} cents required`);
      }
      if (input.userId && c.per_user_limit > 0) {
        const { count } = await db
          .from("coupon_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", c.id)
          .eq("user_id", input.userId);
        if ((count ?? 0) >= c.per_user_limit) {
          throw new CommerceError("COUPON_PER_USER_LIMIT", "Coupon already used by this account");
        }
      }
      const computed =
        c.discount_type === "fixed"
          ? c.discount_value
          : Math.round((subtotalCents * c.discount_value) / 100);
      discountCents = Math.max(0, Math.min(computed, subtotalCents));
      if (c.max_discount_cents !== null) {
        discountCents = Math.min(discountCents, c.max_discount_cents);
      }
      couponId = c.id;
      appliedCouponCode = code;
    }

    const grandTotalCents = subtotalCents - discountCents;

    // Insert order (retry on order_number collision).
    let orderNumber = generateOrderNumber();
    let orderInserted = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: order, error: orderError } = await db
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: input.userId,
          guest_email: input.userId ? null : email,
          status: "pending_payment",
          currency: "USD",
          items_subtotal_cents: subtotalCents,
          discounts_total_cents: discountCents,
          shipping_total_cents: 0,
          tax_total_cents: 0,
          grand_total_cents: grandTotalCents,
          coupon_code: appliedCouponCode,
          shipping_address: checkout.shippingAddress,
          billing_address: checkout.billingAddress ?? null,
          delivery_method: checkout.deliveryMethod,
          placed_at: new Date().toISOString(),
          metadata: input.metadata ?? null,
        })
        .select("id")
        .maybeSingle();
      if (order && !orderError) {
        ctx.orderId = order.id;
        orderInserted = true;
        break;
      }
      if (orderError && orderError.code === "23505") {
        orderNumber = generateOrderNumber();
        continue;
      }
      throw new CommerceError("ORDER_INSERT_FAILED", orderError?.message ?? "Failed to insert order");
    }
    if (!orderInserted || !ctx.orderId) {
      throw new CommerceError("ORDER_INSERT_FAILED", "Could not allocate a unique order number");
    }

    // Order item snapshots.
    const orderItems = drafts.map((draft) => ({ ...draft, order_id: ctx.orderId!, status: "confirmed" }));
    const { error: itemsError } = await db.from("order_items").insert(orderItems);
    if (itemsError) throw new CommerceError("ORDER_ITEMS_INSERT_FAILED", itemsError.message);

    // Initial status history.
    const { error: historyError } = await db.from("order_status_history").insert({
      order_id: ctx.orderId,
      from_status: null,
      to_status: "pending_payment",
      note: "Order created from checkout",
      changed_by: input.userId,
    });
    if (historyError) throw new CommerceError("ORDER_HISTORY_INSERT_FAILED", historyError.message);

    // Coupon redemption + usage increment.
    if (couponId && appliedCouponCode) {
      const { error: redemptionError } = await db.from("coupon_redemptions").insert({
        coupon_id: couponId,
        order_id: ctx.orderId,
        user_id: input.userId,
        amount_cents: discountCents,
      });
      if (redemptionError) throw new CommerceError("COUPON_REDEMPTION_FAILED", redemptionError.message);
      ctx.couponRedemptionInserted = true;

      const { data: freshCoupon } = await db
        .from("coupons")
        .select("used_count")
        .eq("id", couponId)
        .maybeSingle();
      const nextUsed = (freshCoupon?.used_count ?? 0) + 1;
      const { error: couponError } = await db
        .from("coupons")
        .update({ used_count: nextUsed })
        .eq("id", couponId);
      if (couponError) throw new CommerceError("COUPON_UPDATE_FAILED", couponError.message);
      ctx.couponIncremented = true;
    }

    // Decrement inventory (guarded updates).
    for (const [productId, demand] of productDemand) {
      const product = joined.find((line) => line.products?.id === productId)?.products;
      if (!product) continue;
      const { data: decremented, error: decrementError } = await db
        .from("products")
        .update({ inventory_quantity: product.inventory_quantity - demand })
        .eq("id", productId)
        .gte("inventory_quantity", demand)
        .select("id")
        .maybeSingle();
      if (decrementError || !decremented) {
        throw new CommerceError(
          "INVENTORY_DECREMENT_FAILED",
          decrementError?.message ?? "Inventory changed concurrently",
        );
      }
      ctx.decrementedProducts.set(productId, demand);
    }
    for (const [variantId, demand] of variantDemand) {
      const variant = variantById.get(variantId);
      if (!variant) continue;
      const { data: decremented, error: decrementError } = await db
        .from("product_variants")
        .update({ inventory_quantity: variant.inventory_quantity - demand })
        .eq("id", variantId)
        .gte("inventory_quantity", demand)
        .select("id")
        .maybeSingle();
      if (decrementError || !decremented) {
        throw new CommerceError(
          "INVENTORY_DECREMENT_FAILED",
          decrementError?.message ?? "Variant inventory changed concurrently",
        );
      }
      ctx.decrementedVariants.set(variantId, demand);
    }

    // Pending payment row (test provider; idempotency_key enforces replay).
    const { data: payment, error: paymentError } = await db
      .from("payments")
      .insert({
        order_id: ctx.orderId,
        user_id: input.userId,
        provider: "test",
        amount_cents: grandTotalCents,
        currency: "USD",
        status: "pending",
        idempotency_key: input.idempotencyKey,
      })
      .select("id")
      .maybeSingle();
    if (paymentError || !payment) {
      throw new CommerceError("PAYMENT_CREATE_FAILED", paymentError?.message ?? "Failed to create payment");
    }

    // Accrue commissions + ledger entries.
    await accrueCommissionsForOrder(ctx.orderId);

    // Customer notification.
    if (input.userId) {
      const { data: notification, error: notificationError } = await db
        .from("notifications")
        .insert({
          user_id: input.userId,
          type: "order_update",
          title: `Order ${orderNumber} placed`,
          body: `Your order total is ${formatCents(grandTotalCents)}.`,
          link: `/account/orders/${ctx.orderId}`,
        })
        .select("id")
        .maybeSingle();
      if (notificationError || !notification) {
        throw new CommerceError("NOTIFICATION_INSERT_FAILED", notificationError?.message ?? "Failed to create notification");
      }
      ctx.notificationIds.push(notification.id);
    }

    // Clear the cart last so a failed checkout never destroys the cart.
    await clearCart(input.cartId);

    return {
      orderId: ctx.orderId,
      orderNumber,
      grandTotalCents,
    };
  } catch (err) {
    await rollbackOrderCreation(db, ctx);
    if (err instanceof CommerceError) throw err;
    throw new CommerceError(
      "ORDER_CREATE_FAILED",
      err instanceof Error ? err.message : "Unknown error creating order",
      { cause: err },
    );
  }
}

/**
 * Transition an order's status: updates the order, records history, notifies
 * the customer (and sellers for shipped/delivered).
 */
export async function updateOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  note?: string,
  actorId?: string | null,
): Promise<UpdateOrderStatusResult> {
  if (!ORDER_STATUSES.includes(toStatus)) {
    throw new CommerceError("INVALID_STATUS", `Unsupported order status: ${toStatus}`);
  }

  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, user_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || error) throw new CommerceError("ORDER_NOT_FOUND", "Order not found");

  const o = order as { id: string; order_number: string; user_id: string | null; status: OrderStatus };
  if (o.status === toStatus) {
    return { id: o.id, orderNumber: o.order_number, status: o.status };
  }

  const { error: updateError } = await db
    .from("orders")
    .update({ status: toStatus })
    .eq("id", orderId);
  if (updateError) throw new CommerceError("ORDER_STATUS_UPDATE_FAILED", updateError.message);

  const { error: historyError } = await db.from("order_status_history").insert({
    order_id: orderId,
    from_status: o.status,
    to_status: toStatus,
    note: note ?? null,
    changed_by: actorId ?? null,
  });
  if (historyError) throw new CommerceError("ORDER_HISTORY_INSERT_FAILED", historyError.message);

  const label = toStatus.replaceAll("_", " ");
  if (o.user_id) {
    await safeNotify(db, {
      user_id: o.user_id,
      type: "order_update",
      title: `Order ${label}`,
      body: `Your order ${o.order_number} is now ${label}.`,
      link: `/account/orders/${orderId}`,
    });
  }
  if (toStatus === "shipped" || toStatus === "delivered") {
    const { data: sellerRows } = await db
      .from("order_items")
      .select("seller_id")
      .eq("order_id", orderId)
      .not("seller_id", "is", null);
    const sellerIds = [
      ...new Set((sellerRows ?? []).map((row) => (row as { seller_id: string }).seller_id)),
    ];
    for (const sellerId of sellerIds) {
      await safeNotify(db, {
        user_id: sellerId,
        type: "shipping_update",
        title: `Order ${label}`,
        body: `Order ${o.order_number} is now ${label}.`,
        link: `/seller/orders/${orderId}`,
      });
    }
  }

  return { id: orderId, orderNumber: o.order_number, status: toStatus };
}

/**
 * Customer-initiated cancellation. Only allowed from confirmed/processing.
 */
export async function requestCancellation(
  orderId: string,
  userId: string,
): Promise<UpdateOrderStatusResult> {
  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, user_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || error) throw new CommerceError("ORDER_NOT_FOUND", "Order not found");

  const o = order as { id: string; order_number: string; user_id: string | null; status: OrderStatus };
  if (o.user_id !== userId) {
    throw new CommerceError("FORBIDDEN", "You cannot cancel this order");
  }
  if (o.status !== "confirmed" && o.status !== "processing") {
    throw new CommerceError(
      "CANCELLATION_NOT_ALLOWED",
      "Only confirmed or processing orders can be cancelled",
    );
  }

  const { error: historyError } = await db.from("order_status_history").insert({
    order_id: orderId,
    from_status: o.status,
    to_status: "cancellation_requested",
    note: "Customer requested cancellation",
    changed_by: userId,
  });
  if (historyError) throw new CommerceError("ORDER_HISTORY_INSERT_FAILED", historyError.message);

  const { error: updateError } = await db
    .from("orders")
    .update({ status: "cancellation_requested" })
    .eq("id", orderId);
  if (updateError) throw new CommerceError("ORDER_STATUS_UPDATE_FAILED", updateError.message);

  await safeNotify(db, {
    user_id: userId,
    type: "order_update",
    title: "Cancellation requested",
    body: `Your cancellation request for order ${o.order_number} has been received.`,
    link: `/account/orders/${orderId}`,
  });

  return { id: orderId, orderNumber: o.order_number, status: "cancellation_requested" };
}

/**
 * Request a refund. Creates a refunds row with status 'requested'; admin
 * approval later marks it 'processed' and records reversal ledger entries.
 */
export async function refundOrder(
  orderId: string,
  amountCents: number,
  reason: string,
  actorId?: string | null,
): Promise<RefundResult> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new CommerceError("INVALID_REFUND_AMOUNT", "Refund amount must be a positive integer");
  }

  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, user_id, grand_total_cents")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || error) throw new CommerceError("ORDER_NOT_FOUND", "Order not found");
  if (amountCents > order.grand_total_cents) {
    throw new CommerceError("REFUND_EXCEEDS_TOTAL", "Refund amount exceeds order total");
  }

  const { data: payment } = await db
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: refund, error: refundError } = await db
    .from("refunds")
    .insert({
      order_id: orderId,
      payment_id: payment?.id ?? null,
      amount_cents: amountCents,
      reason: reason ?? null,
      status: "requested",
      requested_by: actorId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (refundError || !refund) {
    throw new CommerceError("REFUND_INSERT_FAILED", refundError?.message ?? "Failed to create refund");
  }

  if (order.user_id) {
    await safeNotify(db, {
      user_id: order.user_id,
      type: "refund_update",
      title: "Refund requested",
      body: `A refund of ${formatCents(amountCents)} has been requested for order ${order.order_number}.`,
      link: `/account/orders/${orderId}`,
    });
  }

  return { refundId: refund.id, status: "requested" };
}
