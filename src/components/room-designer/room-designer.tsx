"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Copy, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelMesh } from "@/components/configurator/models/model-mesh";
import { MODEL_KINDS, KIND_LABELS, type ModelKind } from "@/lib/models3d/kinds";
import { ROOM_TEMPLATES, getRoomTemplate, type RoomTemplate } from "./templates";

interface PlacedObject {
  id: string;
  kind: ModelKind;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

interface SavedDesign {
  name: string;
  templateId: string;
  objects: PlacedObject[];
  savedAt: string;
}

const STORAGE_KEY = "atelier.room.designs";

const PALETTE: ModelKind[] = [
  "sofa-curved",
  "sectional",
  "modular-sofa",
  "accent-chair",
  "lounge-chair",
  "coffee-table",
  "side-table",
  "tv-console",
  "bed",
  "bed-platform",
  "bedside-table",
  "dresser",
  "bench",
  "dining-table",
  "dining-table-round",
  "dining-chair",
  "dining-chair-uph",
  "dining-bench",
  "desk",
  "desk-executive",
  "office-chair",
  "shelving",
  "floor-lamp",
  "pendant",
  "table-lamp",
  "vase",
  "mirror",
  "wall-clock",
  "planter",
  "wall-art",
];

function loadSaved(): SavedDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedDesign[]) : [];
  } catch {
    return [];
  }
}

export function RoomDesigner() {
  const [templateId, setTemplateId] = React.useState(ROOM_TEMPLATES[0].id);
  const [objects, setObjects] = React.useState<PlacedObject[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("My room design");
  const [saved, setSaved] = React.useState<SavedDesign[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSaved(loadSaved());
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const template = getRoomTemplate(templateId);

  function addObject(kind: ModelKind) {
    const id = `${kind}-${Date.now()}`;
    setObjects((prev) => [
      ...prev,
      { id, kind, x: 0, z: 0.4, rotY: 0, scale: 1 },
    ]);
    setSelectedId(id);
  }

  function moveSelected(x: number, z: number) {
    if (!selectedId) return;
    const halfW = template.width / 2 - 0.6;
    const halfD = template.depth / 2 - 0.6;
    const cx = Math.max(-halfW, Math.min(halfW, x));
    const cz = Math.max(-halfD, Math.min(halfD, z));
    setObjects((prev) => prev.map((o) => (o.id === selectedId ? { ...o, x: cx, z: cz } : o)));
  }

  function mutateSelected(patch: Partial<Pick<PlacedObject, "rotY" | "scale">>) {
    if (!selectedId) return;
    setObjects((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)));
  }

  function removeSelected() {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function clearAll() {
    setObjects([]);
    setSelectedId(null);
  }

  function saveDesign() {
    const design: SavedDesign = {
      name: name.trim() || "My room design",
      templateId,
      objects,
      savedAt: new Date().toISOString(),
    };
    const next = [design, ...saved.filter((d) => d.name !== design.name)];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next);
    setToast("Design saved on this device");
  }

  function loadDesign(design: SavedDesign) {
    setTemplateId(design.templateId);
    setObjects(design.objects);
    setName(design.name);
    setSelectedId(null);
    setToast(`Loaded “${design.name}”`);
  }

  function deleteDesign(designName: string) {
    const next = saved.filter((d) => d.name !== designName);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next);
  }

  const selected = objects.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        {/* Template picker */}
        <div className="flex flex-wrap gap-2 border-b border-line p-4">
          {ROOM_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors",
                t.id === templateId ? "bg-charcoal text-ivory" : "border border-line bg-ivory text-ink hover:border-bronze",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative h-[480px] w-full sm:h-[560px]">
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: template.camera.position, fov: template.camera.fov }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 6, 3]} intensity={1.4} castShadow />
            <directionalLight position={[-4, 3, -2]} intensity={0.3} />

            <RoomShell template={template} />

            {template.rug ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
                <planeGeometry args={[template.rug.width, template.rug.depth]} />
                <meshStandardMaterial color={template.rug.color} roughness={0.95} />
              </mesh>
            ) : null}

            {objects.map((obj) => (
              <group
                key={obj.id}
                position={[obj.x, 0, obj.z]}
                rotation={[0, obj.rotY, 0]}
                scale={obj.scale}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(obj.id);
                }}
              >
                <ModelMesh kind={obj.kind} />
              </group>
            ))}

            {/* Selection ring */}
            {selected ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[selected.x, 0.02, selected.z]}>
                <ringGeometry args={[0.9, 1.05, 48]} />
                <meshBasicMaterial color="#a88c69" transparent opacity={0.85} />
              </mesh>
            ) : null}

            {/* Ground: click to move the selected piece */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedId) moveSelected(e.point.x, e.point.z);
                else setSelectedId(null);
              }}
            >
              <planeGeometry args={[template.width, template.depth]} />
              <meshStandardMaterial color={template.floor} roughness={0.85} />
            </mesh>

            <ContactShadows position={[0, 0.01, 0]} opacity={0.3} blur={2.2} far={3} color="#2b2620" />
            <OrbitControls makeDefault enablePan={false} minDistance={1.6} maxDistance={12} target={[0, 0.8, 0]} />
          </Canvas>

          <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/35 px-4 py-1.5 text-caption text-ivory/85 backdrop-blur-md">
            {selected ? "Click the floor to move the selected piece" : "Select a piece from the palette to place it"}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-4">
        {/* Palette */}
        <div className="rounded-2xl border border-line bg-paper p-5">
          <h3 className="font-display text-title-md text-ink">Furniture palette</h3>
          <p className="mt-1 text-caption text-fog">Tap a piece to add it to the room.</p>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {PALETTE.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addObject(kind)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-ivory/50 px-2.5 py-2 text-left text-caption text-ink transition-colors hover:border-bronze hover:bg-bronze/5"
              >
                <Plus className="h-3 w-3 shrink-0 text-bronze" />
                <span className="truncate">{KIND_LABELS[kind]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selection / tools */}
        <div className="rounded-2xl border border-line bg-paper p-5">
          <h3 className="font-display text-title-md text-ink">Tools</h3>
          {selected ? (
            <div className="mt-3">
              <p className="text-body-sm text-ink">
                {KIND_LABELS[selected.kind]}
                <span className="text-fog"> — selected</span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => mutateSelected({ rotY: selected.rotY - Math.PI / 8 })} className="rounded-full border border-line px-3 py-2 text-caption font-medium text-ink transition-colors hover:border-bronze">
                  Rotate ⟲
                </button>
                <button type="button" onClick={() => mutateSelected({ rotY: selected.rotY + Math.PI / 8 })} className="rounded-full border border-line px-3 py-2 text-caption font-medium text-ink transition-colors hover:border-bronze">
                  Rotate ⟳
                </button>
                <button type="button" onClick={() => mutateSelected({ scale: Math.min(1.5, selected.scale + 0.1) })} className="rounded-full border border-line px-3 py-2 text-caption font-medium text-ink transition-colors hover:border-bronze">
                  Scale +
                </button>
                <button type="button" onClick={() => mutateSelected({ scale: Math.max(0.6, selected.scale - 0.1) })} className="rounded-full border border-line px-3 py-2 text-caption font-medium text-ink transition-colors hover:border-bronze">
                  Scale −
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={removeSelected} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-danger/40 px-3 py-2 text-caption font-medium text-danger transition-colors hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
                <button type="button" onClick={clearAll} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-3 py-2 text-caption font-medium text-ink transition-colors hover:border-bronze">
                  <X className="h-3.5 w-3.5" /> Clear all
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-body-sm text-fog">Select a placed piece to rotate, scale or remove it.</p>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <label className="text-caption font-medium text-fog" htmlFor="room-design-name">Design name</label>
            <input
              id="room-design-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ivory px-3 text-body-sm text-ink focus:border-bronze focus:outline-none"
            />
            <button
              type="button"
              onClick={saveDesign}
              disabled={objects.length === 0}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-body-sm font-medium text-ivory transition-colors hover:bg-ink disabled:opacity-40"
            >
              <Save className="h-4 w-4" /> Save design
            </button>
          </div>
        </div>

        {/* Saved designs */}
        {saved.length > 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h3 className="font-display text-title-md text-ink">Saved designs</h3>
            <ul className="mt-3 grid gap-2">
              {saved.map((design) => (
                <li key={design.name} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ivory/50 px-3 py-2.5">
                  <button type="button" onClick={() => loadDesign(design)} className="min-w-0 text-left">
                    <span className="block truncate text-body-sm font-medium text-ink">{design.name}</span>
                    <span className="block text-caption text-fog">
                      {design.objects.length} objects · {new Date(design.savedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteDesign(design.name)} aria-label={`Delete ${design.name}`} className="shrink-0 rounded-full p-1.5 text-fog transition-colors hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {toast ? (
          <div className="rounded-xl bg-success/10 px-4 py-3 text-body-sm text-success">{toast}</div>
        ) : null}
      </aside>
    </div>
  );
}

function RoomShell({ template }: { template: RoomTemplate }) {
  const { width, depth, height, wall } = template;
  const wallMat = <meshStandardMaterial color={wall} roughness={0.94} />;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <planeGeometry args={[width, height]} />
        {wallMat}
      </mesh>
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        {wallMat}
      </mesh>
      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        {wallMat}
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        {wallMat}
      </mesh>
      {/* Window */}
      {template.window ? (
        <group>
          <mesh position={[template.window.x, template.window.height / 2, -depth / 2 + 0.01]}>
            <planeGeometry args={[template.window.width, template.window.height]} />
            <meshStandardMaterial
              color={template.window.color}
              emissive={template.window.color}
              emissiveIntensity={template.window.intensity}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[template.window.x, template.window.height / 2, -depth / 2 + 0.02]}>
            <boxGeometry args={[0.06, template.window.height, 0.06]} />
            <meshStandardMaterial color="#2a2a28" roughness={0.6} />
          </mesh>
          <mesh position={[template.window.x, template.window.height / 2, -depth / 2 + 0.02]}>
            <boxGeometry args={[template.window.width, 0.06, 0.06]} />
            <meshStandardMaterial color="#2a2a28" roughness={0.6} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/** Re-export for convenient access to the template list elsewhere. */
export { ROOM_TEMPLATES, MODEL_KINDS };
