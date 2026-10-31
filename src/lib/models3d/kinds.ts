/**
 * Model kind catalogue. Every kind maps to a procedural builder in ./builders.ts
 * and is exposed to the configurator (scene-content), the showroom, the room
 * designer and the offline render pipeline (scripts/render).
 */

export type ModelKind =
  | "sofa-curved"
  | "sectional"
  | "modular-sofa"
  | "accent-chair"
  | "lounge-chair"
  | "coffee-table"
  | "side-table"
  | "tv-console"
  | "bed"
  | "bed-platform"
  | "bedside-table"
  | "dresser"
  | "bench"
  | "dining-table"
  | "dining-table-round"
  | "dining-chair"
  | "dining-chair-uph"
  | "dining-bench"
  | "desk"
  | "desk-executive"
  | "office-chair"
  | "shelving"
  | "floor-lamp"
  | "pendant"
  | "table-lamp"
  | "vase"
  | "mirror"
  | "wall-clock"
  | "planter"
  | "wall-art";

export const MODEL_KINDS: ModelKind[] = [
  "sofa-curved",
  "sectional",
  "modular-sofa",
  "accent-chair",
  "lounge-chair",
  "coffee-table",
  "side-table",
  "tv-console",
  "bed",
  "bed-platform",
  "bedside-table",
  "dresser",
  "bench",
  "dining-table",
  "dining-table-round",
  "dining-chair",
  "dining-chair-uph",
  "dining-bench",
  "desk",
  "desk-executive",
  "office-chair",
  "shelving",
  "floor-lamp",
  "pendant",
  "table-lamp",
  "vase",
  "mirror",
  "wall-clock",
  "planter",
  "wall-art",
];

/**
 * Signature mesh-part names per kind. Used by the configurator to apply a
 * material override to the meshes that carry this name.
 */
export const KIND_PART_NAMES: Record<ModelKind, string[]> = {
  "sofa-curved": ["seat", "frame", "back", "cushions", "legs"],
  sectional: ["seat", "frame", "back", "cushions", "legs"],
  "modular-sofa": ["seat", "frame", "back", "cushions", "legs"],
  "accent-chair": ["seat", "frame", "back", "legs"],
  "lounge-chair": ["seat", "frame", "back", "legs"],
  "coffee-table": ["top", "base", "legs"],
  "side-table": ["top", "base", "legs"],
  "tv-console": ["frame", "top", "legs", "doors"],
  bed: ["frame", "headboard", "legs"],
  "bed-platform": ["frame", "headboard", "legs"],
  "bedside-table": ["frame", "top", "legs", "drawers"],
  dresser: ["frame", "top", "legs", "drawers"],
  bench: ["seat", "frame", "legs"],
  "dining-table": ["top", "base", "legs"],
  "dining-table-round": ["top", "base", "legs"],
  "dining-chair": ["seat", "back", "legs"],
  "dining-chair-uph": ["seat", "back", "frame", "legs"],
  "dining-bench": ["seat", "frame", "legs"],
  desk: ["top", "frame", "legs", "drawers"],
  "desk-executive": ["top", "frame", "legs", "drawers"],
  "office-chair": ["seat", "back", "frame", "legs"],
  shelving: ["frame", "shelves"],
  "floor-lamp": ["base", "pole", "shade"],
  pendant: ["shade", "cord"],
  "table-lamp": ["base", "shade"],
  vase: ["body"],
  mirror: ["frame"],
  "wall-clock": ["body", "hands"],
  planter: ["body"],
  "wall-art": ["body"],
};

/**
 * Optional camera/detail hints for the render pipeline. Offsets are in world
 * units relative to the model origin; `detailTarget` is where the detail view
 * camera should point.
 */
export interface KindRenderHint {
  detailTarget?: [number, number, number];
  detailFov?: number;
  scale?: number;
}

export const KIND_RENDER_HINTS: Partial<Record<ModelKind, KindRenderHint>> = {
  "sofa-curved": { detailTarget: [0, 0.7, 0.55], detailFov: 28 },
  sectional: { detailTarget: [-0.6, 0.7, 0.5], detailFov: 30 },
  "modular-sofa": { detailTarget: [0, 0.6, 0.5], detailFov: 28 },
  "accent-chair": { detailTarget: [0, 0.7, 0.45], detailFov: 28 },
  "lounge-chair": { detailTarget: [0, 0.75, 0.5], detailFov: 28 },
  "coffee-table": { detailTarget: [0, 0.35, 0.35], detailFov: 26 },
  "side-table": { detailTarget: [0, 0.5, 0.3], detailFov: 26 },
  "tv-console": { detailTarget: [0, 0.35, 0.3], detailFov: 28 },
  bed: { detailTarget: [0, 0.6, 0.6], detailFov: 30 },
  "bed-platform": { detailTarget: [0, 0.5, 0.6], detailFov: 30 },
  "bedside-table": { detailTarget: [0, 0.55, 0.3], detailFov: 26 },
  dresser: { detailTarget: [0, 0.6, 0.35], detailFov: 28 },
  bench: { detailTarget: [0, 0.4, 0.4], detailFov: 28 },
  "dining-table": { detailTarget: [0, 0.8, 0.5], detailFov: 30 },
  "dining-table-round": { detailTarget: [0, 0.75, 0.4], detailFov: 30 },
  "dining-chair": { detailTarget: [0, 0.55, 0.3], detailFov: 28 },
  "dining-chair-uph": { detailTarget: [0, 0.55, 0.3], detailFov: 28 },
  "dining-bench": { detailTarget: [0, 0.45, 0.35], detailFov: 28 },
  desk: { detailTarget: [0, 0.8, 0.5], detailFov: 30 },
  "desk-executive": { detailTarget: [0, 0.7, 0.45], detailFov: 30 },
  "office-chair": { detailTarget: [0, 0.7, 0.4], detailFov: 28 },
  shelving: { detailTarget: [0, 1.1, 0.3], detailFov: 30 },
  "floor-lamp": { detailTarget: [0, 1.6, 0.3], detailFov: 28 },
  pendant: { detailTarget: [0, 1.2, 0.2], detailFov: 30 },
  "table-lamp": { detailTarget: [0, 0.45, 0.25], detailFov: 26 },
  vase: { detailTarget: [0, 0.35, 0.2], detailFov: 24 },
  mirror: { detailTarget: [0, 1.15, 0.05], detailFov: 28 },
  "wall-clock": { detailTarget: [0, 1.1, 0.05], detailFov: 24 },
  planter: { detailTarget: [0, 0.5, 0.25], detailFov: 26 },
  "wall-art": { detailTarget: [0, 1.1, 0.05], detailFov: 26 },
};

/** Human-readable label used in UI lists. */
export const KIND_LABELS: Record<ModelKind, string> = {
  "sofa-curved": "Curved Sofa",
  sectional: "L-shaped Sectional",
  "modular-sofa": "Modular Sofa",
  "accent-chair": "Accent Chair",
  "lounge-chair": "Lounge Chair",
  "coffee-table": "Coffee Table",
  "side-table": "Side Table",
  "tv-console": "TV Console",
  bed: "Upholstered Bed",
  "bed-platform": "Platform Bed",
  "bedside-table": "Bedside Table",
  dresser: "Dresser",
  bench: "Bench",
  "dining-table": "Dining Table",
  "dining-table-round": "Round Dining Table",
  "dining-chair": "Dining Chair",
  "dining-chair-uph": "Upholstered Dining Chair",
  "dining-bench": "Dining Bench",
  desk: "Desk",
  "desk-executive": "Executive Desk",
  "office-chair": "Office Chair",
  shelving: "Shelving Unit",
  "floor-lamp": "Floor Lamp",
  pendant: "Pendant Light",
  "table-lamp": "Table Lamp",
  vase: "Vase",
  mirror: "Wall Mirror",
  "wall-clock": "Wall Clock",
  planter: "Planter",
  "wall-art": "Wall Art",
};
