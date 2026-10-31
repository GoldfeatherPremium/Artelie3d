import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/server";

const ROLE_LEVEL: Record<UserRole, number> = {
  customer: 0,
  seller: 1,
  admin: 2,
};

/**
 * Role hierarchy: customer < seller < admin. Passing "customer" in the
 * required list means "any authenticated user".
 */
function hasRole(role: UserRole, required: UserRole[]): boolean {
  if (required.length === 0) return false;
  if (required.includes("customer")) return true;
  const maxRequired = Math.max(...required.map((r) => ROLE_LEVEL[r]));
  return ROLE_LEVEL[role] >= maxRequired;
}

/** Return the current user's role from profiles.role (customer when signed out). */
export async function getUserRole(): Promise<UserRole> {
  const user = await getUser();
  if (!user) return "customer";

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as { role: UserRole } | null;
  return profile?.role ?? "customer";
}

export async function isAdmin(): Promise<boolean> {
  return (await getUserRole()) === "admin";
}

export async function isSeller(): Promise<boolean> {
  const role = await getUserRole();
  return role === "seller" || role === "admin";
}

/**
 * Require one of the given roles, redirecting when unauthorized:
 * unauthenticated users go to /auth/login, authenticated users without the
 * required role go to the home page.
 */
export async function requireRole(roles: UserRole[]): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const role = await getUserRole();
  if (!hasRole(role, roles)) redirect("/");
}

/** Whether the current user can manage the given store (owner seller or admin). */
export async function canManageStore(storeId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const role = await getUserRole();
  if (role === "admin") return true;
  if (role !== "seller") return false;

  const service = createServiceClient();

  const { data: sellerData } = await service
    .from("seller_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const sellerProfile = sellerData as { id: string } | null;
  if (!sellerProfile) return false;

  const { data: storeData } = await service
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("seller_profile_id", sellerProfile.id)
    .maybeSingle();

  return Boolean(storeData);
}

/** Whether the current user can manage the given product (store owner seller or admin). */
export async function canManageProduct(productId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const role = await getUserRole();
  if (role === "admin") return true;
  if (role !== "seller") return false;

  const service = createServiceClient();

  const { data: productData } = await service
    .from("products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle();

  const product = productData as { store_id: string } | null;
  if (!product) return false;

  return canManageStore(product.store_id);
}
