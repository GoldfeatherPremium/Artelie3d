"use server";

import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  computeConfigurationPrice,
  validateConfiguration,
  PricingValidationError,
  type CustomizationSchema,
} from "@/lib/pricing";
import { summarizeConfiguration } from "@/lib/commerce/cart";
import { generateShareToken } from "@/lib/utils";

export type ActionResult = { ok: true; token: string; priceCents: number } | { ok: false; error: string };

interface ProductRow {
  id: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  customization_schema: unknown;
}

/**
 * Persist a saved configuration. Server-side pricing validation ensures the
 * stored unit price and summary are trustworthy (never client-computed).
 */
export async function saveConfiguration(input: {
  productId: string;
  name: string;
  options: Record<string, string>;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name || name.length > 120) {
    return { ok: false, error: "Please provide a name (max 120 characters)." };
  }

  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Please sign in to save configurations." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select("id, base_price_cents, sale_price_cents, customization_schema")
    .eq("id", input.productId)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Product not found." };

  const product = data as ProductRow;

  const schema = (product.customization_schema ?? null) as CustomizationSchema | null;
  const validation = validateConfiguration(schema, input.options);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Invalid configuration." };
  }

  let unitPriceCents: number;
  let breakdown: { groupKey: string; label: string; optionLabel: string; priceAddCents: number }[] = [];
  try {
    const priced = computeConfigurationPrice(
      {
        base_price_cents: product.base_price_cents,
        sale_price_cents: product.sale_price_cents,
        customization_schema: schema,
      },
      input.options,
    );
    unitPriceCents = priced.unitPriceCents;
    breakdown = priced.breakdown;
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return { ok: false, error: err.errors[0] ?? "Invalid configuration." };
    }
    return { ok: false, error: "Could not compute the configuration price." };
  }

  const token = generateShareToken();
  const optionSummary = summarizeConfiguration(input.options);

  const { data: created, error: insertError } = await db
    .from("product_configurations")
    .insert({
      user_id: user.id,
      product_id: input.productId,
      name,
      options: input.options,
      option_summary: optionSummary,
      unit_price_cents: unitPriceCents,
      computed: { unitPriceCents, breakdown },
      share_token: token,
      is_public: true,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !created) {
    return { ok: false, error: insertError?.message ?? "Could not save your configuration." };
  }

  return { ok: true, token, priceCents: unitPriceCents };
}

/** Recompute price for display (client-side) is not used here — costs are computed server-side. */
export type PublicConfiguration = {
  id: string;
  name: string;
  options: Record<string, string>;
  optionSummary: string | null;
  unitPriceCents: number;
  shareToken: string;
  product: {
    id: string;
    name: string;
    slug: string;
    basePriceCents: number;
    salePriceCents: number | null;
    customizationSchema: CustomizationSchema | null;
    modelConfig: Record<string, unknown> | null;
    imageUrl: string | null;
  };
};

export async function getPublicConfiguration(token: string): Promise<PublicConfiguration | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("product_configurations")
    .select(
      "id, name, options, option_summary, unit_price_cents, share_token, " +
        "products(id, name, slug, base_price_cents, sale_price_cents, customization_schema, model_config, product_images(url, position))",
    )
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    name: string;
    options: Record<string, string>;
    option_summary: string | null;
    unit_price_cents: number;
    share_token: string;
    products: {
      id: string;
      name: string;
      slug: string;
      base_price_cents: number;
      sale_price_cents: number | null;
      customization_schema: unknown;
      model_config: unknown;
      product_images: { url: string; position: number }[];
    } | null;
  };

  if (!row.products) return null;

  const images = [...(row.products.product_images ?? [])].sort((a, b) => a.position - b.position);

  return {
    id: row.id,
    name: row.name,
    options: row.options ?? {},
    optionSummary: row.option_summary,
    unitPriceCents: row.unit_price_cents,
    shareToken: row.share_token,
    product: {
      id: row.products.id,
      name: row.products.name,
      slug: row.products.slug,
      basePriceCents: row.products.base_price_cents,
      salePriceCents: row.products.sale_price_cents,
      customizationSchema: (row.products.customization_schema ?? null) as CustomizationSchema | null,
      modelConfig:
        row.products.model_config && typeof row.products.model_config === "object"
          ? (row.products.model_config as Record<string, unknown>)
          : null,
      imageUrl: images[0]?.url ?? null,
    },
  };
}
