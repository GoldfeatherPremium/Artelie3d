"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

const iconFor: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4.5 w-4.5 text-fog" />,
  success: <CheckCircle2 className="h-4.5 w-4.5 text-success" />,
  error: <AlertCircle className="h-4.5 w-4.5 text-danger" />,
  info: <Info className="h-4.5 w-4.5 text-info" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: { title: string; description?: string; variant?: ToastVariant }) => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, ...input, variant: input.variant ?? "default" }]);
      window.setTimeout(() => dismiss(id), 4800);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-paper p-4 shadow-raised",
              )}
            >
              <span className="mt-0.5 shrink-0">{iconFor[item.variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-caption text-fog">{item.description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded-full p-1 text-fog transition-colors hover:bg-ivory hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
