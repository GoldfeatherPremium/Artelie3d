/**
 * Procedural furniture builders.
 *
 * Every builder returns a THREE.Group whose meshes are named after the part
 * (e.g. `seat`, `frame`, `back`, `legs`, `top`, `base`, `shade`). The
 * configurator maps customization group keys to these mesh names and swaps
 * color/roughness in real time (see applyPartMaterials).
 *
 * Units are meters; the origin sits on the floor at the centre of the piece,
 * facing +Z.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MODEL_KINDS, type ModelKind } from "./kinds";

export interface PartMaterial {
  color?: string;
  roughness?: number;
  metalness?: number;
}

export interface ModelBuildOptions {
  materials?: Record<string, PartMaterial>;
  seed?: number;
}

const TAU = Math.PI * 2;

function mat(color = "#cfc7ba", roughness = 0.7, metalness = 0, transparent = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    transparent,
    opacity,
  });
}

function mesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function box(
  name: string,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
) {
  return mesh(name, new THREE.BoxGeometry(w, h, d), material, pos, rot);
}

function roundedBox(
  name: string,
  w: number,
  h: number,
  d: number,
  radius: number,
  material: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
) {
  const g = new RoundedBoxGeometry(w, h, d, 4, radius);
  return mesh(name, g, material, pos, rot);
}

function cyl(
  name: string,
  rTop: number,
  rBottom: number,
  h: number,
  material: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  segments = 48,
) {
  return mesh(name, new THREE.CylinderGeometry(rTop, rBottom, h, segments), material, pos, rot);
}

function taperedLegs(
  group: THREE.Group,
  part: string,
  material: THREE.Material,
  x: number,
  z: number,
  legHeight: number,
  rTop = 0.03,
  rBottom = 0.018,
) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      group.add(
        cyl(part, rTop, rBottom, legHeight, material, [sx * x, legHeight / 2, sz * z], [0, 0, 0], 20),
      );
    }
  }
}

function slabTop(group: THREE.Group, part: string, material: THREE.Material, w: number, d: number, t: number, y: number, radius = 0.02) {
  group.add(roundedBox(part, w, t, d, radius, material, [0, y, 0]));
}

/** Four tapered legs under a table top. */
function tableLegs(group: THREE.Group, material: THREE.Material, w: number, d: number, legHeight: number, inset = 0.08) {
  const x = w / 2 - inset;
  const z = d / 2 - inset;
  taperedLegs(group, "legs", material, x, z, legHeight, 0.035, 0.022);
}

// ---------------------------------------------------------------------------
// Sofas / seating
// ---------------------------------------------------------------------------

function buildCurvedSofa(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#E9E2D4", opts.materials?.seat?.roughness ?? 0.9);
  const fabBack = mat(opts.materials?.back?.color ?? "#E3DCCE", opts.materials?.back?.roughness ?? 0.85);
  const frame = mat(opts.materials?.frame?.color ?? "#C6A97E", opts.materials?.frame?.roughness ?? 0.35);
  const cushionMat = mat(opts.materials?.cushions?.color ?? "#EFE9DC", opts.materials?.cushions?.roughness ?? 0.95);
  const legMat = mat(opts.materials?.legs?.color ?? "#6B5B4A", opts.materials?.legs?.roughness ?? 0.4);

  const R_BACK = 1.35;
  const R_SEAT = 1.12;

  // Curved back wall (partial cylinder, opening toward +Z).
  const backWall = new THREE.Mesh(
    new THREE.CylinderGeometry(R_BACK, R_BACK, 0.62, 40, 1, true, Math.PI, Math.PI),
    fabBack,
  );
  backWall.name = "back";
  backWall.position.y = 0.5;
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Seat platform (shorter cylinder arc).
  const seatBase = new THREE.Mesh(
    new THREE.CylinderGeometry(R_SEAT, R_SEAT, 0.12, 40, 1, true, Math.PI, Math.PI),
    frame,
  );
  seatBase.name = "frame";
  seatBase.position.y = 0.4;
  seatBase.castShadow = true;
  seatBase.receiveShadow = true;
  group.add(seatBase);

  // Seat cushions laid along the chord at the front.
  const cushionGap = 0.55;
  for (const off of [-1, 0, 1]) {
    const a = (off * cushionGap) / R_SEAT;
    const x = Math.sin(a) * R_SEAT * 0.86;
    const z = Math.cos(a) * R_SEAT * 0.86;
    group.add(
      roundedBox("cushions", 0.78, 0.16, 0.6, 0.07, cushionMat, [x, 0.58, z], [0, a * 0.7, 0]),
    );
  }

  // Low curved front rail.
  group.add(cyl("frame", R_SEAT + 0.04, R_SEAT + 0.04, 0.1, frame, [0, 0.06, 0], [0, 0, 0], 40, true));

  // Legs near the ends and centre-back.
  const legH = 0.16;
  for (const a of [-Math.PI / 2, 0, Math.PI / 2]) {
    const x = Math.sin(a) * (R_SEAT - 0.1);
    const z = Math.cos(a) * (R_SEAT - 0.1);
    group.add(cyl("legs", 0.035, 0.025, legH, legMat, [x, legH / 2, z], [0, 0, 0], 16));
  }

  return group;
}

function buildSectional(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#D8CFC0", opts.materials?.seat?.roughness ?? 0.9);
  const fabBack = mat(opts.materials?.back?.color ?? "#CFC5B5", opts.materials?.back?.roughness ?? 0.85);
  const frame = mat(opts.materials?.frame?.color ?? "#2E2C2A", opts.materials?.frame?.roughness ?? 0.5);
  const cushionMat = mat(opts.materials?.cushions?.color ?? "#E3DCD0", opts.materials?.cushions?.roughness ?? 0.95);
  const legMat = mat(opts.materials?.legs?.color ?? "#8A7F72", opts.materials?.legs?.roughness ?? 0.45);

  const seatY = 0.42;

  // Main sofa section (left).
  group.add(roundedBox("frame", 1.9, 0.14, 1.0, 0.03, frame, [-0.35, 0.08, 0]));
  group.add(roundedBox("seat", 1.72, 0.15, 0.86, 0.05, fab, [-0.35, seatY, 0.05]));
  group.add(roundedBox("back", 1.86, 0.6, 0.2, 0.07, fabBack, [-0.35, seatY + 0.42, -0.42]));
  group.add(roundedBox("cushions", 0.78, 0.16, 0.72, 0.06, cushionMat, [-0.75, seatY + 0.08, 0.03]));
  group.add(roundedBox("cushions", 0.78, 0.16, 0.72, 0.06, cushionMat, [0.05, seatY + 0.08, 0.03]));
  // Arms
  group.add(roundedBox("frame", 0.16, 0.34, 0.9, 0.05, frame, [-1.28, seatY + 0.12, 0.02]));
  group.add(roundedBox("frame", 0.16, 0.34, 0.9, 0.05, frame, [0.58, seatY + 0.12, 0.02]));

  // Chaise (right, short leg of the L).
  group.add(roundedBox("frame", 1.0, 0.14, 1.6, 0.03, frame, [1.15, 0.08, -0.55]));
  group.add(roundedBox("seat", 0.86, 0.15, 1.45, 0.05, fab, [1.15, seatY, -0.5]));
  group.add(roundedBox("back", 0.2, 0.6, 1.55, 0.07, fabBack, [1.6, seatY + 0.42, -0.5]));
  group.add(roundedBox("cushions", 0.72, 0.16, 0.9, 0.06, cushionMat, [1.15, seatY + 0.08, -0.95]));
  group.add(roundedBox("cushions", 0.72, 0.16, 0.9, 0.06, cushionMat, [1.15, seatY + 0.08, -0.05]));

  // Legs
  for (const [x, z] of [
    [-1.28, -0.38],
    [-1.28, 0.38],
    [0.58, -0.38],
    [0.58, 0.38],
    [1.55, -1.28],
    [1.55, 0.28],
    [0.75, -1.28],
    [0.75, 0.28],
  ] as const) {
    group.add(cyl("legs", 0.03, 0.022, 0.16, legMat, [x, 0.08, z], [0, 0, 0], 16));
  }

  return group;
}

function buildModularSofa(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#EDE6DA", opts.materials?.seat?.roughness ?? 0.9);
  const fabBack = mat(opts.materials?.back?.color ?? "#E5DCCD", opts.materials?.back?.roughness ?? 0.85);
  const frame = mat(opts.materials?.frame?.color ?? "#A99987", opts.materials?.frame?.roughness ?? 0.4);
  const cushionMat = mat(opts.materials?.cushions?.color ?? "#F1ECE2", opts.materials?.cushions?.roughness ?? 0.95);
  const legMat = mat(opts.materials?.legs?.color ?? "#4E463E", opts.materials?.legs?.roughness ?? 0.5);

  const seatY = 0.4;
  const moduleWidth = 0.92;
  const positions: [number, number, number][] = [
    [-0.98, 0, 0],
    [0, 0, 0],
    [0.98, 0, 0],
  ];

  positions.forEach(([x, , z], i) => {
    const isCenter = i === 1;
    group.add(roundedBox("frame", moduleWidth, 0.14, 0.95, 0.035, frame, [x, 0.07, z]));
    group.add(roundedBox("seat", moduleWidth - 0.12, 0.16, 0.8, 0.05, fab, [x, seatY, z + 0.04]));
    if (!isCenter) {
      group.add(roundedBox("back", moduleWidth - 0.08, 0.55, 0.2, 0.06, fabBack, [x, seatY + 0.4, z - 0.4]));
    }
    group.add(roundedBox("cushions", moduleWidth - 0.3, 0.17, 0.66, 0.06, cushionMat, [x, seatY + 0.08, z + 0.03]));
    group.add(cyl("legs", 0.032, 0.024, 0.15, legMat, [x - moduleWidth / 2 + 0.08, 0.075, z - 0.36], [0, 0, 0], 14));
    group.add(cyl("legs", 0.032, 0.024, 0.15, legMat, [x + moduleWidth / 2 - 0.08, 0.075, z - 0.36], [0, 0, 0], 14));
    group.add(cyl("legs", 0.032, 0.024, 0.15, legMat, [x - moduleWidth / 2 + 0.08, 0.075, z + 0.36], [0, 0, 0], 14));
    group.add(cyl("legs", 0.032, 0.024, 0.15, legMat, [x + moduleWidth / 2 - 0.08, 0.075, z + 0.36], [0, 0, 0], 14));
  });

  return group;
}

function buildAccentChair(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#3A3A38", opts.materials?.seat?.roughness ?? 0.5);
  const frame = mat(opts.materials?.frame?.color ?? "#2E2C2A", opts.materials?.frame?.roughness ?? 0.45);
  const legMat = mat(opts.materials?.legs?.color ?? "#9A9A98", opts.materials?.legs?.roughness ?? 0.4);

  const seatY = 0.44;
  group.add(roundedBox("frame", 0.8, 0.1, 0.82, 0.04, frame, [0, 0.06, 0]));
  group.add(roundedBox("seat", 0.72, 0.14, 0.72, 0.06, fab, [0, seatY, 0.04]));
  // Barrel back (partial cylinder, tall).
  const backArc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.68, 36, 1, true, Math.PI * 0.4, Math.PI * 1.2),
    fab,
  );
  backArc.name = "back";
  backArc.position.set(0, seatY + 0.46, -0.16);
  backArc.rotation.y = Math.PI;
  backArc.castShadow = true;
  backArc.receiveShadow = true;
  group.add(backArc);
  // Arms
  group.add(roundedBox("frame", 0.12, 0.22, 0.66, 0.04, frame, [-0.4, seatY + 0.14, 0.04]));
  group.add(roundedBox("frame", 0.12, 0.22, 0.66, 0.04, frame, [0.4, seatY + 0.14, 0.04]));
  taperedLegs(group, "legs", legMat, 0.32, 0.32, 0.2, 0.028, 0.02);

  return group;
}

function buildLoungeChair(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#F0E9DC", opts.materials?.seat?.roughness ?? 0.9);
  const frame = mat(opts.materials?.frame?.color ?? "#2A2A28", opts.materials?.frame?.roughness ?? 0.5);
  const baseMat = mat(opts.materials?.legs?.color ?? "#5A534B", opts.materials?.legs?.roughness ?? 0.3);

  const seatY = 0.4;
  group.add(roundedBox("seat", 0.84, 0.16, 0.8, 0.07, fab, [0, seatY, 0.05]));
  group.add(roundedBox("back", 0.84, 0.66, 0.28, 0.1, fab, [0, seatY + 0.42, -0.32], [0.14, 0, 0]));
  // Sweeping arm/body shell
  group.add(roundedBox("frame", 0.95, 0.2, 0.86, 0.085, frame, [0, seatY - 0.02, 0.04]));
  // Swivel disc base
  group.add(cyl("legs", 0.34, 0.38, 0.08, baseMat, [0, 0.04, 0], [0, 0, 0], 40));
  group.add(cyl("legs", 0.07, 0.08, 0.06, baseMat, [0, 0.12, 0], [0, 0, 0], 24));

  return group;
}

// ---------------------------------------------------------------------------
// Tables / surfaces
// ---------------------------------------------------------------------------

function buildCoffeeTable(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#E4DCD0", opts.materials?.top?.roughness ?? 0.55);
  const baseMat = mat(opts.materials?.base?.color ?? "#B0A593", opts.materials?.base?.roughness ?? 0.45);
  const legMat = mat(opts.materials?.legs?.color ?? "#4E463E", opts.materials?.legs?.roughness ?? 0.5);

  group.add(cyl("top", 0.62, 0.62, 0.06, topMat, [0, 0.42, 0], [0, 0, 0], 48));
  group.add(cyl("base", 0.12, 0.16, 0.32, baseMat, [0, 0.2, 0], [0, 0, 0], 32));
  group.add(cyl("legs", 0.44, 0.48, 0.06, legMat, [0, 0.03, 0], [0, 0, 0], 40));

  return group;
}

function buildSideTable(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#E2D8C9", opts.materials?.top?.roughness ?? 0.6);
  const frameMat = mat(opts.materials?.base?.color ?? "#2F2D2A", opts.materials?.base?.roughness ?? 0.5);
  const legMat = mat(opts.materials?.legs?.color ?? "#8A7F72", opts.materials?.legs?.roughness ?? 0.45);

  group.add(cyl("top", 0.4, 0.4, 0.045, topMat, [0, 0.56, 0], [0, 0, 0], 40));
  group.add(cyl("base", 0.16, 0.18, 0.44, frameMat, [0, 0.3, 0], [0, 0, 0], 32));
  group.add(cyl("legs", 0.34, 0.37, 0.05, legMat, [0, 0.025, 0], [0, 0, 0], 36));

  return group;
}

function buildTvConsole(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#5B4636", opts.materials?.frame?.roughness ?? 0.35);
  const topMat = mat(opts.materials?.top?.color ?? "#6E5947", opts.materials?.top?.roughness ?? 0.3);
  const doorMat = mat(opts.materials?.doors?.color ?? "#6E5947", opts.materials?.doors?.roughness ?? 0.3);
  const legMat = mat(opts.materials?.legs?.color ?? "#2A2A28", opts.materials?.legs?.roughness ?? 0.5);

  const bodyY = 0.42;
  group.add(roundedBox("frame", 1.7, 0.38, 0.42, 0.025, frameMat, [0, bodyY, 0]));
  group.add(roundedBox("top", 1.78, 0.05, 0.48, 0.02, topMat, [0, bodyY + 0.22, 0]));
  // Door fronts
  for (const sx of [-1, 1]) {
    group.add(roundedBox("doors", 0.78, 0.3, 0.03, 0.015, doorMat, [sx * 0.42, bodyY - 0.01, 0.215]));
    group.add(cyl("doors", 0.01, 0.01, 0.12, mat("#B99B6F", 0.2, 0.8), [sx * 0.18, bodyY - 0.01, 0.235], [Math.PI / 2, 0, 0], 12));
  }
  taperedLegs(group, "legs", legMat, 0.75, 0.17, 0.18, 0.032, 0.02);

  return group;
}

function buildBed(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#4A3F33", opts.materials?.frame?.roughness ?? 0.4);
  const headMat = mat(opts.materials?.headboard?.color ?? "#D9CFC0", opts.materials?.headboard?.roughness ?? 0.85);
  const legMat = mat(opts.materials?.legs?.color ?? "#3A322B", opts.materials?.legs?.roughness ?? 0.45);

  // Platform base
  group.add(roundedBox("frame", 1.6, 0.28, 2.0, 0.03, frameMat, [0, 0.14, 0]));
  // Mattress
  group.add(roundedBox("frame", 1.52, 0.2, 1.94, 0.08, mat("#F1EFEA", 0.95), [0, 0.38, 0]));
  // Headboard
  group.add(roundedBox("headboard", 1.6, 1.05, 0.1, 0.05, headMat, [0, 0.9, -0.99]));
  // Pillows
  for (const sx of [-1, 1]) {
    group.add(roundedBox("frame", 0.66, 0.16, 0.42, 0.07, mat("#F6F3ED", 0.95), [sx * 0.42, 0.55, -0.72], [0.18, 0, 0]));
  }
  taperedLegs(group, "legs", legMat, 0.72, 0.92, 0.12, 0.035, 0.028);

  return group;
}

function buildPlatformBed(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#4A3426", opts.materials?.frame?.roughness ?? 0.35);
  const headMat = mat(opts.materials?.headboard?.color ?? "#3A2B20", opts.materials?.headboard?.roughness ?? 0.35);
  const legMat = mat(opts.materials?.legs?.color ?? "#2A2019", opts.materials?.legs?.roughness ?? 0.4);

  group.add(roundedBox("frame", 1.6, 0.3, 2.0, 0.02, frameMat, [0, 0.15, 0]));
  group.add(roundedBox("frame", 1.52, 0.2, 1.94, 0.08, mat("#F1EFEA", 0.95), [0, 0.4, 0]));
  group.add(roundedBox("headboard", 1.6, 0.55, 0.08, 0.03, headMat, [0, 0.68, -0.99]));
  group.add(roundedBox("frame", 0.66, 0.16, 0.42, 0.07, mat("#F6F3ED", 0.95), [-0.42, 0.56, -0.72], [0.18, 0, 0]));
  group.add(roundedBox("frame", 0.66, 0.16, 0.42, 0.07, mat("#F6F3ED", 0.95), [0.42, 0.56, -0.72], [0.18, 0, 0]));
  taperedLegs(group, "legs", legMat, 0.72, 0.92, 0.1, 0.04, 0.03);

  return group;
}

function buildBedsideTable(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#5B4636", opts.materials?.frame?.roughness ?? 0.35);
  const topMat = mat(opts.materials?.top?.color ?? "#6E5947", opts.materials?.top?.roughness ?? 0.3);
  const drawerMat = mat(opts.materials?.drawers?.color ?? "#6E5947", opts.materials?.drawers?.roughness ?? 0.32);
  const legMat = mat(opts.materials?.legs?.color ?? "#2A2A28", opts.materials?.legs?.roughness ?? 0.5);

  group.add(roundedBox("frame", 0.5, 0.42, 0.42, 0.02, frameMat, [0, 0.24, 0]));
  group.add(roundedBox("drawers", 0.42, 0.16, 0.03, 0.01, drawerMat, [0, 0.3, 0.215]));
  group.add(cyl("drawers", 0.012, 0.012, 0.1, mat("#B99B6F", 0.2, 0.8), [0, 0.3, 0.235], [Math.PI / 2, 0, 0], 12));
  group.add(roundedBox("top", 0.56, 0.04, 0.48, 0.015, topMat, [0, 0.48, 0]));
  taperedLegs(group, "legs", legMat, 0.2, 0.17, 0.14, 0.024, 0.016);

  return group;
}

function buildDresser(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#6E5947", opts.materials?.frame?.roughness ?? 0.3);
  const topMat = mat(opts.materials?.top?.color ?? "#7A6450", opts.materials?.top?.roughness ?? 0.3);
  const drawerMat = mat(opts.materials?.drawers?.color ?? "#7A6450", opts.materials?.drawers?.roughness ?? 0.32);
  const legMat = mat(opts.materials?.legs?.color ?? "#2A2A28", opts.materials?.legs?.roughness ?? 0.5);

  group.add(roundedBox("frame", 1.2, 0.78, 0.46, 0.025, frameMat, [0, 0.42, 0]));
  for (let i = 0; i < 3; i++) {
    group.add(roundedBox("drawers", 1.08, 0.2, 0.03, 0.012, drawerMat, [0, 0.24 + i * 0.24, 0.235]));
    group.add(cyl("drawers", 0.012, 0.012, 0.12, mat("#B99B6F", 0.2, 0.8), [0, 0.24 + i * 0.24, 0.258], [Math.PI / 2, 0, 0], 12));
  }
  group.add(roundedBox("top", 1.28, 0.05, 0.52, 0.018, topMat, [0, 0.84, 0]));
  taperedLegs(group, "legs", legMat, 0.55, 0.19, 0.16, 0.03, 0.02);

  return group;
}

function buildBench(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const seatMat = mat(opts.materials?.seat?.color ?? "#E5DCCD", opts.materials?.seat?.roughness ?? 0.9);
  const frameMat = mat(opts.materials?.frame?.color ?? "#2E2C2A", opts.materials?.frame?.roughness ?? 0.5);
  const legMat = mat(opts.materials?.legs?.color ?? "#4E463E", opts.materials?.legs?.roughness ?? 0.5);

  group.add(roundedBox("seat", 1.3, 0.1, 0.5, 0.05, seatMat, [0, 0.44, 0]));
  group.add(roundedBox("frame", 1.24, 0.1, 0.44, 0.03, frameMat, [0, 0.36, 0]));
  taperedLegs(group, "legs", legMat, 0.54, 0.18, 0.34, 0.03, 0.022);

  return group;
}

// ---------------------------------------------------------------------------
// Dining
// ---------------------------------------------------------------------------

function buildDiningTable(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#9B7B5B", opts.materials?.top?.roughness ?? 0.3);
  const baseMat = mat(opts.materials?.base?.color ?? "#5B4636", opts.materials?.base?.roughness ?? 0.4);
  const legMat = mat(opts.materials?.legs?.color ?? "#5B4636", opts.materials?.legs?.roughness ?? 0.4);

  group.add(roundedBox("top", 2.0, 0.06, 1.0, 0.03, topMat, [0, 0.74, 0]));
  // Trestle-style base
  group.add(roundedBox("base", 0.14, 0.66, 0.9, 0.03, baseMat, [0, 0.37, 0]));
  group.add(roundedBox("base", 1.7, 0.06, 0.34, 0.02, baseMat, [0, 0.09, 0]));
  for (const sz of [-1, 1]) {
    group.add(roundedBox("legs", 0.12, 0.6, 0.09, 0.02, legMat, [0, 0.32, sz * 0.42], [0, 0, 0.28 * sz]));
  }

  return group;
}

function buildRoundDiningTable(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#E5DEDA", opts.materials?.top?.roughness ?? 0.25);
  const baseMat = mat(opts.materials?.base?.color ?? "#3A3836", opts.materials?.base?.roughness ?? 0.45);
  const legMat = mat(opts.materials?.legs?.color ?? "#3A3836", opts.materials?.legs?.roughness ?? 0.45);

  group.add(cyl("top", 0.85, 0.85, 0.05, topMat, [0, 0.75, 0], [0, 0, 0], 64));
  group.add(cyl("base", 0.16, 0.2, 0.68, baseMat, [0, 0.36, 0], [0, 0, 0], 40));
  group.add(cyl("legs", 0.62, 0.66, 0.06, legMat, [0, 0.03, 0], [0, 0, 0], 56));

  return group;
}

function buildDiningChair(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const wood = mat(opts.materials?.frame?.color ?? "#8A6240", opts.materials?.frame?.roughness ?? 0.35);
  const seatMat = mat(opts.materials?.seat?.color ?? "#8A6240", opts.materials?.seat?.roughness ?? 0.35);
  const legMat = mat(opts.materials?.legs?.color ?? "#8A6240", opts.materials?.legs?.roughness ?? 0.35);

  const seatY = 0.46;
  group.add(roundedBox("seat", 0.44, 0.05, 0.44, 0.02, seatMat, [0, seatY, 0]));
  // Bentwood back
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 12, 32, Math.PI * 0.9), wood);
  back.name = "back";
  back.position.set(0, seatY + 0.36, -0.18);
  back.rotation.x = Math.PI / 2;
  back.rotation.z = Math.PI * 0.5;
  back.castShadow = true;
  group.add(back);
  // Posts
  for (const sx of [-1, 1]) {
    group.add(cyl("back", 0.022, 0.022, 0.5, wood, [sx * 0.17, seatY + 0.3, -0.18], [0.1 * sx, 0, 0], 12));
  }
  taperedLegs(group, "legs", legMat, 0.18, 0.18, 0.44, 0.022, 0.014);

  return group;
}

function buildUphDiningChair(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const fab = mat(opts.materials?.seat?.color ?? "#DCD4C6", opts.materials?.seat?.roughness ?? 0.9);
  const fabBack = mat(opts.materials?.back?.color ?? "#DCD4C6", opts.materials?.back?.roughness ?? 0.9);
  const frameMat = mat(opts.materials?.frame?.color ?? "#2A2A28", opts.materials?.frame?.roughness ?? 0.5);
  const legMat = mat(opts.materials?.legs?.color ?? "#9A9A98", opts.materials?.legs?.roughness ?? 0.4);

  const seatY = 0.46;
  group.add(roundedBox("seat", 0.46, 0.09, 0.46, 0.04, fab, [0, seatY, 0]));
  group.add(roundedBox("back", 0.42, 0.52, 0.1, 0.045, fabBack, [0, seatY + 0.34, -0.2], [0.12, 0, 0]));
  group.add(cyl("frame", 0.02, 0.02, 0.3, frameMat, [0, seatY + 0.18, -0.2], [0, 0, 0], 12));
  taperedLegs(group, "legs", legMat, 0.19, 0.19, 0.44, 0.02, 0.014);

  return group;
}

function buildDiningBench(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const seatMat = mat(opts.materials?.seat?.color ?? "#9B7B5B", opts.materials?.seat?.roughness ?? 0.35);
  const frameMat = mat(opts.materials?.frame?.color ?? "#5B4636", opts.materials?.frame?.roughness ?? 0.4);
  const legMat = mat(opts.materials?.legs?.color ?? "#5B4636", opts.materials?.legs?.roughness ?? 0.4);

  group.add(roundedBox("seat", 1.5, 0.06, 0.42, 0.025, seatMat, [0, 0.46, 0]));
  for (const sz of [-1, 1]) {
    group.add(roundedBox("frame", 1.42, 0.36, 0.08, 0.02, frameMat, [0, 0.2, sz * 0.17]));
    group.add(cyl("legs", 0.04, 0.03, 0.1, legMat, [0, 0.05, sz * 0.17], [0, 0, 0], 16));
  }

  return group;
}

// ---------------------------------------------------------------------------
// Office
// ---------------------------------------------------------------------------

function buildDesk(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#C6A97E", opts.materials?.top?.roughness ?? 0.35);
  const frameMat = mat(opts.materials?.frame?.color ?? "#2E2C2A", opts.materials?.frame?.roughness ?? 0.5);
  const legMat = mat(opts.materials?.legs?.color ?? "#2E2C2A", opts.materials?.legs?.roughness ?? 0.5);
  const drawerMat = mat(opts.materials?.drawers?.color ?? "#6E5947", opts.materials?.drawers?.roughness ?? 0.35);

  group.add(roundedBox("top", 1.4, 0.05, 0.7, 0.02, topMat, [0, 0.74, 0]));
  // Right pedestal with drawers
  group.add(roundedBox("frame", 0.4, 0.64, 0.6, 0.02, frameMat, [0.45, 0.34, 0]));
  for (let i = 0; i < 2; i++) {
    group.add(roundedBox("drawers", 0.32, 0.26, 0.03, 0.012, drawerMat, [0.45, 0.22 + i * 0.3, 0.31]));
    group.add(cyl("drawers", 0.01, 0.01, 0.1, mat("#B99B6F", 0.2, 0.8), [0.45, 0.22 + i * 0.3, 0.34], [Math.PI / 2, 0, 0], 12));
  }
  // Left legs
  taperedLegs(group, "legs", legMat, 0.62, 0.28, 0.72, 0.028, 0.018);

  return group;
}

function buildExecutiveDesk(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const topMat = mat(opts.materials?.top?.color ?? "#5B4636", opts.materials?.top?.roughness ?? 0.3);
  const frameMat = mat(opts.materials?.frame?.color ?? "#4A3A2D", opts.materials?.frame?.roughness ?? 0.35);
  const legMat = mat(opts.materials?.legs?.color ?? "#3A2E24", opts.materials?.legs?.roughness ?? 0.35);
  const drawerMat = mat(opts.materials?.drawers?.color ?? "#4A3A2D", opts.materials?.drawers?.roughness ?? 0.35);

  group.add(roundedBox("top", 1.8, 0.07, 0.85, 0.025, topMat, [0, 0.75, 0]));
  for (const sx of [-1, 1]) {
    group.add(roundedBox("frame", 0.5, 0.62, 0.7, 0.025, frameMat, [sx * 0.55, 0.36, 0]));
    group.add(roundedBox("drawers", 0.4, 0.24, 0.03, 0.012, drawerMat, [sx * 0.55, 0.24, 0.36]));
    group.add(roundedBox("drawers", 0.4, 0.24, 0.03, 0.012, drawerMat, [sx * 0.55, 0.5, 0.36]));
    group.add(cyl("drawers", 0.012, 0.012, 0.12, mat("#B99B6F", 0.2, 0.8), [sx * 0.55, 0.37, 0.39], [Math.PI / 2, 0, 0], 12));
  }
  taperedLegs(group, "legs", legMat, 0.82, 0.34, 0.14, 0.04, 0.032);

  return group;
}

function buildOfficeChair(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const seatMat = mat(opts.materials?.seat?.color ?? "#3A3A38", opts.materials?.seat?.roughness ?? 0.55);
  const backMat = mat(opts.materials?.back?.color ?? "#3A3A38", opts.materials?.back?.roughness ?? 0.55);
  const frameMat = mat(opts.materials?.frame?.color ?? "#2A2A28", opts.materials?.frame?.roughness ?? 0.5);
  const legMat = mat(opts.materials?.legs?.color ?? "#8A8A88", opts.materials?.legs?.roughness ?? 0.4);

  const seatY = 0.48;
  group.add(roundedBox("seat", 0.5, 0.08, 0.5, 0.03, seatMat, [0, seatY, 0]));
  group.add(roundedBox("back", 0.46, 0.56, 0.12, 0.05, backMat, [0, seatY + 0.32, -0.24], [0.12, 0, 0]));
  // Spine + gas lift
  group.add(cyl("frame", 0.03, 0.03, 0.3, frameMat, [0, seatY - 0.14, 0], [0, 0, 0], 12));
  // Star base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    group.add(cyl("legs", 0.018, 0.024, 0.44, legMat, [Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22], [0, 0, -0.42], 10));
  }
  group.add(cyl("legs", 0.26, 0.28, 0.05, legMat, [0, 0.025, 0], [0, 0, 0], 32));
  // Armrests
  for (const sx of [-1, 1]) {
    group.add(roundedBox("frame", 0.05, 0.05, 0.36, 0.02, frameMat, [sx * 0.3, seatY + 0.08, 0]));
    group.add(cyl("frame", 0.02, 0.02, 0.3, frameMat, [sx * 0.3, seatY - 0.09, -0.1], [0.1 * sx, 0, 0], 10));
  }

  return group;
}

function buildShelving(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#8A6240", opts.materials?.frame?.roughness ?? 0.35);
  const shelfMat = mat(opts.materials?.shelves?.color ?? "#9B7350", opts.materials?.shelves?.roughness ?? 0.35);

  const W = 0.9;
  const H = 1.8;
  const D = 0.34;
  const n = 4;
  // Posts
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    group.add(cyl("frame", 0.025, 0.025, H, frameMat, [sx * W / 2, H / 2, sz * D / 2], [0, 0, 0], 12));
  }
  for (let i = 0; i < n; i++) {
    const y = (i / (n - 1)) * H;
    group.add(roundedBox("shelves", W, 0.035, D, 0.012, shelfMat, [0, y, 0]));
  }

  return group;
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

function buildFloorLamp(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const baseMat = mat(opts.materials?.base?.color ?? "#2A2A28", opts.materials?.base?.roughness ?? 0.5);
  const poleMat = mat(opts.materials?.pole?.color ?? "#8A8A88", opts.materials?.pole?.roughness ?? 0.35);
  const shadeMat = mat(opts.materials?.shade?.color ?? "#E8DFD0", opts.materials?.shade?.roughness ?? 0.95);

  group.add(cyl("base", 0.28, 0.3, 0.04, baseMat, [0, 0.02, 0], [0, 0, 0], 36));
  group.add(cyl("pole", 0.018, 0.024, 1.7, poleMat, [0, 0.88, 0], [0, 0, 0], 16));
  group.add(cyl("shade", 0.2, 0.28, 0.32, shadeMat, [0, 1.72, 0], [0, 0, 0], 40));

  return group;
}

function buildPendant(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const cordMat = mat(opts.materials?.cord?.color ?? "#2A2A28", opts.materials?.cord?.roughness ?? 0.5);
  const shadeMat = mat(opts.materials?.shade?.color ?? "#5A554E", opts.materials?.shade?.roughness ?? 0.35, 0, true, 0.75);

  group.add(cyl("cord", 0.008, 0.008, 0.6, cordMat, [0, 1.3, 0], [0, 0, 0], 8));
  group.add(cyl("shade", 0.16, 0.22, 0.26, shadeMat, [0, 0.95, 0], [0, 0, 0], 48));
  group.add(cyl("shade", 0.05, 0.06, 0.04, mat("#B99B6F", 0.25, 0.8), [0, 1.09, 0], [0, 0, 0], 24));

  return group;
}

function buildTableLamp(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const baseMat = mat(opts.materials?.base?.color ?? "#4E463E", opts.materials?.base?.roughness ?? 0.4);
  const shadeMat = mat(opts.materials?.shade?.color ?? "#E8DFD0", opts.materials?.shade?.roughness ?? 0.95);

  group.add(cyl("base", 0.12, 0.13, 0.05, baseMat, [0, 0.025, 0], [0, 0, 0], 32));
  group.add(cyl("base", 0.025, 0.03, 0.22, baseMat, [0, 0.16, 0], [0, 0, 0], 16));
  group.add(cyl("shade", 0.11, 0.16, 0.2, shadeMat, [0, 0.35, 0], [0, 0, 0], 40));

  return group;
}

// ---------------------------------------------------------------------------
// Decor
// ---------------------------------------------------------------------------

function buildVase(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const bodyMat = mat(opts.materials?.body?.color ?? "#C9B6A3", opts.materials?.body?.roughness ?? 0.5);

  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.12, 0),
    new THREE.Vector2(0.14, 0.02),
    new THREE.Vector2(0.15, 0.1),
    new THREE.Vector2(0.13, 0.18),
    new THREE.Vector2(0.09, 0.24),
    new THREE.Vector2(0.1, 0.3),
    new THREE.Vector2(0.13, 0.34),
    new THREE.Vector2(0.13, 0.37),
    new THREE.Vector2(0.1, 0.4),
    new THREE.Vector2(0.07, 0.4),
    new THREE.Vector2(0.05, 0.37),
    new THREE.Vector2(0.05, 0.34),
    new THREE.Vector2(0.06, 0.32),
    new THREE.Vector2(0, 0.32),
  ];
  const g = new THREE.LatheGeometry(pts, 48);
  const vase = new THREE.Mesh(g, bodyMat);
  vase.name = "body";
  vase.position.y = 0.32;
  vase.castShadow = true;
  vase.receiveShadow = true;
  group.add(vase);

  return group;
}

function buildMirror(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.frame?.color ?? "#4A3F33", opts.materials?.frame?.roughness ?? 0.4);
  const glassMat = mat("#dfe8ea", 0.08, 0.4);

  // Full-length arched mirror: rounded panel + frame.
  group.add(roundedBox("frame", 0.66, 1.7, 0.04, 0.18, frameMat, [0, 0.9, 0]));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.6), glassMat);
  glass.name = "frame";
  glass.position.set(0, 0.9, 0.025);
  group.add(glass);
  // Floor stand
  for (const sz of [-1, 1]) {
    group.add(cyl("frame", 0.03, 0.02, 0.35, frameMat, [sz * 0.24, 0.16, 0], [0.2 * sz, 0, 0], 12));
    group.add(cyl("frame", 0.14, 0.16, 0.03, frameMat, [sz * 0.24, 0.015, 0], [0, 0, 0], 24));
  }

  return group;
}

function buildWallClock(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const bodyMat = mat(opts.materials?.body?.color ?? "#2A2A28", opts.materials?.body?.roughness ?? 0.5);
  const faceMat = mat("#F4EFE4", 0.6);
  const handMat = mat("#B99B6F", 0.25, 0.8);

  group.add(cyl("body", 0.32, 0.32, 0.03, bodyMat, [0, 1.1, 0], [0, 0, 0], 48));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 48), faceMat);
  face.name = "body";
  face.position.set(0, 1.1, 0.017);
  group.add(face);
  for (const [len, width, angle] of [
    [0.18, 0.024, -0.7],
    [0.24, 0.018, 2.2],
  ] as const) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.015), handMat);
    h.name = "hands";
    h.position.set(0, 1.1, 0.028);
    h.rotation.z = angle;
    group.add(h);
  }
  group.add(cyl("hands", 0.03, 0.03, 0.02, handMat, [0, 1.1, 0.028], [0, 0, 0], 20));

  return group;
}

function buildPlanter(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const bodyMat = mat(opts.materials?.body?.color ?? "#A68E76", opts.materials?.body?.roughness ?? 0.55);
  const soilMat = mat("#4A3A2D", 0.95);
  const leafMat = mat("#5F7A52", 0.8);
  const stemMat = mat("#4E6642", 0.8);

  group.add(cyl("body", 0.26, 0.2, 0.4, bodyMat, [0, 0.2, 0], [0, 0, 0], 40));
  group.add(cyl("body", 0.24, 0.24, 0.02, soilMat, [0, 0.4, 0], [0, 0, 0], 40));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const bx = Math.cos(a) * 0.12;
    const bz = Math.sin(a) * 0.12;
    group.add(cyl("body", 0.012, 0.014, 0.5, stemMat, [bx, 0.66, bz], [0.2 * Math.cos(a), 0, 0.2 * Math.sin(a)], 8));
    group.add(mesh("body", new THREE.SphereGeometry(0.1, 20, 14), leafMat, [bx + Math.cos(a) * 0.1, 0.92, bz + Math.sin(a) * 0.1], [0, 0, 0]));
    group.add(mesh("body", new THREE.SphereGeometry(0.07, 18, 12), leafMat, [bx - Math.cos(a) * 0.06, 0.8, bz - Math.sin(a) * 0.06], [0, 0, 0]));
  }
  group.add(cyl("body", 0.012, 0.012, 0.6, stemMat, [0, 0.7, 0], [0.1, 0, 0], 8));
  group.add(mesh("body", new THREE.SphereGeometry(0.12, 22, 16), leafMat, [0.08, 1.0, 0], [0, 0, 0]));

  return group;
}

function buildWallArt(opts: ModelBuildOptions) {
  const group = new THREE.Group();
  const frameMat = mat(opts.materials?.body?.color ?? "#2A2A28", opts.materials?.body?.roughness ?? 0.5);
  const canvasMat = mat("#F1ECE2", 0.85);

  group.add(roundedBox("body", 1.0, 0.75, 0.05, 0.02, frameMat, [0, 1.1, 0]));
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.65), canvasMat);
  canvas.name = "body";
  canvas.position.set(0, 1.1, 0.028);
  group.add(canvas);
  // Abstract composition bars
  const bars: [number, number, number, number, string][] = [
    [0.2, 0.12, 0.45, 0.3, "#C9A780"],
    [-0.18, 0.16, 0.28, 0.2, "#5A554E"],
    [-0.3, -0.12, 0.4, 0.14, "#A39A88"],
    [0.32, -0.05, 0.18, 0.3, "#8B6F52"],
  ];
  for (const [x, y, w, h, c] of bars) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c, 0.6));
    b.name = "body";
    b.position.set(x, 1.1 + y, 0.032);
    group.add(b);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Factory + material overrides
// ---------------------------------------------------------------------------

const BUILDERS: Record<ModelKind, (opts: ModelBuildOptions) => THREE.Group> = {
  "sofa-curved": buildCurvedSofa,
  sectional: buildSectional,
  "modular-sofa": buildModularSofa,
  "accent-chair": buildAccentChair,
  "lounge-chair": buildLoungeChair,
  "coffee-table": buildCoffeeTable,
  "side-table": buildSideTable,
  "tv-console": buildTvConsole,
  bed: buildBed,
  "bed-platform": buildPlatformBed,
  "bedside-table": buildBedsideTable,
  dresser: buildDresser,
  bench: buildBench,
  "dining-table": buildDiningTable,
  "dining-table-round": buildRoundDiningTable,
  "dining-chair": buildDiningChair,
  "dining-chair-uph": buildUphDiningChair,
  "dining-bench": buildDiningBench,
  desk: buildDesk,
  "desk-executive": buildExecutiveDesk,
  "office-chair": buildOfficeChair,
  shelving: buildShelving,
  "floor-lamp": buildFloorLamp,
  pendant: buildPendant,
  "table-lamp": buildTableLamp,
  vase: buildVase,
  mirror: buildMirror,
  "wall-clock": buildWallClock,
  planter: buildPlanter,
  "wall-art": buildWallArt,
};

export function isModelKind(value: string): value is ModelKind {
  return (MODEL_KINDS as string[]).includes(value);
}

export function buildModel(kind: ModelKind, opts: ModelBuildOptions = {}): THREE.Group {
  const builder = BUILDERS[kind];
  const group = builder(opts);
  group.name = kind;
  applyPartMaterials(group, opts.materials ?? {});
  return group;
}

/**
 * Apply material overrides to named parts. Parts not present in the map keep
 * their default material. Unknown names are ignored.
 */
export function applyPartMaterials(group: THREE.Group, overrides: Record<string, PartMaterial>) {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return;
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && typeof obj.name === "string" && obj.name in overrides) {
      const material = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const o = overrides[obj.name];
      if (o.color) material.color.set(o.color);
      if (typeof o.roughness === "number") material.roughness = o.roughness;
      if (typeof o.metalness === "number") material.metalness = o.metalness;
      material.needsUpdate = true;
    }
  });
}
