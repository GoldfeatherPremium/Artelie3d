"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { state, loading, updateQty, removeItem } = useCart();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg">
        <DrawerHeader className="pt-14">
          <DrawerTitle>Your bag</DrawerTitle>
          <DrawerDescription>
            {state.count > 0 ? `${state.count} item${state.count === 1 ? "" : "s"}` : "Your shopping bag is empty"}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          {loading ? (
            <div className="grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
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
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  <Link href="/shop">Explore the collection</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-5">
              {state.items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-20 w-20 shrink-0 rounded-lg bg-stone/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productSlug}`} className="line-clamp-1 text-body-sm font-medium text-ink hover:text-bronze">
                      {item.productName}
                    </Link>
                    {item.optionSummary ? (
                      <p className="mt-0.5 line-clamp-1 text-caption text-fog">{item.optionSummary}</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-line">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-body-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Price amountCents={item.lineTotalCents} size="sm" />
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeItem(item.id)}
                          className="rounded-full p-1.5 text-fog transition-colors hover:bg-danger/8 hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DrawerBody>
        {!loading && state.items.length > 0 && (
          <DrawerFooter>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-body-sm text-fog">Subtotal</span>
              <span className="text-title-md font-medium text-ink">{formatCurrency(state.subtotalCents / 100)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <Link href="/cart" className="w-full text-center">View bag</Link>
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                <Link href="/checkout" className="w-full text-center">Checkout</Link>
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
