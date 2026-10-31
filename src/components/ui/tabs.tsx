"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);

  React.useEffect(() => {
    const el = refs.current.get(value);
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [value, tabs]);

  return (
    <div role="tablist" className={cn("relative flex border-b border-line", className)}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              if (node) refs.current.set(tab.value, node);
              else refs.current.delete(tab.value);
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative px-4 py-2.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze",
              selected ? "font-medium text-ink" : "text-fog hover:text-ink",
              tab.disabled && "pointer-events-none opacity-50",
            )}
          >
            {tab.label}
          </button>
        );
      })}
      {indicator && (
        <span
          aria-hidden
          className="absolute -bottom-px h-0.5 bg-charcoal transition-all duration-300"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
    </div>
  );
}

export { Tabs };
