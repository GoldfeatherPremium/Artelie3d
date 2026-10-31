"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  images: { url: string; position: number }[];
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setSuggestions([]);
      const t = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setSuggestions((data.items ?? []) as Suggestion[]))
        .catch(() => {});
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-0 border-b border-line bg-paper shadow-overlay"
          >
            <form onSubmit={submit} className="container-site flex items-center gap-3 py-5">
              <Search className="h-5 w-5 shrink-0 text-fog" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search furniture, collections, designers…"
                aria-label="Search products"
                className="h-12 flex-1 bg-transparent text-title-md text-ink placeholder:text-fog/70 focus:outline-none"
              />
              <button type="submit" className="rounded-full bg-charcoal px-5 py-2.5 text-body-sm font-medium text-ivory transition-colors hover:bg-ink">
                Search
              </button>
              <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-2 text-fog transition-colors hover:bg-ivory hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="border-t border-line bg-paper">
                <div className="container-site py-4">
                  <p className="mb-2 text-caption font-medium uppercase tracking-wider text-fog">Suggestions</p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {suggestions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push(`/products/${item.slug}`);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ivory"
                        >
                          {item.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.images[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <span className="h-10 w-10 rounded-md bg-stone/50" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-body-sm font-medium text-ink">{item.name}</span>
                            <span className="block text-caption text-fog">
                              ${((item.sale_price_cents ?? item.base_price_cents) / 100).toFixed(0)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
