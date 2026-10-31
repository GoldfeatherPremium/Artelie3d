import { format } from "date-fns";
import { requireRole } from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton, type ActionResult } from "@/components/admin/admin-shell";
import { reviewReview } from "@/app/actions/admin";

const REVIEW_SELECT =
  "id, rating, title, body, status, verified_purchase, created_at, products(name), profiles(full_name, email)";

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  verified_purchase: boolean;
  created_at: string;
  products: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function productName(review: ReviewRow): string {
  return first(review.products)?.name ?? "Product";
}

function authorLabel(review: ReviewRow): string {
  const profile = first(review.profiles);
  return profile?.full_name ?? profile?.email ?? "Customer";
}

function statusVariant(status: string): "success" | "danger" | "warning" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

export default async function AdminReviewsPage() {
  await requireRole(["admin"]);
  const db = createServiceClient();

  const [{ data: pendingRows }, { data: allRows }] = await Promise.all([
    db
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("reviews").select(REVIEW_SELECT).order("created_at", { ascending: false }).limit(200),
  ]);

  const pending = (pendingRows ?? []) as unknown as ReviewRow[];
  const all = (allRows ?? []) as unknown as ReviewRow[];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-display-md text-ink">Reviews</h1>
        <p className="text-body-sm text-fog">Moderate customer reviews before they go live.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending moderation</CardTitle>
          <CardDescription>{pending.length} review(s) waiting for a decision</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState title="Nothing to moderate" description="All customer reviews have been reviewed." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{productName(review)}</div>
                      {review.verified_purchase ? (
                        <div className="text-caption text-fog">Verified purchase</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-fog">{authorLabel(review)}</TableCell>
                    <TableCell>
                      <Rating value={review.rating} readOnly size={14} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      {review.title ? <div className="font-medium text-ink">{review.title}</div> : null}
                      <p className="text-fog">{review.body ?? "—"}</p>
                    </TableCell>
                    <TableCell className="text-fog">{format(new Date(review.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <ConfirmButton
                          title="Approve review"
                          description={`Publish this review for ${productName(review)}?`}
                          confirmLabel="Approve"
                          variant="primary"
                          action={reviewReview.bind(null, review.id, "approved") as () => Promise<ActionResult>}
                        >
                          Approve
                        </ConfirmButton>
                        <ConfirmButton
                          title="Reject review"
                          description="The review will be removed and not shown on the product page."
                          confirmLabel="Reject"
                          variant="danger"
                          action={reviewReview.bind(null, review.id, "rejected") as () => Promise<ActionResult>}
                        >
                          Reject
                        </ConfirmButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All reviews</CardTitle>
          <CardDescription>{all.length} review(s) total</CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <EmptyState title="No reviews" description="Reviews will appear here as customers post them." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium text-ink">{productName(review)}</div>
                      {review.verified_purchase ? (
                        <div className="text-caption text-fog">Verified purchase</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-fog">{authorLabel(review)}</TableCell>
                    <TableCell>
                      <Rating value={review.rating} readOnly size={14} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      {review.title ? <div className="font-medium text-ink">{review.title}</div> : null}
                      <p className="text-fog">{review.body ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(review.status)}>{review.status}</Badge>
                    </TableCell>
                    <TableCell className="text-fog">{format(new Date(review.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
