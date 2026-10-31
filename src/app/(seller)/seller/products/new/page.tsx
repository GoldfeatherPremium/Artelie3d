import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { safeJsonParse, slugify } from "@/lib/utils";
import { customizationSchema } from "@/lib/validation";
import { listBrands, listCategories, listCollections } from "@/lib/data/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

interface SellerContext {
  sellerProfileId: string;
  storeId: string | null;
}

async function resolveSeller(
  db: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<SellerContext | null> {
  const { data: sellerRow } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const seller = sellerRow as { id: string } | null;
  if (!seller) return null;

  const { data: storeRow } = await db
    .from("stores")
    .select("id")
    .eq("seller_profile_id", seller.id)
    .maybeSingle();
  const store = storeRow as { id: string } | null;

  return { sellerProfileId: seller.id, storeId: store?.id ?? null };
}

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages && messages.length > 0) out[key] = messages[0];
  }
  return out;
}

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  slug: z.string().trim().max(200, "Slug must be 200 characters or fewer").optional(),
  description: z.string().max(5000, "Description must be 5000 characters or fewer").optional(),
  type: z.enum(["standard", "configurable", "made_to_order"]),
  base_price_usd: z
    .string()
    .min(1, "Base price is required")
    .refine((value) => /^\d+(\.\d{0,2})?$/.test(value.trim()) && Number(value) >= 0, "Enter a valid USD amount (e.g. 129.99)"),
  sale_price_usd: z.string().optional(),
  category_id: z.string().optional(),
  collection_id: z.string().optional(),
  brand_id: z.string().optional(),
  inventory_quantity: z
    .string()
    .optional()
    .refine((value) => value === undefined || value === "" || /^\d+$/.test(value), "Enter a whole number"),
  low_stock_threshold: z
    .string()
    .optional()
    .refine((value) => value === undefined || value === "" || /^\d+$/.test(value), "Enter a whole number"),
  materials: z.string().optional(),
  colors: z.string().optional(),
  dimensions: z.string().optional(),
  customization_schema: z.string().optional(),
});

function buildProductPayload(raw: z.infer<typeof productFormSchema>): {
  payload: Record<string, unknown>;
  errors: Record<string, string>;
} {
  const basePriceCents = Math.round(Number(raw.base_price_usd) * 100);
  const saleRaw = raw.sale_price_usd?.trim() ?? "";
  const salePriceCents = saleRaw ? Math.round(Number(saleRaw) * 100) : null;

  let dimensions: Record<string, unknown> | null = null;
  if ((raw.dimensions ?? "").trim()) {
    try {
      const parsed = JSON.parse(raw.dimensions!.trim()) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("not an object");
      }
      dimensions = parsed as Record<string, unknown>;
    } catch {
      // reported below
    }
  }

  let customizationSchemaValue: unknown = null;
  if ((raw.customization_schema ?? "").trim()) {
    try {
      const parsed = JSON.parse(raw.customization_schema!.trim()) as unknown;
      const result = customizationSchema.safeParse(parsed);
      if (!result.success) throw new Error("invalid schema");
      customizationSchemaValue = result.data;
    } catch {
      // reported below
    }
  }

  const errors: Record<string, string> = {};
  if ((raw.dimensions ?? "").trim() && dimensions === null) {
    errors.dimensions = "Dimensions must be a valid JSON object";
  }
  if ((raw.customization_schema ?? "").trim() && customizationSchemaValue === null) {
    errors.customization_schema = "Customization schema must be valid JSON matching the schema shape";
  }
  if (salePriceCents !== null && salePriceCents > basePriceCents) {
    errors.sale_price_usd = "Sale price cannot exceed the base price";
  }

  return {
    payload: {
      name: raw.name,
      slug: raw.slug?.trim() || slugify(raw.name),
      description: raw.description?.trim() || null,
      type: raw.type,
      base_price_cents: basePriceCents,
      sale_price_cents: salePriceCents,
      currency: "USD",
      category_id: raw.category_id || null,
      collection_id: raw.collection_id || null,
      brand_id: raw.brand_id || null,
      dimensions,
      materials: parseCommaList(raw.materials ?? ""),
      colors: parseCommaList(raw.colors ?? ""),
      inventory_quantity: parseInt(raw.inventory_quantity || "0", 10) || 0,
      low_stock_threshold: parseInt(raw.low_stock_threshold || "5", 10) || 0,
      customization_schema: customizationSchemaValue,
    },
    errors,
  };
}

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ errors?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const fieldErrors = safeJsonParse<Record<string, string>>(sp.errors, {});
  const globalMessage =
    typeof sp.message === "string" && sp.message.length > 0 ? sp.message : undefined;

  await requireRole(["seller"]);
  const db = createServiceClient();
  const user = await getUser();
  const seller = user ? await resolveSeller(db, user.id) : null;

  async function createProductDraft(formData: FormData): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(
        `/seller/products/new?message=${encodeURIComponent("You need an approved store before creating products.")}`,
      );
    }

    const raw = {
      name: formText(formData, "name"),
      slug: formText(formData, "slug"),
      description: formText(formData, "description"),
      type: formText(formData, "type") || "standard",
      base_price_usd: formText(formData, "base_price_usd"),
      sale_price_usd: formText(formData, "sale_price_usd"),
      category_id: formText(formData, "category_id"),
      collection_id: formText(formData, "collection_id"),
      brand_id: formText(formData, "brand_id"),
      inventory_quantity: formText(formData, "inventory_quantity"),
      low_stock_threshold: formText(formData, "low_stock_threshold"),
      materials: formText(formData, "materials"),
      colors: formText(formData, "colors"),
      dimensions: formText(formData, "dimensions"),
      customization_schema: formText(formData, "customization_schema"),
    };

    const parsed = productFormSchema.safeParse(raw);
    if (!parsed.success) {
      redirect(`/seller/products/new?errors=${encodeURIComponent(JSON.stringify(toFieldErrors(parsed.error)))}`);
    }

    const built = buildProductPayload(parsed.data);
    if (Object.keys(built.errors).length > 0) {
      redirect(`/seller/products/new?errors=${encodeURIComponent(JSON.stringify(built.errors))}`);
    }

    const { data: created, error } = await db
      .from("products")
      .insert({
        ...built.payload,
        seller_id: seller.sellerProfileId,
        store_id: seller.storeId,
        status: "draft",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        redirect(
          `/seller/products/new?errors=${encodeURIComponent(JSON.stringify({ slug: "A product with this slug already exists." }))}`,
        );
      }
      redirect(`/seller/products/new?message=${encodeURIComponent(error.message)}`);
    }

    redirect(`/seller/products/${(created as { id: string }).id}`);
  }

  const [categories, collections, brands] = await Promise.all([
    listCategories(),
    listCollections(),
    listBrands(),
  ]);
  const toOptions = (rows: { id: string; name: string }[]) =>
    rows.map((row) => ({ id: row.id, name: row.name }));

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <Link href="/seller/products" className="text-body-sm text-fog transition-colors hover:text-ink">
          ← Products
        </Link>
        <h1 className="mt-1 font-display text-display-md text-ink">New product</h1>
        <p className="text-body-sm text-fog">
          Create a draft; submit it for review when it is ready to go live.
        </p>
      </div>

      {!seller?.storeId ? (
        <EmptyState
          title="No active store"
          description="Your store must be approved before you can add products."
        />
      ) : (
        <form action={createProductDraft} className="grid gap-6">
          {globalMessage ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
              {globalMessage}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>Core product information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="product-name" error={fieldErrors.name}>
                <Input id="product-name" name="name" placeholder="E.g. Arc Lounge Chair" />
              </Field>
              <Field
                label="Slug"
                htmlFor="product-slug"
                hint="Auto-generated from the name when left blank."
                error={fieldErrors.slug}
              >
                <Input id="product-slug" name="slug" placeholder="auto-generated" />
              </Field>
              <Field label="Description" className="sm:col-span-2" htmlFor="product-description" error={fieldErrors.description}>
                <Textarea
                  id="product-description"
                  name="description"
                  rows={4}
                  placeholder="Short description shown in the catalog."
                />
              </Field>
              <Field label="Type" htmlFor="product-type" error={fieldErrors.type}>
                <Select id="product-type" name="type" defaultValue="standard">
                  <option value="standard">Standard</option>
                  <option value="configurable">Configurable</option>
                  <option value="made_to_order">Made to order</option>
                </Select>
              </Field>
              <Field label="Category" htmlFor="product-category" error={fieldErrors.category_id}>
                <Select id="product-category" name="category_id" defaultValue="">
                  <option value="">No category</option>
                  {toOptions(categories).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Collection" htmlFor="product-collection" error={fieldErrors.collection_id}>
                <Select id="product-collection" name="collection_id" defaultValue="">
                  <option value="">No collection</option>
                  {toOptions(collections).map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Brand" htmlFor="product-brand" error={fieldErrors.brand_id}>
                <Select id="product-brand" name="brand_id" defaultValue="">
                  <option value="">No brand</option>
                  {toOptions(brands).map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing &amp; inventory</CardTitle>
              <CardDescription>Prices are in USD.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="Base price (USD)" htmlFor="base-price" error={fieldErrors.base_price_usd}>
                <Input id="base-price" name="base_price_usd" inputMode="decimal" placeholder="129.99" />
              </Field>
              <Field
                label="Sale price (USD)"
                htmlFor="sale-price"
                hint="Leave blank when there is no sale."
                error={fieldErrors.sale_price_usd}
              >
                <Input id="sale-price" name="sale_price_usd" inputMode="decimal" placeholder="109.99" />
              </Field>
              <Field label="Inventory quantity" htmlFor="inventory-qty" error={fieldErrors.inventory_quantity}>
                <Input id="inventory-qty" name="inventory_quantity" defaultValue="0" inputMode="numeric" />
              </Field>
              <Field label="Low stock threshold" htmlFor="low-stock" error={fieldErrors.low_stock_threshold}>
                <Input id="low-stock" name="low_stock_threshold" defaultValue="5" inputMode="numeric" />
              </Field>
              <Field label="Materials" htmlFor="materials" hint="Comma-separated, e.g. Oak, Steel" error={fieldErrors.materials}>
                <Input id="materials" name="materials" />
              </Field>
              <Field label="Colors" htmlFor="colors" hint="Comma-separated, e.g. Natural, Charcoal" error={fieldErrors.colors}>
                <Input id="colors" name="colors" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>Optional advanced fields.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Field
                label="Dimensions (JSON)"
                htmlFor="dimensions"
                hint='Example: {"width_cm": 80, "depth_cm": 70, "height_cm": 75}'
                error={fieldErrors.dimensions}
              >
                <Textarea id="dimensions" name="dimensions" rows={3} spellCheck={false} />
              </Field>
              <Field
                label="Customization schema (JSON)"
                htmlFor="customization-schema"
                hint="Groups with key, label, required, single and options (value, label, priceAddCents, material?)."
                error={fieldErrors.customization_schema}
              >
                <Textarea id="customization-schema" name="customization_schema" rows={8} spellCheck={false} />
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end">
            <Button type="submit">Create draft product</Button>
          </div>
        </form>
      )}
    </div>
  );
}
