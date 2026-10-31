import { formatCurrency } from "@/lib/utils";

/**
 * A material override attached to a customization option. The engine maps it to
 * a mesh part by group key (e.g. `seat`, `frame`, `legs`), so `name` must match
 * a material name used in the model.
 */
export type MaterialOverride = {
  /** Material name used by the model part. */
  name: string;
  kind: "color";
  color: string;
  roughness?: number;
};

export type CustomizationOption = {
  value: string;
  label: string;
  /** Price delta in integer cents, added on top of the base (sale) price. */
  priceAddCents: number;
  material?: MaterialOverride;
};

export type CustomizationGroup = {
  key: string;
  label: string;
  required: boolean;
  /** Whether the group accepts a single selection (drives the configurator UI). */
  single: boolean;
  options: CustomizationOption[];
};

export type CustomizationSchema = {
  groups: CustomizationGroup[];
};

/** Minimal product shape consumed by the pricing engine (mirrors `products`). */
export type PriceableProduct = {
  base_price_cents: number;
  sale_price_cents: number | null;
  customization_schema: CustomizationSchema | null;
};

export type ConfigurationPriceBreakdownItem = {
  groupKey: string;
  label: string;
  optionLabel: string;
  priceAddCents: number;
};

export type ConfigurationPriceResult = {
  unitPriceCents: number;
  salePriceCents: number | null;
  breakdown: ConfigurationPriceBreakdownItem[];
  optionSummary: string;
};

export type ConfigurationValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Thrown when a required customization group has no valid selection while
 * computing a configuration price.
 */
export class PricingValidationError extends Error {
  readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = "PricingValidationError";
    this.errors = errors;
  }
}

/** True when the raw option value is a non-empty string selection. */
function hasSelection(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim().length > 0;
}

/**
 * Resolve the selected option for a group. Returns `undefined` when the group
 * has no selection or when the selected value does not match a known option.
 * Unknown keys and unknown values are ignored by the pricing engine.
 */
function resolveSelectedOption(
  group: CustomizationGroup,
  options: Record<string, string>,
): CustomizationOption | undefined {
  if (!hasSelection(options[group.key])) return undefined;
  const value = options[group.key].trim();
  return group.options.find((option) => option.value === value);
}

/**
 * Validate a configuration against a customization schema. Required groups must
 * have a non-empty selection that matches a known option; optional groups with a
 * selection must reference a known option value.
 */
export function validateConfiguration(
  schema: CustomizationSchema | null | undefined,
  options: Record<string, string> = {},
): ConfigurationValidationResult {
  const errors: string[] = [];
  if (!schema) return { valid: true, errors };

  for (const group of schema.groups) {
    const selected = hasSelection(options[group.key]);

    if (group.required && !selected) {
      errors.push(`Required group "${group.key}" is missing`);
      continue;
    }

    if (selected && !resolveSelectedOption(group, options)) {
      errors.push(`Invalid option "${options[group.key].trim()}" for group "${group.key}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Compute the unit price for a customized product.
 *
 * - Sale price, when set, is the base; `priceAddCents` are additive.
 * - Option keys not present in the schema are ignored.
 * - Missing required groups throw {@link PricingValidationError}.
 * - `optionSummary` is deterministic: selected groups in schema order, joined as
 *   `key:value | key:value`.
 */
export function computeConfigurationPrice(
  product: PriceableProduct,
  options: Record<string, string> = {},
): ConfigurationPriceResult {
  const salePriceCents = product.sale_price_cents;
  const baseCents = salePriceCents ?? product.base_price_cents;
  const schema = product.customization_schema;

  if (!schema) {
    return {
      unitPriceCents: baseCents,
      salePriceCents,
      breakdown: [],
      optionSummary: "",
    };
  }

  const missingRequired = schema.groups.filter(
    (group) => group.required && !hasSelection(options[group.key]),
  );
  if (missingRequired.length > 0) {
    const keys = missingRequired.map((group) => group.key);
    throw new PricingValidationError(
      `Missing required configuration group(s): ${keys.join(", ")}`,
      keys.map((key) => `Required group "${key}" is missing`),
    );
  }

  let unitPriceCents = baseCents;
  const breakdown: ConfigurationPriceBreakdownItem[] = [];
  const summary: string[] = [];

  for (const group of schema.groups) {
    const selected = resolveSelectedOption(group, options);
    if (!selected) continue;

    unitPriceCents += selected.priceAddCents;
    breakdown.push({
      groupKey: group.key,
      label: group.label,
      optionLabel: selected.label,
      priceAddCents: selected.priceAddCents,
    });
    summary.push(`${group.key}:${selected.value}`);
  }

  return {
    unitPriceCents,
    salePriceCents,
    breakdown,
    optionSummary: summary.join(" | "),
  };
}

/**
 * Build a material map for the 3D scene: group key -> MaterialOverride for every
 * selected option that carries a material override.
 */
export function buildMaterialMap(
  schema: CustomizationSchema | null | undefined,
  options: Record<string, string> = {},
): Record<string, MaterialOverride> {
  const materials: Record<string, MaterialOverride> = {};
  if (!schema) return materials;

  for (const group of schema.groups) {
    const selected = resolveSelectedOption(group, options);
    if (selected?.material) {
      materials[group.key] = selected.material;
    }
  }

  return materials;
}

/**
 * Format integer cents as a display currency string (reuses `utils.formatCurrency`).
 */
export function formatPriceForDisplay(cents: number, currency = "USD"): string {
  return formatCurrency(cents / 100, currency);
}
