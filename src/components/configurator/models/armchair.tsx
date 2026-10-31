import type { MaterialOverride } from "@/lib/pricing";

export interface ArmchairModelProps {
  materials: Record<string, MaterialOverride>;
}

function colorOf(override: MaterialOverride | undefined, fallback: string, roughness: number) {
  return {
    color: override?.color ?? fallback,
    roughness: override?.roughness ?? roughness,
  };
}

export function ArmchairModel({ materials }: ArmchairModelProps) {
  const width = 0.95;
  const depth = 0.9;
  const seatHeight = 0.42;
  const legHeight = 0.2;

  const seat = colorOf(materials.seat, "#EDE6DA", 0.95);
  const frame = colorOf(materials.frame, "#2A2A28", 0.4);
  const legs = colorOf(materials.legs, "#9A9A98", 0.4);
  const back = colorOf(materials.back, "#EDE6DA", 0.95);

  return (
    <group>
      {/* Base frame */}
      <mesh position={[0, legHeight + 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshStandardMaterial {...frame} />
      </mesh>

      {/* Seat */}
      <mesh position={[0, seatHeight + legHeight, 0.04]} castShadow>
        <boxGeometry args={[width - 0.16, 0.15, depth - 0.16]} />
        <meshStandardMaterial {...seat} />
      </mesh>

      {/* Back */}
      <mesh position={[0, seatHeight + legHeight + 0.44, -depth / 2 + 0.08]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[width - 0.1, 0.72, 0.2]} />
        <meshStandardMaterial {...back} />
      </mesh>

      {/* Arms */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 - 0.05), seatHeight + legHeight + 0.18, 0]} castShadow>
          <boxGeometry args={[0.12, 0.36, depth - 0.12]} />
          <meshStandardMaterial {...frame} />
        </mesh>
      ))}

      {/* Legs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[sx * (width / 2 - 0.1), legHeight / 2, sz * (depth / 2 - 0.1)]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.03, legHeight, 12]} />
            <meshStandardMaterial {...legs} />
          </mesh>
        )),
      )}
    </group>
  );
}
