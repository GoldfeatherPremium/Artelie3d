import type { MaterialOverride } from "@/lib/pricing";
import { SofaModel } from "./models/sofa";
import { ArmchairModel } from "./models/armchair";
import { DiningTableModel } from "./models/table";

export type ModelKind = "sofa" | "armchair" | "table";

export const SUPPORTED_MODEL_KINDS: ModelKind[] = ["sofa", "armchair", "table"];

export interface SceneContentProps {
  kind: ModelKind;
  materials: Record<string, MaterialOverride>;
}

export function SceneContent({ kind, materials }: SceneContentProps) {
  switch (kind) {
    case "sofa":
      return <SofaModel materials={materials} />;
    case "armchair":
      return <ArmchairModel materials={materials} />;
    case "table":
      return <DiningTableModel materials={materials} />;
  }
}
