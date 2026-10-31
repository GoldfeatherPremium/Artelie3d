import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
type ButtonSize = "sm" | "default" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-charcoal text-ivory hover:bg-ink focus-visible:outline-bronze disabled:bg-fog/60",
  secondary:
    "bg-stone/60 text-ink hover:bg-stone focus-visible:outline-bronze disabled:opacity-60",
  outline:
    "border border-charcoal/20 bg-transparent text-ink hover:border-charcoal/50 hover:bg-charcoal/5 focus-visible:outline-bronze",
  ghost: "bg-transparent text-ink hover:bg-charcoal/5 focus-visible:outline-bronze",
  link: "bg-transparent text-charcoal underline-offset-4 hover:underline focus-visible:outline-bronze p-0 h-auto",
  danger: "bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger disabled:opacity-60",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-body-sm",
  default: "h-11 px-5 text-body-sm",
  lg: "h-12 px-7 text-body-md",
  icon: "h-10 w-10",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-wide transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:pointer-events-none disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
