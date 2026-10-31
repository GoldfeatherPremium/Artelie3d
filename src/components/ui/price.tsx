import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface PriceProps {
  amountCents: number;
  compareAtCents?: number | null;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-body-sm",
  md: "text-body-md",
  lg: "text-title-lg",
};

function Price({ amountCents, compareAtCents, currency = "USD", className, size = "md" }: PriceProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-medium text-ink", sizeClasses[size])}>
        {formatCurrency(amountCents / 100, currency)}
      </span>
      {compareAtCents != null && compareAtCents > amountCents ? (
        <span className={cn("text-fog line-through", size === "lg" ? "text-body-md" : "text-caption")}>
          {formatCurrency(compareAtCents / 100, currency)}
        </span>
      ) : null}
    </span>
  );
}

export { Price };
