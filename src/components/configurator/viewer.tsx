"use client";

import * as React from "react";
import { Maximize, Minimize, RotateCcw, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelScene, parseModelKind } from "./model-scene";
import { SceneCanvas, type CameraPreset } from "./scene-canvas";
import type { MaterialOverride } from "@/lib/pricing";

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "top", label: "Top" },
];

export interface ViewerProps {
  modelConfig: { kind?: string; [key: string]: unknown } | null;
  materials: Record<string, MaterialOverride>;
  className?: string;
}

export function Viewer({ modelConfig, materials, className }: ViewerProps) {
  const kind = parseModelKind(modelConfig);
  const [preset, setPreset] = React.useState<CameraPreset>("default");
  const [loaded, setLoaded] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!kind) {
    return <ModelScene modelConfig={modelConfig} materials={materials} className={className} />;
  }

  return (
    <div ref={containerRef} className={cn("relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-b from-paper to-ivory", className)}>
      {!loaded && (
        <div className="absolute inset-0 z-10">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      )}
      <SceneCanvas kind={kind} materials={materials} interactive preset={preset} onReady={() => setLoaded(true)} />

      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-caption font-medium backdrop-blur-md transition-colors",
              preset === p.id ? "bg-charcoal text-ivory" : "bg-paper/80 text-ink hover:bg-paper",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setPreset("default")}
          aria-label="Reset camera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/80 text-ink backdrop-blur-md transition-colors hover:bg-paper"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/80 text-ink backdrop-blur-md transition-colors hover:bg-paper"
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1.5 backdrop-blur-md">
        <Camera className="h-3.5 w-3.5 text-fog" />
        <span className="text-caption text-fog">Drag to orbit</span>
      </div>
    </div>
  );
}
