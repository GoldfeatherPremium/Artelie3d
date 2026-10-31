"use server";

import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";

const reviewSchema = z.object({
  productId: z.string().min(1),
  orderItemId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().max(4000).optional(),
});

export async function submitReview(input: z.infer<typeof reviewSchema>): Promise<{ ok: boolean; reviewId: string }> {
  const user = await requireUser();
  const role = await getUserRole();
  if (role !== "customer") throw new Error("Only customers can leave reviews");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid review data");

  const db = createServiceClient();
  const { data, error } = await db
    .from("reviews")
    .insert({
      product_id: parsed.data.productId,
      order_item_id: parsed.data.orderItemId ?? null,
      user_id: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Failed to submit review");
  return { ok: true, reviewId: data.id };
}
