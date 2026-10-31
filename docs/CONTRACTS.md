# ATELIER 3D — Shared Contracts

Single source of truth for parallel development. Read this before writing code.
Money is always integer **cents**. `currency` default `USD`. All timestamps
`timestamptz` auto-set. Read `supabase/migrations/0001_schema.sql` for exact
columns. **Never edit files outside your assigned paths** (merge conflicts);
import only from modules listed here.

## 1. Paths, aliases, imports

- Alias `@/*` → `src/*`.
- All server-only logic lives in `src/lib/*`; pages are thin.
- Never import `@supabase/supabase-js` directly in client components; use
  `@/lib/supabase/client`.
- Server components call `@/lib/supabase/server`.

## 2. Supabase clients

**`src/lib/supabase/client.ts`** (browser):
```ts
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

**`src/lib/supabase/server.ts`** (server components / route handlers):
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createSupabaseServer() { /* createServerClient with cookie methods */ }
export async function getUser() { /* returns User | null via auth.getUser() */ }
export async function requireUser() { /* redirect('/auth/login') if null; returns User */ }
```
Do NOT expose service role here. Service-role calls only in `src/lib/supabase/admin.ts`:
```ts
export function createServiceClient() { /* createClient(url, SERVICE_ROLE_KEY) */ }
```

## 3. Auth / roles

`src/lib/auth/roles.ts` (server-only):
```ts
export async function getUserRole(): Promise<"customer"|"seller"|"admin">   // from profiles.role
export async function isAdmin(): Promise<boolean>
export async function isSeller(): Promise<boolean>
export async function requireRole(roles: ("customer"|"seller"|"admin")[]): Promise<void> // redirect when unauthorized
export async function canManageStore(storeId: string): Promise<boolean>
export async function canManageProduct(productId: string): Promise<boolean>
```
Permissions are enforced server-side (route handlers + RLS). Never rely on
hiding nav links.

## 4. Pricing engine — `src/lib/pricing/index.ts`

Input shape (from `products.customization_schema`):
```ts
type CustomizationSchema = {
  groups: {
    key: string; label: string; required: boolean; single: boolean;
    options: { value: string; label: string; priceAddCents: number; material?: MaterialOverride }[];
  }[];
};
type MaterialOverride = { name: string; kind: "color"; color: string; roughness?: number };
```

Exports:
```ts
computeConfigurationPrice(product: { base_price_cents: number; sale_price_cents: number | null; customization_schema: CustomizationSchema | null }, options: Record<string,string>)
// => { unitPriceCents: number; salePriceCents: number | null; breakdown: { groupKey:string; label:string; optionLabel:string; priceAddCents:number }[]; optionSummary: string }
// - Sale price is used as the base when present; priceAddCents add on top.
// - Option keys not in schema are ignored; required groups missing → throw PricingValidationError.
// - optionSummary = deterministic "key:value | key:value" string (also stored in cart_items/order_items).

buildMaterialMap(schema, options): Record<string, MaterialOverride>  // each selected option's material (group key -> override)
validateConfiguration(schema, options): { valid: boolean; errors: string[] }
formatPriceForDisplay(cents, currency?): string // reuse utils.formatCurrency
```

**Cart totals** — `src/lib/pricing/cart.ts`:
```ts
type CartLine = { unitPriceCents: number; quantity: number; productId: string; sellerId?: string };
computeCartTotals(lines: CartLine[], opts?: { coupon?: CouponLike; shippingCents?: number; taxRate?: number })
// => { subtotalCents: number; discountCents: number; shippingCents: number; taxCents: number; totalCents: number; couponCode?: string }
```

## 5. Validation — `src/lib/validation/index.ts`

Zod schemas (server + client share): `productDraftSchema`, `customizationOptionsSchema`,
`checkoutSchema` (email, shippingAddress{fullName,line1,city,region,postalCode,country,phone}, billingAddress?, deliveryMethod), `couponCodeSchema`, `webhookPayloadSchema`, `configSaveSchema` (name, options, productId, shareToken?).

## 6. Payments — `src/lib/payments/index.ts`

```ts
export interface PaymentProvider {
  id: "test" | "stripe" | "custom";
  initiatePayment(input: { order: OrderLike; amountCents: number; currency: string; idempotencyKey: string }): Promise<{ paymentId: string; clientSecret?: string; status: PaymentStatus }>;
  verifyWebhook(payload: unknown, signature: string | null): Promise<boolean>;
  handleEvent(evt: { type: string; data: unknown }): Promise<void>;  // idempotent
  refundPayment(input: { providerPaymentId: string; amountCents: number }): Promise<{ ok: boolean }>;
}
export function getPaymentProvider(): PaymentProvider; // via PAYMENT_PROVIDER env (default "test")
```
Test provider: `initiatePayment` returns success (creates a `payments` row with
status `succeeded` only after explicit simulation — see `src/lib/payments/test-provider.ts`).
Stripe provider: implement with `stripe` package **only if** keys exist; otherwise
throw informative error. **Never** mark orders paid from redirects; only provider
event processing marks success. Webhook events are stored in `payment_events`
(`provider_event_id` unique) and processed idempotently.

## 7. Email — `src/lib/email/index.ts`

```ts
type EmailPayload = { to: string; subject: string; text: string; html?: string; template?: string };
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; provider: string }>; // "console" | "resend"
```
Console provider logs to server console. Resend provider used only when
`EMAIL_PROVIDER_API_KEY` present. Templates: welcome, verify, reset, order_confirmation,
payment_confirmation, shipping, delivery, refund, seller_approval, product_approval.

## 8. Commerce / orders — `src/lib/commerce/orders.ts`

Uses service client in one transaction:
```ts
export async function createOrderFromCheckout(input: {
  cartId: string; userId: string | null; guestEmail?: string;
  shippingAddress: AddressInput; billingAddress?: AddressInput; deliveryMethod: string;
  couponCode?: string; idempotencyKey: string; metadata?: Record<string, unknown>;
}): Promise<{ orderId: string; orderNumber: string; grandTotalCents: number }>
```
Responsibilities: re-read cart items server-side, compute prices via pricing
engine (never trust client), verify inventory, apply coupon (validate + increment
used_count), insert `orders` + `order_items` (snapshot of title/image/config/
option_summary/unit price) + `order_status_history`, decrement inventory, clear
cart, create `payments` row (status `pending`, provider `test`), accrue
commissions + ledger rows, insert notifications (customer), return order. Throw
`CommerceError` on any failure (no partial order).

`updateOrderStatus(orderId, toStatus, note?, actorId?)` — inserts history row and
notifies customer (+ seller if shipped/delivered). `requestCancellation(orderId, userId)`.
`refundOrder(orderId, amountCents, reason, actorId)` — creates `refunds` row
(status `requested`); admin approves → `processed` + reversal ledger entries.

## 9. Ledger — `src/lib/ledger/index.ts`

```ts
computeCommission(grossCents: number, rate: number): { commissionCents: number; netCents: number }
accrueCommissionsForOrder(orderId: string): Promise<void>   // one commissions row per order_item (store rate)
recordLedgerEntry(entry: LedgerEntryInput): Promise<void>   // immutable; balance_after = previous + amount
requestPayout(sellerId, storeId, amountCents, period): Promise<void>
```

## 10. 3D conventions

- **Configurator** lives in `src/components/configurator/*`.
- `ModelScene` renders product geometry from `src/components/configurator/models/`
  (`sofa.tsx`, `armchair.tsx`, `table.tsx`). Each exports a component that takes
  `materials: Record<string, MaterialOverride>` and applies a `<meshStandardMaterial>`
  with matching `name` per mesh part. Part names must match `model_config.groups`
  (e.g. `seat`, `frame`, `cushions`, `legs`, `back`, `top`, `base`).
- R3F v9 + drei v10 + three ^0.174. Lazy-load scenes; reuse geometry; dispose on
  unmount; `frameloop="demand"` where possible; honor `prefers-reduced-motion`.
- GLB uploads: `src/lib/models/validate.ts` exports
  `validateModelUpload(file: { name:string; size:number; type:string })` —
  allowed `model/gltf-binary`, `.glb`, `.gltf`, max `MODEL_UPLOAD_MAX_BYTES`
  (default 25 MB). Uploaded models follow convention: named materials per part;
  if part names don't match schema, configurator shows "unsupported parts" notice
  instead of pretending to swap materials.

## 11. Room designer

`src/components/room/*`. Coordinates in `{x,y}` meters on a floor plane
(room dims from template). Objects have `{id, productId, name, x, y, width, depth, rotation, scale}`.
Helpers in `src/lib/room/placement.ts` (collision/inside-room checks →
`canPlace(object, objects, dims)`). Save to `rooms` table (owner-only via RLS).
Share via `share_token`.

## 12. Routing map

```
/                    home (3D hero)
/shop, /shop/[slug]  catalog + category
/products/[slug]      product detail (gallery, options, 3D preview, reviews)
/collections/[slug]
/showroom             3D showroom
/room-designer        virtual room designer
/search?q=
/brands /designers /about /contact /faq /shipping-policy /returns-policy /privacy /terms
/auth/login /auth/register /auth/verify-email /auth/forgot-password /auth/reset-password
/cart /checkout /checkout/confirmation/[id]
/account/*            customer (overview, orders, orders/[id], configurations, rooms, wishlist, reviews, addresses, settings, security, notifications, support)
/seller/*             seller (dashboard, products, products/new, products/[id]/edit, orders, analytics, payouts, settings, onboarding)
/admin/*              admin (dashboard, users, sellers, products, orders, refunds, commissions, payouts, coupons, reviews, support, audit, settings)
```
Route groups: `app/(site)`, `app/(auth)`, `app/(account)` (login-gated),
`app/(seller)` (seller/admin), `app/(admin)` (admin). `src/middleware.ts`
(refresh session; role gates redirect).

## 13. Design system
Tokens are in `globals.css` + `tailwind.config.ts`: colors `ivory/charcoal/stone/bronze/fog/ink/line/paper/success/warning/danger/info`, fonts `display/body/mono`, type scale `display-2xl…overline`, `shadow-card/raised/overlay/focus`, `max-w-container`. Build UI primitives (button, input, dialog, drawer, toast, card, table, skeleton, pagination, rating, tabs, accordion, dropdown) in `src/components/ui/*` with accessible markup (focus-visible, aria labels, reduced motion). Use `motion/react` for animations: `whileInView` reveals, `AnimatePresence` for mounts/unmounts, `useScroll`+`useTransform` for hero parallax. Keep motion purposeful and non-blocking.

## 14. Definition of done for each coder
- TypeScript strict, no `any` leaks, no `@ts-ignore`.
- All imports resolve to existing/assigned modules.
- Components compile in isolation; no runtime undefined access.
- Follow naming: components `PascalCase`, hooks `useX`, server fns `camelCase`.
- No fake "success" states — wire real data/actions where the feature is claimed.
