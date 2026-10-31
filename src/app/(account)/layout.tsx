import { requireUser } from "@/lib/supabase/server";
import { AccountShell } from "@/components/account/account-shell";

/** Account pages are session-bound; never statically prerendered. */
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Middleware gates /account for authenticated users; re-check server-side.
  await requireUser();

  return <AccountShell>{children}</AccountShell>;
}
