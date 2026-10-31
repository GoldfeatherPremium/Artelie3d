import { MODEL_KINDS, type ModelKind } from "@/lib/models3d/kinds";
import type { MaterialOverride } from "@/lib/pricing";
import { ModelMesh } from "./models/model-mesh";

export type { ModelKind } from "@/lib/models3d/kinds";

/** Every procedural model kind is supported by the live viewer. */
export const SUPPORTED_MODEL_KINDS: ModelKind[] = MODEL_KINDS;

export interface SceneContentProps {
  kind: ModelKind;
  materials: Record<string, MaterialOverride>;
}

export function SceneContent({ kind, materials }: SceneContentProps) {
  return <ModelMesh kind={kind} materials={materials} />;
}
