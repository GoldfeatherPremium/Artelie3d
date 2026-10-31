"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input, Select, Checkbox, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { completeCheckout, getCheckoutContext, validateCoupon, type CheckoutContext } from "@/app/actions/checkout";

type FormState = {
  email: string;
  guestName: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  billingSame: boolean;
  bFullName: string;
  bLine1: string;
  bLine2: string;
  bCity: string;
  bRegion: string;
  bPostalCode: string;
  bCountry: string;
  deliveryMethod: string;
  coupon: string;
};

const INITIAL: FormState = {
  email: "",
  guestName: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "US",
  phone: "",
  billingSame: true,
  bFullName: "",
  bLine1: "",
  bLine2: "",
  bCity: "",
  bRegion: "",
  bPostalCode: "",
  bCountry: "US",
  deliveryMethod: "standard",
  coupon: "",
};

function DeliverySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { id: "standard", title: "Standard delivery", copy: "Free · 5–10 business days", price: "Free" },
    { id: "white-glove", title: "White-glove", copy: "In-room placement & assembly · 2–3 weeks", price: "Quote at confirmation" },
    { id: "express", title: "Express", copy: "2–4 business days", price: "$95" },
  ];
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label
          key={option.id}
          className={
            value === option.id
              ? "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-bronze bg-bronze/10 px-4 py-3"
              : "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3 hover:border-bronze/50"
          }
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="delivery"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="h-4 w-4 accent-[#20201e]"
            />
            <span>
              <span className="block text-body-sm font-medium text-ink">{option.title}</span>
              <span className="block text-caption text-fog">{option.copy}</span>
            </span>
          </span>
          <span className="shrink-0 text-body-sm font-medium text-ink">{option.price}</span>
        </label>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { state: cart, loading: cartLoading } = useCart();

  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [context, setContext] = React.useState<CheckoutContext | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [couponStatus, setCouponStatus] = React.useState<string | null>(null);

  const set = (
    patch: Partial<FormState> | ((prev: FormState) => Partial<FormState>),
  ) => setForm((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));

  React.useEffect(() => {
    getCheckoutContext()
      .then((ctx) => {
        setContext(ctx);
        if (ctx.user?.email) set((f) => ({ ...f, email: ctx.user?.email ?? f.email }));
        const def = ctx.addresses.find((a) => a.isDefault) ?? ctx.addresses[0];
        if (def) {
          set((f) => ({
            ...f,
            fullName: def.fullName,
            line1: def.line1,
            line2: def.line2 ?? "",
            city: def.city,
            region: def.region ?? "",
            postalCode: def.postalCode ?? "",
            country: def.country,
            phone: def.phone ?? "",
          }));
        }
      })
      .catch(() => setContext(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyCoupon() {
    if (!form.coupon.trim()) return;
    const result = await validateCoupon(form.coupon);
    if (!result.ok) {
      setCouponStatus(null);
      toast.toast({ title: "Coupon not accepted", description: result.error, variant: "error" });
      return;
    }
    if (result.coupon) {
      setCouponStatus(`Coupon ${result.coupon.code} accepted — it will be verified and applied at order time.`);
      toast.toast({ title: "Coupon accepted", description: "Verified again at order time.", variant: "success" });
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const shippingAddress = {
        fullName: form.fullName,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        region: form.region || undefined,
        postalCode: form.postalCode || undefined,
        country: form.country,
        phone: form.phone || undefined,
      };
      const billingAddress = form.billingSame
        ? undefined
        : {
            fullName: form.bFullName,
            line1: form.bLine1,
            line2: form.bLine2 || undefined,
            city: form.bCity,
            region: form.bRegion || undefined,
            postalCode: form.bPostalCode || undefined,
            country: form.bCountry,
          };

      const result = await completeCheckout({
        cartId: cart.cartId,
        guestEmail: context?.user ? undefined : form.email,
        shippingAddress,
        billingAddress,
        deliveryMethod: form.deliveryMethod,
        couponCode: form.coupon.trim() || undefined,
        idempotencyKey,
      });

      if (result.ok) {
        router.push(`/checkout/confirmation/${result.orderId}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cartLoading) {
    return (
      <div className="bg-ivory">
        <div className="container-site py-12">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-ivory">
        <div className="container-site py-16">
          <EmptyState
            title="Your bag is empty"
            description="Add pieces before checking out."
            action={
              <Link href="/shop">
                <Button variant="outline">Browse the collection</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const provider = context?.provider ?? "test";

  return (
    <div className="bg-ivory">
      <div className="container-site py-10 sm:py-14">
        <Link href="/cart" className="text-body-sm text-fog transition-colors hover:text-ink">← Back to bag</Link>
        <h1 className="mt-2 font-display text-display-md text-ink">Checkout</h1>

        <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="grid gap-8">
            {/* Contact */}
            <section className="rounded-2xl border border-line bg-paper p-6">
              <h2 className="font-display text-title-lg text-ink">1 · Contact</h2>
              {!context?.user ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Email" htmlFor="co-email">
                    <Input id="co-email" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@example.com" />
                  </Field>
                  <Field label="Full name" htmlFor="co-guest">
                    <Input id="co-guest" required value={form.guestName} onChange={(e) => set({ guestName: e.target.value })} placeholder="Jane Smith" />
                  </Field>
                </div>
              ) : (
                <p className="mt-3 text-body-sm text-fog">Signed in as <span className="font-medium text-ink">{context.user.email}</span>.</p>
              )}
            </section>

            {/* Shipping */}
            <section className="rounded-2xl border border-line bg-paper p-6">
              <h2 className="font-display text-title-lg text-ink">2 · Shipping address</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="co-full" className="sm:col-span-2">
                  <Input id="co-full" required value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="Jane Smith" />
                </Field>
                <Field label="Address line 1" htmlFor="co-line1" className="sm:col-span-2">
                  <Input id="co-line1" required value={form.line1} onChange={(e) => set({ line1: e.target.value })} placeholder="Street address" />
                </Field>
                <Field label="Address line 2" htmlFor="co-line2" className="sm:col-span-2">
                  <Input id="co-line2" value={form.line2} onChange={(e) => set({ line2: e.target.value })} placeholder="Apt / suite (optional)" />
                </Field>
                <Field label="City" htmlFor="co-city">
                  <Input id="co-city" required value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </Field>
                <Field label="Region / state" htmlFor="co-region">
                  <Input id="co-region" value={form.region} onChange={(e) => set({ region: e.target.value })} />
                </Field>
                <Field label="Postal code" htmlFor="co-zip">
                  <Input id="co-zip" value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} />
                </Field>
                <Field label="Country" htmlFor="co-country">
                  <Select id="co-country" value={form.country} onChange={(e) => set({ country: e.target.value })}>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="AU">Australia</option>
                  </Select>
                </Field>
                <Field label="Phone" htmlFor="co-phone" className="sm:col-span-2">
                  <Input id="co-phone" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(optional)" />
                </Field>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox checked={form.billingSame} onChange={(e) => set({ billingSame: e.target.checked })} />
                  <span className="text-body-sm text-ink">Billing address is the same as shipping</span>
                </label>
              </div>

              {!form.billingSame ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Billing full name" htmlFor="co-bfull" className="sm:col-span-2">
                    <Input id="co-bfull" required value={form.bFullName} onChange={(e) => set({ bFullName: e.target.value })} />
                  </Field>
                  <Field label="Billing line 1" htmlFor="co-bline1" className="sm:col-span-2">
                    <Input id="co-bline1" required value={form.bLine1} onChange={(e) => set({ bLine1: e.target.value })} />
                  </Field>
                  <Field label="City" htmlFor="co-bcity">
                    <Input id="co-bcity" required value={form.bCity} onChange={(e) => set({ bCity: e.target.value })} />
                  </Field>
                  <Field label="Country" htmlFor="co-bcountry">
                    <Select id="co-bcountry" value={form.bCountry} onChange={(e) => set({ bCountry: e.target.value })}>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="AU">Australia</option>
                    </Select>
                  </Field>
                </div>
              ) : null}
            </section>

            {/* Delivery */}
            <section className="rounded-2xl border border-line bg-paper p-6">
              <h2 className="font-display text-title-lg text-ink">3 · Delivery</h2>
              <div className="mt-4">
                <DeliverySelector value={form.deliveryMethod} onChange={(v) => set({ deliveryMethod: v })} />
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-2xl border border-line bg-paper p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-title-lg text-ink">4 · Payment</h2>
                {provider === "test" ? (
                  <Badge variant="warning">Sandbox · test mode</Badge>
                ) : (
                  <Badge variant="info">{provider}</Badge>
                )}
              </div>
              {provider === "test" ? (
                <div className="mt-4 rounded-xl bg-bronze/8 p-4 text-body-sm text-ink/80">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <ShieldCheck className="h-4 w-4 text-bronze" /> Secure checkout — sandbox environment
                  </p>
                  <p className="mt-2">
                    This demonstration store runs in <strong>test mode</strong>: no real payment is processed and no card
                    details are collected. Placing the order simulates a successful payment on the server.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-body-sm text-fog">
                  Real-card checkout requires a configured payment provider. This environment defaults to sandbox mode.
                </p>
              )}
              <div className="mt-4 flex items-center gap-2 text-caption text-fog">
                <Lock className="h-3.5 w-3.5" /> Card details are never stored on our servers.
              </div>
            </section>
          </div>

          {/* Order summary */}
          <aside className="h-fit rounded-2xl border border-line bg-paper p-6 lg:sticky lg:top-28">
            <h2 className="font-display text-title-lg text-ink">Order summary</h2>
            <ul className="mt-5 grid gap-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded-lg bg-stone/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${item.productSlug}`} className="line-clamp-1 text-body-sm font-medium text-ink hover:text-bronze">
                      {item.productName}
                    </Link>
                    <p className="text-caption text-fog">Qty {item.quantity}</p>
                    <p className="text-body-sm font-medium text-ink">{`$${(item.lineTotalCents / 100).toFixed(2)}`}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex gap-2">
              <Input value={form.coupon} onChange={(e) => set({ coupon: e.target.value })} placeholder="Coupon code" className="h-10" />
              <Button type="button" variant="outline" size="sm" onClick={applyCoupon} className="h-10 shrink-0">
                Apply
              </Button>
            </div>
            {couponStatus ? <p className="mt-2 text-caption text-success">{couponStatus}</p> : null}

            <dl className="mt-5 grid gap-2.5 border-t border-line pt-5 text-body-sm">
              <div className="flex items-center justify-between">
                <dt className="text-fog">Subtotal</dt>
                <dd className="text-ink">{`$${(cart.subtotalCents / 100).toFixed(2)}`}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-fog">Shipping</dt>
                <dd className="text-ink">{form.deliveryMethod === "standard" ? "Free" : "Calculated at order"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-fog">Taxes</dt>
                <dd className="text-fog">Included where applicable</dd>
              </div>
              {form.coupon.trim() ? (
                <div className="flex items-center justify-between">
                  <dt className="text-fog">Coupon</dt>
                  <dd className="text-success">Verified at order time</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="font-display text-title-lg text-ink">{`$${(cart.subtotalCents / 100).toFixed(2)}`}</dd>
              </div>
            </dl>

            {error ? (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-danger/8 p-3 text-caption text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={submitting} className="mt-5 w-full">
              {submitting ? "Placing order…" : provider === "test" ? "Place order (test mode)" : "Place order"}
            </Button>
            <p className="mt-3 text-center text-caption text-fog">
              By placing this order you agree to our terms & conditions.
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
