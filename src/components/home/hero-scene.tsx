"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Viewer } from "@/components/configurator/viewer";
import type { CatalogProduct } from "@/lib/data/catalog";

interface HeroSceneProps {
  product: CatalogProduct | null;
}

/**
 * Cinematic homepage hero. Renders the immersive 3D furniture scene behind the
 * wordmark with a smooth entrance transition. Falls back to the default curved
 * sofa scene when no configurable product is available.
 */
export function HeroScene({ product }: HeroSceneProps) {
  const reduced = useReducedMotion();

  const modelConfig = React.useMemo(() => {
    const raw = product?.model_config;
    if (raw && typeof raw === "object" && !Array.isArray(raw) && typeof (raw as { kind?: unknown }).kind === "string") {
      return raw as Record<string, unknown>;
    }
    return { kind: "sofa-curved" };
  }, [product]);

  return (
    <div className="relative flex h-[92vh] min-h-[600px] w-full flex-col overflow-hidden bg-gradient-to-b from-paper to-ivory">
      {/* 3D scene */}
      <div className="absolute inset-0">
        <Viewer modelConfig={modelConfig} materials={{}} />
      </div>

      {/* Cinematic scrim for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/45" />

      {/* Overlay content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 text-caption font-medium uppercase tracking-[0.28em] text-ivory"
        >
          ATELIER 3D
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl font-display text-display-2xl text-ivory drop-shadow-sm"
        >
          Your Space. Your Design. Your World.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 max-w-xl text-body-lg text-ivory/90"
        >
          Discover, customize and purchase beautifully designed furniture through
          immersive 3D experiences.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link href="/shop" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full bg-ivory text-charcoal hover:bg-white sm:w-auto">
              Explore the Collection <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/showroom" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-ivory/40 bg-transparent text-ivory hover:border-ivory hover:bg-ivory/10 sm:w-auto"
            >
              Enter the 3D Showroom
            </Button>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2"
      >
        <p className="rounded-full bg-ink/25 px-4 py-1.5 text-caption text-ivory/80 backdrop-blur-md">
          Drag to orbit · scroll to explore
        </p>
      </motion.div>
    </div>
  );
}
