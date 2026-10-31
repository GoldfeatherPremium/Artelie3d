import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { canManageProduct, requireRole } from "@/lib/auth/roles";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { safeJsonParse, slugify } from "@/lib/utils";
import { customizationSchema } from "@/lib/validation";
import { listBrands, listCategories, listCollections } from "@/lib/data/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProductFullRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  type: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  category_id: string | null;
  collection_id: string | null;
  brand_id: string | null;
  dimensions: Record<string, unknown> | null;
  weight_grams: number | null;
  materials: string[];
  colors: string[];
  inventory_quantity: number;
  low_stock_threshold: number;
  status: string;
  customization_schema: unknown;
  created_at: string;
}

interface VariantRow {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_cents: number;
  inventory_quantity: number;
}

interface ImageRow {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  position: number;
}

function productStatusVariant(status: string): "neutral" | "warning" | "success" | "danger" | "info" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
    case "suspended":
      return "danger";
    case "pending_review":
      return "warning";
    case "draft":
      return "neutral";
    default:
      return "info";
  }
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

function parseVariantValues(formData: FormData): { name: string; sku: string | null; priceCents: number; quantity: number } | string {
  const name = formText(formData, "name").trim();
  const sku = formText(formData, "sku").trim() || null;
  const priceUsd = formText(formData, "price_usd");
  const inventory = formText(formData, "inventory_quantity");
  if (!name) return "Variant name is required";
  const priceCents = Math.round(parseFloat(priceUsd) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) return "Enter a valid price (0 or more)";
  const quantity = parseInt(inventory, 10);
  if (!Number.isInteger(quantity) || quantity < 0) return "Inventory must be a whole number";
  return { name, sku, priceCents, quantity };
}

export const dynamic = "force-dynamic";

export default async function SellerProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    errors?: string;
    message?: string;
    submitted?: string;
    variantsSaved?: string;
    variantError?: string;
    imgRemoved?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const fieldErrors = safeJsonParse<Record<string, string>>(sp.errors, {});
  const globalMessage = typeof sp.message === "string" && sp.message.length > 0 ? sp.message : undefined;
  const variantError = typeof sp.variantError === "string" && sp.variantError.length > 0 ? sp.variantError : undefined;

  await requireRole(["seller"]);
  const db = createServiceClient();
  const user = await getUser();
  const seller = user ? await resolveSeller(db, user.id) : null;

  const allowed = await canManageProduct(id);
  if (!allowed) notFound();

  const [{ data: productRow }, { data: variantRows }, { data: imageRows }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db
      .from("product_variants")
      .select("id, product_id, name, sku, price_cents, inventory_quantity")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
    db
      .from("product_images")
      .select("id, product_id, url, alt_text, position")
      .eq("product_id", id)
      .order("position", { ascending: true }),
  ]);

  const product = productRow as unknown as ProductFullRow | null;
  if (!product) notFound();
  const variants = (variantRows ?? []) as unknown as VariantRow[];
  const images = (imageRows ?? []) as unknown as ImageRow[];

  const baseUrl = `/seller/products/${id}`;

  async function updateProductDraft(formData: FormData): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?message=${encodeURIComponent("Not authorized.")}`);
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
      redirect(`${baseUrl}?errors=${encodeURIComponent(JSON.stringify(toFieldErrors(parsed.error)))}`);
    }
    const built = buildProductPayload(parsed.data);
    if (Object.keys(built.errors).length > 0) {
      redirect(`${baseUrl}?errors=${encodeURIComponent(JSON.stringify(built.errors))}`);
    }
    const { error } = await db
      .from("products")
      .update(built.payload)
      .eq("id", id)
      .eq("store_id", seller.storeId);
    if (error) {
      if (error.code === "23505") {
        redirect(
          `${baseUrl}?errors=${encodeURIComponent(JSON.stringify({ slug: "A product with this slug already exists." }))}`,
        );
      }
      redirect(`${baseUrl}?message=${encodeURIComponent(error.message)}`);
    }
    redirect(`${baseUrl}?saved=1`);
  }

  async function submitProductForReview(): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?message=${encodeURIComponent("Not authorized.")}`);
    }
    const { data: currentRow } = await db.from("products").select("status").eq("id", id).maybeSingle();
    const current = currentRow as { status: string } | null;
    if (current?.status !== "draft") {
      redirect(`${baseUrl}?message=${encodeURIComponent("Only drafts can be submitted for review.")}`);
    }
    const { error } = await db
      .from("products")
      .update({ status: "pending_review" })
      .eq("id", id)
      .eq("store_id", seller.storeId);
    if (error) redirect(`${baseUrl}?message=${encodeURIComponent(error.message)}`);
    redirect(`${baseUrl}?submitted=1`);
  }

  async function addVariant(formData: FormData): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?variantError=${encodeURIComponent("Not authorized.")}`);
    }
    const parsedValue = parseVariantValues(formData);
    if (typeof parsedValue === "string") {
      redirect(`${baseUrl}?variantError=${encodeURIComponent(parsedValue)}`);
    }
    const { error } = await db.from("product_variants").insert({
      product_id: id,
      name: parsedValue.name,
      sku: parsedValue.sku,
      price_cents: parsedValue.priceCents,
      inventory_quantity: parsedValue.quantity,
    });
    if (error) redirect(`${baseUrl}?variantError=${encodeURIComponent(error.message)}`);
    redirect(`${baseUrl}?variantsSaved=1`);
  }

  async function updateVariant(variantId: string, formData: FormData): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?variantError=${encodeURIComponent("Not authorized.")}`);
    }
    const parsedValue = parseVariantValues(formData);
    if (typeof parsedValue === "string") {
      redirect(`${baseUrl}?variantError=${encodeURIComponent(parsedValue)}`);
    }
    const { error } = await db
      .from("product_variants")
      .update({
        name: parsedValue.name,
        sku: parsedValue.sku,
        price_cents: parsedValue.priceCents,
        inventory_quantity: parsedValue.quantity,
      })
      .eq("id", variantId)
      .eq("product_id", id);
    if (error) redirect(`${baseUrl}?variantError=${encodeURIComponent(error.message)}`);
    redirect(`${baseUrl}?variantsSaved=1`);
  }

  async function deleteVariant(variantId: string): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?variantError=${encodeURIComponent("Not authorized.")}`);
    }
    const { error } = await db.from("product_variants").delete().eq("id", variantId).eq("product_id", id);
    if (error) redirect(`${baseUrl}?variantError=${encodeURIComponent(error.message)}`);
    redirect(`${baseUrl}?variantsSaved=1`);
  }

  async function deleteProductImage(imageId: string): Promise<void> {
    "use server";
    if (!seller?.storeId) {
      redirect(`${baseUrl}?message=${encodeURIComponent("Not authorized.")}`);
    }
    const { error } = await db.from("product_images").delete().eq("id", imageId).eq("product_id", id);
    if (error) redirect(`${baseUrl}?message=${encodeURIComponent(error.message)}`);
    redirect(`${baseUrl}?imgRemoved=1`);
  }

  const [categories, collections, brands] = await Promise.all([
    listCategories(),
    listCollections(),
    listBrands(),
  ]);
  const toOptions = (rows: { id: string; name: string }[]) =>
    rows.map((row) => ({ id: row.id, name: row.name }));

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/seller/products" className="text-body-sm text-fog transition-colors hover:text-ink">
            ← Products
          </Link>
          <h1 className="mt-1 font-display text-display-md text-ink">{product.name}</h1>
          <p className="text-body-sm text-fog">/{product.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={productStatusVariant(product.status)}>{product.status.replaceAll("_", " ")}</Badge>
          {product.status === "draft" ? (
            <form action={submitProductForReview}>
              <Button type="submit" variant="outline">
                Submit for review
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {sp.saved ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-body-sm text-success" role="status">
          Changes saved.
        </p>
      ) : null}
      {sp.submitted ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-body-sm text-success" role="status">
          Submitted for review. The platform will review your product shortly.
        </p>
      ) : null}
      {globalMessage ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-body-sm text-danger" role="alert">
          {globalMessage}
        </p>
      ) : null}

      <form action={updateProductDraft} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>Core product information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="product-name" error={fieldErrors.name}>
              <Input id="product-name" name="name" defaultValue={product.name} />
            </Field>
            <Field
              label="Slug"
              htmlFor="product-slug"
              hint="Auto-generated from the name when left blank."
              error={fieldErrors.slug}
            >
              <Input id="product-slug" name="slug" defaultValue={product.slug} />
            </Field>
            <Field label="Description" className="sm:col-span-2" htmlFor="product-description" error={fieldErrors.description}>
              <Textarea id="product-description" name="description" rows={4} defaultValue={product.description ?? ""} />
            </Field>
            <Field label="Type" htmlFor="product-type" error={fieldErrors.type}>
              <Select id="product-type" name="type" defaultValue={product.type}>
                <option value="standard">Standard</option>
                <option value="configurable">Configurable</option>
                <option value="made_to_order">Made to order</option>
              </Select>
            </Field>
            <Field label="Category" htmlFor="product-category" error={fieldErrors.category_id}>
              <Select id="product-category" name="category_id" defaultValue={product.category_id ?? ""}>
                <option value="">No category</option>
                {toOptions(categories).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Collection" htmlFor="product-collection" error={fieldErrors.collection_id}>
              <Select id="product-collection" name="collection_id" defaultValue={product.collection_id ?? ""}>
                <option value="">No collection</option>
                {toOptions(collections).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brand" htmlFor="product-brand" error={fieldErrors.brand_id}>
              <Select id="product-brand" name="brand_id" defaultValue={product.brand_id ?? ""}>
                <option value="">No brand</option>
                {toOptions(brands).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Base price (USD)" htmlFor="base-price" error={fieldErrors.base_price_usd}>
              <Input
                id="base-price"
                name="base_price_usd"
                inputMode="decimal"
                defaultValue={(product.base_price_cents / 100).toFixed(2)}
              />
            </Field>
            <Field label="Sale price (USD)" htmlFor="sale-price" hint="Leave blank when there is no sale." error={fieldErrors.sale_price_usd}>
              <Input
                id="sale-price"
                name="sale_price_usd"
                inputMode="decimal"
                defaultValue={product.sale_price_cents != null ? (product.sale_price_cents / 100).toFixed(2) : ""}
              />
            </Field>
            <Field label="Inventory quantity" htmlFor="inventory-qty" error={fieldErrors.inventory_quantity}>
              <Input id="inventory-qty" name="inventory_quantity" inputMode="numeric" defaultValue={String(product.inventory_quantity)} />
            </Field>
            <Field label="Low stock threshold" htmlFor="low-stock" error={fieldErrors.low_stock_threshold}>
              <Input id="low-stock" name="low_stock_threshold" inputMode="numeric" defaultValue={String(product.low_stock_threshold)} />
            </Field>
            <Field label="Materials" htmlFor="materials" hint="Comma-separated, e.g. Oak, Steel" error={fieldErrors.materials}>
              <Input id="materials" name="materials" defaultValue={(product.materials ?? []).join(", ")} />
            </Field>
            <Field label="Colors" htmlFor="colors" hint="Comma-separated, e.g. Natural, Charcoal" error={fieldErrors.colors}>
              <Input id="colors" name="colors" defaultValue={(product.colors ?? []).join(", ")} />
            </Field>
            <Field
              label="Dimensions (JSON)"
              className="sm:col-span-2"
              htmlFor="dimensions"
              hint='Example: {"width_cm": 80, "depth_cm": 70, "height_cm": 75}'
              error={fieldErrors.dimensions}
            >
              <Textarea
                id="dimensions"
                name="dimensions"
                rows={3}
                spellCheck={false}
                defaultValue={product.dimensions ? JSON.stringify(product.dimensions, null, 2) : ""}
              />
            </Field>
            <Field
              label="Customization schema (JSON)"
              className="sm:col-span-2"
              htmlFor="customization-schema"
              hint="Groups with key, label, required, single and options (value, label, priceAddCents, material?)."
              error={fieldErrors.customization_schema}
            >
              <Textarea
                id="customization-schema"
                name="customization_schema"
                rows={8}
                spellCheck={false}
                defaultValue={product.customization_schema ? JSON.stringify(product.customization_schema, null, 2) : ""}
              />
            </Field>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>SKU-level options for this product.</CardDescription>
        </CardHeader>
        <CardContent>
          {sp.variantsSaved ? (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-body-sm text-success" role="status">
              Variants saved.
            </p>
          ) : null}
          {variantError ? (
            <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-body-sm text-danger" role="alert">
              {variantError}
            </p>
          ) : null}

          {variants.length === 0 ? (
            <p className="text-body-sm text-fog">No variants yet. Add one below.</p>
          ) : (
            <ul className="grid gap-3">
              {variants.map((variant) => (
                <li key={variant.id} className="rounded-lg border border-line bg-paper p-3">
                  <form
                    action={updateVariant.bind(null, variant.id)}
                    className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                  >
                    <Field label="Name" htmlFor={`variant-name-${variant.id}`}>
                      <Input id={`variant-name-${variant.id}`} name="name" defaultValue={variant.name} />
                    </Field>
                    <Field label="SKU" htmlFor={`variant-sku-${variant.id}`}>
                      <Input id={`variant-sku-${variant.id}`} name="sku" defaultValue={variant.sku ?? ""} />
                    </Field>
                    <Field label="Price (USD)" htmlFor={`variant-price-${variant.id}`}>
                      <Input
                        id={`variant-price-${variant.id}`}
                        name="price_usd"
                        inputMode="decimal"
                        defaultValue={(variant.price_cents / 100).toFixed(2)}
                      />
                    </Field>
                    <Field label="Inventory" htmlFor={`variant-inventory-${variant.id}`}>
                      <Input
                        id={`variant-inventory-${variant.id}`}
                        name="inventory_quantity"
                        inputMode="numeric"
                        defaultValue={String(variant.inventory_quantity)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" variant="outline">
                        Save
                      </Button>
                    </div>
                  </form>
                  <form action={deleteVariant.bind(null, variant.id)} className="mt-2 flex justify-end">
                    <Button type="submit" size="sm" variant="ghost" className="text-danger">
                      Delete
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addVariant} className="mt-5 grid grid-cols-1 items-end gap-3 rounded-lg border border-dashed border-stone p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Field label="Name" htmlFor="new-variant-name">
              <Input id="new-variant-name" name="name" placeholder="New variant name" />
            </Field>
            <Field label="SKU" htmlFor="new-variant-sku">
              <Input id="new-variant-sku" name="sku" placeholder="SKU" />
            </Field>
            <Field label="Price (USD)" htmlFor="new-variant-price">
              <Input id="new-variant-price" name="price_usd" inputMode="decimal" placeholder="0.00" />
            </Field>
            <Field label="Inventory" htmlFor="new-variant-inventory">
              <Input id="new-variant-inventory" name="inventory_quantity" inputMode="numeric" placeholder="0" />
            </Field>
            <Button type="submit" size="sm" variant="outline">
              Add variant
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>Existing images attached to this product.</CardDescription>
        </CardHeader>
        <CardContent>
          {sp.imgRemoved ? (
            <p className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-body-sm text-success" role="status">
              Image removed.
            </p>
          ) : null}
          {images.length === 0 ? (
            <p className="text-body-sm text-fog">No images yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {images.map((image) => (
                <li key={image.id} className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt_text ?? ""} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink">{image.alt_text || "Image"}</p>
                    <p className="text-caption text-fog">Position {image.position}</p>
                  </div>
                  <form action={deleteProductImage.bind(null, image.id)}>
                    <Button type="submit" variant="danger" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
