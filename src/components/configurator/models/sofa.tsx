import type { MaterialOverride } from "@/lib/pricing";

/**
 * Procedural modular sofa. Mesh part names map to customization group keys:
 * seat, frame, back, legs, cushions.
 */

export interface SofaModelProps {
  materials: Record<string, MaterialOverride>;
  width?: number;
}

function colorOf(override: MaterialOverride | undefined, fallback: string, roughness: number) {
  return {
    color: override?.color ?? fallback,
    roughness: override?.roughness ?? roughness,
  };
}

export function SofaModel({ materials, width = 2.2 }: SofaModelProps) {
  const depth = 0.95;
  const seatHeight = 0.42;
  const legHeight = 0.18;

  const seat = colorOf(materials.seat, "#E9E2D4", 0.9);
  const frame = colorOf(materials.frame, "#C6A97E", 0.35);
  const legs = colorOf(materials.legs, "#6B5B4A", 0.4);
  const back = colorOf(materials.back, "#E3DCCE", 0.85);
  const cushions = colorOf(materials.cushions, "#EFE9DC", 0.95);

  return (
    <group>
      {/* Frame base */}
      <mesh position={[0, legHeight + 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial {...frame} />
      </mesh>

      {/* Seat */}
      <mesh position={[0, seatHeight + legHeight, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.18, 0.16, depth - 0.18]} />
        <meshStandardMaterial {...seat} />
      </mesh>

      {/* Back */}
      <mesh position={[0, seatHeight + legHeight + 0.42, -depth / 2 + 0.08]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[width - 0.12, 0.68, 0.22]} />
        <meshStandardMaterial {...back} />
      </mesh>

      {/* Armrests */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 - 0.07), seatHeight + legHeight + 0.2, 0]} castShadow>
          <boxGeometry args={[0.14, 0.4, depth - 0.14]} />
          <meshStandardMaterial {...frame} />
        </mesh>
      ))}

      {/* Cushions */}
      {[-0.45, 0.45].map((offset) => (
        <mesh key={offset} position={[offset, seatHeight + legHeight + 0.08, 0.04]} castShadow>
          <boxGeometry args={[(width - 0.5) / 2, 0.16, depth - 0.3]} />
          <meshStandardMaterial {...cushions} />
        </mesh>
      ))}

      {/* Legs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[sx * (width / 2 - 0.1), legHeight / 2, sz * (depth / 2 - 0.08)]}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.035, legHeight, 12]} />
            <meshStandardMaterial {...legs} />
          </mesh>
        )),
      )}
    </group>
  );
}
