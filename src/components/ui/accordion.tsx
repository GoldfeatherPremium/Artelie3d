"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  type?: "single" | "multiple";
  defaultValue?: string[];
  className?: string;
}

function Accordion({ items, type = "single", defaultValue = [], className }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>(defaultValue);

  const toggle = (value: string) => {
    setOpen((prev) => {
      if (type === "single") return prev.includes(value) ? [] : [value];
      return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
    });
  };

  return (
    <div className={cn("divide-y divide-line rounded-xl border border-line bg-paper", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.value);
        return (
          <div key={item.value}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(item.value)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-body-md font-medium text-ink transition-colors hover:bg-ivory/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
            >
              {item.label}
              <ChevronDown
                className={cn("h-4.5 w-4.5 shrink-0 text-fog transition-transform duration-300", isOpen && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-body-sm text-ink/75">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export { Accordion };
