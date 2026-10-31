import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Server-side catalog queries (public data). Uses the service client so public
 * read paths work uniformly; all reads are filtered to `status = 'approved'`
 * except where a caller explicitly requests draft/pending rows (seller/admin).
 */

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  type: "standard" | "configurable" | "made_to_order";
  base_price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  dimensions: Record<string, unknown> | null;
  weight_grams: number | null;
  materials: string[];
  colors: string[];
  inventory_quantity: number;
  status: string;
  customization_schema: unknown;
  model_config: unknown;
  featured: boolean;
  bestseller: boolean;
  rating: number;
  review_count: number;
  category: { name: string; slug: string } | null;
  collection: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
  store: { name: string; slug: string } | null;
  images: { url: string; alt_text: string | null; position: number }[];
  created_at: string;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  images: { url: string; position: number }[];
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  product_count?: number;
}

export interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_image_url: string | null;
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
}

export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

export interface ProductListParams {
  categorySlug?: string | null;
  collectionSlug?: string | null;
  brandSlug?: string | null;
  q?: string | null;
  sort?: "newest" | "price-asc" | "price-desc" | "rating" | "bestseller";
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PUBLIC_SELECT = `id, name, slug, description, sku, type, base_price_cents, sale_price_cents, currency, dimensions, weight_grams, materials, colors, inventory_quantity, status, customization_schema, model_config, featured, bestseller, rating, review_count, created_at,
  categories(name, slug),
  collections(name, slug),
  brands(name, slug),
  stores(name, slug),
  product_images(url, alt_text, position)`;

interface RawProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  type: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  dimensions: Record<string, unknown> | null;
  weight_grams: number | null;
  materials: string[];
  colors: string[];
  inventory_quantity: number;
  status: string;
  customization_schema: unknown;
  model_config: unknown;
  featured: boolean;
  bestseller: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  collections: { name: string; slug: string } | { name: string; slug: string }[] | null;
  brands: { name: string; slug: string } | { name: string; slug: string }[] | null;
  stores: { name: string; slug: string } | { name: string; slug: string }[] | null;
  product_images: { url: string; alt_text: string | null; position: number }[];
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeProduct(raw: RawProduct): CatalogProduct {
  const category = first(raw.categories);
  const collection = first(raw.collections);
  const brand = first(raw.brands);
  const store = first(raw.stores);
  const images = [...(raw.product_images ?? [])].sort((a, b) => a.position - b.position);

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    sku: raw.sku,
    type: raw.type as CatalogProduct["type"],
    base_price_cents: raw.base_price_cents,
    sale_price_cents: raw.sale_price_cents,
    currency: raw.currency,
    dimensions: raw.dimensions,
    weight_grams: raw.weight_grams,
    materials: raw.materials ?? [],
    colors: raw.colors ?? [],
    inventory_quantity: raw.inventory_quantity,
    status: raw.status,
    customization_schema: raw.customization_schema,
    model_config: raw.model_config,
    featured: raw.featured,
    bestseller: raw.bestseller,
    rating: raw.rating,
    review_count: raw.review_count,
    category,
    collection,
    brand,
    store,
    images,
    created_at: raw.created_at,
  };
}

export async function listProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 24));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const db = createServiceClient();
  let query = db.from("products").select(PUBLIC_SELECT, { count: "exact" }).eq("status", "approved");

  if (params.categorySlug) {
    query = query.eq("categories.slug", params.categorySlug);
  }
  if (params.collectionSlug) {
    query = query.eq("collections.slug", params.collectionSlug);
  }
  if (params.brandSlug) {
    query = query.eq("brands.slug", params.brandSlug);
  }
  if (params.q && params.q.trim()) {
    const term = params.q.trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`);
  }

  switch (params.sort) {
    case "price-asc":
      query = query.order("base_price_cents", { ascending: true });
      break;
    case "price-desc":
      query = query.order("base_price_cents", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    case "bestseller":
      query = query.order("bestseller", { ascending: false }).order("review_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw new Error(`Failed to list products: ${error.message}`);
  }

  const items = ((data ?? []) as unknown as RawProduct[]).map(normalizeProduct);
  const total = count ?? items.length;

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select(PUBLIC_SELECT)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  return normalizeProduct(data as unknown as RawProduct);
}

export async function getProductById(id: string): Promise<CatalogProduct | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select(PUBLIC_SELECT)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  return normalizeProduct(data as unknown as RawProduct);
}

export async function getRelatedProducts(product: CatalogProduct, limit = 4): Promise<CatalogProduct[]> {
  const db = createServiceClient();

  let query = db
    .from("products")
    .select(PUBLIC_SELECT)
    .eq("status", "approved")
    .neq("id", product.id)
    .limit(limit);

  if (product.category?.slug) {
    query = query.eq("categories.slug", product.category.slug);
  }

  const { data, error } = await query;
  if (error) return [];

  let items = ((data ?? []) as unknown as RawProduct[]).map(normalizeProduct);
  if (items.length < limit && product.brand?.slug) {
    const { data: more } = await db
      .from("products")
      .select(PUBLIC_SELECT)
      .eq("status", "approved")
      .eq("brands.slug", product.brand.slug)
      .neq("id", product.id)
      .limit(limit);
    const extra = ((more ?? []) as unknown as RawProduct[])
      .map(normalizeProduct)
      .filter((p) => !items.some((i) => i.id === p.id));
    items = [...items, ...extra].slice(0, limit);
  }
  return items;
}

export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select(PUBLIC_SELECT)
    .eq("status", "approved")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as unknown as RawProduct[]).map(normalizeProduct);
}

export async function getBestsellers(limit = 8): Promise<CatalogProduct[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select(PUBLIC_SELECT)
    .eq("status", "approved")
    .order("review_count", { ascending: false })
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as unknown as RawProduct[]).map(normalizeProduct);
}

export async function listCategories(withCounts = false): Promise<CategoryRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order")
    .order("sort_order", { ascending: true });

  if (error) return [];
  const rows = (data ?? []) as unknown as CategoryRow[];

  if (!withCounts) return rows;

  const { data: counts } = await db
    .from("products")
    .select("category_id")
    .eq("status", "approved");
  const tally = new Map<string, number>();
  for (const row of (counts ?? []) as { category_id: string | null }[]) {
    if (row.category_id) tally.set(row.category_id, (tally.get(row.category_id) ?? 0) + 1);
  }
  return rows.map((row) => ({ ...row, product_count: tally.get(row.id) ?? 0 }));
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CategoryRow;
}

export async function listCollections(): Promise<CollectionRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("collections")
    .select("id, name, slug, description, hero_image_url")
    .eq("status", "active")
    .order("published_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as CollectionRow[];
}

export async function getCollectionBySlug(slug: string): Promise<CollectionRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("collections")
    .select("id, name, slug, description, hero_image_url")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CollectionRow;
}

export async function listBrands(): Promise<BrandRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("brands")
    .select("id, name, slug, logo_url, description")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as BrandRow[];
}

export async function getBrandBySlug(slug: string): Promise<BrandRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("brands")
    .select("id, name, slug, logo_url, description")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BrandRow;
}

export async function listStores(): Promise<StoreRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("stores")
    .select("id, name, slug, description, logo_url")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as StoreRow[];
}

export async function searchSuggestions(q: string, limit = 6): Promise<SearchSuggestion[]> {
  const term = q.trim();
  if (!term) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .select(`id, name, slug, base_price_cents, sale_price_cents, product_images(url, position)`)
    .eq("status", "approved")
    .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    base_price_cents: number;
    sale_price_cents: number | null;
    product_images: { url: string; position: number }[];
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    base_price_cents: row.base_price_cents,
    sale_price_cents: row.sale_price_cents,
    images: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position),
  }));
}
