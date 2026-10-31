"use server";

import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { generateShareToken } from "@/lib/utils";
import { z } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function authUser() {
  const user = await getUser();
  if (!user) throw new Error("Please sign in to continue.");
  return user;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export async function updateProfile(input: { fullName?: string; phone?: string; preferences?: Record<string, unknown> }): Promise<ActionResult> {
  try {
    const user = await authUser();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid profile data" };

    const payload: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) payload.full_name = parsed.data.fullName;
    if (parsed.data.phone !== undefined) payload.phone = parsed.data.phone;
    if (parsed.data.preferences !== undefined) payload.preferences = parsed.data.preferences;

    const db = createServiceClient();
    const { error } = await db.from("profiles").update(payload).eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function saveNotificationPreferences(input: { emailEnabled: boolean; inAppEnabled: boolean; topics: string[] }): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db.from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_enabled: input.emailEnabled,
        in_app_enabled: input.inAppEnabled,
        topics: input.topics,
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  region: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().length(2).default("US"),
  phone: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export type AddressInputShape = {
  id?: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
};

export async function saveAddress(input: AddressInputShape): Promise<ActionResult> {
  try {
    const user = await authUser();
    const parsed = addressSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Please complete all required fields" };

    const db = createServiceClient();
    const data = {
      label: parsed.data.label ?? null,
      full_name: parsed.data.fullName,
      line1: parsed.data.line1,
      line2: parsed.data.line2 || null,
      city: parsed.data.city,
      region: parsed.data.region || null,
      postal_code: parsed.data.postalCode || null,
      country: parsed.data.country,
      phone: parsed.data.phone || null,
      is_default: parsed.data.isDefault ?? false,
    };

    if (data.is_default) {
      await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    if (parsed.data.id) {
      const { error } = await db.from("addresses").update(data).eq("id", parsed.data.id).eq("user_id", user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = await db.from("addresses").insert({ user_id: user.id, ...data });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function setDefaultAddress(addressId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    await db.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await db.from("addresses").update({ is_default: true }).eq("id", addressId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db.from("addresses").delete().eq("id", addressId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function dismissNotification(notificationId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db.from("notifications").delete().eq("id", notificationId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function submitReview(input: {
  productId: string;
  orderId: string;
  orderItemId?: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<ActionResult> {
  try {
    const user = await authUser();
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return { ok: false, error: "Rating must be between 1 and 5" };
    }
    const db = createServiceClient();
    const { data: order } = await db
      .from("orders")
      .select("id")
      .eq("id", input.orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!order) return { ok: false, error: "Order not found" };

    const { error } = await db.from("reviews").insert({
      product_id: input.productId,
      order_id: input.orderId,
      order_item_id: input.orderItemId ?? null,
      user_id: user.id,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      status: "pending",
      verified_purchase: true,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

export async function createTicket(input: { subject: string; issueType?: string; message: string }): Promise<ActionResult> {
  try {
    const user = await authUser();
    if (!input.subject.trim() || !input.message.trim()) return { ok: false, error: "Subject and message are required" };

    const db = createServiceClient();
    const { data: ticket, error } = await db
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: input.subject.trim(),
        issue_type: input.issueType || null,
        status: "open",
        priority: "normal",
      })
      .select("id")
      .maybeSingle();
    if (error || !ticket) return { ok: false, error: error?.message ?? "Could not create ticket" };

    const { error: msgError } = await db.from("support_messages").insert({
      ticket_id: (ticket as { id: string }).id,
      author_id: user.id,
      author_role: "customer",
      body: input.message.trim(),
    });
    if (msgError) return { ok: false, error: msgError.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function replyTicketCustomer(ticketId: string, body: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    if (!body.trim()) return { ok: false, error: "Message cannot be empty" };
    const db = createServiceClient();
    const { data: ticket } = await db
      .from("support_tickets")
      .select("id, status")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ticket) return { ok: false, error: "Ticket not found" };

    const { error } = await db.from("support_messages").insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_role: "customer",
      body: body.trim(),
    });
    if (error) return { ok: false, error: error.message };

    if ((ticket as { status: string }).status === "resolved" || (ticket as { status: string }).status === "closed") {
      await db.from("support_tickets").update({ status: "open" }).eq("id", ticketId);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Saved configurations
// ---------------------------------------------------------------------------

export async function renameConfiguration(configId: string, name: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    if (!name.trim() || name.trim().length > 120) return { ok: false, error: "Name must be 1–120 characters" };
    const db = createServiceClient();
    const { error } = await db
      .from("product_configurations")
      .update({ name: name.trim() })
      .eq("id", configId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function duplicateConfiguration(configId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { data: config } = await db
      .from("product_configurations")
      .select("product_id, name, options, option_summary, unit_price_cents, computed")
      .eq("id", configId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!config) return { ok: false, error: "Configuration not found" };
    const c = config as { product_id: string; name: string; options: Record<string, string>; option_summary: string | null; unit_price_cents: number; computed: unknown };
    const { error } = await db.from("product_configurations").insert({
      user_id: user.id,
      product_id: c.product_id,
      name: `${c.name} (copy)`,
      options: c.options,
      option_summary: c.option_summary,
      unit_price_cents: c.unit_price_cents,
      computed: c.computed,
      share_token: generateShareToken(),
      is_public: false,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteConfiguration(configId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db.from("product_configurations").delete().eq("id", configId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export async function duplicateRoom(roomId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { data: room } = await db
      .from("rooms")
      .select("name, template_key, dimensions, style, objects")
      .eq("id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!room) return { ok: false, error: "Room not found" };
    const r = room as { name: string; template_key: string; dimensions: unknown; style: unknown; objects: unknown };
    const { error } = await db.from("rooms").insert({
      user_id: user.id,
      name: `${r.name} (copy)`,
      template_key: r.template_key,
      dimensions: r.dimensions,
      style: r.style,
      objects: r.objects,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteRoom(roomId: string): Promise<ActionResult> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const { error } = await db.from("rooms").delete().eq("id", roomId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function shareRoom(roomId: string): Promise<ActionResult & { token?: string }> {
  try {
    const user = await authUser();
    const db = createServiceClient();
    const token = generateShareToken();
    const { error } = await db
      .from("rooms")
      .update({ share_token: token, is_public: true })
      .eq("id", roomId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// ---------------------------------------------------------------------------
// Recently viewed
// ---------------------------------------------------------------------------

export async function listRecentlyViewedProducts(slugs: string[]): Promise<{ slug: string; name: string; basePriceCents: number; salePriceCents: number | null; imageUrl: string | null; status: string }[]> {
  if (slugs.length === 0) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select("slug, name, base_price_cents, sale_price_cents, status, product_images(url, position)")
    .in("slug", slugs)
    .eq("status", "approved");
  if (error) return [];
  const rows = (data ?? []) as unknown as {
    slug: string;
    name: string;
    base_price_cents: number;
    sale_price_cents: number | null;
    status: string;
    product_images: { url: string; position: number }[];
  }[];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      basePriceCents: r.base_price_cents,
      salePriceCents: r.sale_price_cents,
      imageUrl: [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
      status: r.status,
    }));
}
