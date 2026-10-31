"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/wishlist";

export function RemoveWishlistItem({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <button
      type="button"
      aria-label="Remove from wishlist"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await toggleWishlist(productId);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/8 disabled:opacity-60"
    >
      <Heart className="h-4.5 w-4.5 fill-danger" />
    </button>
  );
}
