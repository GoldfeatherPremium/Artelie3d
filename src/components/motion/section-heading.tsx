import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export interface SectionHeadingProps {
  overline?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ overline, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {overline ? (
        <p className="mb-3 text-caption font-medium uppercase tracking-[0.18em] text-bronze">{overline}</p>
      ) : null}
      <h2 className="font-display text-display-md text-ink">{title}</h2>
      {description ? <p className="mt-4 text-body-lg text-fog">{description}</p> : null}
    </Reveal>
  );
}
