"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import type { CategoryRow, BrandRow } from "@/lib/data/catalog";

export interface ShopQuery {
  category?: string | null;
  brand?: string | null;
  sort?: string | null;
  q?: string | null;
  page?: string | null;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "bestseller", label: "Best selling" },
];

interface ShopToolbarProps {
  categories: CategoryRow[];
  brands: BrandRow[];
  current: ShopQuery;
  total: number;
}

export function ShopToolbar({ categories, brands, current, total }: ShopToolbarProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ category: current.category ?? "all", brand: current.brand ?? "all" });

  const push = React.useCallback(
    (patch: Partial<ShopQuery>) => {
      const params = new URLSearchParams();
      const next = { ...current, ...patch };
      if (next.q) params.set("q", next.q);
      if (next.category) params.set("category", next.category);
      if (next.brand) params.set("brand", next.brand);
      if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
      if (next.page && next.page !== "1") params.set("page", next.page);
      const qs = params.toString();
      router.push(qs ? `/shop?${qs}` : "/shop");
    },
    [current, router],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-sm text-fog">
        {total} product{total === 1 ? "" : "s"}
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setFiltersOpen(true)} className="lg:hidden">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>

        <div className="hidden items-center gap-4 lg:flex">
          <Select
            aria-label="Filter by brand"
            value={current.brand ?? "all"}
            onChange={(e) => push({ brand: e.target.value === "all" ? null : e.target.value, page: null })}
            className="h-9 w-auto text-body-sm"
          >
            <option value="all">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </Select>
          <span className="h-4 w-px bg-line" />
        </div>

        <Select
          aria-label="Sort products"
          value={current.sort ?? "newest"}
          onChange={(e) => push({ sort: e.target.value, page: null })}
          className="h-9 w-auto text-body-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Mobile filter drawer */}
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent side="left" className="max-w-sm">
          <DrawerHeader className="pt-14">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="pb-10">
            <p className="mb-3 text-caption font-medium uppercase tracking-wider text-fog">Categories</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, category: "all" }))}
                className={
                  draft.category === "all"
                    ? "rounded-full bg-charcoal px-4 py-2 text-body-sm font-medium text-ivory"
                    : "rounded-full border border-line bg-paper px-4 py-2 text-body-sm text-ink hover:border-bronze"
                }
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, category: category.slug }))}
                  className={
                    draft.category === category.slug
                      ? "rounded-full bg-charcoal px-4 py-2 text-body-sm font-medium text-ivory"
                      : "rounded-full border border-line bg-paper px-4 py-2 text-body-sm text-ink hover:border-bronze"
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>

            <p className="mb-3 mt-8 text-caption font-medium uppercase tracking-wider text-fog">Brand</p>
            <Select value={draft.brand} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}>
              <option value="all">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </Select>

            <Button
              type="button"
              className="mt-8 w-full"
              onClick={() => {
                push({
                  category: draft.category === "all" ? null : draft.category,
                  brand: draft.brand === "all" ? null : draft.brand,
                  page: null,
                });
                setFiltersOpen(false);
              }}
            >
              Apply filters
            </Button>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
