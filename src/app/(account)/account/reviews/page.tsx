import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteReview } from "@/components/account/write-review";

export default async function ReviewsPage() {
  const user = await requireUser();
  const db = createServiceClient();

  const { data: reviewsData } = await db
    .from("reviews")
    .select("id, rating, title, body, status, created_at, products(id, name, slug, product_images(url, position))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: deliveredData } = await db
    .from("orders")
    .select("id, order_number, order_items(id, product_id, title)")
    .eq("user_id", user.id)
    .eq("status", "delivered")
    .limit(10);

  const reviews = (reviewsData ?? []) as unknown as {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    status: string;
    created_at: string;
    products: { id: string; name: string; slug: string; product_images: { url: string; position: number }[] } | null;
  }[];

  const delivered = (deliveredData ?? []) as unknown as {
    id: string;
    order_number: string;
    order_items: { id: string; product_id: string; title: string }[];
  }[];

  const reviewable = delivered.flatMap((order) =>
    order.order_items.map((item) => ({ orderId: order.id, orderNumber: order.order_number, orderItemId: item.id, productId: item.product_id, productTitle: item.title })),
  );

  return (
    <div>
      <h2 className="font-display text-title-lg text-ink">My reviews</h2>

      {reviewable.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
          <h3 className="font-display text-title-md text-ink">Review a delivered order</h3>
          <WriteReview items={reviewable} />
        </section>
      ) : null}

      <h3 className="mt-8 font-display text-title-md text-ink">Written reviews</h3>

      {reviews.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No reviews yet" description="Your published reviews will appear here." />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Rating value={review.rating} size={14} />
                <Badge variant={review.status === "approved" ? "success" : review.status === "pending" ? "warning" : "neutral"}>{review.status}</Badge>
              </div>
              <p className="mt-2 text-body-sm text-fog">
                <Link href={`/products/${review.products?.slug}`} className="font-medium text-ink hover:text-bronze">
                  {review.products?.name ?? "Product"}
                </Link>{" "}
                · {new Date(review.created_at).toLocaleDateString()}
              </p>
              {review.title ? <p className="mt-2 font-medium text-ink">{review.title}</p> : null}
              {review.body ? <p className="mt-1 text-body-sm text-ink/80">{review.body}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
