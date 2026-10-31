"use client";

import dynamic from "next/dynamic";

/**
 * Client-side lazy wrapper for the 3D room designer.
 *
 * The room designer uses WebGL and must only mount in the browser, so it is
 * loaded with `ssr: false`. `next/dynamic` with `ssr: false` is only allowed
 * inside a Client Component, hence this separate wrapper (the page that
 * renders it stays a Server Component and keeps its `metadata` export).
 */
export const RoomDesignerLazy = dynamic(
  () => import("@/components/room-designer/room-designer").then((m) => m.RoomDesigner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-128 items-center justify-center rounded-2xl border border-line bg-paper text-fog">
        Loading the 3D room designer…
      </div>
    ),
  },
);
