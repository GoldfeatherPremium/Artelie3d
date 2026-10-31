"use client";

import * as React from "react";
import { Check, Minus, Plus, Save, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Viewer } from "@/components/configurator/viewer";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/cart/cart-provider";
import {
  computeConfigurationPrice,
  buildMaterialMap,
  PricingValidationError,
  type CustomizationSchema,
  type CustomizationGroup,
  type MaterialOverride,
} from "@/lib/pricing";
import { saveConfiguration } from "@/app/actions/configurations";
import { AddToCartButton } from "./add-to-cart";

interface ProductConfigureProps {
  product: {
    id: string;
    name: string;
    basePriceCents: number;
    salePriceCents: number | null;
    schema: CustomizationSchema | null;
    modelConfig: Record<string, unknown> | null;
  };
}

function defaultOptions(groups: CustomizationGroup[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of groups) {
    if (group.options.length > 0) out[group.key] = group.options[0].value;
  }
  return out;
}

/** Re-key a customization material map from group keys to mesh part names. */
function materialsByPart(materials: Record<string, MaterialOverride>): Record<string, MaterialOverride> {
  const byPart: Record<string, MaterialOverride> = {};
  for (const value of Object.values(materials)) {
    if (value?.name) byPart[value.name] = value;
  }
  return byPart;
}

export function ProductConfigure({ product }: ProductConfigureProps) {
  const toast = useToast();
  const groups = product.schema?.groups ?? [];
  const [options, setOptions] = React.useState<Record<string, string>>(() => defaultOptions(groups));
  const [quantity, setQuantity] = React.useState(1);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);

  const priced = React.useMemo(() => {
    try {
      return computeConfigurationPrice(
        {
          base_price_cents: product.basePriceCents,
          sale_price_cents: product.salePriceCents,
          customization_schema: product.schema,
        },
        options,
      );
    } catch (err) {
      if (err instanceof PricingValidationError) return null;
      throw err;
    }
  }, [product, options]);

  const materials = React.useMemo(
    () => materialsByPart(buildMaterialMap(product.schema, options)),
    [product.schema, options],
  );
  const unitPriceCents = priced?.unitPriceCents ?? product.salePriceCents ?? product.basePriceCents;
  const lineTotalCents = unitPriceCents * quantity;

  function select(key: string, value: string) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.toast({ title: "Name your configuration", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const result = await saveConfiguration({ productId: product.id, name, options });
      if (result.ok) {
        setToken(result.token);
        setSaveOpen(false);
        setName("");
        toast.toast({ title: "Configuration saved", description: "You can find it in your account.", variant: "success" });
      } else {
        toast.toast({ title: "Could not save", description: result.error, variant: "error" });
        if (result.error.includes("sign in")) {
          window.location.href = "/auth/login";
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    const shareToken = token;
    if (!shareToken) {
      setSaveOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${shareToken}`);
      toast.toast({ title: "Copied", description: "Share link copied to clipboard.", variant: "success" });
    } catch {
      toast.toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "error" });
    }
  }

  return (
    <div>
      {/* Live 3D preview */}
      {product.modelConfig ? (
        <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-paper to-ivory">
          <div className="h-80 w-full sm:h-96">
            <Viewer modelConfig={product.modelConfig} materials={materials} />
          </div>
          <div className="flex items-center justify-between border-t border-line bg-paper px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-caption text-fog">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live preview — changes update in real time
            </span>
            <span className="text-caption text-fog">Drag to orbit</span>
          </div>
        </div>
      ) : (
        <Badge variant="neutral" className="mb-6">
          Standard configuration
        </Badge>
      )}

      {/* Option groups */}
      <div className="grid gap-6">
        {groups.map((group) => (
          <fieldset key={group.key}>
            <legend className="mb-3 flex items-center gap-2 text-body-sm font-medium text-ink">
              {group.label}
              {group.required ? <span className="text-danger">*</span> : null}
              {group.required ? <span className="text-caption font-normal text-fog">Required</span> : null}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.options.map((option) => {
                const selected = options[group.key] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => select(group.key, option.value)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      selected ? "border-bronze bg-bronze/10" : "border-line bg-paper hover:border-bronze/50",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-4.5 w-4.5 items-center justify-center rounded-full border",
                          selected ? "border-bronze bg-bronze text-paper" : "border-stone",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="text-body-sm text-ink">{option.label}</span>
                    </span>
                    {option.material ? (
                      <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-line" style={{ backgroundColor: option.material.color }} aria-hidden />
                    ) : (
                      <span className="shrink-0 text-caption text-fog">
                        {option.priceAddCents === 0 ? "Included" : `${option.priceAddCents > 0 ? "+" : "−"}$${(Math.abs(option.priceAddCents) / 100).toFixed(2)}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Pricing summary */}
      <div className="mt-8 rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-fog">Unit price</span>
          <Price amountCents={unitPriceCents} compareAtCents={product.salePriceCents ? product.basePriceCents : null} size="lg" />
        </div>
        {priced && priced.breakdown.length > 0 ? (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
            {priced.breakdown.map((item) => (
              <li key={item.groupKey} className="flex items-center justify-between text-body-sm">
                <span className="text-fog">
                  {item.label} · {item.optionLabel}
                </span>
                <span className="text-ink">
                  {item.priceAddCents === 0 ? "Included" : `${item.priceAddCents > 0 ? "+" : "−"}$${(Math.abs(item.priceAddCents) / 100).toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
          <span className="text-body-sm text-fog">Quantity</span>
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-body-md">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-fog transition-colors hover:text-ink"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
          <span className="text-body-sm font-medium text-ink">Total</span>
          <span className="font-display text-title-lg text-ink">{`$${(lineTotalCents / 100).toFixed(2)}`}</span>
        </div>

        <div className="mt-5 grid gap-3">
          <AddToCartButton productId={product.id} quantity={quantity} configuration={options} label="Add configured piece to bag" size="lg" />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setSaveOpen(true)}>
              <Save className="h-4 w-4" /> Save
            </Button>
            <Button type="button" variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this configuration</DialogTitle>
            <DialogDescription>Name it so you can find it later in your account.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Configuration name" htmlFor="config-name">
              <Input id="config-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`My ${product.name}`} maxLength={120} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={saving}>
              Save configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
