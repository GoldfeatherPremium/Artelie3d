"use client";

import { useMemo } from "react";
import { buildModel, applyPartMaterials } from "@/lib/models3d/builders";
import type { ModelKind } from "@/lib/models3d/kinds";
import type { MaterialOverride } from "@/lib/pricing";

/** Convert a customization map (keyed by group) into one keyed by mesh part name. */
export function materialOverridesByPart(
  overrides: Record<string, MaterialOverride>,
): Record<string, { color?: string; roughness?: number }> {
  const byPart: Record<string, { color?: string; roughness?: number }> = {};
  for (const value of Object.values(overrides)) {
    if (!value?.name) continue;
    byPart[value.name] = {
      color: value.color,
      roughness: value.roughness,
    };
  }
  return byPart;
}

export interface ModelMeshProps {
  kind: ModelKind;
  materials?: Record<string, MaterialOverride>;
}

/**
 * Renders a procedural furniture model inside a react-three-fiber canvas. The
 * model is built once per kind; material overrides are applied to the named
 * mesh parts (seat, frame, back, legs, top, base, shade, …) and update
 * reactively when the configuration changes.
 */
export function ModelMesh({ kind, materials = {} }: ModelMeshProps) {
  const group = useMemo(() => buildModel(kind), [kind]);
  const partMats = useMemo(() => materialOverridesByPart(materials), [materials]);

  useMemo(() => {
    applyPartMaterials(group, partMats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, partMats]);

  return <primitive object={group} />;
}
