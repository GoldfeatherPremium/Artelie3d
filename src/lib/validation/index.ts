import { z } from "zod";

/**
 * Shared Zod schemas for server + client. All money fields are integer cents.
 * Schemas strip unknown keys by default (except `webhookPayloadSchema`, which is
 * passthrough so provider-specific fields survive).
 */

// ---------------------------------------------------------------------------
// Customization schema (product record), mirrors src/lib/pricing types.
// ---------------------------------------------------------------------------

export const materialOverrideSchema = z.object({
  name: z.string().min(1),
  kind: z.literal("color"),
  color: z.string().min(1),
  roughness: z.number().min(0).max(1).optional(),
});

export const customizationOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  priceAddCents: z.number().int().default(0),
  material: materialOverrideSchema.optional(),
});

export const customizationGroupSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(false),
  single: z.boolean().default(true),
  options: z.array(customizationOptionSchema).min(1),
});

export const customizationSchema = z.object({
  groups: z.array(customizationGroupSchema),
});

// ---------------------------------------------------------------------------
// Product draft (seller form).
// ---------------------------------------------------------------------------

export const productDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  sku: z.string().trim().max(100).optional(),
  type: z.enum(["standard", "configurable", "made_to_order"]).default("standard"),
  base_price_cents: z.number().int().min(0),
  sale_price_cents: z.number().int().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  category_id: z.string().min(1).optional(),
  collection_id: z.string().min(1).optional(),
  brand_id: z.string().min(1).optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  weight_grams: z.number().int().min(0).optional(),
  materials: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  inventory_quantity: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).default(5),
  customization_schema: customizationSchema.nullish(),
  model_url: z.string().trim().optional(),
  model_preview_url: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Customization options for a configuration (group key -> option value).
// ---------------------------------------------------------------------------

export const customizationOptionsSchema = z.record(z.string(), z.string());

// ---------------------------------------------------------------------------
// Checkout.
// ---------------------------------------------------------------------------

export const addressInputSchema = z.object({
  fullName: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  region: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().length(2).default("US"),
  phone: z.string().trim().optional(),
});

export const couponCodeSchema = z.string().trim().min(1).max(100);

export const checkoutSchema = z.object({
  email: z.string().trim().email(),
  shippingAddress: addressInputSchema,
  billingAddress: addressInputSchema.optional(),
  deliveryMethod: z.string().trim().min(1),
  couponCode: couponCodeSchema.optional(),
});

// ---------------------------------------------------------------------------
// Payment webhook payload.
// ---------------------------------------------------------------------------

export const webhookPayloadSchema = z
  .object({
    id: z.string().optional(),
    event_type: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    data: z.unknown().optional(),
    provider_event_id: z.string().optional(),
    provider: z.string().optional(),
    signature: z.string().nullable().optional(),
  })
  .passthrough()
  .refine((payload) => payload.event_type != null || payload.type != null, {
    message: "Webhook payload must include an event type",
  });

// ---------------------------------------------------------------------------
// Saved configuration.
// ---------------------------------------------------------------------------

export const configSaveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  options: customizationOptionsSchema,
  productId: z.string().min(1),
  shareToken: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types.
// ---------------------------------------------------------------------------

export type ProductDraft = z.infer<typeof productDraftSchema>;
export type CustomizationOptions = z.infer<typeof customizationOptionsSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type ConfigSaveInput = z.infer<typeof configSaveSchema>;
