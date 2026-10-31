import { requireRole } from "@/lib/auth/roles";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Enforce admin access on every /admin route (middleware also gates, but the
  // layout re-checks server-side per the shared contracts).
  await requireRole(["admin"]);

  return <AdminShell>{children}</AdminShell>;
}
