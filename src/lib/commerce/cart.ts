import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Cart domain errors. Typed, carries a stable machine `code`.
 */
export class CartError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CartError";
    this.code = code;
  }
}

export interface CartRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  configuration: Record<string, string> | null;
  option_summary: string | null;
  unit_price_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface AddToCartInput {
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity?: number;
  configuration?: Record<string, string> | null;
  optionSummary?: string | null;
  unitPriceCents: number;
}

/**
 * Deterministic option summary: "key:value | key:value" (keys sorted).
 * Must match the format produced by the pricing engine (cart_items/order_items snapshots).
 */
export function summarizeConfiguration(
  configuration: Record<string, string> | null | undefined,
): string | null {
  if (!configuration) return null;
  const keys = Object.keys(configuration).sort();
  if (keys.length === 0) return null;
  return keys.map((key) => `${key}:${configuration[key]}`).join(" | ");
}

/** Normalize arbitrary jsonb configuration into Record<string, string>. */
export function normalizeConfiguration(
  configuration: unknown,
): Record<string, string> | null {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(configuration as Record<string, unknown>)) {
    out[key] = String(value);
  }
  return out;
}

/**
 * Return the cart for a user (user_id unique) or a guest session (session_id).
 * Creates the cart when missing.
 */
export async function getOrCreateCart(
  userId: string | null,
  sessionId?: string,
): Promise<CartRow> {
  const db = createServiceClient();

  if (userId) {
    const { data: existing } = await db
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return existing as CartRow;

    const { data: created, error } = await db
      .from("carts")
      .insert({ user_id: userId })
      .select("*")
      .maybeSingle();
    if (created && !error) return created as CartRow;

    // Race: another writer may have created the cart between read and insert.
    const { data: again } = await db
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (again) return again as CartRow;

    throw new CartError("CART_CREATE_FAILED", error?.message ?? "Failed to create cart");
  }

  if (!sessionId) {
    throw new CartError(
      "CART_ORIGIN_REQUIRED",
      "Either userId or sessionId is required to resolve a cart",
    );
  }

  const { data: existing } = await db
    .from("carts")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (existing && existing.length > 0) return existing[0] as CartRow;

  const { data: created, error } = await db
    .from("carts")
    .insert({ session_id: sessionId })
    .select("*")
    .maybeSingle();
  if (!created || error) {
    throw new CartError("CART_CREATE_FAILED", error?.message ?? "Failed to create cart");
  }
  return created as CartRow;
}

/**
 * Add (or merge) a line into a cart. Merge key matches the cart_items unique
 * constraint (cart_id, product_id, variant_id, option_summary): existing lines
 * have their quantity incremented instead of creating a duplicate.
 */
export async function addToCart(input: AddToCartInput): Promise<void> {
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new CartError("INVALID_QUANTITY", "Quantity must be a positive integer");
  }

  const db = createServiceClient();
  const variantId = input.variantId ?? null;
  const configuration = normalizeConfiguration(input.configuration);
  const optionSummary = input.optionSummary ?? summarizeConfiguration(configuration);

  const { data: existing } = await db
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", input.cartId)
    .eq("product_id", input.productId)
    .eq("variant_id", variantId)
    .eq("option_summary", optionSummary)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("cart_items")
      .update({
        quantity: existing.quantity + quantity,
        unit_price_cents: input.unitPriceCents,
        configuration,
      })
      .eq("id", existing.id);
    if (error) throw new CartError("ADD_TO_CART_FAILED", error.message);
    return;
  }

  const { error } = await db.from("cart_items").insert({
    cart_id: input.cartId,
    product_id: input.productId,
    variant_id: variantId,
    quantity,
    configuration,
    option_summary: optionSummary,
    unit_price_cents: input.unitPriceCents,
    currency: "USD",
  });
  if (error) throw new CartError("ADD_TO_CART_FAILED", error.message);
}

/** Update the quantity of a single cart line (positive integer). */
export async function updateCartItemQty(cartItemId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new CartError("INVALID_QUANTITY", "Quantity must be a positive integer");
  }
  const db = createServiceClient();
  const { data, error } = await db
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new CartError("CART_ITEM_NOT_FOUND", error?.message ?? "Cart item not found");
  }
}

/** Remove a cart line. */
export async function removeCartItem(cartItemId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("cart_items").delete().eq("id", cartItemId);
  if (error) throw new CartError("REMOVE_CART_ITEM_FAILED", error.message);
}

/** Delete all lines in a cart (keeps the cart row). */
export async function clearCart(cartId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("cart_items").delete().eq("cart_id", cartId);
  if (error) throw new CartError("CLEAR_CART_FAILED", error.message);
}

/** List cart lines (used by checkout to re-read the cart server-side). */
export async function getCartItems(cartId: string): Promise<CartItemRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });
  if (error) throw new CartError("CART_READ_FAILED", error.message);
  return (data ?? []) as CartItemRow[];
}

/**
 * Merge a guest session cart into the user's cart. Matching lines (per the
 * cart_items unique key) have their quantities combined; non-matching lines are
 * copied. The guest cart(s) are then removed.
 */
export async function mergeGuestCart(
  guestSessionId: string,
  userId: string,
): Promise<{ cartId: string }> {
  const db = createServiceClient();

  const { data: guestCarts } = await db
    .from("carts")
    .select("id")
    .eq("session_id", guestSessionId)
    .order("created_at", { ascending: true })
    .limit(1);

  const userCart = await getOrCreateCart(userId);
  if (!guestCarts || guestCarts.length === 0) return { cartId: userCart.id };

  const guestCartId = (guestCarts[0] as { id: string }).id;
  const { data: guestItems } = await db
    .from("cart_items")
    .select("*")
    .eq("cart_id", guestCartId);

  if (guestItems && guestItems.length > 0) {
    for (const item of guestItems as CartItemRow[]) {
      await addToCart({
        cartId: userCart.id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        configuration: item.configuration ?? undefined,
        optionSummary: item.option_summary,
        unitPriceCents: item.unit_price_cents,
      });
    }
  }

  const { error } = await db.from("carts").delete().eq("session_id", guestSessionId);
  if (error) throw new CartError("MERGE_GUEST_CART_FAILED", error.message);
  return { cartId: userCart.id };
}
