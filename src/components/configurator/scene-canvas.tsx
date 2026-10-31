"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SceneContent, type ModelKind } from "./scene-content";
import type { MaterialOverride } from "@/lib/pricing";

export type CameraPreset = "default" | "front" | "side" | "top";

const PRESET_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  default: [2.4, 1.8, 3],
  front: [0, 1.1, 3.4],
  side: [3.4, 1.2, 0.4],
  top: [0, 4.4, 0.1],
};

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera, controls } = useThree();
  const first = useRef(true);

  useEffect(() => {
    const target = PRESET_POSITIONS[preset];
    camera.position.set(...target);
    (controls as OrbitControlsImpl | null)?.update?.();
    if (first.current) {
      camera.lookAt(0, 0.8, 0);
      first.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  return null;
}

export interface SceneCanvasProps {
  kind: ModelKind;
  materials: Record<string, MaterialOverride>;
  interactive?: boolean;
  preset?: CameraPreset;
  onReady?: () => void;
}

export function SceneCanvas({ kind, materials, interactive = false, preset = "default", onReady }: SceneCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: PRESET_POSITIONS[preset], fov: 40 }}
      frameloop={interactive ? "always" : "demand"}
      onCreated={() => onReady?.()}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={1.5} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />
      <Suspense fallback={null}>
        <SceneContent kind={kind} materials={materials} />
      </Suspense>
      <ContactShadows position={[0, -0.005, 0]} opacity={0.35} blur={2.4} far={2.4} color="#2b2620" />
      {interactive && (
        <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={1.2} maxDistance={8} target={[0, 0.8, 0]} />
      )}
      <CameraRig preset={preset} />
    </Canvas>
  );
}
