"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Field } from "@/components/ui/input";
import { Rating } from "@/components/ui/rating";
import { useToast } from "@/components/ui/toast";
import { submitReview } from "@/app/actions/customer";

interface ReviewableItem {
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productId: string;
  productTitle: string;
}

export function WriteReview({ items }: { items: ReviewableItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [productId, setProductId] = React.useState(items[0]?.productId ?? "");
  const [orderId, setOrderId] = React.useState(items[0]?.orderId ?? "");
  const [orderItemId, setOrderItemId] = React.useState(items[0]?.orderItemId ?? "");
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function selectItem(itemId: string) {
    const item = items.find((i) => i.orderItemId === itemId);
    if (!item) return;
    setProductId(item.productId);
    setOrderId(item.orderId);
    setOrderItemId(item.orderItemId);
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await submitReview({ productId, orderId, orderItemId, rating, title, body });
      if (result.ok) {
        toast.toast({ title: "Review submitted", description: "It will appear after moderation.", variant: "success" });
        setTitle("");
        setBody("");
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4">
      <Field label="Product" htmlFor="review-product">
        <Select id="review-product" value={orderItemId} onChange={(e) => selectItem(e.target.value)}>
          {items.map((item) => (
            <option key={item.orderItemId} value={item.orderItemId}>
              {item.productTitle} ({item.orderNumber})
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-ink">Rating</p>
        <Rating value={rating} onChange={setRating} size={20} />
      </div>
      <Field label="Title" htmlFor="review-title">
        <input id="review-title" className="h-11 w-full rounded-lg border border-line bg-paper px-3.5 text-body-md focus:border-bronze focus:outline-none focus:ring-2 focus:ring-bronze/30" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary (optional)" />
      </Field>
      <Field label="Review" htmlFor="review-body">
        <Textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was the piece?" rows={4} />
      </Field>
      {error ? <p className="text-caption text-danger" role="alert">{error}</p> : null}
      <div>
        <Button type="button" onClick={submit} loading={pending}>Submit review</Button>
      </div>
    </div>
  );
}
