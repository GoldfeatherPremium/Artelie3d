# ATELIER 3D — Build Status

> Maintained during development. Scope: full 3D commerce platform (Next.js +
> Supabase + Three.js). This file tracks real, verified progress only.

## Completed
- **Foundation**: Next.js 15 App Router + React 19 + TS strict + Tailwind 3.4 scaffold.
  Design tokens (palette/type/radius/elevation) in `globals.css` + `tailwind.config.ts`.
- **Database (supabase/migrations)**:
  - `0001_schema.sql` — 35+ tables, enums (order/payment/refund/payout/ledger/
    notification/ticket/review), triggers (`set_updated_at`, `handle_new_user`,
    `ensure_default_wishlist`), indexes, storage buckets.
  - `0002_rls.sql` — Row Level Security on every table + storage policies;
    helper functions `is_admin`, `is_seller`, `current_seller_profile`,
    `can_manage_store`, `can_manage_product`.
  - `0003_seed.sql` — demo auth users (admin/seller×3/customer×2), profiles,
    roles, approved seller profiles + stores, 8 categories, 5 brands,
    5 collections, 14 products (3 **configurable** with full customization
    schema + model_config for procedural 3D), product images (Unsplash),
    variants, customization options, coupons, reviews (incl. pending),
    notifications. All demo data labeled `metadata.demo = true`.
- **Tool recon**: Framer MCP authenticated (workspace "Hashim's Workspace",
  `create_project` allowed; 3 projects visible). Motion docs MCP available
  (verified `motion/react` import + AnimatePresence patterns).

## In progress
- Shared libs (supabase clients, auth/roles, pricing, validation, payments/email
  adapters, commerce/ledger) — delegated to coders.
- UI primitives, layout/nav, 3D configurator (procedural models), room designer.

## Not started / known limitations
- Public pages, shop, product detail, auth pages, customer/seller/admin apps,
  cart/checkout, APIs, tests.
- **Payments**: integration interface built; default provider is `test`
  (sandbox). Real charges require `PAYMENT_PROVIDER=stripe` +
  `PAYMENT_PROVIDER_SECRET_KEY` + `PAYMENT_WEBHOOK_SECRET`. No real money is
  ever charged in test mode.
- **Email**: default adapter `console` (logs). Resend requires
  `EMAIL_PROVIDER_API_KEY`.
- **Framer**: direct MCP editing exists but is approval-gated. Decision here:
  single-domain Next.js app for the full platform (spec-permitted); Framer
  front-of-house site is optional later work, not claimed as done.
- **3D assets**: configurator uses original procedural geometry (no external
  GLB yet). GLB upload + material-mapping convention documented; uploaded
  models validated by type/size server-side.

## Required external credentials
See `.env.example` (Supabase URL/anon/service-role; payment provider keys;
email provider key; public app URL; storage config). No secrets committed.

## Test results
- None executed yet (tests being written in this phase).

## Deployment status
- No Vercel deploy yet (build still in progress). Supabase migrations written;
  apply via `apply_migrations` after review.

## Next implementation steps
1. Delegate shared-lib coders (auth, pricing, payments/email, commerce/ledger).
2. Delegate UI primitives + layout + 3D + room.
3. Delegate marketing/shop/product/auth/customer/seller/admin apps.
4. Wire API routes; add tests; typecheck; preflight; apply migrations; deploy.
