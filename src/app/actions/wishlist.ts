"use server";

import { redirect } from "next/navigation";
import { requireUser, getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

async function getDefaultWishlist(db: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await db
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data.id;
  const { data: created, error: insertError } = await db
    .from("wishlists")
    .insert({ user_id: userId })
    .select("id")
    .maybeSingle();
  if (insertError || !created) throw new Error(insertError?.message ?? "Failed to create wishlist");
  return created.id;
}

export async function toggleWishlist(productId: string): Promise<{ inWishlist: boolean }> {
  const user = await requireUser();
  const db = createServiceClient();

  const wishlistId = await getDefaultWishlist(db, user.id);

  const { data: existing } = await db
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await db.from("wishlist_items").delete().eq("id", existing.id);
    return { inWishlist: false };
  }

  const { error } = await db.from("wishlist_items").insert({ wishlist_id: wishlistId, product_id: productId });
  if (error) throw new Error(error.message);
  return { inWishlist: true };
}

export async function getWishlistProductIds(): Promise<string[]> {
  let user: Awaited<ReturnType<typeof getUser>> = null;
  try {
    user = await getUser();
  } catch {
    return [];
  }
  if (!user) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("wishlist_items")
    .select("product_id")
    .eq("wishlists.user_id", user.id);
  if (error) return [];
  return (data ?? []).map((row) => (row as { product_id: string }).product_id);
}

export async function listWishlist() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data, error } = await db
    .from("wishlist_items")
    .select(
      `id, created_at,
       products(id, name, slug, base_price_cents, sale_price_cents, status, product_images(url, position))`,
    )
    .eq("wishlists.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const item = row as {
      id: string;
      created_at: string;
      products: {
        id: string;
        name: string;
        slug: string;
        base_price_cents: number;
        sale_price_cents: number | null;
        status: string;
        product_images: { url: string; position: number }[];
      }[] | null;
    };
    const product = item.products?.[0] ?? null;
    return {
      id: item.id,
      createdAt: item.created_at,
      product: product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
            basePriceCents: product.base_price_cents,
            salePriceCents: product.sale_price_cents,
            status: product.status,
            imageUrl:
              [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null,
          }
        : null,
    };
  });
}

export async function requireWishlist(): Promise<void> {
  const user = await requireUser();
  const role = await getUserRole();
  if (role === "seller" || role === "admin") redirect("/");
  return void user;
}
