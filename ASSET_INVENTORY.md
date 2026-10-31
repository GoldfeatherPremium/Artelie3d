# ATELIER 3D — Asset Inventory

This inventory maps every catalog record to the visual assets that serve it, the
3D model behind it, and the components that consume it. Assets are original and
generated in-repo (see `3D_MODEL_GUIDE.md` and `ASSET_GENERATION_REPORT.md`).

## 1. Existing products (catalog seed)

| # | Product | Slug | Category | Type | 3D model kind |
|---|---|---|---|---|---|
| 1 | Meridian Lounge Sofa | meridian-lounge-sofa | Sofas | configurable | sofa-curved |
| 2 | Arc Lounge Chair | arc-lounge-chair | Armchairs | configurable | accent-chair |
| 3 | Morrow Dining Table | morrow-dining-table | Tables | configurable | dining-table |
| 4 | Halden Sideboard | halden-sideboard | Storage | standard | tv-console |
| 5 | Basil & Oak Coffee Table | basil-oak-coffee-table | Tables | standard | coffee-table |
| 6 | Meridian Floor Lamp | meridian-floor-lamp | Lighting | standard | floor-lamp |
| 7 | Noma Media Console | noma-media-console | Storage | standard | tv-console |
| 8 | Halden Desk | halden-desk | Office | standard | desk |
| 9 | Atelier Maison Bed Frame | atelier-maison-bed-frame | Bedroom | standard | bed |
| 10 | Noma Pendant Light | noma-pendant-light | Lighting | standard | pendant |
| 11 | Studio North Nesting Tables | studio-north-nesting-tables | Tables | standard | side-table |
| 12 | Meridian Bookcase | meridian-bookcase | Storage | standard | shelving |
| 13 | Arc Ottoman | arc-ottoman | Armchairs | standard | bench |
| 14 | Halden Lounge Chair | halden-lounge-chair | Armchairs | pending_review | lounge-chair |

### Suggested catalog additions (Phase 3 brief) — generated assets exist

All 30 brief products have generated photography and a procedural 3D model.
The seeded database above covers 14 records; the remainder are present as
assets and model kinds, ready to be attached when their DB records are created:

Monaco Sectional (`monaco-sectional` → sectional), Nova Modular Sofa
(`nova-modular-sofa` → modular-sofa), Velora Velvet Chair (`velora-velvet-chair`
→ accent-chair), Eclipse Lounge Chair (`eclipse-lounge-chair` → lounge-chair),
Orion Coffee Table (`orion-coffee-table` → coffee-table), Sienna TV Console
(`sienna-tv-console` → tv-console), Atlas Side Table (`atlas-side-table` →
side-table), Serene Bed (`serene-bed` → bed), Noir Platform Bed
(`noir-platform-bed` → bed-platform), Haven Bedside Table (`haven-bedside-table`
→ bedside-table), Luna Dresser (`luna-dresser` → dresser), Cloud Bench
(`cloud-bench` → bench), Solstice Dining Table (`solstice-dining-table` →
dining-table), Ellipse Round Dining Table (`ellipse-round-dining-table` →
dining-table-round), Arden Dining Chair (`arden-dining-chair` → dining-chair),
Vista Dining Chair (`vista-dining-chair` → dining-chair-uph), Monolith Dining
Bench (`monolith-dining-bench` → dining-bench), Studio Desk (`studio-desk` →
desk), Executive Desk (`executive-desk` → desk-executive), Forma Office Chair
(`forma-office-chair` → office-chair), Grid Shelving (`grid-shelving` →
shelving), Aura Floor Lamp (`aura-floor-lamp` → floor-lamp), Lumen Pendant
(`lumen-pendant` → pendant), Halo Table Lamp (`halo-table-lamp` → table-lamp),
Terra Vase (`terra-ceramic-vase` → vase), Arc Mirror (`arc-wall-mirror` →
mirror), Orbit Clock (`orbit-wall-clock` → wall-clock), Bloom Planter
(`bloom-planter` → planter), Linea Wall Art (`linea-wall-art` → wall-art).

## 2. Asset coverage by product

Every generated product set contains 5 consistent images (rendered from the same
3D geometry as the configurator):

- `hero.webp` — primary hero photograph
- `front.webp` — front / three-quarter view
- `side.webp` — side view
- `detail.webp` — material detail close-up
- `lifestyle.webp` — lifestyle / interior scene

Path: `public/assets/products/<slug>/*.webp`

## 3. Missing assets (before this work) → now resolved

| Missing asset | Resolution |
|---|---|
| Product photography (hero/front/side/detail/lifestyle) | Generated from procedural 3D geometry (WebP) |
| 3D models for the catalog | Procedural GLB-class geometry used by the viewer (see guide) |
| Category banners | Generated per category (`public/assets/categories/*.webp`) |
| Collection banners | Generated per collection (`public/assets/collections/*.webp`) |
| Interior / lifestyle scenes | Generated (12 rooms, `public/assets/interiors/*.webp`) |
| Showroom furniture | Live 3D viewer now supports every model kind |
| Room designer geometry | Functional 3D room designer (templates + placement) |
| Broken/placeholder references | Components now prefer local assets with DB fallback |

## 4. Texture & material library

Materials are defined as PBR `MeshStandardMaterial` properties (base color +
roughness + metalness) on named parts. Texture maps (normal/metal/ao) are not
baked; the renderer uses procedural/material colors for web performance. See
`3D_MODEL_GUIDE.md` § Materials for the named material set (fabric, wood,
metal, leather, stone).

## 5. Components requiring/integrated with assets

| Component | Asset use |
|---|---|
| `src/components/catalog/product-card.tsx` | Local hero image + alt |
| `src/components/product/gallery.tsx` | Local 5-image set |
| `src/app/(site)/products/[slug]/page.tsx` | Gallery + OG image |
| `src/app/(site)/page.tsx` | Category/collection banners, editorial interiors, demo image |
| `src/app/(site)/collections/[slug]/page.tsx` | Collection hero banner |
| `src/app/(site)/shop/[slug]/page.tsx` | Category banner |
| `src/app/(site)/showroom/page.tsx` | Preview images + live 3D |
| `src/components/showroom/showroom-client.tsx` | Live 3D viewer |
| `src/components/configurator/*` | Live 3D models + material swaps |
| `src/components/room-designer/*` | Room geometry + furniture placement |
| `src/components/home/hero-scene.tsx` | Live hero 3D scene |
| `src/components/layout/search-overlay.tsx` | Suggestion thumbnails |
| `src/app/(site)/room-inspiration/page.tsx` | Interior imagery + product shots |
