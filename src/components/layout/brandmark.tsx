import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brandmark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="ATELIER 3D home" className={cn("group inline-flex items-baseline gap-1.5", className)}>
      <span className="font-display text-lg font-medium tracking-[0.12em] text-ink">ATELIER</span>
      <span className="font-display text-lg font-semibold text-bronze">3D</span>
      <span className="hidden text-[0.625rem] uppercase tracking-[0.28em] text-fog sm:inline">The future of shopping</span>
    </Link>
  );
}
