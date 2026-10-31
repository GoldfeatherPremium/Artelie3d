/**
 * ATELIER 3D — deterministic vector asset generator.
 *
 * Creates the complete public asset library (`public/assets/**`) from the same
 * brand language as the 3D show: ivory/paper studio scenes, natural oak and
 * walnut, bronze accents, soft shadows. Assets are rendered to WebP with sharp
 * at build time (`npm run prebuild` / `generate:assets`), so the repository
 * stays text-only while deployments receive real, optimized raster files.
 *
 * The offline photorealistic pipeline (scripts/render, headless Chromium) can
 * be run to replace these with raster renders of the actual 3D geometry; the
 * same paths and names are used.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const PUBLIC = join(ROOT, "public");
const ASSETS = join(PUBLIC, "assets");

// ---------------------------------------------------------------------------
// Palette (mirrors globals.css tokens + 3D material defaults)
// ---------------------------------------------------------------------------
const MAT = {
  seat: "#E9E2D4",
  cushion: "#EFE9DC",
  back: "#E3DCCE",
  woodOak: "#C6A97E",
  walnut: "#5B4636",
  ebonized: "#2E2A26",
  black: "#2A2A28",
  steel: "#9A9A98",
  brass: "#A88C69",
  marble: "#E5DEDA",
  travertine: "#E4DCD0",
  linen: "#E8DFD0",
  glassSmoke: "#5A554E",
  leaf: "#5F7A52",
  body: "#C9B6A3",
  paper: "#F4F0E8",
};

// ---------------------------------------------------------------------------
// Product silhouettes (design space: 160×200, ground at y≈180)
// shape = [type, ...args, part]
//   r = [x, y, w, h, part, radius]
//   e = [cx, cy, rx, ry, part]
//   p = [points, part] where points = [[x,y], ...]
//   l = [x1, y1, x2, y2, width, part]
// ---------------------------------------------------------------------------
const SHAPES = {
  "sofa-curved": [
    ["r", 25, 70, 110, 44, "back", 14],
    ["r", 35, 112, 90, 32, "seat", 10],
    ["r", 18, 96, 16, 46, "woodOak", 6],
    ["r", 126, 96, 16, 46, "woodOak", 6],
    ["r", 42, 122, 36, 20, "cushion", 8],
    ["r", 82, 122, 36, 20, "cushion", 8],
    ["r", 52, 170, 7, 10, "black", 3],
    ["r", 101, 170, 7, 10, "black", 3],
  ],
  sectional: [
    ["r", 20, 72, 124, 44, "back", 14],
    ["r", 30, 112, 110, 32, "seat", 10],
    ["r", 14, 94, 16, 48, "woodOak", 6],
    ["r", 128, 118, 30, 52, "seat", 8],
    ["r", 132, 80, 26, 40, "back", 8],
    ["r", 44, 122, 42, 20, "cushion", 8],
    ["r", 88, 122, 34, 20, "cushion", 8],
    ["r", 40, 170, 7, 10, "black", 3],
    ["r", 116, 170, 7, 10, "black", 3],
    ["r", 140, 168, 7, 10, "black", 3],
  ],
  "modular-sofa": [
    ["r", 22, 78, 34, 42, "back", 8],
    ["r", 63, 78, 34, 42, "back", 8],
    ["r", 104, 78, 34, 42, "back", 8],
    ["r", 20, 116, 38, 30, "seat", 8],
    ["r", 61, 116, 38, 30, "seat", 8],
    ["r", 102, 116, 38, 30, "seat", 8],
    ["r", 28, 124, 24, 18, "cushion", 6],
    ["r", 69, 124, 24, 18, "cushion", 6],
    ["r", 110, 124, 24, 18, "cushion", 6],
    ["r", 28, 168, 6, 10, "black", 3],
    ["r", 126, 168, 6, 10, "black", 3],
  ],
  "accent-chair": [
    ["r", 42, 58, 76, 60, "seat", 20],
    ["r", 48, 116, 64, 30, "seat", 10],
    ["r", 34, 92, 14, 42, "woodOak", 6],
    ["r", 112, 92, 14, 42, "woodOak", 6],
    ["r", 50, 170, 8, 8, "black", 3],
    ["r", 102, 170, 8, 8, "black", 3],
  ],
  "lounge-chair": [
    ["r", 48, 70, 64, 56, "seat", 18],
    ["e", 80, 120, 42, 26, "seat"],
    ["e", 80, 178, 40, 12, "steel"],
    ["e", 80, 178, 24, 8, "black"],
  ],
  "coffee-table": [
    ["e", 80, 110, 56, 20, "travertine"],
    ["r", 74, 132, 12, 42, "walnut", 4],
    ["e", 80, 176, 40, 12, "walnut"],
  ],
  "side-table": [
    ["e", 80, 104, 34, 12, "marble"],
    ["r", 76, 118, 8, 46, "black", 3],
    ["e", 80, 174, 30, 10, "black"],
  ],
  "tv-console": [
    ["r", 24, 104, 112, 10, "walnut", 4],
    ["r", 30, 114, 100, 44, "walnut", 6],
    ["r", 38, 120, 40, 32, "walnut", 5],
    ["r", 82, 120, 40, 32, "walnut", 5],
    ["l", 58, 136, 58, 136, 3, "brass"],
    ["l", 102, 136, 102, 136, 3, "brass"],
    ["r", 38, 168, 7, 10, "black", 3],
    ["r", 115, 168, 7, 10, "black", 3],
  ],
  bed: [
    ["r", 14, 56, 132, 56, "seat", 16],
    ["r", 20, 112, 120, 32, "linen", 10],
    ["r", 14, 144, 132, 12, "walnut", 4],
    ["r", 42, 120, 30, 16, "paper", 8],
    ["r", 88, 120, 30, 16, "paper", 8],
    ["r", 30, 168, 8, 10, "black", 3],
    ["r", 122, 168, 8, 10, "black", 3],
  ],
  "bed-platform": [
    ["r", 16, 82, 128, 30, "ebonized", 6],
    ["r", 22, 112, 116, 32, "linen", 10],
    ["r", 16, 144, 128, 18, "walnut", 4],
    ["r", 44, 120, 30, 16, "paper", 8],
    ["r", 86, 120, 30, 16, "paper", 8],
    ["r", 34, 168, 8, 10, "black", 3],
    ["r", 118, 168, 8, 10, "black", 3],
  ],
  "bedside-table": [
    ["r", 52, 106, 56, 8, "walnut", 4],
    ["r", 56, 114, 48, 46, "walnut", 6],
    ["r", 60, 124, 40, 4, "brass"],
    ["r", 58, 166, 7, 10, "black", 3],
    ["r", 95, 166, 7, 10, "black", 3],
  ],
  dresser: [
    ["r", 30, 96, 100, 10, "walnut", 4],
    ["r", 36, 106, 88, 58, "walnut", 6],
    ["l", 48, 120, 112, 120, 3, "brass"],
    ["l", 48, 140, 112, 140, 3, "brass"],
    ["l", 48, 160, 112, 160, 3, "brass"],
    ["r", 44, 164, 8, 12, "black", 3],
    ["r", 108, 164, 8, 12, "black", 3],
  ],
  bench: [
    ["r", 30, 112, 100, 14, "seat", 6],
    ["r", 34, 128, 92, 10, "woodOak", 4],
    ["r", 36, 164, 8, 14, "black", 3],
    ["r", 116, 164, 8, 14, "black", 3],
  ],
  "dining-table": [
    ["r", 20, 104, 120, 10, "walnut", 4],
    ["r", 74, 118, 12, 44, "walnut", 4],
    ["r", 30, 158, 100, 10, "walnut", 4],
  ],
  "dining-table-round": [
    ["e", 80, 104, 52, 16, "marble"],
    ["r", 74, 122, 12, 42, "black", 4],
    ["e", 80, 172, 40, 12, "black"],
  ],
  "dining-chair": [
    ["r", 54, 72, 52, 8, "woodOak", 4],
    ["r", 60, 80, 40, 36, "woodOak", 10],
    ["r", 56, 116, 48, 10, "woodOak", 4],
    ["r", 56, 158, 6, 18, "woodOak", 2],
    ["r", 98, 158, 6, 18, "woodOak", 2],
  ],
  "dining-chair-uph": [
    ["r", 50, 68, 60, 50, "seat", 14],
    ["r", 54, 114, 52, 14, "seat", 6],
    ["r", 56, 156, 6, 18, "steel", 2],
    ["r", 98, 156, 6, 18, "steel", 2],
  ],
  "dining-bench": [
    ["r", 26, 112, 108, 12, "walnut", 4],
    ["r", 26, 128, 8, 26, "walnut", 4],
    ["r", 126, 128, 8, 26, "walnut", 4],
    ["r", 34, 160, 8, 14, "black", 3],
    ["r", 118, 160, 8, 14, "black", 3],
  ],
  desk: [
    ["r", 24, 104, 112, 10, "woodOak", 4],
    ["r", 92, 118, 36, 46, "walnut", 6],
    ["l", 96, 130, 124, 130, 3, "brass"],
    ["l", 96, 150, 124, 150, 3, "brass"],
    ["r", 30, 160, 8, 16, "black", 3],
    ["r", 66, 160, 8, 16, "black", 3],
  ],
  "desk-executive": [
    ["r", 16, 104, 128, 10, "walnut", 4],
    ["r", 26, 118, 36, 46, "walnut", 6],
    ["r", 102, 118, 36, 46, "walnut", 6],
    ["l", 30, 130, 58, 130, 3, "brass"],
    ["l", 106, 130, 134, 130, 3, "brass"],
    ["r", 32, 164, 8, 12, "black", 3],
    ["r", 120, 164, 8, 12, "black", 3],
  ],
  "office-chair": [
    ["r", 56, 70, 48, 46, "seat", 12],
    ["r", 60, 112, 40, 12, "seat", 6],
    ["r", 78, 126, 4, 22, "black", 2],
    ["r", 56, 106, 8, 12, "black", 3],
    ["r", 96, 106, 8, 12, "black", 3],
    ["e", 80, 176, 36, 10, "steel"],
  ],
  shelving: [
    ["r", 44, 70, 8, 100, "woodOak", 3],
    ["r", 108, 70, 8, 100, "woodOak", 3],
    ["r", 44, 78, 72, 6, "woodOak", 2],
    ["r", 44, 104, 72, 6, "woodOak", 2],
    ["r", 44, 130, 72, 6, "woodOak", 2],
    ["r", 44, 156, 72, 6, "woodOak", 2],
  ],
  "floor-lamp": [
    ["e", 80, 176, 26, 8, "black"],
    ["l", 80, 76, 80, 174, 3, "steel"],
    ["p", [[58, 66], [102, 66], [110, 86], [50, 86]], "linen"],
  ],
  pendant: [
    ["l", 80, 28, 80, 94, 2, "black"],
    ["p", [[58, 94], [102, 94], [96, 122], [64, 122]], "glassSmoke"],
    ["r", 78, 92, 4, 6, "brass", 2],
  ],
  "table-lamp": [
    ["e", 80, 176, 20, 8, "walnut"],
    ["r", 76, 142, 8, 30, "walnut", 3],
    ["p", [[58, 116], [102, 116], [96, 142], [64, 142]], "linen"],
  ],
  vase: [
    ["p", [[72, 78], [88, 78], [90, 88], [92, 106], [88, 124], [80, 134], [72, 124], [68, 106], [70, 88]], "body"],
  ],
  mirror: [
    ["r", 52, 58, 56, 122, "walnut", 18],
    ["r", 61, 67, 38, 104, "paper", 14],
    ["r", 54, 178, 7, 10, "black", 3],
    ["r", 99, 178, 7, 10, "black", 3],
  ],
  "wall-clock": [
    ["e", 80, 96, 34, 34, "black"],
    ["e", 80, 96, 28, 28, "paper"],
    ["l", 80, 96, 92, 86, 3, "brass"],
    ["l", 80, 96, 80, 78, 3, "brass"],
  ],
  planter: [
    ["p", [[58, 128], [102, 128], [96, 176], [64, 176]], "body"],
    ["e", 80, 128, 20, 6, "black"],
    ["e", 66, 96, 12, 12, "leaf"],
    ["e", 84, 88, 16, 16, "leaf"],
    ["e", 96, 102, 10, 10, "leaf"],
    ["l", 80, 128, 80, 100, 3, "leaf"],
  ],
  "wall-art": [
    ["r", 36, 60, 88, 80, "black", 4],
    ["r", 42, 66, 76, 68, "paper", 2],
    ["r", 52, 80, 40, 10, "brass"],
    ["r", 60, 96, 30, 8, "walnut"],
    ["r", 72, 112, 24, 8, "steel"],
  ],
};

// ---------------------------------------------------------------------------
// View transforms
// ---------------------------------------------------------------------------
function tr(view) {
  const zoom = view === "detail" ? 1.6 : 1;
  const sx = view === "side" ? 0.5 : 1;
  const sy = 1;
  const scale = 3.05 * zoom;
  const ox = 320 - 80 * scale * sx;
  const oy = 440 + (view === "detail" ? -14 : 0) * scale - 100 * scale;
  return { sx: scale * sx, sy: scale * sy, ox, oy };
}

function shapeToSvg(shape, t) {
  const kind = shape[0];
  if (kind === "r") {
    const [, x, y, w, h, part, radius = 4] = shape;
    const X = t.ox + x * t.sx;
    const Y = t.oy + y * t.sy;
    const W = w * t.sx;
    const H = h * t.sy;
    const R = Math.min(radius * t.sx, W / 2, H / 2);
    return `<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" rx="${R.toFixed(1)}" fill="${MAT[part]}" />`;
  }
  if (kind === "e") {
    const [, cx, cy, rx, ry, part] = shape;
    const X = t.ox + cx * t.sx;
    const Y = t.oy + cy * t.sy;
    return `<ellipse cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" rx="${(rx * t.sx).toFixed(1)}" ry="${(ry * t.sy).toFixed(1)}" fill="${MAT[part]}" />`;
  }
  if (kind === "l") {
    const [, x1, y1, x2, y2, w, part] = shape;
    return `<line x1="${(t.ox + x1 * t.sx).toFixed(1)}" y1="${(t.oy + y1 * t.sy).toFixed(1)}" x2="${(t.ox + x2 * t.sx).toFixed(1)}" y2="${(t.oy + y2 * t.sy).toFixed(1)}" stroke="${MAT[part]}" stroke-width="${(w * t.sx).toFixed(1)}" stroke-linecap="round" />`;
  }
  if (kind === "p") {
    const [, points, part] = shape;
    const pts = points.map(([x, y]) => `${(t.ox + x * t.sx).toFixed(1)},${(t.oy + y * t.sy).toFixed(1)}`).join(" ");
    return `<polygon points="${pts}" fill="${MAT[part]}" />`;
  }
  return "";
}

const SHADOW = `<ellipse cx="320" cy="682" rx="130" ry="16" fill="#241f1a" opacity="0.16" />`;

function productSvg(kind, view) {
  const t = tr(view);
  const body = SHAPES[kind].map((s) => shapeToSvg(s, t)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#faf7f1"/>
      <stop offset="1" stop-color="#efe9df"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9e3d7"/>
      <stop offset="1" stop-color="#ddd5c6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1500" fill="url(#bg)"/>
  <rect y="1160" width="1200" height="340" fill="url(#floor)"/>
  <line x1="0" y1="1160" x2="1200" y2="1160" stroke="#d4cbb9" stroke-width="2"/>
  <rect x="60" y="70" width="300" height="4" fill="#c9bfae" opacity="0.8"/>
  ${view === "lifestyle" ? lifestyleInner(kind) : SHADOW + body}
</svg>`;
}

/** Minimal interior staging for the lifestyle view. */
function lifestyleInner(kind) {
  const t = tr("hero");
  const body = SHAPES[kind].map((s) => shapeToSvg(s, t)).join("\n");
  const shift = `<g transform="translate(-260,120) scale(0.78)">${body}</g>`;
  return `
    <rect x="500" y="150" width="320" height="420" fill="#ffe9c9" opacity="0.85"/>
    <line x1="500" y1="360" x2="820" y2="360" stroke="#2a2a28" stroke-width="3"/>
    <line x1="660" y1="150" x2="660" y2="570" stroke="#2a2a28" stroke-width="3"/>
    <ellipse cx="330" cy="1210" rx="260" ry="40" fill="#d8cdbb" opacity="0.7"/>
    <ellipse cx="330" cy="1190" rx="240" ry="34" fill="#e3dacb"/>
    ${shift}
    <ellipse cx="880" cy="1195" rx="70" ry="14" fill="#cbb9a0"/>
    <g transform="translate(860,1080) scale(0.7)">${SHAPES["vase"].map((s) => shapeToSvg(s, tr("hero"))).join("\n")}</g>
  `;
}

// ---------------------------------------------------------------------------
// Banners + interiors
// ---------------------------------------------------------------------------
function bannerSvg(kind, width, height) {
  const t = { sx: 3.0, sy: 3.0, ox: width / 2 - 80 * 3.0, oy: height / 2 - 100 * 3.0 };
  const body = SHAPES[kind].map((s) => shapeToSvg(s, t)).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f2ea"/>
      <stop offset="1" stop-color="#e9e2d4"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <ellipse cx="${width / 2}" cy="${height * 0.84}" rx="${width * 0.16}" ry="${height * 0.03}" fill="#241f1a" opacity="0.14"/>
  ${body}
</svg>`;
}

const INTERIORS = {
  "living-luxury": { wall: "#efe9df", floor: "#cbb9a0", rug: "#d8cdbb", window: "#ffe9c9", pieces: [["sofa-curved", 0.32, 0.4], ["coffee-table", 0.55, 0.58], ["floor-lamp", 0.8, 0.5], ["planter", 0.18, 0.2]] },
  "living-scandinavian": { wall: "#f7f3ec", floor: "#e8e0d2", rug: "#e3dcd0", window: "#eaf4ff", pieces: [["modular-sofa", 0.34, 0.42], ["coffee-table", 0.56, 0.6], ["table-lamp", 0.78, 0.5], ["bench", 0.2, 0.65]] },
  "bedroom-japandi": { wall: "#e9e1d3", floor: "#d8cdbc", rug: "#cfc2ad", window: "#ffe6c4", pieces: [["bed", 0.45, 0.42], ["bedside-table", 0.14, 0.4], ["bedside-table", 0.76, 0.4], ["bench", 0.45, 0.68]] },
  "bedroom-minimalist": { wall: "#f4efe7", floor: "#e5ddcf", rug: "#e0d7c8", window: "#e9f2ff", pieces: [["bed-platform", 0.45, 0.42], ["bedside-table", 0.14, 0.42], ["floor-lamp", 0.78, 0.6]] },
  "dining-contemporary": { wall: "#f0eae0", floor: "#cfc4b2", rug: null, window: "#ffe9c9", pieces: [["dining-table-round", 0.5, 0.5], ["dining-chair-uph", 0.3, 0.35], ["dining-chair-uph", 0.7, 0.35], ["tv-console", 0.5, 0.78], ["pendant", 0.5, 0.15]] },
  "office-luxury": { wall: "#e7dfd2", floor: "#cbbc9f", rug: "#cbb9a0", window: "#eaf4ff", pieces: [["desk-executive", 0.4, 0.45], ["office-chair", 0.4, 0.62], ["shelving", 0.78, 0.4], ["floor-lamp", 0.2, 0.6]] },
  "apartment-modern": { wall: "#f1ece3", floor: "#d9d0c2", rug: "#e0d6c6", window: "#ffe9c9", pieces: [["sectional", 0.34, 0.4], ["coffee-table", 0.56, 0.58], ["tv-console", 0.5, 0.76], ["floor-lamp", 0.82, 0.5]] },
  "apartment-studio": { wall: "#f5f0e8", floor: "#e0d8ca", rug: null, window: "#e9f2ff", pieces: [["bed-platform", 0.3, 0.6], ["accent-chair", 0.68, 0.45], ["side-table", 0.82, 0.62], ["shelving", 0.2, 0.3]] },
  "organic-modern": { wall: "#efe7da", floor: "#d0c2ac", rug: "#d6cbb8", window: "#ffe3bb", pieces: [["lounge-chair", 0.32, 0.5], ["coffee-table", 0.55, 0.6], ["mirror", 0.72, 0.3], ["planter", 0.8, 0.62]] },
  penthouse: { wall: "#f0ebe2", floor: "#cfc4b2", rug: "#e3dacb", window: "#ffe9c9", pieces: [["sofa-curved", 0.3, 0.42], ["coffee-table", 0.5, 0.58], ["dining-table-round", 0.78, 0.5], ["pendant", 0.78, 0.15]] },
  "showroom-designer": { wall: "#f4f0e8", floor: "#dfd7c9", rug: null, window: null, pieces: [["sofa-curved", 0.35, 0.45], ["accent-chair", 0.7, 0.4], ["coffee-table", 0.55, 0.62], ["floor-lamp", 0.16, 0.55]] },
  "architectural-interior": { wall: "#efe9df", floor: "#d5ccbd", rug: "#d8cdbb", window: "#ffe9c9", pieces: [["sectional", 0.3, 0.45], ["coffee-table", 0.5, 0.6], ["dining-table", 0.78, 0.5], ["floor-lamp", 0.16, 0.5]] },
};

function interiorSvg(id) {
  const cfg = INTERIORS[id];
  const w = 1600;
  const h = 1067;
  const wallH = Math.round(h * 0.58);
  const pieces = (cfg.pieces ?? [])
    .map(([kind, fx, fy], i) => {
      const t = { sx: 1.9, sy: 1.9, ox: fx * w - 80 * 1.9, oy: wallH + fy * (h - wallH) - 100 * 1.9 };
      const body = SHAPES[kind].map((s) => shapeToSvg(s, t)).join("\n");
      return `<g transform="scale(${0.85 + (i % 3) * 0.1})">${body}</g>`;
    })
    .join("\n");
  const win = cfg.window
    ? `<g><rect x="${w * 0.66}" y="${h * 0.08}" width="${w * 0.22}" height="${wallH * 0.72}" fill="${cfg.window}" opacity="0.9"/><line x1="${w * 0.66}" y1="${h * 0.08 + wallH * 0.36}" x2="${w * 0.88}" y2="${h * 0.08 + wallH * 0.36}" stroke="#2a2a28" stroke-width="3"/><line x1="${w * 0.77}" y1="${h * 0.08}" x2="${w * 0.77}" y2="${h * 0.08 + wallH * 0.72}" stroke="#2a2a28" stroke-width="3"/></g>`
    : "";
  const rug = cfg.rug ? `<ellipse cx="${w * 0.5}" cy="${wallH + (h - wallH) * 0.78}" rx="${w * 0.22}" ry="${(h - wallH) * 0.22}" fill="${cfg.rug}" opacity="0.85"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${wallH}" fill="${cfg.wall}"/>
  <rect y="${wallH}" width="${w}" height="${h - wallH}" fill="${cfg.floor}"/>
  <line x1="0" y1="${wallH}" x2="${w}" y2="${wallH}" stroke="#c9bfae" stroke-width="2"/>
  ${win}
  ${rug}
  ${pieces}
</svg>`;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
async function emit(svg, width, height, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg)).resize({ width, height }).webp({ quality: 82, effort: 4 }).toFile(outPath);
}

const PRODUCTS = [
  ["meridian-lounge-sofa", "sofa-curved"],
  ["arc-lounge-chair", "accent-chair"],
  ["morrow-dining-table", "dining-table"],
  ["halden-sideboard", "tv-console"],
  ["basil-oak-coffee-table", "coffee-table"],
  ["meridian-floor-lamp", "floor-lamp"],
  ["noma-media-console", "tv-console"],
  ["halden-desk", "desk"],
  ["atelier-maison-bed-frame", "bed"],
  ["noma-pendant-light", "pendant"],
  ["studio-north-nesting-tables", "side-table"],
  ["meridian-bookcase", "shelving"],
  ["arc-ottoman", "bench"],
  ["halden-lounge-chair", "lounge-chair"],
  ["monaco-sectional", "sectional"],
  ["nova-modular-sofa", "modular-sofa"],
  ["noir-platform-bed", "bed-platform"],
  ["haven-bedside-table", "bedside-table"],
  ["luna-dresser", "dresser"],
  ["ellipse-round-dining-table", "dining-table-round"],
  ["arden-dining-chair", "dining-chair"],
  ["vista-dining-chair", "dining-chair-uph"],
  ["executive-desk", "desk-executive"],
  ["forma-office-chair", "office-chair"],
  ["halo-table-lamp", "table-lamp"],
  ["terra-ceramic-vase", "vase"],
  ["arc-wall-mirror", "mirror"],
  ["orbit-wall-clock", "wall-clock"],
  ["bloom-planter", "planter"],
  ["linea-wall-art", "wall-art"],
];

const CATEGORIES = [
  ["sofas", "sofa-curved"],
  ["armchairs", "accent-chair"],
  ["tables", "dining-table"],
  ["lighting", "floor-lamp"],
  ["storage", "shelving"],
  ["bedroom", "bed"],
  ["office", "desk"],
  ["decor", "vase"],
];

const COLLECTIONS = [
  ["quiet-luxury", "sofa-curved"],
  ["the-foundry", "coffee-table"],
  ["sculptural-forms", "lounge-chair"],
  ["nordic-light", "dining-chair"],
  ["archive-01", "desk"],
];

const VIEWS = ["hero", "front", "side", "detail", "lifestyle"];

async function main() {
  const started = Date.now();
  let count = 0;

  for (const [slug, kind] of PRODUCTS) {
    for (const view of VIEWS) {
      const out = join(ASSETS, "products", slug, `${view}.webp`);
      await emit(productSvg(kind, view), 1200, 1500, out);
      count += 1;
    }
  }

  for (const [slug, kind] of CATEGORIES) {
    const out = join(ASSETS, "categories", `${slug}.webp`);
    await emit(bannerSvg(kind, 1200, 900), 1200, 900, out);
    count += 1;
  }

  for (const [slug, kind] of COLLECTIONS) {
    const out = join(ASSETS, "collections", `${slug}.webp`);
    await emit(bannerSvg(kind, 1920, 1080), 1920, 1080, out);
    count += 1;
  }

  for (const id of Object.keys(INTERIORS)) {
    const out = join(ASSETS, "interiors", `${id}.webp`);
    await emit(interiorSvg(id), 1600, 1067, out);
    count += 1;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: "scripts/generate-assets.mjs",
    counts: { products: PRODUCTS.length, viewsPerProduct: VIEWS.length, categories: CATEGORIES.length, collections: COLLECTIONS.length, interiors: Object.keys(INTERIORS).length, total: count },
    products: Object.fromEntries(PRODUCTS.map(([slug]) => [slug, VIEWS.map((v) => `/assets/products/${slug}/${v}.webp`)])),
    categories: Object.fromEntries(CATEGORIES.map(([slug]) => [slug, `/assets/categories/${slug}.webp`])),
    collections: Object.fromEntries(COLLECTIONS.map(([slug]) => [slug, `/assets/collections/${slug}.webp`])),
    interiors: Object.fromEntries(Object.keys(INTERIORS).map((id) => [id, `/assets/interiors/${id}.webp`])),
  };
  writeFileSync(join(ASSETS, "manifest.json"), JSON.stringify(manifest, null, 2));
  count += 1;

  console.log(`generated ${count} assets under public/assets in ${Date.now() - started}ms`);
}

main().catch((err) => {
  console.error("asset generation failed:", err);
  process.exit(1);
});
