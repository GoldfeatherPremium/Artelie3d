/**
 * ATELIER 3D — local visual asset registry.
 *
 * All generated, original assets live under `/assets/**` in the public
 * directory. This module is the single source of truth that maps catalog
 * records (product slugs, category/collection slugs, interior ids) to their
 * generated asset paths, so components never hard-code asset URLs. Anything
 * not present here falls back to the database-provided image URL.
 *
 * Product photography is generated from the *same* procedural 3D geometry the
 * configurator renders (see scripts/render + src/lib/models3d), so every view
 * of a product shares one consistent identity.
 */
import type { ModelKind } from "@/lib/models3d/kinds";

/** Model kind used to render each product's photography (matches the 3D configurator). */
export const PRODUCT_MODEL_KINDS: Record<string, ModelKind> = {
  "meridian-lounge-sofa": "sofa-curved",
  "arc-lounge-chair": "accent-chair",
  "morrow-dining-table": "dining-table",
  "halden-sideboard": "tv-console",
  "basil-oak-coffee-table": "coffee-table",
  "meridian-floor-lamp": "floor-lamp",
  "noma-media-console": "tv-console",
  "halden-desk": "desk",
  "atelier-maison-bed-frame": "bed",
  "noma-pendant-light": "pendant",
  "studio-north-nesting-tables": "side-table",
  "meridian-bookcase": "shelving",
  "arc-ottoman": "bench",
  "halden-lounge-chair": "lounge-chair",
  "monaco-sectional": "sectional",
  "nova-modular-sofa": "modular-sofa",
  "noir-platform-bed": "bed-platform",
  "haven-bedside-table": "bedside-table",
  "luna-dresser": "dresser",
  "ellipse-round-dining-table": "dining-table-round",
  "arden-dining-chair": "dining-chair",
  "vista-dining-chair": "dining-chair-uph",
  "executive-desk": "desk-executive",
  "forma-office-chair": "office-chair",
  "halo-table-lamp": "table-lamp",
  "terra-ceramic-vase": "vase",
  "arc-wall-mirror": "mirror",
  "orbit-wall-clock": "wall-clock",
  "bloom-planter": "planter",
  "linea-wall-art": "wall-art",
};

export const PRODUCT_ASSET_VIEWS = ["hero", "front", "side", "detail", "lifestyle"] as const;
export type ProductAssetView = (typeof PRODUCT_ASSET_VIEWS)[number];

export interface ProductAssetSet {
  base: string;
  preview: string;
  images: string[];
}

export function productAssetBase(slug: string): string {
  return `/assets/products/${slug}`;
}

/** True when the product slug has a generated asset set in this build. */
export function hasProductAssets(slug: string): boolean {
  return slug in PRODUCT_MODEL_KINDS;
}

/** Ordered local gallery for a product (hero, front, side, detail, lifestyle). */
export function localProductImages(slug: string): string[] {
  if (!hasProductAssets(slug)) return [];
  const base = productAssetBase(slug);
  return PRODUCT_ASSET_VIEWS.map((view) => `${base}/${view}.webp`);
}

/** Primary hero image for a product (used by cards, search, OG tags, showroom list). */
export function localHeroFor(slug: string): string | null {
  if (!hasProductAssets(slug)) return null;
  return `${productAssetBase(slug)}/hero.webp`;
}

/** Category banner images (generated from a representative model per category). */
export const CATEGORY_BANNERS: Record<string, string> = {
  sofas: "/assets/categories/sofas.webp",
  armchairs: "/assets/categories/armchairs.webp",
  tables: "/assets/categories/tables.webp",
  lighting: "/assets/categories/lighting.webp",
  storage: "/assets/categories/storage.webp",
  bedroom: "/assets/categories/bedroom.webp",
  office: "/assets/categories/office.webp",
  decor: "/assets/categories/decor.webp",
};

export function categoryBanner(slug: string): string | null {
  return CATEGORY_BANNERS[slug] ?? null;
}

/** Collection hero images (generated from a representative model per collection). */
export const COLLECTION_BANNERS: Record<string, string> = {
  "quiet-luxury": "/assets/collections/quiet-luxury.webp",
  "the-foundry": "/assets/collections/the-foundry.webp",
  "sculptural-forms": "/assets/collections/sculptural-forms.webp",
  "nordic-light": "/assets/collections/nordic-light.webp",
  "archive-01": "/assets/collections/archive-01.webp",
};

export function collectionBanner(slug: string): string | null {
  return COLLECTION_BANNERS[slug] ?? null;
}

/** Interior photography (generated room scenes) keyed by interior id. */
export const INTERIOR_IMAGES: Record<string, string> = {
  "living-luxury": "/assets/interiors/living-luxury.webp",
  "living-scandinavian": "/assets/interiors/living-scandinavian.webp",
  "bedroom-japandi": "/assets/interiors/bedroom-japandi.webp",
  "bedroom-minimalist": "/assets/interiors/bedroom-minimalist.webp",
  "dining-contemporary": "/assets/interiors/dining-contemporary.webp",
  "office-luxury": "/assets/interiors/office-luxury.webp",
  "apartment-modern": "/assets/interiors/apartment-modern.webp",
  "apartment-studio": "/assets/interiors/apartment-studio.webp",
  "organic-modern": "/assets/interiors/organic-modern.webp",
  penthouse: "/assets/interiors/penthouse.webp",
  "showroom-designer": "/assets/interiors/showroom-designer.webp",
  "architectural-interior": "/assets/interiors/architectural-interior.webp",
};

export function interiorImage(id: string): string | null {
  return INTERIOR_IMAGES[id] ?? null;
}

/** Ordered list of interior ids for editorial galleries. */
export const INTERIOR_IDS = Object.keys(INTERIOR_IMAGES);
