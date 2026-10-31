import { describe, it, expect } from "vitest";
import {
  buildMaterialMap,
  computeConfigurationPrice,
  PricingValidationError,
  validateConfiguration,
  type CustomizationSchema,
} from "./index";

const schema: CustomizationSchema = {
  groups: [
    {
      key: "fabric",
      label: "Fabric",
      required: true,
      single: true,
      options: [
        { value: "linen", label: "Linen", priceAddCents: 0, material: { name: "fabric", kind: "color", color: "#d9d1c5" } },
        { value: "velvet", label: "Velvet", priceAddCents: 40000, material: { name: "fabric", kind: "color", color: "#6a3b2a" } },
      ],
    },
    {
      key: "legs",
      label: "Legs",
      required: false,
      single: true,
      options: [
        { value: "oak", label: "Oak", priceAddCents: 0, material: { name: "legs", kind: "color", color: "#b58f5e" } },
        { value: "brass", label: "Brass", priceAddCents: 25000, material: { name: "legs", kind: "color", color: "#a88c69" } },
      ],
    },
    {
      key: "cushion",
      label: "Cushion fill",
      required: false,
      single: true,
      options: [
        { value: "standard", label: "Standard", priceAddCents: 0 },
        { value: "down", label: "Down", priceAddCents: 15000 },
      ],
    },
  ],
};

const product = {
  base_price_cents: 200000,
  sale_price_cents: null,
  customization_schema: schema,
};

describe("validateConfiguration", () => {
  it("accepts a valid configuration with required groups selected", () => {
    const result = validateConfiguration(schema, { fabric: "linen", legs: "brass" });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("flags a missing required group", () => {
    const result = validateConfiguration(schema, { legs: "oak" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("fabric"))).toBe(true);
  });

  it("flags an option value that does not exist in the group", () => {
    const result = validateConfiguration(schema, { fabric: "polyester" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("polyester");
  });

  it("allows optional groups to be omitted", () => {
    const result = validateConfiguration(schema, { fabric: "velvet" });
    expect(result.valid).toBe(true);
  });

  it("returns valid when no schema is provided", () => {
    expect(validateConfiguration(null, {}).valid).toBe(true);
    expect(validateConfiguration(undefined, {}).valid).toBe(true);
  });
});

describe("computeConfigurationPrice", () => {
  it("returns base price and empty summary for a product without a schema", () => {
    const result = computeConfigurationPrice({ base_price_cents: 50000, sale_price_cents: null, customization_schema: null }, {});
    expect(result.unitPriceCents).toBe(50000);
    expect(result.optionSummary).toBe("");
    expect(result.breakdown).toEqual([]);
  });

  it("computes base price when no options are selected (required group satisfied elsewhere)", () => {
    const result = computeConfigurationPrice(product, { fabric: "linen" });
    expect(result.unitPriceCents).toBe(200000);
    expect(result.optionSummary).toBe("fabric:linen");
  });

  it("adds option price deltas ascending in schema order", () => {
    const result = computeConfigurationPrice(product, { fabric: "velvet", legs: "brass", cushion: "down" });
    expect(result.unitPriceCents).toBe(200000 + 40000 + 25000 + 15000);
    expect(result.breakdown).toHaveLength(3);
    expect(result.optionSummary).toBe("fabric:velvet | legs:brass | cushion:down");
  });

  it("uses sale price as the base when present", () => {
    const result = computeConfigurationPrice(
      { base_price_cents: 200000, sale_price_cents: 175000, customization_schema: schema },
      { fabric: "velvet" },
    );
    expect(result.unitPriceCents).toBe(175000 + 40000);
  });

  it("throws PricingValidationError when a required group is missing", () => {
    expect(() => computeConfigurationPrice(product, { legs: "oak" })).toThrow(PricingValidationError);
  });

  it("ignores unknown option keys", () => {
    const result = computeConfigurationPrice(product, { fabric: "linen", not_in_schema: "x" });
    expect(result.unitPriceCents).toBe(200000);
    expect(result.optionSummary).toBe("fabric:linen");
  });

  it("ignores unknown values for a selected group", () => {
    const result = computeConfigurationPrice(product, { fabric: "linen", legs: "titanium" });
    expect(result.unitPriceCents).toBe(200000);
    expect(result.optionSummary).toBe("fabric:linen");
  });
});

describe("buildMaterialMap", () => {
  it("maps selected options that carry materials by group key", () => {
    const map = buildMaterialMap(schema, { fabric: "velvet", legs: "brass", cushion: "down" });
    expect(map.fabric?.color).toBe("#6a3b2a");
    expect(map.legs?.color).toBe("#a88c69");
    expect(map.cushion).toBeUndefined();
  });

  it("returns an empty map when no materials are selected", () => {
    expect(buildMaterialMap(schema, { fabric: "linen" }).legs).toBeUndefined();
    expect(buildMaterialMap(null, {})).toEqual({});
  });
});
