"use client";

import * as React from "react";
import Link from "next/link";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Accordion } from "@/components/ui/accordion";
import { Brandmark } from "./brandmark";
import type { CategoryRow } from "@/lib/data/catalog";
import type { HeaderRole } from "./site-header";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  role: HeaderRole;
}

export function MobileNav({ open, onOpenChange, categories, role }: MobileNavProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="left" className="max-w-sm">
        <DrawerHeader className="pt-14">
          <DrawerTitle><Brandmark /></DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="pb-10">
          <nav className="grid gap-1">
            <Link href="/shop" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              All products
            </Link>
            <Accordion
              type="single"
              items={[
                {
                  value: "categories",
                  label: "Shop by category",
                  content: (
                    <ul className="grid gap-1">
                      {categories.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={`/shop/${category.slug}`}
                            className="block rounded-lg px-3 py-2 text-body-sm text-ink/80 transition-colors hover:bg-ivory"
                          >
                            {category.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
            <Link href="/collections" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              Collections
            </Link>
            <Link href="/showroom" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              3D Showroom
            </Link>
            <Link href="/room-designer" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              Room Designer
            </Link>
            <Link href="/designers" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              Designers
            </Link>
            <Link href="/about" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              Our story
            </Link>
            <Link href="/contact" className="rounded-lg px-3 py-2.5 text-body-md font-medium text-ink transition-colors hover:bg-ivory">
              Contact
            </Link>
          </nav>
          <div className="mt-6 border-t border-line pt-4">
            {role ? (
              <div className="grid grid-cols-2 gap-2">
                {role === "admin" && (
                  <Link href="/admin/dashboard" className="rounded-full bg-charcoal px-4 py-2.5 text-center text-body-sm font-medium text-ivory">
                    Admin
                  </Link>
                )}
                {role === "seller" && (
                  <Link href="/seller/dashboard" className="rounded-full bg-charcoal px-4 py-2.5 text-center text-body-sm font-medium text-ivory">
                    Seller
                  </Link>
                )}
                <Link href="/account/overview" className="rounded-full border border-charcoal/20 px-4 py-2.5 text-center text-body-sm font-medium text-ink">
                  Account
                </Link>
                <Link href="/auth/logout" className="rounded-full border border-charcoal/20 px-4 py-2.5 text-center text-body-sm font-medium text-ink">
                  Sign out
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auth/login" className="rounded-full bg-charcoal px-4 py-2.5 text-center text-body-sm font-medium text-ivory">
                  Sign in
                </Link>
                <Link href="/auth/register" className="rounded-full border border-charcoal/20 px-4 py-2.5 text-center text-body-sm font-medium text-ink">
                  Create account
                </Link>
              </div>
            )}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
