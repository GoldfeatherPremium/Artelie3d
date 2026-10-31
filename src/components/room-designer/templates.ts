/**
 * Room templates for the 3D Room Designer. Each template defines a room shell
 * (floor, walls, ceiling, optional window) with dimensions and material colors.
 * Furniture placement is a separate user state (see room-designer.tsx).
 */

export interface RoomTemplate {
  id: string;
  label: string;
  description: string;
  width: number;
  depth: number;
  height: number;
  floor: string;
  wall: string;
  rug?: { width: number; depth: number; color: string };
  window?: { x: number; width: number; height: number; color: string; intensity: number };
  camera: { position: [number, number, number]; target: [number, number, number]; fov: number };
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: "living-luxury",
    label: "Luxury Living Room",
    description: "Generous proportions, warm stone flooring and a window wall.",
    width: 8,
    depth: 6,
    height: 3,
    floor: "#cbb9a0",
    wall: "#efe9df",
    rug: { width: 3.4, depth: 2.4, color: "#d8cdbb" },
    window: { x: 2.6, width: 3.4, height: 2.4, color: "#ffe9c9", intensity: 0.9 },
    camera: { position: [2.2, 1.7, 3.4], target: [0, 0.9, 0], fov: 42 },
  },
  {
    id: "living-scandinavian",
    label: "Scandinavian Living Room",
    description: "Bright, airy, light wood and soft daylight.",
    width: 7.5,
    depth: 5.6,
    height: 2.9,
    floor: "#e8e0d2",
    wall: "#f7f3ec",
    rug: { width: 3, depth: 2.2, color: "#e3dcd0" },
    window: { x: 2.4, width: 3, height: 2.2, color: "#eaf4ff", intensity: 0.8 },
    camera: { position: [2.4, 1.6, 3.2], target: [0, 0.9, 0], fov: 44 },
  },
  {
    id: "bedroom-japandi",
    label: "Japandi Bedroom",
    description: "Low, calm, tactile natural tones.",
    width: 7,
    depth: 5.4,
    height: 2.8,
    floor: "#d8cdbc",
    wall: "#e9e1d3",
    rug: { width: 2.2, depth: 2.8, color: "#cfc2ad" },
    window: { x: 2.2, width: 2.6, height: 2, color: "#ffe6c4", intensity: 0.8 },
    camera: { position: [0.2, 1.7, 3.6], target: [0, 1, -0.3], fov: 44 },
  },
  {
    id: "dining-contemporary",
    label: "Contemporary Dining Room",
    description: "Sculptural light, dark stone floor.",
    width: 7,
    depth: 5.5,
    height: 3,
    floor: "#cfc4b2",
    wall: "#f0eae0",
    window: { x: 2.2, width: 2.8, height: 2.2, color: "#ffe9c9", intensity: 0.85 },
    camera: { position: [2.3, 1.8, 3.6], target: [0, 0.9, 0.1], fov: 42 },
  },
  {
    id: "office-luxury",
    label: "Luxury Home Office",
    description: "Focused, warm, strong natural light.",
    width: 7,
    depth: 5.2,
    height: 3,
    floor: "#cbbc9f",
    wall: "#e7dfd2",
    rug: { width: 2.6, depth: 1.8, color: "#cbb9a0" },
    window: { x: 2.2, width: 3.2, height: 2.3, color: "#eaf4ff", intensity: 0.8 },
    camera: { position: [2.2, 1.7, 3.5], target: [0, 0.9, 0], fov: 44 },
  },
];

export function getRoomTemplate(id: string): RoomTemplate {
  return ROOM_TEMPLATES.find((t) => t.id === id) ?? ROOM_TEMPLATES[0];
}
