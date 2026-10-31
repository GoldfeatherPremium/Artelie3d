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
- **3D**: procedural model scenes for 30 model kinds (sofas, chairs, tables, desks,
  beds, storage, lighting, decor), configurator with live material swapping, showroom,
  functional room designer, hero scene; motion/react for animation.
- **Visual asset library**: deterministic vector renderer (`scripts/generate-assets.mjs`)
  generates 176 WebP assets under `public/assets` (30 product sets with
  hero/front/side/detail/lifestyle, 8 category banners, 5 collection banners, 12
  interiors, manifest); the set is committed to the branch and re-generated at build
  time via `prebuild`. Components prefer these local assets with database fallback.
- **Apps**: public site pages (home, shop, product, collections, brands, designers,
  sell, contact, legal), customer account, seller dashboard (products/variants, orders,
  payouts, settings), admin dashboard (users, sellers, products moderation, orders,
  refunds, coupons, categories, reviews, support, audit, settings).
- **API**: `/api/search` route + server actions for checkout/cart/configurations/
  wishlist/reviews/contact/newsletter/admin/seller flows.

## Verification (last full run — green except build-in-sandbox)
- `npm run typecheck` → exit 0.
- `npm run test` → 40 passed, 4 skipped (integration/order-flow needs live Supabase).
- `npm run build` (`next build`) → runs on Vercel (sandbox heap cap OOMs a full local
  build). Vercel deploy: READY with runtime PASSED (200) on the entry page.
- Assets committed to branch: `git ls-tree HEAD public/` → 176 files.

## Known limitations / not yet verified
- **Payments**: default provider is `test` (sandbox). Real charges require Stripe env
  keys + webhook secret; no real money charged in test mode.
- **Email**: default `console`. `EMAIL_PROVIDER=resend|smtp` requires provider keys.
- **Supabase migrations**: not re-applied in this session; seed/demo data intended for
  dev. Apply via `apply_migrations` on a linked project.
- **Stripe provider build warning**: webpack "critical dependency" warning is expected —
  the `stripe` package is intentionally imported lazily via `createRequire` so the
  production build passes without the optional package installed.
- **Offline render runtime**: `scripts/render/runtime.ts` is excluded from `tsc`
  (browser-only tool); `scripts/render/runtime.mjs` (bundle) is not committed.
- **Deployment**: Vercel deploy status tracked separately at end of work.

## Required external credentials
See `.env.example` (Supabase URL/anon/service-role; payment provider keys; email
provider key; public app URL; storage config). No secrets committed.
