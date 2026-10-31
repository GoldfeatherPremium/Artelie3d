import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "bronze" | "outline" | "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-charcoal text-ivory",
  bronze: "bg-bronze/15 text-bronze",
  outline: "border border-charcoal/20 text-ink",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
  neutral: "bg-stone/40 text-ink/70",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium tracking-wide",
      variantClasses[variant],
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
