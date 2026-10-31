import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  PaymentConfigError,
  PaymentError,
  type OrderLike,
  type PaymentProvider,
  type PaymentStatus,
} from "./index";

/**
 * Minimal, locally-defined surface of the `stripe` package used by this
 * provider. The real package ships its own types; we keep a narrow local
 * contract so the module compiles even when `stripe` is not installed.
 */
interface StripeApi {
  paymentIntents: {
    create(params: {
      amount: number;
      currency: string;
      metadata: Record<string, string>;
      idempotencyKey?: string;
    }): Promise<{ id: string; client_secret: string | null }>;
  };
  refunds: {
    create(params: { payment_intent: string; amount: number }): Promise<{ id: string }>;
  };
  webhooks: {
    constructEvent(
      payload: string | Buffer,
      signature: string,
      secret: string,
    ): { type: string; data: { object: Record<string, unknown> } };
  };
}

type StripeCtor = (apiKey: string) => StripeApi;

/** Serialize a webhook payload into the raw body bytes for signature verification. */
function toRawBody(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  return JSON.stringify(payload);
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
 * idempotent without relying on unstable Stripe object ids.
 */
function providerEventIdFor(evt: { type: string; data: unknown }): string {
  return createHash("sha256").update(JSON.stringify(evt)).digest("hex");
}

/** Insert a payment event idempotently. The provider only records events; it never marks orders paid. */
async function recordPaymentEvent(evt: { type: string; data: unknown }): Promise<void> {
  const service = createServiceClient();
  const { error } = await service
    .from("payment_events")
    .upsert(
      {
        event_type: evt.type,
        payload: evt.data,
        provider_event_id: providerEventIdFor(evt),
      },
      { onConflict: "provider_event_id" },
    );
  if (error) {
    throw new PaymentError("EVENT_RECORD_FAILED", `Failed to record payment event: ${error.message}`);
  }
}

/**
 * Stripe payment provider (real charges).
 *
 * Requires `PAYMENT_PROVIDER_SECRET_KEY` + `PAYMENT_PUBLISHABLE_KEY`.
 * The `stripe` package is loaded lazily at runtime so the production build
 * succeeds even when the package is not installed; it must be present in
 * node_modules when this provider is actually used.
 */
export class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  constructor() {
    if (!process.env.PAYMENT_PROVIDER_SECRET_KEY || !process.env.PAYMENT_PUBLISHABLE_KEY) {
      throw new PaymentConfigError(
        'Stripe provider requires PAYMENT_PROVIDER_SECRET_KEY and PAYMENT_PUBLISHABLE_KEY. Set PAYMENT_PROVIDER="test" to use the sandbox provider without keys.',
      );
    }
  }

  /** Lazy-load the `stripe` package and return a configured instance. */
  private getStripe(): StripeApi {
    const secretKey = process.env.PAYMENT_PROVIDER_SECRET_KEY;
    if (!secretKey) {
      throw new PaymentConfigError("PAYMENT_PROVIDER_SECRET_KEY is not set.");
    }
    const require = createRequire(__filename);
    // Non-literal request: keeps the package out of the webpack dependency
    // graph so the production build succeeds without `stripe` installed. The
    // package is resolved at runtime only when this provider is selected.
    const pkgName = "stripe";
    const Stripe = require(pkgName) as StripeCtor;
    return Stripe(secretKey);
  }

  async initiatePayment(input: {
    order: OrderLike;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ paymentId: string; clientSecret: string; status: PaymentStatus }> {
    const stripe = this.getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      metadata: {
        orderId: input.order.id,
        idempotencyKey: input.idempotencyKey,
      },
      idempotencyKey: input.idempotencyKey,
    });
    return {
      paymentId: intent.id,
      clientSecret: intent.client_secret ?? "",
      status: "pending",
    };
  }

  async verifyWebhook(payload: unknown, signature: string | null): Promise<boolean> {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      throw new PaymentConfigError("Stripe webhook verification requires PAYMENT_WEBHOOK_SECRET.");
    }
    if (!signature) return false;
    const stripe = this.getStripe();
    try {
      const event = stripe.webhooks.constructEvent(toRawBody(payload), signature, secret);
      return Boolean(event?.type) && Boolean(event?.data);
    } catch {
      return false;
    }
  }

  /** Records a Stripe event idempotently (payment_events.provider_event_id unique). */
  async handleEvent(evt: { type: string; data: unknown }): Promise<void> {
    await recordPaymentEvent(evt);
  }

  async refundPayment(input: { providerPaymentId: string; amountCents: number }): Promise<{ ok: boolean }> {
    const stripe = this.getStripe();
    await stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      amount: input.amountCents,
    });
    return { ok: true };
  }
}
