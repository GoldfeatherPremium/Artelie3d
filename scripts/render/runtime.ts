/**
 * Offline render runtime (bundled by esbuild -> runtime.mjs, opened inside the
 * headless Chromium render page). It builds a Three.js scene from URL params
 * and declares readiness once the first frame has been drawn. The capture
 * script screenshots it.
 *
 * Modes:
 *   mode=product&kind=<ModelKind>&view=hero|front|side|detail|lifestyle&mats=<json>
 *   mode=interior&id=<interiorId>
 *   mode=category&kind=<ModelKind>&banner=1
 *   mode=collection&kind=<ModelKind>
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildModel, applyPartMaterials, isModelKind, type ModelKind } from "../../src/lib/models3d/builders";
import { KIND_RENDER_HINTS } from "../../src/lib/models3d/kinds";

const canvas = document.getElementById("viewport") as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  return { w, h };
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "product";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f0e8);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
key.position.set(4, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 24;
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
scene.add(key);

const fill = new THREE.DirectionalLight(0xbcd2ff, 0.8);
fill.position.set(-5, 3, -3);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(0, 4, -6);
scene.add(rim);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// ---------------------------------------------------------------------------
// Ground + backdrop
// ---------------------------------------------------------------------------
function addFloor(color: string) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}

function addBackdrop(color: string, depth = 8) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mat);
  back.position.set(0, 5, -depth);
  back.receiveShadow = true;
  scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mat);
  left.position.set(-depth, 5, 0);
  left.rotation.y = Math.PI / 2;
  scene.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mat);
  right.position.set(depth, 5, 0);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);
}

// ---------------------------------------------------------------------------
// Product scene (studio)
// ---------------------------------------------------------------------------
function symmetricShadow(radius: number) {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ color: 0x241f1a, transparent: true, opacity: 0.28 }),
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.004;
  scene.add(s);
}

const VIEW_DIRS: Record<string, [number, number, number]> = {
  hero: [0.65, 0.55, 0.85],
  front: [0, 0.35, 1],
  side: [1, 0.4, 0.08],
  detail: [0.45, 0.2, 0.7],
};

function buildProductScene() {
  const kindParam = params.get("kind") || "";
  if (!isModelKind(kindParam)) throw new Error(`unknown kind ${kindParam}`);
  const kind = kindParam as ModelKind;
  const view = params.get("view") || "hero";
  const matsJson = params.get("mats");
  let mats: Record<string, { color?: string; roughness?: number }> = {};
  if (matsJson) {
    try {
      mats = JSON.parse(matsJson);
    } catch {
      /* ignore malformed */
    }
  }

  addFloor("#eae5da");
  addBackdrop("#f4f0e8");

  const group = buildModel(kind);
  applyPartMaterials(group, mats);
  scene.add(group);

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  center.y = 0.35;

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const dir = view === "detail" ? VIEW_DIRS.detail : VIEW_DIRS[view] ?? VIEW_DIRS.hero;
  const hint = KIND_RENDER_HINTS[kind];

  let camPos: THREE.Vector3;
  let target = new THREE.Vector3(0, 0.55, 0);
  let fov = 36;

  if (view === "detail") {
    const t = hint?.detailTarget ?? [0, 0.6, 0.4];
    target = new THREE.Vector3(...t);
    const d = 1.15 * maxDim + 0.35;
    camPos = target.clone().add(new THREE.Vector3(dir[0] * d, dir[1] * d * 0.8, dir[2] * d));
    fov = hint?.detailFov ?? 28;
  } else {
    const d = (maxDim / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2))) * 1.5;
    camPos = new THREE.Vector3(dir[0] * d, 0.9 + dir[1] * d * 0.6, dir[2] * d);
  }

  camera.position.copy(camPos);
  camera.lookAt(target);
  camera.fov = fov;
  camera.updateProjectionMatrix();

  const shadowR = Math.max(size.x, size.z) * 0.62 + 0.15;
  symmetricShadow(shadowR);

  return { viewWidth: 1500, viewHeight: 1875 };
}

// ---------------------------------------------------------------------------
// Interiors
// ---------------------------------------------------------------------------
interface Placed {
  kind: ModelKind;
  pos: [number, number, number];
  rotY: number;
  scale?: number;
  mats?: Record<string, { color?: string; roughness?: number }>;
}

interface InteriorDef {
  floor: string;
  wall: string;
  accent: string;
  roomW: number;
  roomD: number;
  roomH: number;
  window: { sx: number; sy: number; x: number; y: number; color: string; intensity: number } | null;
  rug?: { w: number; d: number; color: string };
  art?: { w: number; h: number; x: number; y: number; color: string }[];
  pieces: Placed[];
  cam: { pos: [number, number, number]; target: [number, number, number]; fov: number };
}

function buildRoom(interior: InteriorDef) {
  const { roomW, roomD, roomH } = interior;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ color: interior.floor, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: interior.wall, roughness: 0.94 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
  back.position.set(0, roomH / 2, -roomD / 2);
  back.receiveShadow = true;
  scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
  left.position.set(-roomW / 2, roomH / 2, 0);
  left.rotation.y = Math.PI / 2;
  scene.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
  right.position.set(roomW / 2, roomH / 2, 0);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, roomD),
    new THREE.MeshStandardMaterial({ color: interior.wall, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomH;
  scene.add(ceiling);

  if (interior.rug) {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(interior.rug.w, interior.rug.d),
      new THREE.MeshStandardMaterial({ color: interior.rug.color, roughness: 0.95 }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.01;
    scene.add(rug);
  }

  for (const a of interior.art ?? []) {
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(a.w, a.h),
      new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.5 }),
    );
    frame.position.set(a.x, a.y, -roomD / 2 + 0.02);
    scene.add(frame);
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(a.w - 0.1, a.h - 0.1),
      new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.8 }),
    );
    inner.position.set(a.x, a.y, -roomD / 2 + 0.03);
    scene.add(inner);
  }

  if (interior.window) {
    const w = interior.window;
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(w.sx, w.sy),
      new THREE.MeshStandardMaterial({
        color: w.color,
        emissive: w.color,
        emissiveIntensity: w.intensity,
        roughness: 0.4,
      }),
    );
    pane.position.set(w.x, w.y, -roomD / 2 + 0.01);
    pane.rotation.y = Math.PI;
    scene.add(pane);
    const frameV = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, w.sy, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.6 }),
    );
    frameV.position.set(w.x, w.y, -roomD / 2 + 0.02);
    scene.add(frameV);
    const frameH = new THREE.Mesh(
      new THREE.BoxGeometry(w.sx, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.6 }),
    );
    frameH.position.set(w.x, w.y, -roomD / 2 + 0.02);
    scene.add(frameH);
  }

  for (const p of interior.pieces) {
    const g = buildModel(p.kind);
    const s = p.scale ?? 1;
    g.scale.setScalar(s);
    g.position.set(...p.pos);
    g.rotation.y = p.rotY;
    if (p.mats) applyPartMaterials(g, p.mats);
    scene.add(g);
  }

  camera.position.set(...interior.cam.pos);
  camera.lookAt(new THREE.Vector3(...interior.cam.target));
  camera.fov = interior.cam.fov;
  camera.updateProjectionMatrix();
}

function buildInteriorScene() {
  const id = params.get("id") || "living-luxury";
  const def = INTERIORS[id] ?? INTERIORS["living-luxury"];
  buildRoom(def);
  return { viewWidth: 1600, viewHeight: 1067 };
}

// ---------------------------------------------------------------------------
// Interior catalogue
// ---------------------------------------------------------------------------
const INTERIORS: Record<string, InteriorDef> = {
  "living-luxury": {
    floor: "#cbb9a0",
    wall: "#efe9df",
    accent: "#b8a68c",
    roomW: 8, roomD: 6, roomH: 3,
    window: { sx: 3.4, sy: 2.4, x: 2.6, y: 1.8, color: "#ffe9c9", intensity: 0.9 },
    rug: { w: 3.4, d: 2.4, color: "#d8cdbb" },
    art: [{ w: 1.4, h: 1.9, x: -2.4, y: 1.8, color: "#c9a780" }],
    pieces: [
      { kind: "sofa-curved", pos: [-0.5, 0, 0.6], rotY: 0, scale: 0.98 },
      { kind: "coffee-table", pos: [0.6, 0, -0.4], rotY: 0.4 },
      { kind: "floor-lamp", pos: [2.3, 0, -1.4], rotY: 0.3 },
      { kind: "vase", pos: [1.6, 0, 1.6], rotY: 0, scale: 0.9 },
      { kind: "planter", pos: [-2.6, 0, 1.2], rotY: 0.9, scale: 1.1 },
      { kind: "side-table", pos: [1.7, 0, 0.9], rotY: 0.2 },
      { kind: "table-lamp", pos: [1.7, 0.56, 0.9], rotY: 0 },
    ],
    cam: { pos: [2.2, 1.7, 3.4], target: [0, 0.9, 0], fov: 42 },
  },
  "living-scandinavian": {
    floor: "#e8e0d2",
    wall: "#f7f3ec",
    accent: "#cfc4b2",
    roomW: 7.5, roomD: 5.6, roomH: 2.9,
    window: { sx: 3, sy: 2.2, x: 2.4, y: 1.7, color: "#eaf4ff", intensity: 0.8 },
    rug: { w: 3, d: 2.2, color: "#e3dcd0" },
    art: [
      { w: 0.7, h: 0.9, x: -1.4, y: 1.8, color: "#a9ae9b" },
      { w: 0.7, h: 0.9, x: -0.5, y: 1.8, color: "#c9a780" },
    ],
    pieces: [
      { kind: "modular-sofa", pos: [-0.6, 0, 0.8], rotY: 0 },
      { kind: "coffee-table", pos: [0.5, 0, -0.5], rotY: 0 },
      { kind: "table-lamp", pos: [1.6, 0.42, 1.2], rotY: 0, scale: 0.8 },
      { kind: "bench", pos: [1.8, 0, -1.2], rotY: 1.2 },
      { kind: "vase", pos: [-1.3, 0, -1.4], rotY: 0, scale: 0.8 },
      { kind: "pendant", pos: [0.6, 2.4, -0.5], rotY: 0 },
    ],
    cam: { pos: [2.4, 1.6, 3.2], target: [0, 0.9, 0], fov: 44 },
  },
  "bedroom-japandi": {
    floor: "#d8cdbc",
    wall: "#e9e1d3",
    accent: "#b3a58f",
    roomW: 7, roomD: 5.4, roomH: 2.8,
    window: { sx: 2.6, sy: 2, x: 2.2, y: 1.6, color: "#ffe6c4", intensity: 0.8 },
    rug: { w: 2.2, d: 2.8, color: "#cfc2ad" },
    art: [{ w: 1.6, h: 0.9, x: 0, y: 2.1, color: "#c0a98a" }],
    pieces: [
      { kind: "bed", pos: [0, 0, -1.1], rotY: 0 },
      { kind: "bedside-table", pos: [-1.0, 0, -1.2], rotY: 0 },
      { kind: "bedside-table", pos: [1.0, 0, -1.2], rotY: 0 },
      { kind: "table-lamp", pos: [-1.0, 0.48, -1.2], rotY: 0, scale: 0.75 },
      { kind: "table-lamp", pos: [1.0, 0.48, -1.2], rotY: 0, scale: 0.75 },
      { kind: "bench", pos: [0, 0, 0.6], rotY: 0, scale: 0.85 },
      { kind: "planter", pos: [2.4, 0, 1.4], rotY: 0.6, scale: 0.9 },
    ],
    cam: { pos: [0.2, 1.7, 3.6], target: [0, 1, -0.3], fov: 44 },
  },
  "bedroom-minimalist": {
    floor: "#e5ddcf",
    wall: "#f4efe7",
    accent: "#c9c0b2",
    roomW: 6.6, roomD: 5, roomH: 2.8,
    window: { sx: 2.4, sy: 2, x: 2, y: 1.6, color: "#e9f2ff", intensity: 0.7 },
    rug: { w: 2, d: 2.6, color: "#e0d7c8" },
    art: [{ w: 1.4, h: 0.8, x: 0, y: 2, color: "#8f8a82" }],
    pieces: [
      { kind: "bed-platform", pos: [0, 0, -1], rotY: 0 },
      { kind: "bedside-table", pos: [-0.95, 0, -1.1], rotY: 0 },
      { kind: "bedside-table", pos: [0.95, 0, -1.1], rotY: 0 },
      { kind: "floor-lamp", pos: [-2.1, 0, 0.8], rotY: 0.4 },
      { kind: "side-table", pos: [2, 0, 1.1], rotY: 0.3 },
    ],
    cam: { pos: [-0.4, 1.6, 3.3], target: [0, 0.9, -0.2], fov: 46 },
  },
  "dining-contemporary": {
    floor: "#cfc4b2",
    wall: "#f0eae0",
    accent: "#a99e8c",
    roomW: 7, roomD: 5.5, roomH: 3,
    window: { sx: 2.8, sy: 2.2, x: 2.2, y: 1.7, color: "#ffe9c9", intensity: 0.85 },
    art: [{ w: 2, h: 1.1, x: 0, y: 2.1, color: "#8b6f52" }],
    pieces: [
      { kind: "dining-table-round", pos: [0, 0, 0.2], rotY: 0 },
      { kind: "dining-chair-uph", pos: [1.25, 0, 0.2], rotY: -Math.PI / 2 },
      { kind: "dining-chair-uph", pos: [-1.25, 0, 0.2], rotY: Math.PI / 2 },
      { kind: "dining-chair-uph", pos: [0, 0, -1.25], rotY: Math.PI },
      { kind: "dining-chair-uph", pos: [0, 0, 1.65], rotY: 0 },
      { kind: "tv-console", pos: [0, 0, -2.1], rotY: 0, scale: 0.92 },
      { kind: "dresser", pos: [-2.3, 0, -0.6], rotY: 0.6, scale: 0.85 },
      { kind: "pendant", pos: [0, 2.6, 0.2], rotY: 0 },
      { kind: "vase", pos: [0, 0.79, 0.65], rotY: 0, scale: 0.7 },
    ],
    cam: { pos: [2.3, 1.8, 3.6], target: [0, 0.9, 0.1], fov: 42 },
  },
  "office-luxury": {
    floor: "#cbbc9f",
    wall: "#e7dfd2",
    accent: "#b09a7d",
    roomW: 7, roomD: 5.2, roomH: 3,
    window: { sx: 3.2, sy: 2.3, x: 2.2, y: 1.8, color: "#eaf4ff", intensity: 0.8 },
    rug: { w: 2.6, d: 1.8, color: "#cbb9a0" },
    art: [{ w: 1.2, h: 1.6, x: -2.3, y: 1.8, color: "#3a3a38" }],
    pieces: [
      { kind: "desk-executive", pos: [0, 0, 0.4], rotY: 0 },
      { kind: "office-chair", pos: [0, 0, -0.7], rotY: 0 },
      { kind: "shelving", pos: [-2.4, 0, -1.6], rotY: 0 },
      { kind: "floor-lamp", pos: [2.3, 0, -1.2], rotY: 0.5 },
      { kind: "planter", pos: [-2.6, 0, 1.2], rotY: 0.8, scale: 0.9 },
    ],
    cam: { pos: [2.2, 1.7, 3.5], target: [0, 0.9, 0], fov: 44 },
  },
  "apartment-modern": {
    floor: "#d9d0c2",
    wall: "#f1ece3",
    accent: "#bcb0a0",
    roomW: 8, roomD: 6, roomH: 3,
    window: { sx: 3.6, sy: 2.4, x: 2.8, y: 1.8, color: "#ffe9c9", intensity: 0.85 },
    rug: { w: 3.2, d: 2.4, color: "#e0d6c6" },
    art: [{ w: 1.6, h: 1.2, x: -1.4, y: 1.9, color: "#6b5b4a" }],
    pieces: [
      { kind: "sectional", pos: [-0.8, 0, 0.7], rotY: 0, scale: 0.95 },
      { kind: "coffee-table", pos: [0.9, 0, -0.4], rotY: 0.2 },
      { kind: "tv-console", pos: [0.5, 0, -2.2], rotY: 0 },
      { kind: "floor-lamp", pos: [2.5, 0, 1.3], rotY: 0.6 },
      { kind: "vase", pos: [-2.2, 0, -1], rotY: 0, scale: 0.85 },
    ],
    cam: { pos: [2.6, 1.8, 3.6], target: [0, 0.9, -0.2], fov: 42 },
  },
  "apartment-studio": {
    floor: "#e0d8ca",
    wall: "#f5f0e8",
    accent: "#c9bfae",
    roomW: 6.5, roomD: 4.8, roomH: 2.9,
    window: { sx: 2.6, sy: 2.1, x: 2.1, y: 1.7, color: "#e9f2ff", intensity: 0.75 },
    pieces: [
      { kind: "bed-platform", pos: [-1.4, 0, -1.2], rotY: Math.PI / 2, scale: 0.9 },
      { kind: "accent-chair", pos: [1.4, 0, 0.4], rotY: -0.8 },
      { kind: "side-table", pos: [1.9, 0, 1.2], rotY: 0 },
      { kind: "floor-lamp", pos: [0.4, 0, -1.5], rotY: 0.4 },
      { kind: "shelving", pos: [-2.2, 0, 0.6], rotY: 0, scale: 0.8 },
      { kind: "planter", pos: [0.6, 0, 1.8], rotY: 0.5, scale: 0.8 },
    ],
    cam: { pos: [2.0, 1.7, 3.2], target: [-0.3, 0.9, 0], fov: 46 },
  },
  "organic-modern": {
    floor: "#d0c2ac",
    wall: "#efe7da",
    accent: "#b7a78e",
    roomW: 7, roomD: 5.4, roomH: 2.9,
    window: { sx: 3, sy: 2.2, x: 2.4, y: 1.7, color: "#ffe3bb", intensity: 0.9 },
    rug: { w: 2.8, d: 2.2, color: "#d6cbb8" },
    art: [{ w: 1.1, h: 1.5, x: -2.1, y: 1.8, color: "#a68e76" }],
    pieces: [
      { kind: "lounge-chair", pos: [-1.2, 0, 0.5], rotY: 0.5 },
      { kind: "coffee-table", pos: [0.3, 0, -0.6], rotY: 0.3 },
      { kind: "planter", pos: [2.3, 0, 1.1], rotY: 0.7, scale: 1.15 },
      { kind: "mirror", pos: [1.9, 0, -1.8], rotY: 0.4 },
      { kind: "bench", pos: [-1.9, 0, -1.6], rotY: 0.9 },
      { kind: "vase", pos: [0.9, 0.44, -0.75], rotY: 0, scale: 0.85 },
    ],
    cam: { pos: [2.2, 1.6, 3.4], target: [0, 0.8, 0], fov: 44 },
  },
  penthouse: {
    floor: "#cfc4b2",
    wall: "#f0ebe2",
    accent: "#a99e8c",
    roomW: 9, roomD: 6.5, roomH: 3.2,
    window: { sx: 5, sy: 2.8, x: 3, y: 2, color: "#ffe9c9", intensity: 1 },
    rug: { w: 3.6, d: 2.6, color: "#e3dacb" },
    art: [{ w: 2.2, h: 1.4, x: -2.6, y: 2.1, color: "#c9a780" }],
    pieces: [
      { kind: "sofa-curved", pos: [-1.1, 0, 0.8], rotY: 0.2 },
      { kind: "coffee-table", pos: [0.4, 0, -0.3], rotY: 0.4 },
      { kind: "floor-lamp", pos: [2.8, 0, -1.6], rotY: 0.5 },
      { kind: "dining-table-round", pos: [2.6, 0, 1.8], rotY: 0, scale: 0.9 },
      { kind: "dining-chair-uph", pos: [3.7, 0, 1.8], rotY: -Math.PI / 2, scale: 0.9 },
      { kind: "dining-chair-uph", pos: [2.6, 0, 0.7], rotY: Math.PI, scale: 0.9 },
      { kind: "pendant", pos: [2.6, 2.8, 1.8], rotY: 0 },
      { kind: "planter", pos: [-3.4, 0, 1.4], rotY: 0.8, scale: 1.1 },
    ],
    cam: { pos: [3.6, 2, 4.6], target: [0, 1, 0.3], fov: 40 },
  },
  "showroom-designer": {
    floor: "#dfd7c9",
    wall: "#f4f0e8",
    accent: "#c9bfae",
    roomW: 10, roomD: 7, roomH: 3.4,
    window: null,
    pieces: [
      { kind: "sofa-curved", pos: [0, 0, 0.6], rotY: 0.35 },
      { kind: "accent-chair", pos: [2.6, 0, -1.4], rotY: -0.6 },
      { kind: "coffee-table", pos: [1.4, 0, 1.6], rotY: 0.2 },
      { kind: "floor-lamp", pos: [-2.4, 0, 1.4], rotY: 0.5 },
      { kind: "planter", pos: [3.4, 0, 1.8], rotY: 0.4, scale: 1.1 },
      { kind: "bench", pos: [-2.2, 0, -1.4], rotY: 0.9 },
      { kind: "vase", pos: [2.2, 0.44, 1.9], rotY: 0, scale: 0.9 },
    ],
    cam: { pos: [3.4, 2, 4.4], target: [0, 0.9, 0.2], fov: 40 },
  },
  "architectural-interior": {
    floor: "#d5ccbd",
    wall: "#efe9df",
    accent: "#b3a58f",
    roomW: 9, roomD: 6.5, roomH: 4.4,
    window: { sx: 3.4, sy: 3.6, x: 2.2, y: 2.4, color: "#ffe9c9", intensity: 1 },
    rug: { w: 3.2, d: 2.4, color: "#d8cdbb" },
    art: [{ w: 2.6, h: 1.6, x: 0, y: 2.8, color: "#4a4038" }],
    pieces: [
      { kind: "sectional", pos: [-1.2, 0, 0.8], rotY: 0.2, scale: 0.95 },
      { kind: "coffee-table", pos: [0.6, 0, -0.5], rotY: 0.3 },
      { kind: "dining-table", pos: [2.8, 0, 1.8], rotY: 0.4, scale: 0.85 },
      { kind: "dining-chair", pos: [3.6, 0, 1.2], rotY: -0.8, scale: 0.85 },
      { kind: "dining-chair", pos: [2.2, 0, 0.9], rotY: 1.2, scale: 0.85 },
      { kind: "floor-lamp", pos: [-3, 0, -1.6], rotY: 0.6 },
      { kind: "vase", pos: [-2.4, 0, 1.6], rotY: 0, scale: 1 },
      { kind: "bench", pos: [1.4, 0, -2.1], rotY: 1.1 },
    ],
    cam: { pos: [3.8, 2.4, 5], target: [0, 1.2, 0.3], fov: 40 },
  },
};

// ---------------------------------------------------------------------------
// Banner scene (category/collection) — product on a roomy scrim
// ---------------------------------------------------------------------------
function buildBannerScene() {
  const kindParam = params.get("kind") || "sofa-curved";
  const kind = (isModelKind(kindParam) ? kindParam : "sofa-curved") as ModelKind;

  addFloor("#eae5da");
  addBackdrop("#f4f0e8");

  const group = buildModel(kind);
  scene.add(group);

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const d = (maxDim / 2 / Math.tan(THREE.MathUtils.degToRad(32 / 2))) * 1.8;
  camera.position.set(0.5 * d, 0.85 * d, d * 0.9);
  camera.lookAt(new THREE.Vector3(0, 0.55, 0));
  camera.fov = 32;
  camera.updateProjectionMatrix();
  symmetricShadow(Math.max(size.x, size.z) * 0.62 + 0.15);

  return { viewWidth: 1920, viewHeight: 1080 };
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
function main() {
  let dims: { viewWidth: number; viewHeight: number };
  if (mode === "interior") {
    dims = buildInteriorScene();
  } else if (mode === "category" || mode === "collection") {
    dims = buildBannerScene();
  } else {
    dims = buildProductScene();
  }

  const ratio = dims.viewHeight / dims.viewWidth;
  const w = Math.min(1600, window.innerWidth || dims.viewWidth);
  const h = Math.round(w * ratio);
  renderer.setSize(w, h, false);
  renderer.render(scene, camera);

  requestAnimationFrame(() => {
    renderer.render(scene, camera);
    window.__RENDER_READY__ = true;
  });
}

main();
