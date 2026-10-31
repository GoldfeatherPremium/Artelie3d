import { describe, it, expect } from "vitest";
import { hasRole } from "./roles";

describe("hasRole", () => {
  it("denies when the required list is empty", () => {
    expect(hasRole("customer", [])).toBe(false);
    expect(hasRole("admin", [])).toBe(false);
  });

  it("treats 'customer' in required as any authenticated user", () => {
    expect(hasRole("customer", ["customer"])).toBe(true);
    expect(hasRole("seller", ["customer"])).toBe(true);
    expect(hasRole("admin", ["customer"])).toBe(true);
  });

  it("lets a seller access seller-level routes", () => {
    expect(hasRole("seller", ["seller"])).toBe(true);
    expect(hasRole("admin", ["seller"])).toBe(true);
    expect(hasRole("customer", ["seller"])).toBe(false);
  });

  it("restricts admin routes to admins", () => {
    expect(hasRole("admin", ["admin"])).toBe(true);
    expect(hasRole("seller", ["admin"])).toBe(false);
    expect(hasRole("customer", ["admin"])).toBe(false);
  });

  it("with a mixed required list uses the highest required level", () => {
    expect(hasRole("admin", ["seller", "admin"])).toBe(true);
    expect(hasRole("seller", ["seller", "admin"])).toBe(false);
  });
});
