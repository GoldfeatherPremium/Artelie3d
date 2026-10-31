import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentConfigError,
  PaymentError,
  type OrderLike,
  type PaymentProvider,
  type PaymentStatus,
} from "./index";

/** Well-known signature accepted by the sandbox webhook verifier when no secret is configured. */
const TEST_WEBHOOK_SIGNATURE = "test";

/** Serialize a webhook payload into the raw body bytes used for HMAC. */
function toRawBody(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  return JSON.stringify(payload);
}

/** Constant-time hex comparison. */
function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Server-only Supabase client scoped to admin/service-role operations.
 * Used only to persist `payment_events`; never exposed to clients.
 */
function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new PaymentConfigError(
      "Cannot persist payment events: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceRoleKey);
}

/**
 * Deterministic id for an event: identical redeliveries produce the same id,
 * so the `payment_events.provider_event_id` unique constraint makes processing
 * idempotent without relying on unstable object ids.
 */
function providerEventIdFor(evt: { type: string; data: unknown }): string {
  return createHash("sha256").update(JSON.stringify(evt)).digest("hex");
}

/** Insert a payment event idempotently. The provider only records events; it never marks orders paid. */
async function recordPaymentEvent(evt: { type: string; data: unknown }): Promise<void> {
  const service = createServiceClient();
  const { error } = await service
    .from("payment_events")
    .insert({
      event_type: evt.type,
      payload: evt.data,
      provider_event_id: providerEventIdFor(evt),
    })
    .onConflict("provider_event_id")
    .doNothing();
  if (error) {
    throw new PaymentError("EVENT_RECORD_FAILED", `Failed to record payment event: ${error.message}`);
  }
}

/**
 * Sandbox payment provider.
 *
 * SANDBOX / TEST MODE — no real charge is ever made. It issues synthetic
 * payment ids, accepts the well-known webhook signature, records payment
 * events idempotently and reports refunds as successful without moving money.
 */
export class TestProvider implements PaymentProvider {
  readonly id = "test" as const;

  /**
   * SANDBOX / TEST MODE — no real charge. Returns a synthetic id and a
   * `pending` status. The provider never marks orders paid; order status only
   * changes through recorded webhook events.
   */
  async initiatePayment(input: {
    order: OrderLike;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ paymentId: string; status: PaymentStatus }> {
    return {
      paymentId: `test_${input.idempotencyKey}`,
      status: "pending",
    };
  }

  async verifyWebhook(payload: unknown, signature: string | null): Promise<boolean> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      // No shared secret configured: accept the well-known test signature.
      return signature === TEST_WEBHOOK_SIGNATURE;
    }
    if (!signature) return false;
    const expected = createHmac("sha256", secret).update(toRawBody(payload)).digest("hex");
    return safeEqualHex(expected, signature);
  }

  /** Records a payment event idempotently (payment_events.provider_event_id unique). */
  async handleEvent(evt: { type: string; data: unknown }): Promise<void> {
    await recordPaymentEvent(evt);
  }

  /**
   * SANDBOX / TEST MODE — no real refund is executed.
   */
  async refundPayment(_input: { providerPaymentId: string; amountCents: number }): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
