"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Save,
  Sofa,
  Heart,
  Clock,
  Star,
  MapPin,
  Settings,
  ShieldCheck,
  Bell,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/account/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: ShoppingCart },
  { href: "/account/configurations", label: "Saved configurations", icon: Save },
  { href: "/account/rooms", label: "Room designs", icon: Sofa },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/recently-viewed", label: "Recently viewed", icon: Clock },
  { href: "/account/reviews", label: "Reviews", icon: Star },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: LifeBuoy },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/account/overview") return pathname === "/account" || pathname === "/account/overview" || pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-ivory">
      <div className="container-site py-8 sm:py-12">
        <h1 className="font-display text-display-md text-ink">My account</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
          {/* Desktop nav */}
          <aside className="hidden lg:block">
            <nav aria-label="Account" className="grid gap-1 rounded-2xl border border-line bg-paper p-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm transition-colors",
                      active ? "bg-charcoal font-medium text-ivory" : "text-ink hover:bg-charcoal/5",
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile nav */}
          <div className="-mx-4 lg:hidden">
            <nav aria-label="Account (mobile)" className="flex gap-1 overflow-x-auto px-4 pb-2">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-colors",
                      active ? "bg-charcoal text-ivory" : "bg-paper text-fog hover:text-ink",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
