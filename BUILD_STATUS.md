# ATELIER 3D — Build Status

> Maintained during development. Scope: full 3D commerce platform (Next.js +
> Supabase + Three.js). This file tracks real, verified progress only.

## Completed
- **Foundation**: Next.js 15 App Router + React 19 + TS strict + Tailwind 3.4 scaffold.
  Design tokens (palette/type/radius/elevation) in `globals.css` + `tailwind.config.ts`.
- **Design tokens (verified)**: custom colors are RGB triplet CSS variables consumed via
  `rgb(var(--color-X) / <alpha-value>)`, so opacity modifiers (`text-ink/80`,
  `bg-bronze/5`, `border-danger/30`, …) compile correctly in `@apply` and utilities.
- **Database (supabase/migrations)**: `0001_schema.sql`, `0002_rls.sql`,
  `0003_seed.sql` (schema, RLS + helper functions, demo seed w/ `metadata.demo=true`).
- **Routing (verified)**: customer/seller/admin apps live at real URL prefixes.
  - Account app: `src/app/(account)/account/**` → `/account/...`
  - Admin app: `src/app/(admin)/admin/**` → `/admin/...`
  - Seller app: `src/app/(seller)/seller/**` → `/seller/...`
  - Middleware gates `/account`, `/seller`, `/admin` by role; layouts re-check server-side.
- **Auth/roles**: middleware + server-side `requireRole`/`requireUser`, role promotion
  with last-admin protection, audit trail.
- **Commerce core**: pricing (coupons/discounts/tax/shipping), cart, order lifecycle,
  ledger, commissions, payouts, refund reversal logic (unit-tested).
- **Payments abstraction**: provider interface; default `test` provider (sandbox, no
  real charges); Stripe provider implemented behind env-gated lazy import
  (`PAYMENT_PROVIDER=stripe` + keys). Webhook signature verification + idempotent
  `payment_events` upsert.
- **Email abstraction**: default `console` logger; Resend/SMTP adapters env-gated.
- **3D**: procedural model scenes (armchair/sofa/table), configurator, showroom,
  room-designer landing, hero scene; motion/react for animation.
- **Apps**: public site pages (home, shop, product, collections, brands, designers,
  sell, contact, legal), customer account, seller dashboard (products/variants, orders,
  payouts, settings), admin dashboard (users, sellers, products moderation, orders,
  refunds, coupons, categories, reviews, support, audit, settings).
- **API**: `/api/search` route + server actions for checkout/cart/configurations/
  wishlist/reviews/contact/newsletter/admin/seller flows.

## Verification (last full run — all green)
- `npm run typecheck` → exit 0.
- `npm run test` → 40 passed, 4 skipped (integration/order-flow needs live Supabase).
- `npm run build` (`next build`) → compiled successfully; route map verified
  (`/account/*`, `/admin/*`, `/seller/*` present; no parallel-route collisions).

## Known limitations / not yet verified
- **Payments**: default provider is `test` (sandbox). Real charges require Stripe env
  keys + webhook secret; no real money charged in test mode.
- **Email**: default `console`. `EMAIL_PROVIDER=resend|smtp` requires provider keys.
- **Supabase migrations**: not re-applied in this session; seed/demo data intended for
  dev. Apply via `apply_migrations` on a linked project.
- **Stripe provider build warning**: webpack "critical dependency" warning is expected —
  the `stripe` package is intentionally imported lazily via `createRequire` so the
  production build passes without the optional package installed.
- **Deployment**: Vercel deploy status tracked separately at end of work.

## Required external credentials
See `.env.example` (Supabase URL/anon/service-role; payment provider keys; email
provider key; public app URL; storage config). No secrets committed.
