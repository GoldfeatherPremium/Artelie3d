"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  RotateCcw,
  Percent,
  Wallet,
  TicketPercent,
  Star,
  LifeBuoy,
  FolderTree,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** Shape returned by every admin server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/commissions", label: "Commissions", icon: Percent },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLink({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string }) {
  const active = isActive(href, pathname);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze",
        active ? "bg-charcoal font-medium text-ivory" : "text-ink hover:bg-charcoal/5",
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {label}
    </Link>
  );
}

/**
 * Admin application shell. Renders the navigation rail (desktop) and a
 * horizontal nav (mobile) around the passed page content.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ivory">
      {/* Mobile nav */}
      <div className="sticky top-0 z-30 border-b border-line bg-paper lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="font-display text-title-sm tracking-wide text-ink">ATELIER 3D</div>
          <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-caption font-medium text-bronze">Admin</span>
        </div>
        <nav aria-label="Admin (mobile)" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, pathname) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-colors",
                isActive(item.href, pathname)
                  ? "bg-charcoal text-ivory"
                  : "text-fog hover:text-ink",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto flex max-w-container flex-col lg:flex-row">
        {/* Desktop nav */}
        <aside className="hidden w-60 shrink-0 border-r border-line bg-paper lg:block">
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
            <div className="mb-6 flex items-center gap-2 px-3 pt-2">
              <div className="font-display text-title-md tracking-wide text-ink">ATELIER 3D</div>
              <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-caption font-medium text-bronze">Admin</span>
            </div>
            <nav aria-label="Admin" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <AdminNavLink key={item.href} {...item} pathname={pathname} />
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export interface ConfirmButtonProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "outline";
  size?: "sm" | "default";
  /** A server action (possibly bound) invoked on confirm. */
  action: () => Promise<ActionResult>;
  /** Optional free-text reason collected inside the confirm dialog. */
  notePlaceholder?: string;
  requireNote?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Confirmation dialog button for sensitive admin actions. Runs the provided
 * server action on confirm, shows results via toast, and refreshes the
 * server-rendered page on success. No fake controls: everything is wired to
 * real server actions.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  size = "sm",
  action,
  notePlaceholder,
  requireNote,
  disabled,
  className,
}: ConfirmButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  const noteId = React.useId();

  const run = async () => {
    if (requireNote && !note.trim()) {
      setError("Please provide a reason");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) {
        toast.toast({ title: "Done", description: "The change was applied.", variant: "success" });
        setOpen(false);
        setNote("");
        router.refresh();
      } else {
        setError(result.error);
        toast.toast({ title: "Action failed", description: result.error, variant: "error" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.toast({ title: "Action failed", description: message, variant: "error" });
    } finally {
      setPending(false);
    }
  };

  const buttonVariant = variant === "danger" ? "danger" : variant === "outline" ? "outline" : "primary";

  return (
    <React.Fragment>
      <Button
        type="button"
        variant={buttonVariant}
        size={size}
        disabled={disabled}
        className={className}
        onClick={() => {
          setNote("");
          setError(null);
          setOpen(true);
        }}
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogBody>
            {notePlaceholder ? (
              <Field label="Reason" htmlFor={noteId}>
                <Textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={notePlaceholder}
                  disabled={pending}
                />
              </Field>
            ) : null}
            {error ? (
              <p className="mt-3 text-caption text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {cancelLabel ?? "Cancel"}
            </Button>
            <Button type="button" variant={buttonVariant} loading={pending} onClick={run}>
              {confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
