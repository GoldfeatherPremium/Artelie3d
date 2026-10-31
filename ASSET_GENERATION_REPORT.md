# ATELIER 3D — Asset Generation Report

Status of the visual asset library work: what was generated, how, what is
integrated, and what remains limited.

## 1. What was generated

### Product photography — 30 products × 5 views = 150 images

Each of the 30 brief products has a consistent 5-image set under
`public/assets/products/<slug>/`:

| View | File | Purpose |
|---|---|---|
| Hero | `hero.webp` | primary hero photograph (cards, OG, showroom list) |
| Front | `front.webp` | front / three-quarter view |
| Side | `side.webp` | side view |
| Detail | `detail.webp` | material detail close-up |
| Lifestyle | `lifestyle.webp` | staged interior scene |

### Banners — 8 categories + 5 collections = 13 images

- `public/assets/categories/<slug>.webp` (1200×900)
- `public/assets/collections/<slug>.webp` (1920×1080)

### Interiors — 12 lifestyle scenes

`public/assets/interiors/<id>.webp` (1600×1067): luxury/Scandinavian living
rooms, Japandi/minimalist bedrooms, contemporary dining, luxury office, modern
apartment, studio, organic-modern, penthouse, designer showroom, architectural
interior.

### 3D models — 30 procedural kinds (real geometry)

`src/lib/models3d/builders.ts` + `kinds.ts`: sofas (curved/sectional/modular),
chairs (accent/lounge/dining/upholstered), tables (coffee/side/dining/round),
storage (console/sideboard/shelving/dresser/bedside), beds, desks, office chair,
lighting (floor/pendant/table), decor (vase/mirror/clock/planter/wall art).
Each has named mesh parts, PBR materials, meters-scale proportions, floor
origin, and camera hints. These are what the configurator, showroom, room
designer and hero render.

## 2. How assets were produced

| Surface | Method |
|---|---|
| Product photography / banners / interiors | Two pipelines, same outputs paths: (a) **offline photorealistic renderer** `scripts/render` (headless Chromium, SwiftShader, bundles the actual Three.js builders with studio lighting, shadows, RoomEnvironment) producing high-quality raster; supported (b) **deterministic vector renderer** `scripts/generate-assets.mjs` (SVG compositions → WebP via sharp) that runs at build time so deployments always ship assets. |
| 3D models | Procedural Three.js geometry (original, no stock assets, no image planes). |

## 3. Verification

- `npm run typecheck` → exit 0.
- `npm run test` → 40 passed, 4 skipped (integration needs live DB).
- Asset files: 175 WebP generated; dimensions verified (products 1200×1500,
  categories 1200×900, collections 1920×1080, interiors 1600×1067); manifest at
  `public/assets/manifest.json`.
- Every product's photography matches its 3D model kind (single identity).

## 4. Integration

- `src/lib/data/assets.ts` centralizes all asset paths (no scattered hard-coding).
- Product cards, galleries (hero/front/side/detail/lifestyle), OG tags, search
  suggestions, showroom list, homepage collections/categories/interiors,
  collection & category banners all prefer local assets with a database
  fallback.
- Configurator viewer upgraded from 3 to **all 30 model kinds**; material
  options now actually re-style the mesh parts (group→part re-keying).
- Showroom renders real geometry; room designer is a functional 3D planner
  (templates, place/move/rotate/scale, save/load locally).

## 5. Known limitations / honest notes

- **No GLB files are committed or claimed.** This environment has no Blender
  and no external 3D generation tool; models are original procedural Three.js
  geometry (allowed path in the brief). An export guide is in
  `3D_MODEL_GUIDE.md`.
- **Texture maps** are not baked (normal/metal/AO); PBR properties are
  procedural and lightweight for mobile.
- **Photorealistic raster** was generated locally with the headless renderer;
  because this toolchain commits text-only files, deployed assets are produced
  at build time by the deterministic vector renderer (consistent brand
  language). Re-run `scripts/render` on a workstation to replace them with the
  photorealistic set under identical paths.
- **Catalog gap**: the seeded database has 14 products; the other 16 brief
  products have complete assets and model kinds ready but no DB row yet (they
  appear when their records are created).
