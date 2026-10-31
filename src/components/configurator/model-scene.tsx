"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { MaterialOverride } from "@/lib/pricing";
import { SUPPORTED_MODEL_KINDS, type ModelKind } from "./scene-content";

const SceneCanvas = dynamic(() => import("./scene-canvas"), { ssr: false });

export interface ModelSceneProps {
  modelConfig: { kind?: string; [key: string]: unknown } | null;
  materials: Record<string, MaterialOverride>;
  interactive?: boolean;
  className?: string;
}

export function parseModelKind(modelConfig: { kind?: string; [key: string]: unknown } | null): ModelKind | null {
  if (!modelConfig?.kind) return null;
  const kind = modelConfig.kind as string;
  return SUPPORTED_MODEL_KINDS.includes(kind as ModelKind) ? (kind as ModelKind) : null;
}

export function ModelScene({ modelConfig, materials, interactive = false, className }: ModelSceneProps) {
  const kind = parseModelKind(modelConfig);

  if (!kind) {
    return (
      <div
        className={cn(
          "flex h-full min-h-64 w-full items-center justify-center rounded-xl border border-dashed border-stone bg-ivory/50 p-6 text-center",
          className,
        )}
      >
        <div>
          <p className="text-body-sm font-medium text-ink">3D preview unavailable</p>
          <p className="mt-1 text-caption text-fog">
            This product does not include a supported 3D model for live preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full min-h-64 overflow-hidden rounded-xl bg-gradient-to-b from-paper to-ivory", className)}>
      <SceneCanvas kind={kind} materials={materials} interactive={interactive} />
    </div>
  );
}
