import { createServiceClient } from "@/lib/supabase/admin";

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  author: { fullName: string | null } | null;
}

export async function getProductReviews(productId: string, limit = 12): Promise<ReviewView[]> {
  const db = createServiceClient();
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
      author,
    };
  });
}
