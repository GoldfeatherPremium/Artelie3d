"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/motion/section-heading";

export default function CartPage() {
  const { state, loading, updateQty, removeItem } = useCart();

  return (
    <div className="bg-ivory">
      <div className="container-site py-10 sm:py-14">
        <SectionHeading overline="Shopping bag" title="Your bag" />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
          {/* Lines */}
          <div>
            {loading ? (
              <div className="grid gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-4 rounded-2xl border border-line bg-paper p-4">
                    <Skeleton className="h-24 w-24 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : state.items.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-6 w-6" />}
                title="Your bag is empty"
                description="Discover pieces to customize and bring into your space."
                action={
                  <Link href="/shop">
                    <Button variant="outline">Explore the collection</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-4">
                {state.items.map((item) => (
                  <li key={item.id} className="flex gap-4 rounded-2xl border border-line bg-paper p-4">
                    {item.imageUrl ? (
                      <Link href={`/products/${item.productSlug}`} className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
                      </Link>
                    ) : (
                      <span className="h-24 w-24 shrink-0 rounded-xl bg-stone/50" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/products/${item.productSlug}`} className="line-clamp-1 text-title-sm font-medium text-ink transition-colors hover:text-bronze">
                            {item.productName}
                          </Link>
                          {item.optionSummary ? (
                            <p className="mt-1 line-clamp-2 text-caption text-fog">{item.optionSummary.replaceAll(" | ", " · ")}</p>
                          ) : null}
                          <p className="mt-1 text-caption text-fog">
                            {`$${(item.unitPriceCents / 100).toFixed(2)} each`}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeItem(item.id)}
                          className="rounded-full p-1.5 text-fog transition-colors hover:bg-danger/8 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-full border border-line">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-body-sm">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Price amountCents={item.lineTotalCents} size="md" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Summary */}
          {!loading && state.items.length > 0 ? (
            <aside className="h-fit rounded-2xl border border-line bg-paper p-6 lg:sticky lg:top-28">
              <h2 className="font-display text-title-lg text-ink">Summary</h2>
              <dl className="mt-5 grid gap-3 text-body-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-fog">Subtotal</dt>
                  <dd className="font-medium text-ink">{`$${(state.subtotalCents / 100).toFixed(2)}`}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-fog">Shipping</dt>
                  <dd className="text-ink">Free standard</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-fog">Taxes</dt>
                  <dd className="text-fog">Calculated at checkout</dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-line pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-ink">Estimated total</span>
                  <span className="font-display text-title-lg text-ink">{`$${(state.subtotalCents / 100).toFixed(2)}`}</span>
                </div>
              </div>
              <Link href="/checkout" className="mt-6 block">
                <Button size="lg" className="w-full">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/shop" className="mt-3 block text-center text-body-sm text-fog transition-colors hover:text-ink">
                Continue shopping
              </Link>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
