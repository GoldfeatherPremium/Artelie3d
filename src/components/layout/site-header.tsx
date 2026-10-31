"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";
import { SearchOverlay } from "./search-overlay";
import { Brandmark } from "./brandmark";
import { MobileNav } from "./mobile-nav";
import { CartDrawer } from "./cart-drawer";
import { DropdownMenu, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import type { CategoryRow, CollectionRow } from "@/lib/data/catalog";

export type HeaderRole = "customer" | "seller" | "admin" | null;

interface SiteHeaderProps {
  categories: CategoryRow[];
  collections: CollectionRow[];
  role: HeaderRole;
}

export function SiteHeader({ categories, collections, role }: SiteHeaderProps) {
  const pathname = usePathname();
  const { state } = useCart();
  const [scrolled, setScrolled] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [megaOpen, setMegaOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const navLink =
    "relative px-3 py-2 text-body-sm font-medium text-ink/80 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze";
  const iconButton =
    "relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="container-site flex h-16 items-center justify-between gap-4 lg:h-20">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className={cn(iconButton, "lg:hidden")}>
            <Menu className="h-5 w-5" />
          </button>
          <Brandmark />
        </div>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              type="button"
              aria-expanded={megaOpen}
              className={cn(navLink, "inline-flex items-center gap-1")}
            >
              Shop <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", megaOpen && "rotate-180")} />
            </button>
            {megaOpen && (
              <div className="absolute left-1/2 top-full w-[42rem] -translate-x-1/2 pt-3">
                <div className="rounded-2xl border border-line bg-paper p-6 shadow-raised">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Categories</p>
                      <ul className="grid gap-1">
                        {categories.map((category) => (
                          <li key={category.id}>
                            <Link
                              href={`/shop/${category.slug}`}
                              className="block rounded-lg px-3 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ivory hover:text-ink"
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Collections</p>
                      <ul className="grid gap-1">
                        {collections.slice(0, 5).map((collection) => (
                          <li key={collection.id}>
                            <Link
                              href={`/collections/${collection.slug}`}
                              className="block rounded-lg px-3 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ivory hover:text-ink"
                            >
                              {collection.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <p className="mb-3 mt-6 text-caption font-medium uppercase tracking-wider text-fog">Experiences</p>
                      <ul className="grid gap-1">
                        <li><Link href="/showroom" className="block rounded-lg px-3 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ivory hover:text-ink">3D Showroom</Link></li>
                        <li><Link href="/room-designer" className="block rounded-lg px-3 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ivory hover:text-ink">Room Designer</Link></li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-line pt-4">
                    <Link href="/shop" className="text-body-sm font-medium text-bronze transition-colors hover:text-ink">
                      All products →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Link href="/collections" className={navLink}>Collections</Link>
          <Link href="/showroom" className={navLink}>3D Showroom</Link>
          <Link href="/room-designer" className={navLink}>Room Designer</Link>
          <Link href="/designers" className={navLink}>Designers</Link>
          <Link href="/about" className={navLink}>Our Story</Link>
        </nav>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className={iconButton}>
            <Search className="h-5 w-5" />
          </button>
          <Link href={role ? "/account/wishlist" : "/auth/login"} aria-label="Wishlist" className={cn(iconButton, "hidden sm:flex")}>
            <Heart className="h-5 w-5" />
          </Link>
          {role ? (
            <DropdownMenu
              align="end"
              trigger={
                <button type="button" aria-label="Account" className={iconButton}>
                  <User className="h-5 w-5" />
                </button>
              }
            >
              <DropdownLabel>{role === "admin" ? "Administrator" : role === "seller" ? "Seller" : "Account"}</DropdownLabel>
              <DropdownSeparator />
              {role === "admin" && (
                <>
                  <DropdownItem onClick={() => (window.location.href = "/admin/dashboard")}>Admin dashboard</DropdownItem>
                  <DropdownSeparator />
                </>
              )}
              {role === "seller" && (
                <>
                  <DropdownItem onClick={() => (window.location.href = "/seller/dashboard")}>Seller dashboard</DropdownItem>
                  <DropdownItem onClick={() => (window.location.href = "/seller/products")}>My products</DropdownItem>
                  <DropdownSeparator />
                </>
              )}
              <DropdownItem onClick={() => (window.location.href = "/account/overview")}>My account</DropdownItem>
              <DropdownItem onClick={() => (window.location.href = "/account/orders")}>Orders</DropdownItem>
              <DropdownItem onClick={() => (window.location.href = "/account/configurations")}>Saved configurations</DropdownItem>
              <DropdownItem onClick={() => (window.location.href = "/account/rooms")}>Room designs</DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={() => (window.location.href = "/auth/logout")}>Sign out</DropdownItem>
            </DropdownMenu>
          ) : (
            <Link href="/auth/login" className={cn(iconButton, "hidden sm:flex")} aria-label="Sign in">
              <User className="h-5 w-5" />
            </Link>
          )}
          <button type="button" onClick={() => setCartOpen(true)} aria-label="Shopping bag" className={iconButton}>
            <ShoppingBag className="h-5 w-5" />
            {state.count > 0 && (
              <span className="absolute right-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-bronze px-1 text-[0.625rem] font-semibold text-paper">
                {state.count > 99 ? "99+" : state.count}
              </span>
            )}
          </button>
        </div>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} categories={categories} role={role} />
    </header>
  );
}
