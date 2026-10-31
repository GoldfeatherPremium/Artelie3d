"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

interface PaginationClientProps {
  page: number;
  totalPages: number;
  className?: string;
}

export function PaginationClient({ page, totalPages, className }: PaginationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      className={className}
      onPageChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next <= 1) params.delete("page");
        else params.set("page", String(next));
        const qs = params.toString();
        router.push(qs ? `/shop?${qs}` : "/shop");
      }}
    />
  );
}
