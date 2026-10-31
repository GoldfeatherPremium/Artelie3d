import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { TestProvider } from "./test-provider";
import { PaymentConfigError } from "./index";

const provider = new TestProvider();

afterEach(() => {
  delete process.env.PAYMENT_WEBHOOK_SECRET;
});

describe("TestProvider.initiatePayment", () => {
  it("returns a synthetic payment id and pending status without credentials", async () => {
    const result = await provider.initiatePayment({
      order: { id: "order_1" },
      amountCents: 1000,
      currency: "USD",
      idempotencyKey: "key_1",
    });
    expect(result.status).toBe("pending");
    expect(result.paymentId).toBe("test_key_1");
  });
});

describe("TestProvider.verifyWebhook", () => {
  it("accepts the well-known sandbox signature when no secret is configured", async () => {
    await expect(provider.verifyWebhook({ hello: "world" }, "test")).resolves.toBe(true);
  });

  it("rejects a missing/incorrect signature when no secret is configured", async () => {
    await expect(provider.verifyWebhook({ hello: "world" }, null)).resolves.toBe(false);
    await expect(provider.verifyWebhook({ hello: "world" }, "nope")).resolves.toBe(false);
  });

  it("verifies an HMAC-SHA256 signature when a secret is configured", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "whsec_test";
    const payload = { type: "payment.succeeded", data: { order_id: "o1" } };
    const raw = JSON.stringify(payload);
    const signature = createHmac("sha256", "whsec_test").update(raw).digest("hex");
    await expect(provider.verifyWebhook(payload, signature)).resolves.toBe(true);
  });

  it("rejects a tampered payload under a configured secret", async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "whsec_test";
    const payload = { type: "payment.succeeded", data: { order_id: "o1" } };
    const raw = JSON.stringify(payload);
    const signature = createHmac("sha256", "whsec_test").update(raw).digest("hex");
    const tampered = { ...payload, data: { order_id: "o2" } };
    await expect(provider.verifyWebhook(tampered, signature)).resolves.toBe(false);
  });
});

describe("TestProvider.handleEvent persistence", () => {
  it("throws a config error when Supabase service credentials are absent (never silently pretends)", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(
      provider.handleEvent({ type: "payment.succeeded", data: { order_id: "o1" } }),
    ).rejects.toThrow(PaymentConfigError);
  });
});
