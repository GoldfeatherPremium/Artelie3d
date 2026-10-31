import { describe, expect, it, beforeAll } from "vitest";
import { createServiceClient } from "@/lib/supabase/admin";
import { createOrderFromCheckout, CommerceError } from "@/lib/commerce/orders";
import { computeCommission } from "@/lib/ledger";

/**
 * Integration tests against a real Supabase project. They are skipped when
 * service-role credentials are not configured (CI / local without .env), and
 * run against the linked project when env vars are present. They never touch
 * real customer data: everything is created and cleaned up within the test.
 */
const hasDb = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hasDb)("order creation (integration)", () => {
  let db: ReturnType<typeof createServiceClient>;

  beforeAll(() => {
    db = createServiceClient();
  });

  it("rejects checkout without a cart id", async () => {
    await expect(
      createOrderFromCheckout({
        cartId: "",
        userId: null,
        guestEmail: "test@example.com",
        shippingAddress: {
          fullName: "Test User",
          line1: "1 Main St",
          city: "New York",
          country: "US",
        },
        deliveryMethod: "standard",
        idempotencyKey: "int-test-none",
      }),
    ).rejects.toThrow(CommerceError);
  });

  it("rejects checkout without an idempotency key", async () => {
    await expect(
      createOrderFromCheckout({
        cartId: "cart-x",
        userId: null,
        guestEmail: "test@example.com",
        shippingAddress: {
          fullName: "Test User",
          line1: "1 Main St",
          city: "New York",
          country: "US",
        },
        deliveryMethod: "standard",
        idempotencyKey: "",
      }),
    ).rejects.toThrow(CommerceError);
  });

  it("rejects a cart that does not exist", async () => {
    await expect(
      createOrderFromCheckout({
        cartId: "00000000-0000-0000-0000-000000000000",
        userId: null,
        guestEmail: "test@example.com",
        shippingAddress: {
          fullName: "Test User",
          line1: "1 Main St",
          city: "New York",
          country: "US",
        },
        deliveryMethod: "standard",
        idempotencyKey: "int-test-missing-cart",
      }),
    ).rejects.toThrow(/Cart not found/);
  });
});

describe.skipIf(!hasDb)("commission math consistency (integration)", () => {
  it("commission + net always equals gross", () => {
    for (const gross of [0, 1, 999, 1000, 123456, 99999999]) {
      for (const rate of [0, 0.05, 0.08, 0.15, 1]) {
        const { commissionCents, netCents } = computeCommission(gross, rate);
        expect(commissionCents + netCents).toBe(gross);
      }
    }
  });
});
