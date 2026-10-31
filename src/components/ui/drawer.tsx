"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextValue>({ open: false, onOpenChange: () => {} });

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Drawer({ open, onOpenChange, children }: DrawerProps) {
  const value = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export interface DrawerContentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag"> {
  side?: "left" | "right";
  hideClose?: boolean;
}

function DrawerContent({ className, side = "right", hideClose, children, ...props }: DrawerContentProps) {
  const { open, onOpenChange } = React.useContext(DrawerContext);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onOpenChange]);

  const isRight = side === "right";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ x: isRight ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? "100%" : "-100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute inset-y-0 flex w-full max-w-md flex-col bg-paper shadow-overlay",
              isRight ? "right-0" : "left-0",
              className,
            )}
            {...props}
          >
            {!hideClose && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close panel"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-fog transition-colors hover:bg-ivory hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-6 pb-4", className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-title-lg text-ink", className)} {...props} />;
}

function DrawerDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-sm text-fog", className)} {...props} />;
}

function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto px-6", className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-line p-6", className)} {...props} />;
}

export { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody, DrawerFooter };
