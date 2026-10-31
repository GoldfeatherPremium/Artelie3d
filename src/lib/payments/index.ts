import { StripeProvider } from "./stripe-provider";
import { TestProvider } from "./test-provider";

/**
 * Payment status values mirroring the `payment_status` enum in
 * supabase/migrations/0001_schema.sql.
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "refunded"
  | "partially_refunded";

/** Minimal order shape consumed by payment providers. */
export interface OrderLike {
  id: string;
  userId?: string | null;
  [key: string]: unknown;
}

/** Base error for payment adapter failures (CommerceError-compatible). */
export class PaymentError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}

/** Raised when the environment is missing or misconfigured for a provider. */
export class PaymentConfigError extends PaymentError {
  constructor(message: string) {
    super("CONFIG_ERROR", message);
    this.name = "PaymentConfigError";
  }
}

/** Unified payment adapter interface (see docs/CONTRACTS.md §6). */
export interface PaymentProvider {
  id: "test" | "stripe" | "custom";
  initiatePayment(input: {
    order: OrderLike;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ paymentId: string; clientSecret?: string; status: PaymentStatus }>;
  verifyWebhook(payload: unknown, signature: string | null): Promise<boolean>;
  handleEvent(evt: { type: string; data: unknown }): Promise<void>;
  refundPayment(input: { providerPaymentId: string; amountCents: number }): Promise<{ ok: boolean }>;
}

/**
 * Select the payment provider from `PAYMENT_PROVIDER` (default "test").
 * - "test"   → sandbox provider, never moves real money (no keys required).
 * - "stripe" → real charges; requires Stripe keys (throws otherwise).
 * - "custom" → reserved, not implemented.
 */
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "test";
  switch (provider) {
    case "test":
      return new TestProvider();
    case "stripe":
      return new StripeProvider();
    case "custom":
      throw new PaymentConfigError(
        'PAYMENT_PROVIDER="custom" is reserved but not implemented; use "test" or "stripe".',
      );
    default:
      throw new PaymentConfigError(
        `Unknown PAYMENT_PROVIDER "${provider}" (expected "test", "stripe" or "custom").`,
      );
  }
}
