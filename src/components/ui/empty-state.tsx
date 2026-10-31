import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone bg-ivory/40 px-6 py-14 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-paper text-bronze shadow-card">{icon}</div>
      ) : null}
      <h3 className="font-display text-title-md text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-body-sm text-fog">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
