"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireRole, getUserRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  updateOrderStatus,
  refundOrder,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/commerce/orders";
import { recordLedgerEntry, computeCommission } from "@/lib/ledger";
import { sendEmail } from "@/lib/email";
import { slugify } from "@/lib/utils";

/** Shape returned by every admin server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export interface AdminActor {
  id: string | null;
  role: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function getActor(): Promise<AdminActor> {
  const user = await getUser();
  const role = await getUserRole();
  return { id: user?.id ?? null, role };
}

/**
 * Append an immutable audit log row. Used by every sensitive admin action.
 */
export async function writeAudit(input: {
  action: string;
  entityType?: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  actor?: AdminActor;
}): Promise<void> {
  const actor = input.actor ?? (await getActor());
  const db = createServiceClient();
  await db.from("audit_logs").insert({
    actor_id: actor.id,
    actor_role: actor.role,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
  });
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

/** Best-effort email (console provider by default). */
async function mailUser(input: {
  to: string;
  subject: string;
  text: string;
  template?: string;
}): Promise<void> {
  try {
    await sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      template: input.template ?? undefined,
    });
  } catch {
    // best effort
  }
}

function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function noteValue(value: string | FormData | undefined): string {
  if (value instanceof FormData) return formText(value, "reason") ?? "";
  return value ?? "";
}

function emptyToNull(value: unknown): unknown {
  return value === "" || value == null ? null : value;
}

/** Normalize a form date input ("YYYY-MM-DD") to an ISO timestamp string. */
function dateToIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return value;
}

/**
 * Update a user's role (promote/demote). Protects the last admin and prevents
 * admins from changing their own role.
 */
export async function updateUserRole(userId: string, role: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    if (!["customer", "seller", "admin"].includes(role)) {
      return { ok: false, error: "Invalid role" };
    }
    if (actor.id === userId) {
      return { ok: false, error: "You cannot change your own role" };
    }

    const db = createServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return { ok: false, error: "User not found" };

    const prevRole = (profile as { role: string }).role;
    if (prevRole === role) return { ok: true };

    if (prevRole === "admin" && role !== "admin") {
      const { count } = await db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Cannot demote the last admin" };
      }
    }

    const { error: profileError } = await db
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (profileError) return { ok: false, error: profileError.message };

    await db.from("user_roles").delete().eq("user_id", userId);
    await db.from("user_roles").insert({ user_id: userId, role });

    await writeAudit({
      action: "user.role.update",
      entityType: "profiles",
      entityId: userId,
      before: { role: prevRole },
      after: { role },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Approve or reject a seller application; activates the store on approval. */
export async function reviewSeller(
  sellerProfileId: string,
  decision: "approved" | "rejected",
  note?: string | FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const reason = noteValue(note).trim();
    const db = createServiceClient();

    const { data: sp } = await db
      .from("seller_profiles")
      .select("id, user_id, business_name, contact_email, status")
      .eq("id", sellerProfileId)
      .maybeSingle();
    if (!sp) return { ok: false, error: "Seller profile not found" };
    const seller = sp as { id: string; user_id: string; business_name: string; contact_email: string | null; status: string };

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name")
      .eq("id", seller.user_id)
      .maybeSingle();
    const { data: store } = await db
      .from("stores")
      .select("id, name, status")
      .eq("seller_profile_id", sellerProfileId)
      .maybeSingle();

    const payload: Record<string, unknown> = { status: decision };
    if (decision === "rejected") payload.rejection_reason = reason || null;
    const { error: updateError } = await db
      .from("seller_profiles")
      .update(payload)
      .eq("id", sellerProfileId);
    if (updateError) return { ok: false, error: updateError.message };

    if (decision === "approved" && store) {
      const { error: storeError } = await db
        .from("stores")
        .update({ status: "active" })
        .eq("id", (store as { id: string }).id);
      if (storeError) return { ok: false, error: storeError.message };
    }

    const to = (profile as { email?: string | null } | null)?.email ?? seller.contact_email;
    if (to) {
      await mailUser({
        to,
        subject: decision === "approved" ? "Your store is approved" : "Store application not approved",
        text:
          decision === "approved"
            ? `Congratulations — ${seller.business_name} is now live on ATELIER 3D.`
            : `We could not approve ${seller.business_name} at this time.${reason ? ` Reason: ${reason}` : ""}`,
        template: "seller_approval",
      });
    }

    await notifyUser({
      userId: seller.user_id,
      type: "seller_approval",
      title: decision === "approved" ? "Store approved" : "Store not approved",
      body:
        decision === "approved"
          ? `${seller.business_name} is live. You can now manage products and orders.`
          : `${seller.business_name} was not approved.${reason ? ` Reason: ${reason}` : ""}`,
      link: "/seller",
    });

    await writeAudit({
      action: `seller.review.${decision}`,
      entityType: "seller_profiles",
      entityId: sellerProfileId,
      after: { decision, reason },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Approve or reject a product submitted for moderation. */
export async function reviewProduct(
  productId: string,
  decision: "approved" | "rejected",
  note?: string | FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const reason = noteValue(note).trim();
    const db = createServiceClient();

    const { data: product } = await db
      .from("products")
      .select("id, name, slug, seller_id, store_id, status")
      .eq("id", productId)
      .maybeSingle();
    if (!product) return { ok: false, error: "Product not found" };
    const p = product as { id: string; name: string; seller_id: string; status: string };

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name")
      .eq("id", p.seller_id)
      .maybeSingle();

    const payload: Record<string, unknown> = { status: decision };
    if (decision === "rejected") {
      payload.metadata = { rejection_reason: reason || null };
    }
    const { error: updateError } = await db
      .from("products")
      .update(payload)
      .eq("id", productId);
    if (updateError) return { ok: false, error: updateError.message };

    const to = (profile as { email?: string | null } | null)?.email;
    if (to) {
      await mailUser({
        to,
        subject: decision === "approved" ? "Your product is live" : "Product not approved",
        text:
          decision === "approved"
            ? `${p.name} is now live on ATELIER 3D.`
            : `${p.name} was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        template: "product_approval",
      });
    }

    await notifyUser({
      userId: p.seller_id,
      type: "product_approval",
      title: decision === "approved" ? "Product approved" : "Product not approved",
      body:
        decision === "approved"
          ? `${p.name} is now published.`
          : `${p.name} was not approved.${reason ? ` Reason: ${reason}` : ""}`,
      link: `/seller/products/${productId}`,
    });

    await writeAudit({
      action: `product.review.${decision}`,
      entityType: "products",
      entityId: productId,
      after: { decision, reason },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Reverse accrued net proceeds proportionally for an approved refund.
 * Mirrors accrueCommissionsForOrder: each order item contributes its share of
 * the refund, reversed by the seller/store net rate.
 */
async function recordRefundReversals(
  orderId: string,
  refundAmountCents: number,
  actorId: string,
): Promise<void> {
  const db = createServiceClient();
  const { data: itemRows } = await db
    .from("order_items")
    .select("id, seller_id, store_id, line_total_cents")
    .eq("order_id", orderId);
  const items = (itemRows ?? []) as { id: string; seller_id: string; store_id: string; line_total_cents: number }[];
  const totalLineCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  if (!totalLineCents) return;

  const storeIds = [...new Set(items.map((item) => item.store_id))];
  const { data: storeRows } = await db
    .from("stores")
    .select("id, platform_commission_rate")
    .in("id", storeIds);
  const rateById = new Map<string, number>(
    (storeRows ?? []).map((store) => [
      (store as { id: string }).id,
      Number((store as { platform_commission_rate: number }).platform_commission_rate) || 0,
    ]),
  );

  const group = new Map<string, { sellerId: string; storeId: string; netCents: number }>();
  for (const item of items) {
    const shareCents = Math.round((refundAmountCents * item.line_total_cents) / totalLineCents);
    const rate = rateById.get(item.store_id) ?? 0;
    const { netCents } = computeCommission(shareCents, rate);
    const key = `${item.seller_id}:${item.store_id}`;
    const existing = group.get(key);
    if (existing) {
      existing.netCents += netCents;
    } else {
      group.set(key, { sellerId: item.seller_id, storeId: item.store_id, netCents });
    }
  }

  for (const { sellerId, storeId, netCents } of group.values()) {
    await recordLedgerEntry({
      sellerId,
      storeId,
      entryType: "refund",
      amountCents: -netCents,
      orderId,
      description: "Refund reversal (net proceeds)",
      createdBy: actorId,
    });
  }
}

/** Approve or reject a refund request. Approval reverses ledger and notifies. */
export async function reviewRefund(
  refundId: string,
  decision: "approved" | "rejected",
  note?: string | FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const adminNote = noteValue(note).trim();
    const db = createServiceClient();

    const { data: refund } = await db
      .from("refunds")
      .select("id, order_id, payment_id, amount_cents, reason, status, requested_by, created_at")
      .eq("id", refundId)
      .maybeSingle();
    if (!refund) return { ok: false, error: "Refund not found" };
    const r = refund as {
      id: string;
      order_id: string;
      payment_id: string | null;
      amount_cents: number;
      status: string;
      requested_by: string | null;
    };
    if (r.status !== "requested") {
      return { ok: false, error: "This refund has already been reviewed" };
    }

    const { data: order } = await db
      .from("orders")
      .select("id, order_number, user_id, grand_total_cents")
      .eq("id", r.order_id)
      .maybeSingle();
    if (!order) return { ok: false, error: "Order not found" };
    const o = order as { id: string; order_number: string; user_id: string | null; grand_total_cents: number };

    const { error: updateError } = await db
      .from("refunds")
      .update({
        status: decision === "approved" ? "processed" : "rejected",
        admin_note: adminNote || null,
        processed_by: actor.id,
        processed_at: decision === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", refundId);
    if (updateError) return { ok: false, error: updateError.message };

    if (decision === "approved") {
      await recordRefundReversals(r.order_id, r.amount_cents, actor.id ?? "");
      // Full refunds move the order to refunded; partial refunds leave it as is.
      if (r.amount_cents >= o.grand_total_cents) {
        await updateOrderStatus(r.order_id, "refunded", "Refund processed", actor.id);
      }
    }

    const customerId = o.user_id ?? r.requested_by;
    if (customerId) {
      await notifyUser({
        userId: customerId,
        type: "refund_update",
        title: decision === "approved" ? "Refund processed" : "Refund rejected",
        body:
          decision === "approved"
            ? `Your refund for order ${o.order_number} has been processed.`
            : `Your refund request for order ${o.order_number} was not approved.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        link: `/account/orders/${r.order_id}`,
      });
    }

    await writeAudit({
      action: `refund.review.${decision}`,
      entityType: "refunds",
      entityId: refundId,
      before: { status: r.status, amount_cents: r.amount_cents },
      after: { decision, admin_note: adminNote },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Move a payout from requested → approved (reviewed). */
export async function approvePayout(payoutId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const db = createServiceClient();
    const { data: payout } = await db
      .from("payouts")
      .select("id, seller_id, store_id, amount_cents, status")
      .eq("id", payoutId)
      .maybeSingle();
    if (!payout) return { ok: false, error: "Payout not found" };
    const p = payout as { id: string; seller_id: string; store_id: string; amount_cents: number; status: string };
    if (p.status !== "requested") return { ok: false, error: "Only requested payouts can be approved" };

    const { error } = await db
      .from("payouts")
      .update({ status: "approved", reviewed_by: actor.id, reviewed_at: new Date().toISOString() })
      .eq("id", payoutId);
    if (error) return { ok: false, error: error.message };

    await notifyUser({
      userId: p.seller_id,
      type: "payout_update",
      title: "Payout approved",
      body: `Your payout of ${(p.amount_cents / 100).toFixed(2)} USD has been approved.`,
      link: "/seller/payouts",
    });

    await writeAudit({
      action: "payout.approve",
      entityType: "payouts",
      entityId: payoutId,
      before: { status: p.status },
      after: { status: "approved" },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Mark an approved payout as paid and move funds out of the seller ledger. */
export async function markPayoutPaid(payoutId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const db = createServiceClient();
    const { data: payout } = await db
      .from("payouts")
      .select("id, seller_id, store_id, amount_cents, status")
      .eq("id", payoutId)
      .maybeSingle();
    if (!payout) return { ok: false, error: "Payout not found" };
    const p = payout as { id: string; seller_id: string; store_id: string; amount_cents: number; status: string };
    if (p.status !== "approved") {
      return { ok: false, error: "Only approved payouts can be marked paid" };
    }

    const { error } = await db
      .from("payouts")
      .update({ status: "paid", reviewed_by: actor.id, reviewed_at: new Date().toISOString() })
      .eq("id", payoutId);
    if (error) return { ok: false, error: error.message };

    await recordLedgerEntry({
      sellerId: p.seller_id,
      storeId: p.store_id,
      entryType: "payout",
      amountCents: -p.amount_cents,
      payoutId,
      description: "Payout disbursed",
      createdBy: actor.id,
    });

    await notifyUser({
      userId: p.seller_id,
      type: "payout_update",
      title: "Payout paid",
      body: `Your payout of ${(p.amount_cents / 100).toFixed(2)} USD has been paid.`,
      link: "/seller/payouts",
    });

    await writeAudit({
      action: "payout.paid",
      entityType: "payouts",
      entityId: payoutId,
      before: { status: p.status },
      after: { status: "paid" },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Reject a payout request (or approved payout waiting for disbursement). */
export async function rejectPayout(payoutId: string, note?: string | FormData): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const reason = noteValue(note).trim();
    const db = createServiceClient();
    const { data: payout } = await db
      .from("payouts")
      .select("id, seller_id, amount_cents, status")
      .eq("id", payoutId)
      .maybeSingle();
    if (!payout) return { ok: false, error: "Payout not found" };
    const p = payout as { id: string; seller_id: string; amount_cents: number; status: string };
    if (p.status !== "requested" && p.status !== "approved") {
      return { ok: false, error: "This payout cannot be rejected" };
    }

    const { error } = await db
      .from("payouts")
      .update({ status: "rejected", note: reason || null, reviewed_by: actor.id, reviewed_at: new Date().toISOString() })
      .eq("id", payoutId);
    if (error) return { ok: false, error: error.message };

    await notifyUser({
      userId: p.seller_id,
      type: "payout_update",
      title: "Payout rejected",
      body: `Your payout of ${(p.amount_cents / 100).toFixed(2)} USD was rejected.${reason ? ` Reason: ${reason}` : ""}`,
      link: "/seller/payouts",
    });

    await writeAudit({
      action: "payout.reject",
      entityType: "payouts",
      entityId: payoutId,
      before: { status: p.status },
      after: { status: "rejected", reason },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const couponFormSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).max(50),
  description: z.string().trim().max(300).optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.coerce.number().min(0).max(1_000_000),
  min_order_cents: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable()).optional(),
  max_discount_cents: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable()).optional(),
  usage_limit: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable()).optional(),
  per_user_limit: z.preprocess((value) => (value === "" || value == null ? 1 : value), z.coerce.number().int().min(0)).default(1),
  starts_at: z.preprocess(dateToIso, z.string().nullable()).optional(),
  ends_at: z.preprocess(dateToIso, z.string().nullable()).optional(),
  active: z
    .preprocess((value) => (value === "on" ? true : value === "off" ? false : value), z.coerce.boolean())
    .default(true),
});

/** Create or update a coupon (an id means "update"). Form action. */
export async function saveCoupon(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const fail = (message: string) => redirect(`/admin/coupons?error=${encodeURIComponent(message)}`);
  try {
    const actor = await getActor();
    const raw: Record<string, unknown> = {
      id: emptyToNull(formText(formData, "id")),
      code: formText(formData, "code"),
      description: formText(formData, "description"),
      discount_type: formText(formData, "discount_type"),
      discount_value: formText(formData, "discount_value"),
      min_order_cents: formText(formData, "min_order_cents"),
      max_discount_cents: formText(formData, "max_discount_cents"),
      usage_limit: formText(formData, "usage_limit"),
      per_user_limit: formText(formData, "per_user_limit"),
      starts_at: formText(formData, "starts_at"),
      ends_at: formText(formData, "ends_at"),
      active: formText(formData, "active") ?? "off",
    };
    const parsed = couponFormSchema.safeParse(raw);
    if (!parsed.success) {
      fail(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const data = parsed.data;
    const db = createServiceClient();

    if (data.id) {
      const { error } = await db.from("coupons").update(data).eq("id", data.id);
      if (error) fail(error.message);
      await writeAudit({ action: "coupon.update", entityType: "coupons", entityId: data.id, after: data, actor });
      return;
    }

    const { data: created, error } = await db
      .from("coupons")
      .insert({ ...data, used_count: 0 })
      .select("id")
      .maybeSingle();
    if (error || !created) fail(error?.message ?? "Failed to create coupon");
    await writeAudit({ action: "coupon.create", entityType: "coupons", entityId: (created as { id: string }).id, after: data, actor });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(errorMessage(err));
  }
}

/** Approve or reject a customer review; keeps product aggregates in sync. */
export async function reviewReview(
  reviewId: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const db = createServiceClient();

    const { data: review } = await db
      .from("reviews")
      .select("id, product_id, user_id, rating, status, created_at")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return { ok: false, error: "Review not found" };
    const r = review as { id: string; product_id: string; user_id: string; rating: number; status: string };
    if (r.status !== "pending") return { ok: false, error: "This review has already been moderated" };

    const { error: updateError } = await db
      .from("reviews")
      .update({ status: decision })
      .eq("id", reviewId);
    if (updateError) return { ok: false, error: updateError.message };

    // Recompute product rating/review_count from approved reviews.
    const { data: approved } = await db
      .from("reviews")
      .select("rating")
      .eq("product_id", r.product_id)
      .eq("status", "approved");
    const rows = (approved ?? []) as { rating: number }[];
    const avg = rows.length
      ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 10) / 10
      : 0;
    await db
      .from("products")
      .update({ rating: avg, review_count: rows.length })
      .eq("id", r.product_id);

    await notifyUser({
      userId: r.user_id,
      type: "system",
      title: decision === "approved" ? "Review published" : "Review not published",
      body:
        decision === "approved"
          ? "Your review is now visible on the product page."
          : "Your review was not approved for publication.",
      link: "/account/reviews",
    });

    await writeAudit({
      action: `review.review.${decision}`,
      entityType: "reviews",
      entityId: reviewId,
      before: { status: r.status },
      after: { status: decision },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Reply to a support ticket as an admin. Form action. */
export async function replyTicket(ticketId: string, body?: string | FormData): Promise<void> {
  await requireRole(["admin"]);
  const fail = (message: string) => redirect(`/admin/support/${ticketId}?error=${encodeURIComponent(message)}`);
  try {
    const actor = await getActor();
    const message = body instanceof FormData ? (formText(body, "body") ?? "").trim() : (body ?? "").trim();
    if (!message) fail("Reply cannot be empty");

    const db = createServiceClient();
    const { data: ticket } = await db
      .from("support_tickets")
      .select("id, user_id, subject, status")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) fail("Ticket not found");
    const t = ticket as { id: string; user_id: string; subject: string; status: string };

    const { error: insertError } = await db.from("support_messages").insert({
      ticket_id: ticketId,
      author_id: actor.id,
      author_role: "admin",
      body: message,
    });
    if (insertError) fail(insertError.message);

    await notifyUser({
      userId: t.user_id,
      type: "support_reply",
      title: "New support reply",
      body: `An admin replied to your ticket “${t.subject}”.`,
      link: "/account/support",
    });

    await writeAudit({
      action: "support.reply",
      entityType: "support_tickets",
      entityId: ticketId,
      after: { body: message },
      actor,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(errorMessage(err));
  }
}

/** Resolve a support ticket. */
export async function resolveTicket(ticketId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    const db = createServiceClient();
    const { data: ticket } = await db
      .from("support_tickets")
      .select("id, user_id, subject, status")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) return { ok: false, error: "Ticket not found" };
    const t = ticket as { id: string; user_id: string; subject: string; status: string };
    if (t.status === "resolved" || t.status === "closed") {
      return { ok: false, error: "Ticket is already resolved" };
    }

    const { error } = await db.from("support_tickets").update({ status: "resolved" }).eq("id", ticketId);
    if (error) return { ok: false, error: error.message };

    await notifyUser({
      userId: t.user_id,
      type: "support_reply",
      title: "Support ticket resolved",
      body: `Your ticket “${t.subject}” has been marked resolved.`,
      link: "/account/support",
    });

    await writeAudit({
      action: "support.resolve",
      entityType: "support_tickets",
      entityId: ticketId,
      before: { status: t.status },
      after: { status: "resolved" },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const categoryFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(160).optional(),
  parent_id: z.preprocess(emptyToNull, z.string().nullable()).optional(),
  description: z.string().trim().max(1000).optional(),
  image_url: z.string().trim().max(2000).optional(),
  sort_order: z.preprocess((value) => (value === "" || value == null ? 0 : value), z.coerce.number().int()).default(0),
});

/** Create or update a category (an id means "update"). Form action. */
export async function saveCategory(formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const fail = (message: string) => redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  try {
    const actor = await getActor();
    const raw: Record<string, unknown> = {
      id: emptyToNull(formText(formData, "id")),
      name: formText(formData, "name"),
      slug: formText(formData, "slug"),
      parent_id: formText(formData, "parent_id"),
      description: formText(formData, "description"),
      image_url: formText(formData, "image_url"),
      sort_order: formText(formData, "sort_order"),
    };
    const parsed = categoryFormSchema.safeParse(raw);
    if (!parsed.success) {
      fail(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const data = parsed.data;
    const slug = data.slug || slugify(data.name);
    const db = createServiceClient();

    if (data.id) {
      if (data.parent_id === data.id) fail("Category cannot be its own parent");
      const { error } = await db.from("categories").update({ ...data, slug }).eq("id", data.id);
      if (error) fail(error.message);
      await writeAudit({ action: "category.update", entityType: "categories", entityId: data.id, after: { ...data, slug }, actor });
      return;
    }

    const { data: created, error } = await db
      .from("categories")
      .insert({ ...data, slug })
      .select("id")
      .maybeSingle();
    if (error || !created) fail(error?.message ?? "Failed to create category");
    await writeAudit({
      action: "category.create",
      entityType: "categories",
      entityId: (created as { id: string }).id,
      after: { ...data, slug },
      actor,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(errorMessage(err));
  }
}

/** Persist platform settings JSON to analytics_events (event_type = platform_settings). Form action. */
export async function savePlatformSettings(input: unknown | FormData): Promise<void> {
  await requireRole(["admin"]);
  const fail = (message: string) => redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  try {
    const actor = await getActor();
    let parsed: unknown;
    if (input instanceof FormData) {
      const raw = formText(input, "json");
      if (!raw) fail("Settings JSON is required");
      parsed = JSON.parse(raw);
    } else {
      parsed = input;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      fail("Settings must be a JSON object");
    }
    const db = createServiceClient();
    const { data: event, error } = await db
      .from("analytics_events")
      .insert({ event_type: "platform_settings", properties: parsed })
      .select("id")
      .maybeSingle();
    if (error || !event) fail(error?.message ?? "Failed to save settings");
    await writeAudit({
      action: "platform.settings.save",
      entityType: "analytics_events",
      entityId: (event as { id: string }).id,
      after: parsed,
      actor,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(errorMessage(err));
  }
}

/** Admin-triggered order status transition (wraps updateOrderStatus). */
export async function updateOrderStatusAdmin(
  orderId: string,
  status: string,
  note?: string | FormData,
): Promise<ActionResult> {
  await requireRole(["admin"]);
  try {
    const actor = await getActor();
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      return { ok: false, error: `Unsupported order status: ${status}` };
    }
    const adminNote = noteValue(note).trim();
    await updateOrderStatus(orderId, status as OrderStatus, adminNote || undefined, actor.id);
    await writeAudit({
      action: "order.status.update",
      entityType: "orders",
      entityId: orderId,
      after: { status, note: adminNote },
      actor,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Admin-requested refund for an order (amount in USD from the form). Form action. */
export async function adminRequestRefund(orderId: string, formData: FormData): Promise<void> {
  await requireRole(["admin"]);
  const fail = (message: string) => redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(message)}`);
  try {
    const actor = await getActor();
    const amountStr = formText(formData, "amount");
    const reason = formText(formData, "reason") ?? "";
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      fail("Enter a valid refund amount");
    }
    const amountCents = Math.round(amount * 100);
    const result = await refundOrder(orderId, amountCents, reason, actor.id);
    await writeAudit({
      action: "refund.request",
      entityType: "orders",
      entityId: orderId,
      after: { refundId: result.refundId, amount_cents: amountCents, reason },
      actor,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(errorMessage(err));
  }
}
