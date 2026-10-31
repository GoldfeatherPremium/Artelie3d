"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { getWishlistProductIds, toggleWishlist } from "@/app/actions/wishlist";
import { useToast } from "@/components/ui/toast";

export interface WishlistButtonProps {
  productId: string;
  initialIn?: boolean;
  className?: string;
}

export function WishlistButton({ productId, initialIn, className }: WishlistButtonProps) {
  const [inWishlist, setInWishlist] = React.useState(() => Boolean(initialIn));
  const [loaded, setLoaded] = React.useState(Boolean(initialIn));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  React.useEffect(() => {
    if (loaded) return;
    let active = true;
    getWishlistProductIds()
      .then((ids) => {
        if (!active) return;
        setInWishlist(ids.includes(productId));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [productId, loaded]);

  const toggle = () => {
    startTransition(async () => {
      try {
        const result = await toggleWishlist(productId);
        setInWishlist(result.inWishlist);
        toast({
          title: result.inWishlist ? "Added to wishlist" : "Removed from wishlist",
          variant: "success",
        });
      } catch (err) {
        toast({ title: "Unable to update wishlist", description: err instanceof Error ? err.message : undefined, variant: "error" });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-ink shadow-sm transition-colors",
        "hover:text-bronze focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze",
        inWishlist ? "text-bronze" : "text-fog",
        className,
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", inWishlist && "fill-bronze")} />
    </button>
  );
}
