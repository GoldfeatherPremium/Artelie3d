import { SiteHeader, type HeaderRole } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { listCategories, listCollections } from "@/lib/data/catalog";
import { getUserRole } from "@/lib/auth/roles";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, collections, role] = await Promise.all([
    listCategories(),
    listCollections(),
    getUserRole().catch(() => "customer" as const),
  ]);

  const headerRole: HeaderRole = role === "customer" ? null : role;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader categories={categories} collections={collections} role={headerRole} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
