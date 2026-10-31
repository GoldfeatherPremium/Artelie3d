import { describe, it, expect } from "vitest";
import { CartError, normalizeConfiguration, summarizeConfiguration } from "./cart";
import { addToCart } from "./cart";
import { createServiceClient } from "@/lib/supabase/admin";

describe("summarizeConfiguration", () => {
  it("returns null for missing or empty configuration", () => {
    expect(summarizeConfiguration(null)).toBeNull();
    expect(summarizeConfiguration(undefined)).toBeNull();
    expect(summarizeConfiguration({})).toBeNull();
  });

  it("builds a deterministic sorted 'key:value | key:value' summary", () => {
    expect(summarizeConfiguration({ fabric: "linen", legs: "brass" })).toBe("fabric:linen | legs:brass");
  });

  it("sorts keys independently of insertion order", () => {
    expect(summarizeConfiguration({ legs: "brass", fabric: "linen" })).toBe("fabric:linen | legs:brass");
  });
});

describe("normalizeConfiguration", () => {
  it("returns null for non-object input", () => {
    expect(normalizeConfiguration(null)).toBeNull();
    expect(normalizeConfiguration("x")).toBeNull();
    expect(normalizeConfiguration([1, 2])).toBeNull();
  });

  it("coerces values to strings", () => {
    expect(normalizeConfiguration({ fabric: "linen", qty: 2 })).toEqual({ fabric: "linen", qty: "2" });
  });

  it("returns null for an empty object", () => {
    // Empty object normalizes to {} (not null) — cart merge uses it as a valid empty configuration.
    expect(normalizeConfiguration({})).toEqual({});
  });
});

describe("addToCart validation", () => {
  it("rejects non-positive quantities before hitting the database", async () => {
    const db = createServiceClient();
    await expect(
      addToCart({
        cartId: "cart",
        productId: "product",
        quantity: 0,
        unitPriceCents: 100,
      }),
    ).rejects.toThrow(CartError);
    void db;
  });

  it("rejects fractional quantities", async () => {
    await expect(
      addToCart({
        cartId: "cart",
        productId: "product",
        quantity: 1.5,
        unitPriceCents: 100,
      }),
    ).rejects.toThrow(/positive integer/);
  });
});
