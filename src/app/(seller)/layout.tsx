import { requireRole } from "@/lib/auth/roles";
import { SellerShell } from "@/components/seller/seller-shell";

/** Seller routes are access-controlled; never statically prerendered. */
export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  // Enforce seller access on every /seller route (middleware also gates, but the
  // layout re-checks server-side per the shared contracts).
  await requireRole(["seller"]);

  return <SellerShell>{children}</SellerShell>;
}
