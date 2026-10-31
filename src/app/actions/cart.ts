"use server";

import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  getOrCreateCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
  type CartRow,
} from "@/lib/commerce/cart";
import { computeConfigurationPrice, PricingValidationError } from "@/lib/pricing";

export interface CartLineView {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
  optionSummary: string | null;
  configuration: Record<string, string> | null;
  lineTotalCents: number;
}

export interface CartState {
  cartId: string;
  items: CartLineView[];
  count: number;
  subtotalCents: number;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  customization_schema: unknown;
  inventory_quantity: number;
}

async function readCartState(cart: CartRow): Promise<CartState> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("cart_items")
    .select("id, product_id, quantity, configuration, option_summary, unit_price_cents")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const raw = (data ?? []) as {
    id: string;
    product_id: string;
    quantity: number;
    configuration: Record<string, string> | null;
    option_summary: string | null;
    unit_price_cents: number;
  }[];

  const productIds = [...new Set(raw.map((line) => line.product_id))];
  const { data: products } = await db
    .from("products")
    .select("id, name, slug, base_price_cents, sale_price_cents, customization_schema, inventory_quantity")
    .in("id", productIds);

  const { data: images } = await db
    .from("product_images")
    .select("product_id, url, position")
    .in("product_id", productIds)
    .order("position", { ascending: true });

  const productById = new Map<string, ProductRow>((products ?? []).map((p) => [p.id, p as ProductRow]));
  const firstImageByProduct = new Map<string, string>();
  for (const image of (images ?? []) as { product_id: string; url: string }[]) {
    if (!firstImageByProduct.has(image.product_id)) firstImageByProduct.set(image.product_id, image.url);
  }

  const items: CartLineView[] = raw.map((line) => {
    const product = productById.get(line.product_id);
    return {
      id: line.id,
      productId: line.product_id,
      productName: product?.name ?? "Product",
      productSlug: product?.slug ?? "",
      imageUrl: firstImageByProduct.get(line.product_id) ?? null,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      optionSummary: line.option_summary,
      configuration: line.configuration,
      lineTotalCents: line.unit_price_cents * line.quantity,
    };
  });

  return {
    cartId: cart.id,
    items,
    count: items.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: items.reduce((sum, line) => sum + line.lineTotalCents, 0),
  };
}

async function resolveCart(sessionId?: string | null): Promise<CartRow> {
  const user = await getUser();
  if (user) return getOrCreateCart(user.id);
  return getOrCreateCart(null, sessionId ?? undefined);
}

export async function getCartState(sessionId?: string | null): Promise<CartState> {
  const cart = await resolveCart(sessionId);
  return readCartState(cart);
}

export async function addItemToCart(input: {
  productId: string;
  quantity?: number;
  configuration?: Record<string, string> | null;
  sessionId?: string | null;
}): Promise<CartState> {
  const quantity = Math.max(1, input.quantity ?? 1);
  const cart = await resolveCart(input.sessionId);

  const db = createServiceClient();
  const { data: product, error } = await db
    .from("products")
    .select("id, name, slug, base_price_cents, sale_price_cents, customization_schema, inventory_quantity")
    .eq("id", input.productId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !product) throw new Error("Product not found or unavailable");

  const row = product as ProductRow;

  let unitPriceCents: number;
  let optionSummary: string | null = null;
  const configuration = input.configuration ?? null;

  try {
    const priced = computeConfigurationPrice(
      {
        base_price_cents: row.base_price_cents,
        sale_price_cents: row.sale_price_cents,
        customization_schema: row.customization_schema as never,
      },
      configuration ?? {},
    );
    unitPriceCents = priced.unitPriceCents;
    optionSummary = priced.optionSummary || null;
  } catch (err) {
    if (err instanceof PricingValidationError) {
      throw new Error(err.errors.join("; "));
    }
    throw err;
  }

  if (row.inventory_quantity < quantity) {
    throw new Error("Insufficient inventory for the selected quantity");
  }

  await addToCart({
    cartId: cart.id,
    productId: input.productId,
    quantity,
    configuration,
    optionSummary,
    unitPriceCents,
  });

  return readCartState(cart);
}

export async function updateCartItemQtyAction(input: { itemId: string; quantity: number; sessionId?: string | null }): Promise<CartState> {
  const cart = await resolveCart(input.sessionId);
  await updateCartItemQty(input.itemId, Math.max(1, Math.floor(input.quantity)));
  return readCartState(cart);
}

export async function removeCartItemAction(input: { itemId: string; sessionId?: string | null }): Promise<CartState> {
  const cart = await resolveCart(input.sessionId);
  await removeCartItem(input.itemId);
  return readCartState(cart);
}
