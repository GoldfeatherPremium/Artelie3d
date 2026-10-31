import type { MaterialOverride } from "@/lib/pricing";

export interface DiningTableModelProps {
  materials: Record<string, MaterialOverride>;
}

function colorOf(override: MaterialOverride | undefined, fallback: string, roughness: number) {
  return {
    color: override?.color ?? fallback,
    roughness: override?.roughness ?? roughness,
  };
}

export function DiningTableModel({ materials }: DiningTableModelProps) {
  const width = 1.8;
  const depth = 0.95;
  const topThickness = 0.06;
  const legHeight = 0.7;

  const top = colorOf(materials.top, "#5B4636", 0.3);
  const base = colorOf(materials.base, "#3A3A38", 0.5);

  return (
    <group>
      {/* Top slab */}
      <mesh position={[0, legHeight + topThickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topThickness, depth]} />
        <meshStandardMaterial {...top} />
      </mesh>

      {/* Base: pedestal stem + foot */}
      <mesh position={[0, legHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, legHeight, 16]} />
        <meshStandardMaterial {...base} />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.4, 0.44, 0.08, 24]} />
        <meshStandardMaterial {...base} />
      </mesh>
    </group>
  );
}
