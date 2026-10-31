"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { productDraftSchema } from "@/lib/validation";
import { updateOrderStatus, type OrderStatus } from "@/lib/commerce/orders";
import { requestPayout, LedgerError } from "@/lib/ledger";
import { slugify } from "@/lib/utils";
import { type ActionResult, writeAudit } from "./admin";

/** Shape returned by every seller server action (mirrors admin). */
export type { ActionResult };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function emptyToNull(value: unknown): unknown {
  return value === "" || value == null ? null : value;
}

function joinIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/** Best-effort in-app notification (never fails the primary operation). */
async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  const db = createServiceClient();
  await db.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface SellerProfileRow {
  id: string;
  user_id: string;
  business_name: string;
  legal_name: string | null;
  contact_email: string | null;
  phone: string | null;
  country: string | null;
  address: Record<string, unknown> | null;
  tax_id: string | null;
  status: string;
  verification_documents: unknown[];
  agreed_to_terms: boolean;
  agreed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerStoreRow {
  id: string;
  seller_profile_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: string;
  platform_commission_rate: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface SellerContext {
  profile: SellerProfileRow | null;
  store: SellerStoreRow | null;
  status: string;
}

/** Resolve the current seller's profile + store (seller_profiles by user_id; stores by seller_profile_id). */
export async function getSellerContext(): Promise<SellerContext> {
  await requireRole(["seller"]);
  const user = await getUser();
  if (!user) return { profile: null, store: null, status: "none" };

  const db = createServiceClient();
  const { data: sp } = await db
    .from("seller_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = (sp as SellerProfileRow | null) ?? null;

  let store: SellerStoreRow | null = null;
  if (profile) {
    const { data: st } = await db
      .from("stores")
      .select("*")
      .eq("seller_profile_id", profile.id)
      .maybeSingle();
    store = (st as SellerStoreRow | null) ?? null;
  }

  return { profile, store, status: profile?.status ?? "none" };
}

async function requireSellerStore(): Promise<{
  sellerId: string;
  sellerProfileId: string;
  store: SellerStoreRow;
} | null> {
  const user = await getUser();
  if (!user) return null;
  const db = createServiceClient();
  const { data: sp } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sp) return null;
  const { data: store } = await db
    .from("stores")
    .select("*")
    .eq("seller_profile_id", (sp as { id: string }).id)
    .maybeSingle();
  if (!store) return null;
  return {
    sellerId: user.id,
    sellerProfileId: (sp as { id: string }).id,
    store: store as SellerStoreRow,
  };
}

// ---------------------------------------------------------------------------
// Onboarding / profile
// ---------------------------------------------------------------------------

const sellerOnboardingSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  legal_name: z.string().trim().max(200).optional(),
  contact_email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().length(2).default("US"),
  tax_id: z.string().trim().max(60).optional(),
});

/** Submit (or re-submit) a seller application. */
export async function requestSellerOnboarding(formData: FormData): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const parsed = sellerOnboardingSchema.safeParse({
      business_name: formText(formData, "business_name"),
      legal_name: formText(formData, "legal_name"),
      contact_email: formText(formData, "contact_email"),
      phone: formText(formData, "phone"),
      country: formText(formData, "country") ?? "US",
      tax_id: formText(formData, "tax_id"),
    });
    if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const db = createServiceClient();
    const { data: existing } = await db
      .from("seller_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const approved = existing?.status === "approved";
    const payload = {
      business_name: parsed.data.business_name,
      legal_name: parsed.data.legal_name || null,
      contact_email: parsed.data.contact_email,
      phone: parsed.data.phone || null,
      country: parsed.data.country,
      tax_id: parsed.data.tax_id || null,
      status: approved ? "approved" : "submitted",
      agreed_to_terms: true,
      agreed_at: new Date().toISOString(),
    };

    let sellerProfileId: string;
    if (existing) {
      sellerProfileId = (existing as { id: string }).id;
      const { error } = await db
        .from("seller_profiles")
        .update(payload)
        .eq("id", sellerProfileId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: created, error } = await db
        .from("seller_profiles")
        .insert({ user_id: user.id, ...payload })
        .select("id")
        .maybeSingle();
      if (error || !created) return { ok: false, error: error?.message ?? "Failed to create seller profile" };
      sellerProfileId = (created as { id: string }).id;
    }

    await writeAudit({
      action: "seller.onboarding.submit",
      entityType: "seller_profiles",
      entityId: sellerProfileId,
      after: payload,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const sellerProfileSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  legal_name: z.string().trim().max(200).nullable().optional(),
  contact_email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().max(3).nullable().optional(),
  tax_id: z.string().trim().max(60).nullable().optional(),
});

/** Update the seller's contact/business profile. */
export async function updateSellerProfile(formData: FormData): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const parsed = sellerProfileSchema.safeParse({
      business_name: formText(formData, "business_name"),
      legal_name: emptyToNull(formText(formData, "legal_name")),
      contact_email: emptyToNull(formText(formData, "contact_email")),
      phone: emptyToNull(formText(formData, "phone")),
      country: emptyToNull(formText(formData, "country")),
      tax_id: emptyToNull(formText(formData, "tax_id")),
    });
    if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const db = createServiceClient();
    const { data: existing } = await db
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Seller profile not found" };

    const { error } = await db
      .from("seller_profiles")
      .update(parsed.data)
      .eq("id", (existing as { id: string }).id);
    if (error) return { ok: false, error: error.message };

    await writeAudit({
      action: "seller.profile.update",
      entityType: "seller_profiles",
      entityId: (existing as { id: string }).id,
      after: parsed.data,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Store settings
// ---------------------------------------------------------------------------

const storeSettingsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  logo_url: z.string().trim().max(2000).optional(),
});

/** Update the seller's store (name/slug/description/logo_url). */
export async function saveStoreSettings(formData: FormData): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const parsed = storeSettingsSchema.safeParse({
      name: formText(formData, "name"),
      slug: formText(formData, "slug"),
      description: formText(formData, "description"),
      logo_url: formText(formData, "logo_url"),
    });
    if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

    const ctx = await requireSellerStore();
    if (!ctx) return { ok: false, error: "Seller store not found" };

    const slug = parsed.data.slug || slugify(parsed.data.name);
    const db = createServiceClient();
    const { data: clash } = await db
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .neq("id", ctx.store.id)
      .maybeSingle();
    if (clash) return { ok: false, error: "That store slug is already taken" };

    const { error } = await db
      .from("stores")
      .update({
        name: parsed.data.name,
        slug,
        description: parsed.data.description?.trim() || null,
        logo_url: parsed.data.logo_url?.trim() || null,
      })
      .eq("id", ctx.store.id);
    if (error) return { ok: false, error: error.message };

    await writeAudit({
      action: "seller.store.update",
      entityType: "stores",
      entityId: ctx.store.id,
      after: { name: parsed.data.name, slug },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface SellerProductView {
  id: string;
  name: string;
  slug: string;
  status: string;
  basePriceCents: number;
  salePriceCents: number | null;
  inventoryQuantity: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List the current seller's products with their first image. */
export async function listSellerProducts(): Promise<SellerProductView[]> {
  await requireRole(["seller"]);
  const user = await getUser();
  if (!user) throw new Error("Please sign in.");

  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select("id, name, slug, status, base_price_cents, sale_price_cents, inventory_quantity, created_at, updated_at, product_images(url, alt_text, position)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];

  const rows = (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    status: string;
    base_price_cents: number;
    sale_price_cents: number | null;
    inventory_quantity: number;
    created_at: string;
    updated_at: string;
    product_images: { url: string; alt_text: string | null; position: number }[];
  }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    basePriceCents: row.base_price_cents,
    salePriceCents: row.sale_price_cents,
    inventoryQuantity: row.inventory_quantity,
    imageUrl: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function collectProductDraftRaw(formData: FormData): Record<string, unknown> {
  const numberValue = (key: string): unknown => {
    const value = formData.get(key);
    if (value === null || value === "") return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  };
  const stringArray = (key: string): string[] => {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    } catch {
      // fall through to CSV split
    }
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  };
  const jsonValue = (key: string): unknown => {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim()) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  };

  return {
    name: formText(formData, "name"),
    slug: formText(formData, "slug"),
    description: formText(formData, "description"),
    sku: formText(formData, "sku"),
    type: formText(formData, "type") ?? "standard",
    base_price_cents: numberValue("base_price_cents"),
    sale_price_cents: numberValue("sale_price_cents"),
    currency: formText(formData, "currency") ?? "USD",
    category_id: formText(formData, "category_id"),
    collection_id: formText(formData, "collection_id"),
    brand_id: formText(formData, "brand_id"),
    dimensions: jsonValue("dimensions"),
    weight_grams: numberValue("weight_grams"),
    materials: stringArray("materials"),
    colors: stringArray("colors"),
    inventory_quantity: numberValue("inventory_quantity") ?? 0,
    low_stock_threshold: numberValue("low_stock_threshold") ?? 5,
    customization_schema: jsonValue("customization_schema"),
    model_url: formText(formData, "model_url"),
    model_preview_url: formText(formData, "model_preview_url"),
    metadata: jsonValue("metadata"),
  };
}

async function uniqueProductSlug(db: SupabaseClient, base: string): Promise<string> {
  const desired = slugify(base) || "product";
  let slug = desired;
  let i = 2;
  for (;;) {
    const { data } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${desired}-${i++}`;
  }
}

export type CreateProductResult = { ok: true; productId: string } | { ok: false; error: string };

/** Create a draft product for the current seller's store. */
export async function createProductDraft(formData: FormData): Promise<CreateProductResult> {
  await requireRole(["seller"]);
  try {
    const raw = collectProductDraftRaw(formData);
    const parsed = productDraftSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

    const ctx = await requireSellerStore();
    if (!ctx) return { ok: false, error: "Seller store not found" };

    const db = createServiceClient();
    const slug = await uniqueProductSlug(db, parsed.data.slug || parsed.data.name);
    const { data: created, error } = await db
      .from("products")
      .insert({ ...parsed.data, slug, seller_id: ctx.sellerId, store_id: ctx.store.id, status: "draft" })
      .select("id")
      .maybeSingle();
    if (error || !created) return { ok: false, error: error?.message ?? "Failed to create product" };

    const productId = (created as { id: string }).id;
    await writeAudit({
      action: "seller.product.create_draft",
      entityType: "products",
      entityId: productId,
      after: { name: parsed.data.name, status: "draft" },
    });
    return { ok: true, productId };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Update an existing draft product (ownership + draft-only enforced). */
export async function updateProductDraft(productId: string, formData: FormData): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const raw = collectProductDraftRaw(formData);
    const parsed = productDraftSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: joinIssues(parsed.error) };

    const db = createServiceClient();
    const { data: product } = await db
      .from("products")
      .select("id, status, seller_id, slug")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { ok: false, error: "Product not found" };
    const p = product as { id: string; status: string; seller_id: string; slug: string };
    if (p.seller_id !== user.id) return { ok: false, error: "This product does not belong to your store" };
    if (p.status !== "draft") return { ok: false, error: "Only draft products can be edited" };

    const payload: Record<string, unknown> = { ...parsed.data };
    const requestedSlug = String(raw.slug ?? "").trim();
    if (requestedSlug && requestedSlug !== p.slug) {
      payload.slug = await uniqueProductSlug(db, requestedSlug);
    } else {
      delete payload.slug;
    }

    const { error } = await db.from("products").update(payload).eq("id", productId);
    if (error) return { ok: false, error: error.message };

    await writeAudit({
      action: "seller.product.update_draft",
      entityType: "products",
      entityId: productId,
      after: { name: parsed.data.name },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Submit a draft product for moderation (pending_review). */
export async function submitProductForReview(productId: string): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const db = createServiceClient();
    const { data: product } = await db
      .from("products")
      .select("id, status, seller_id")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { ok: false, error: "Product not found" };
    const p = product as { id: string; status: string; seller_id: string };
    if (p.seller_id !== user.id) return { ok: false, error: "This product does not belong to your store" };
    if (p.status !== "draft") return { ok: false, error: "Only draft products can be submitted for review" };

    const { error } = await db
      .from("products")
      .update({ status: "pending_review" })
      .eq("id", productId);
    if (error) return { ok: false, error: error.message };

    await writeAudit({
      action: "seller.product.submit_review",
      entityType: "products",
      entityId: productId,
      before: { status: "draft" },
      after: { status: "pending_review" },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export interface SellerOrderItemView {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  status: string;
}

export interface SellerOrderView {
  id: string;
  orderNumber: string;
  status: string;
  grandTotalCents: number;
  placedAt: string | null;
  createdAt: string;
  customer: { email: string | null; fullName: string | null } | null;
  items: SellerOrderItemView[];
}

/** List orders that contain at least one of the current seller's items. */
export async function listSellerOrders(): Promise<SellerOrderView[]> {
  await requireRole(["seller"]);
  const user = await getUser();
  if (!user) throw new Error("Please sign in.");

  const db = createServiceClient();
  const { data: itemRows, error: itemsError } = await db
    .from("order_items")
    .select("id, order_id, product_id, title, image_url, unit_price_cents, quantity, line_total_cents, status")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (itemsError) return [];

  const items = (itemRows ?? []) as {
    id: string;
    order_id: string;
    product_id: string;
    title: string;
    image_url: string | null;
    unit_price_cents: number;
    quantity: number;
    line_total_cents: number;
    status: string;
  }[];
  if (items.length === 0) return [];

  const orderIds = [...new Set(items.map((item) => item.order_id))];
  const { data: orderRows } = await db
    .from("orders")
    .select("id, order_number, status, grand_total_cents, placed_at, created_at, guest_email, profiles(email, full_name)")
    .in("id", orderIds);

  const orders = (orderRows ?? []) as {
    id: string;
    order_number: string;
    status: string;
    grand_total_cents: number;
    placed_at: string | null;
    created_at: string;
    guest_email: string | null;
    profiles:
      | { email: string | null; full_name: string | null }
      | { email: string | null; full_name: string | null }[]
      | null;
  }[];

  const views: SellerOrderView[] = orders.map((order) => {
    const owner = Array.isArray(order.profiles) ? order.profiles[0] ?? null : order.profiles;
    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      grandTotalCents: order.grand_total_cents,
      placedAt: order.placed_at,
      createdAt: order.created_at,
      customer: owner
        ? { email: owner.email, fullName: owner.full_name }
        : { email: order.guest_email, fullName: null },
      items: items
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          id: item.id,
          productId: item.product_id,
          title: item.title,
          imageUrl: item.image_url,
          unitPriceCents: item.unit_price_cents,
          quantity: item.quantity,
          lineTotalCents: item.line_total_cents,
          status: item.status,
        })),
    };
  });

  return views.sort((a, b) => (b.placedAt ?? b.createdAt).localeCompare(a.placedAt ?? a.createdAt));
}

const SELLER_ITEM_STATUSES = [
  "confirmed",
  "processing",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

/** Update an order item's fulfillment status; advances the order + writes history via updateOrderStatus. */
export async function updateOrderItemStatus(orderItemId: string, status: string, note?: string): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    if (!(SELLER_ITEM_STATUSES as readonly string[]).includes(status)) {
      return { ok: false, error: `Unsupported item status: ${status}` };
    }

    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const db = createServiceClient();
    const { data: item } = await db
      .from("order_items")
      .select("id, order_id, title, status, seller_id")
      .eq("id", orderItemId)
      .maybeSingle();
    if (!item) return { ok: false, error: "Order item not found" };
    const it = item as { id: string; order_id: string; title: string; status: string; seller_id: string };
    if (it.seller_id !== user.id) return { ok: false, error: "This item does not belong to your store" };
    if (it.status === status) return { ok: true };

    const { error: itemError } = await db
      .from("order_items")
      .update({ status })
      .eq("id", orderItemId);
    if (itemError) return { ok: false, error: itemError.message };

    const noteText = note?.trim() || `Item “${it.title}” marked ${status.replaceAll("_", " ")}`;
    await updateOrderStatus(it.order_id, status as OrderStatus, noteText, user.id);

    await writeAudit({
      action: "seller.order_item.status.update",
      entityType: "order_items",
      entityId: orderItemId,
      before: { status: it.status },
      after: { status, note: note?.trim() ?? null },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export interface SellerPayoutView {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  note: string | null;
  reference: string | null;
  createdAt: string;
}

/** Request a payout against the seller's available ledger balance. */
export async function requestSellerPayout(formData: FormData): Promise<ActionResult> {
  await requireRole(["seller"]);
  try {
    const amountStr = formText(formData, "amount");
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Enter a valid payout amount" };
    }
    const amountCents = Math.round(amount * 100);
    const periodStart = formText(formData, "period_start") || null;
    const periodEnd = formText(formData, "period_end") || null;

    const user = await getUser();
    if (!user) return { ok: false, error: "Please sign in." };

    const db = createServiceClient();
    const { data: sp } = await db
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!sp) return { ok: false, error: "Seller profile not found" };
    const { data: store } = await db
      .from("stores")
      .select("id")
      .eq("seller_profile_id", (sp as { id: string }).id)
      .maybeSingle();
    if (!store) return { ok: false, error: "Store not found" };

    await requestPayout(user.id, (store as { id: string }).id, amountCents, {
      start: periodStart,
      end: periodEnd,
    });

    await writeAudit({
      action: "seller.payout.request",
      entityType: "payouts",
      after: { amount_cents: amountCents, period_start: periodStart, period_end: periodEnd },
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof LedgerError) return { ok: false, error: err.message };
    return { ok: false, error: errorMessage(err) };
  }
}

/** List the current seller's payout requests. */
export async function listSellerPayouts(): Promise<SellerPayoutView[]> {
  await requireRole(["seller"]);
  const user = await getUser();
  if (!user) throw new Error("Please sign in.");

  const db = createServiceClient();
  const { data, error } = await db
    .from("payouts")
    .select("id, amount_cents, currency, status, period_start, period_end, note, reference, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    note: row.note,
    reference: row.reference,
    createdAt: row.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface SellerAnalytics {
  revenueCents: number;
  ordersCount: number;
  pendingProducts: number;
  averageOrderValueCents: number;
  topProducts: {
    productId: string;
    title: string;
    imageUrl: string | null;
    units: number;
    revenueCents: number;
  }[];
}

/** Seller dashboard metrics: revenue (line totals), orders, pending products, AOV, top products. */
export async function getSellerAnalytics(): Promise<SellerAnalytics> {
  await requireRole(["seller"]);
  const user = await getUser();
  if (!user) throw new Error("Please sign in.");

  const db = createServiceClient();
  const [{ data: itemRows }, { count: pendingProducts }] = await Promise.all([
    db
      .from("order_items")
      .select("id, order_id, product_id, title, image_url, quantity, line_total_cents, orders(id, status)")
      .eq("seller_id", user.id),
    db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "pending_review"),
  ]);

  const items = (itemRows ?? []) as {
    id: string;
    order_id: string;
    product_id: string;
    title: string;
    image_url: string | null;
    quantity: number;
    line_total_cents: number;
    orders: { id: string; status: string } | null;
  }[];

  const EXCLUDED = new Set(["cancelled", "refunded"]);
  const qualifying = items.filter((item) => item.orders && !EXCLUDED.has(item.orders.status));

  const revenueCents = qualifying.reduce((sum, item) => sum + item.line_total_cents, 0);
  const orderIds = new Set(qualifying.map((item) => item.order_id));
  const ordersCount = orderIds.size;
  const averageOrderValueCents = ordersCount ? Math.round(revenueCents / ordersCount) : 0;

  const top = new Map<string, { productId: string; title: string; imageUrl: string | null; units: number; revenueCents: number }>();
  for (const item of qualifying) {
    const existing = top.get(item.product_id);
    if (existing) {
      existing.units += item.quantity;
      existing.revenueCents += item.line_total_cents;
    } else {
      top.set(item.product_id, {
        productId: item.product_id,
        title: item.title,
        imageUrl: item.image_url,
        units: item.quantity,
        revenueCents: item.line_total_cents,
      });
    }
  }
  const topProducts = [...top.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5);

  return {
    revenueCents,
    ordersCount,
    pendingProducts: pendingProducts ?? 0,
    averageOrderValueCents,
    topProducts,
  };
}
