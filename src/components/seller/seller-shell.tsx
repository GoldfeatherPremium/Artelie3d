"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Wallet, Settings } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  saveStoreSettings,
  updateSellerProfile,
  requestSellerPayout,
} from "@/app/actions/seller";

/** Shape returned by every seller server action. */
export type ActionResult = { ok: true } | { ok: false; error: string };

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/seller", label: "Overview", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/seller/payouts", label: "Payouts", icon: Wallet },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/seller") return pathname === "/seller";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SellerNavLink({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string }) {
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
 * Seller application shell. Renders the navigation rail (desktop) and a
 * horizontal nav (mobile) around the passed page content.
 */
export function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ivory">
      {/* Mobile nav */}
      <div className="sticky top-0 z-30 border-b border-line bg-paper lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="font-display text-title-sm tracking-wide text-ink">ATELIER 3D</div>
          <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-caption font-medium text-bronze">Seller</span>
        </div>
        <nav aria-label="Seller (mobile)" className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, pathname) ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-colors",
                isActive(item.href, pathname) ? "bg-charcoal text-ivory" : "text-fog hover:text-ink",
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
              <span className="rounded-full bg-bronze/15 px-2 py-0.5 text-caption font-medium text-bronze">Seller</span>
            </div>
            <nav aria-label="Seller" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <SellerNavLink key={item.href} {...item} pathname={pathname} />
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings forms (client wrappers around seller server actions)
// ---------------------------------------------------------------------------

interface StoreSettingsFormProps {
  initialName: string;
  initialSlug: string;
  initialDescription: string;
  initialLogoUrl: string;
}

export function StoreSettingsForm({
  initialName,
  initialSlug,
  initialDescription,
  initialLogoUrl,
}: StoreSettingsFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = React.useState(initialName);
  const [slug, setSlug] = React.useState(initialSlug);
  const [description, setDescription] = React.useState(initialDescription);
  const [logoUrl, setLogoUrl] = React.useState(initialLogoUrl);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Store name is required");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("slug", slug);
      fd.set("description", description);
      fd.set("logo_url", logoUrl);
      const result = await saveStoreSettings(fd);
      if (result.ok) {
        toast.toast({ title: "Store settings saved", variant: "success" });
        router.refresh();
      } else {
        setError(result.error);
        toast.toast({ title: "Could not save", description: result.error, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Store name" htmlFor="store-name">
          <Input id="store-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Atelier Maison" />
        </Field>
        <Field label="Slug" htmlFor="store-slug" hint="Leave blank to generate from the name.">
          <Input id="store-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="atelier-maison" />
        </Field>
        <Field label="Description" htmlFor="store-description" className="sm:col-span-2">
          <Textarea id="store-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field label="Logo URL" htmlFor="store-logo" className="sm:col-span-2">
          <Input id="store-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
        </Field>
      </div>
      {error ? (
        <p className="text-caption text-danger" role="alert">{error}</p>
      ) : null}
      <div>
        <Button type="submit" loading={pending}>Save store settings</Button>
      </div>
    </form>
  );
}

interface SellerProfileFormProps {
  initialBusinessName: string;
  initialLegalName: string;
  initialContactEmail: string;
  initialPhone: string;
  initialCountry: string;
  initialTaxId: string;
}

export function SellerProfileForm({
  initialBusinessName,
  initialLegalName,
  initialContactEmail,
  initialPhone,
  initialCountry,
  initialTaxId,
}: SellerProfileFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [businessName, setBusinessName] = React.useState(initialBusinessName);
  const [legalName, setLegalName] = React.useState(initialLegalName);
  const [contactEmail, setContactEmail] = React.useState(initialContactEmail);
  const [phone, setPhone] = React.useState(initialPhone);
  const [country, setCountry] = React.useState(initialCountry);
  const [taxId, setTaxId] = React.useState(initialTaxId);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("business_name", businessName);
      fd.set("legal_name", legalName);
      fd.set("contact_email", contactEmail);
      fd.set("phone", phone);
      fd.set("country", country);
      fd.set("tax_id", taxId);
      const result = await updateSellerProfile(fd);
      if (result.ok) {
        toast.toast({ title: "Profile saved", variant: "success" });
        router.refresh();
      } else {
        setError(result.error);
        toast.toast({ title: "Could not save", description: result.error, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="seller-business-name">
          <Input id="seller-business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </Field>
        <Field label="Legal name" htmlFor="seller-legal-name">
          <Input id="seller-legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </Field>
        <Field label="Contact email" htmlFor="seller-contact-email">
          <Input id="seller-contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="seller-phone">
          <Input id="seller-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Country (ISO code)" htmlFor="seller-country" hint="Two-letter country code, e.g. US.">
          <Input id="seller-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" maxLength={3} />
        </Field>
        <Field label="Tax ID" htmlFor="seller-tax-id">
          <Input id="seller-tax-id" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </Field>
      </div>
      {error ? (
        <p className="text-caption text-danger" role="alert">{error}</p>
      ) : null}
      <div>
        <Button type="submit" loading={pending}>Save profile</Button>
      </div>
    </form>
  );
}

interface PayoutRequestFormProps {
  balanceCents: number;
}

export function PayoutRequestForm({ balanceCents }: PayoutRequestFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [amount, setAmount] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive amount");
      return;
    }
    if (Math.round(value * 100) > balanceCents) {
      setError("Amount exceeds your available balance");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("amount", amount);
      fd.set("period_start", periodStart);
      fd.set("period_end", periodEnd);
      const result = await requestSellerPayout(fd);
      if (result.ok) {
        toast.toast({ title: "Payout requested", description: "An admin will review your request.", variant: "success" });
        setAmount("");
        setPeriodStart("");
        setPeriodEnd("");
        router.refresh();
      } else {
        setError(result.error);
        toast.toast({ title: "Could not request payout", description: result.error, variant: "error" });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-5 grid gap-5">
      <p className="text-body-sm text-fog">
        Available balance: <span className="font-medium text-ink">{formatCurrency(balanceCents / 100)}</span>
      </p>
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Amount (USD)" htmlFor="payout-amount">
            <Input
              id="payout-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={balanceCents <= 0}
            />
          </Field>
          <Field label="Period start" htmlFor="payout-start">
            <Input id="payout-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </Field>
          <Field label="Period end" htmlFor="payout-end">
            <Input id="payout-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </Field>
        </div>
        {error ? (
          <p className="text-caption text-danger" role="alert">{error}</p>
        ) : null}
        <div>
          <Button type="submit" loading={pending} disabled={balanceCents <= 0}>Request payout</Button>
        </div>
      </form>
    </div>
  );
}
