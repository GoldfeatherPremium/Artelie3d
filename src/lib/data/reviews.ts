import { createPublicClient } from "@/lib/supabase/server";

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  authorName: string | null;
}

/**
 * Public review reads. Uses the public anon-key client so approved reviews are
 * read under RLS (see 0002_rls.sql `reviews_select_public`); the reviewer's
 * profile name is exposed only when RLS allows it (self/admin), otherwise it
 * falls back to "Anonymous" in the UI. This never requires the service-role
 * credential.
 */
export async function getProductReviews(productId: string, limit = 12): Promise<ReviewView[]> {
  const db = createPublicClient();
  const { data, error } = await db
    .from("reviews")
    .select("id, rating, title, body, created_at, verified_purchase, helpful_count, profiles(full_name)")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      rating: number;
      title: string | null;
      body: string | null;
      created_at: string;
      verified_purchase: boolean;
      helpful_count: number;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    };
    const author = Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles;
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      verifiedPurchase: r.verified_purchase,
      helpfulCount: r.helpful_count,
      authorName: author?.full_name ?? null,
    };
  });
}
