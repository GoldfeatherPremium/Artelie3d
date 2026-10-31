# ATELIER 3D — 3D Model Guide

This guide documents how 3D furniture is created, named, optimized and wired
into the checkout, configurator, showroom and room designer.

## 1. Architecture

All furniture is **procedural**, built in code from primitive geometry
(`THREE.BoxGeometry`, `RoundedBoxGeometry`, `CylinderGeometry`, `TorusGeometry`,
`LatheGeometry`, curves) with PBR materials. There is one builder per model
kind in `src/lib/models3d/builders.ts`, dispatched from a central factory
(`buildModel`). The same code drives:

- the live viewer (React Three Fiber via `ModelMesh`),
- the generated product photography (headless Chromium render pipeline),
- the showroom and the room designer.

This guarantees a single, consistent product identity across every surface —
the photo you see on a product card is a render of the exact model you can orbit
and customize.

### Why procedural geometry instead of static GLB files

The sandbox and CI environment used for this build has no Blender instance and
no external 3D generation tool available, and the repo has no asset pipeline
that can produce authored GLB files offline. Rather than ship fabricated
"GLB ready" files, the team chose the approach the task explicitly allows:
**original procedural 3D models using Three.js / React Three Fiber**, rendered
as real scene geometry (never a flat image plane). A static GLB export path is
documented below for when a Blender-equipped environment is available.

### GLB/glTF export path (future, verified only when run)

To export any model to GLB (e.g. for seller uploads or external tools):

1. `npm i -D @gltf-transform/core @gltf-transform/functions`
2. In a Node script, build the model with `buildModel(kind)`, then serialize
   with `GLTFExporter` from `three/examples/jsm/exporters/GLTFExporter.js`
   (binary = `true`) and write `*.glb`.
3. Validate by re-importing with `GLTFLoader` and comparing mesh names/bounds.

No GLB is claimed to exist in this repository. Uploads are still supported
end-to-end via `src/lib/models/validate.ts` (MIME/ext/size) and the seller flow.

## 2. Model kinds (30)

Defined in `src/lib/models3d/kinds.ts` (`MODEL_KINDS`), each with:

- a builder in `builders.ts`,
- `KIND_PART_NAMES` — which mesh parts exist for configuration,
- `KIND_RENDER_HINTS` — camera/detail hints for photography,
- `KIND_LABELS` — human-readable UI label.

| Kind | Product examples |
|---|---|
| sofa-curved | Meridian Lounge Sofa |
| sectional | Monaco Sectional |
| modular-sofa | Nova Modular Sofa |
| accent-chair | Arc Lounge Chair, Velora |
| lounge-chair | Eclipse, Halden Lounge Chair |
| coffee-table | Basil & Oak, Orion |
| side-table | Atlas, Studio North Nesting |
| tv-console | Noma Media Console, Halden Sideboard, Sienna |
| bed | Serene, Atelier Maison Bed Frame |
| bed-platform | Noir Platform Bed |
| bedside-table | Haven |
| dresser | Luna |
| bench | Cloud, Arc Ottoman |
| dining-table | Morrow, Solstice |
| dining-table-round | Ellipse |
| dining-chair | Arden |
| dining-chair-uph | Vista |
| dining-bench | Monolith |
| desk | Halden Desk, Studio |
| desk-executive | Executive |
| office-chair | Forma |
| shelving | Meridian Bookcase, Grid |
| floor-lamp | Meridian Floor Lamp, Aura |
| pendant | Noma Pendant, Lumen |
| table-lamp | Halo |
| vase | Terra |
| mirror | Arc |
| wall-clock | Orbit |
| planter | Bloom |
| wall-art | Linea |

## 3. Mesh parts & materials

Meshes are named per part so the configurator can restyle them. Common names:

`seat`, `back`, `frame`, `cushions`, `legs`, `top`, `base`, `doors`,
`drawers`, `shelves`, `headboard`, `shade`, `cord`, `pole`, `body`, `hands`.

Materials are `MeshStandardMaterial` with named defaults:

| Material | Default color | Roughness | Used on |
|---|---|---|---|
| fabric_base | #E9E2D4 (ivory linen) | 0.90 | seat/cushions |
| fabric_cushion | #EFE9DC | 0.95 | cushions |
| wood_oak | #C6A97E | 0.35 | frame/top |
| wood_walnut | #5B4636 | 0.30 | top/frame |
| metal_black | #2A2A28 | 0.50 | frame/legs |
| metal_brass | #A88C69 | 0.20 | handles/details |
| leather_base | #262625 | 0.25 | seat/back |
| marble_surface | #E5DEDA | 0.25 | round table top |

Roughness/metalness are set per material; normal/metal/AO maps are not baked so
models stay light on mobile (see Performance).

### Schema → part mapping

Customization options in the product schema carry a `material` override with a
`name` (the mesh part). `buildMaterialMap` produces group-keyed overrides;
`materialOverridesByPart` (in `model-mesh.tsx`) re-keys them by part name, and
`applyPartMaterials` updates only the named meshes. Options that do not affect
geometry (e.g. size) never change the mesh.

## 4. Scale, origin, camera

- Units are meters; origin at floor center; furniture faces +Z.
- The configurator cameras: default / front / side / top presets; orbit/zoom
  enabled; distance clamped 1.2–8 m.
- Render pipeline computes framing from the model's bounding box so every
  product is composed consistently.

## 5. Performance

- Low polygon budgets: cylinders 8–64 segments; rounded boxes `4×4` segments.
- One shadow-casting directional light; `ContactShadows` for studio scenes.
- `dpr` clamped 1–1.5; canvas `frameloop="demand"` when non-interactive.
- Models are built once per kind (`useMemo`) and reused across scenes.
- No full catalog is ever loaded into memory; each view lazily builds only the
  kinds it needs.
- Photography is pre-rendered to WebP (≈80–140 KB each), so listing pages
  never boot a WebGL context.
