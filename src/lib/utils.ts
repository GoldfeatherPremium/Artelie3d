import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a currency string. */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

/** Compact number formatting for dashboards. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Slugify a string. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generate a human-friendly random order number. */
export function generateOrderNumber(): string {
  const ts = new Date();
  const stamp =
    String(ts.getUTCFullYear()).slice(-2) +
    String(ts.getUTCMonth() + 1).padStart(2, "0") +
    String(ts.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `A3D-${stamp}-${rand}`;
}

/** Generate a random share token. */
export function generateShareToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  ).toLowerCase();
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate a string to a max length with an ellipsis. */
export function truncate(value: string, max = 120): string {
  if (value.length <= max) return value;
  return value.slice(0, max).trimEnd() + "…";
}

/** Deep equality for simple JSON-able values (used for option comparisons). */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Safe JSON parse with fallback. */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Percentage helper with safe division. */
export function percentage(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

/** Convert a base64-ish data uri to a Blob (used for client-side uploads). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
