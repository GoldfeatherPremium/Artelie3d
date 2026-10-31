import { describe, it, expect } from "vitest";
import { computeCommission, LedgerError } from "./index";

describe("computeCommission", () => {
  it("computes an 8% commission and net proceeds", () => {
    const { commissionCents, netCents } = computeCommission(100000, 0.08);
    expect(commissionCents).toBe(8000);
    expect(netCents).toBe(92000);
  });

  it("handles a zero-rate store (platform takes nothing)", () => {
    const { commissionCents, netCents } = computeCommission(25000, 0);
    expect(commissionCents).toBe(0);
    expect(netCents).toBe(25000);
  });

  it("handles a 100% rate (net zero)", () => {
    const { commissionCents, netCents } = computeCommission(5000, 1);
    expect(commissionCents).toBe(5000);
    expect(netCents).toBe(0);
  });

  it("rounds fractional cents deterministically", () => {
    const { commissionCents, netCents } = computeCommission(999, 0.08);
    expect(commissionCents + netCents).toBe(999);
  });

  it("rejects negative gross", () => {
    expect(() => computeCommission(-1, 0.08)).toThrow(LedgerError);
  });

  it("rejects rates outside [0, 1]", () => {
    expect(() => computeCommission(100, -0.1)).toThrow(LedgerError);
    expect(() => computeCommission(100, 1.1)).toThrow(LedgerError);
  });

  it("rejects non-finite gross", () => {
    expect(() => computeCommission(NaN, 0.08)).toThrow(LedgerError);
    expect(() => computeCommission(Infinity, 0.08)).toThrow(LedgerError);
  });
});
