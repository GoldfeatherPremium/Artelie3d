"use client";

import * as React from "react";

const KEY = "atelier_recent";

/**
 * Client-side recently-viewed tracking (privacy-conscious: stored only in the
 * visitor's own browser). Silently degrades when storage is unavailable.
 */
export function TrackView({ slug }: { slug: string }) {
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [slug, ...list.filter((s) => s !== slug)].slice(0, 20);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [slug]);

  return null;
}
