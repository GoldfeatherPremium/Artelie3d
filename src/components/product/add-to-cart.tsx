"use client";

import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/ui/toast";

interface AddToCartButtonProps extends Omit<ButtonProps, "onClick"> {
  productId: string;
  quantity?: number;
  configuration?: Record<string, string> | null;
  label?: string;
}

export function AddToCartButton({
  productId,
  quantity = 1,
  configuration = null,
  label = "Add to bag",
  ...buttonProps
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      await addItem({ productId, quantity, configuration });
      toast.toast({
        title: "Added to your bag",
        description: "The piece is ready when you are.",
        variant: "success",
      });
    } catch (err) {
      toast.toast({
        title: "Could not add to bag",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" onClick={handleAdd} loading={loading} {...buttonProps}>
      <ShoppingBag className="h-4 w-4" />
      {label}
    </Button>
  );
}
