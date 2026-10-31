-- ============================================================================
-- ATELIER 3D — Schema (0001)
-- Core tables, enums, functions and indexes. Money is integer cents.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('customer', 'seller', 'admin');
create type product_type as enum ('standard', 'configurable', 'made_to_order');
create type product_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'archived', 'inactive');
create type order_status as enum (
  'pending_payment', 'confirmed', 'processing', 'in_production', 'ready_to_ship',
  'shipped', 'delivered', 'cancellation_requested', 'cancelled', 'refund_pending', 'refunded'
);
create type payment_status as enum ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded');
create type refund_status as enum ('requested', 'approved', 'processed', 'rejected');
create type payout_status as enum ('requested', 'approved', 'paid', 'rejected', 'failed');
create type ledger_entry_type as enum ('sale', 'refund', 'adjustment', 'payout');
create type notification_type as enum (
  'order_update', 'payment_update', 'shipping_update', 'seller_approval', 'product_approval',
  'refund_update', 'payout_update', 'support_reply', 'system'
);
create type ticket_status as enum ('open', 'pending', 'resolved', 'closed');
create type review_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- PROFILES / ROLES
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  role user_role not null default 'customer',
  email_verified boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null,
  legal_name text,
  contact_email text,
  phone text,
  country text,
  address jsonb,
  tax_id text,
  status text not null default 'pending', -- pending | submitted | under_review | approved | rejected | suspended
  verification_documents jsonb not null default '[]'::jsonb,
  agreed_to_terms boolean not null default false,
  agreed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_documents (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles (id) on delete cascade,
  kind text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  status text not null default 'pending'
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.seller_profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  status text not null default 'active', -- active | suspended
  platform_commission_rate numeric(5,4) not null default 0.0800,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CATALOG
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id) on delete set null,
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  website_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  hero_image_url text,
  status text not null default 'active',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sku text,
  type product_type not null default 'standard',
  base_price_cents int not null default 0 check (base_price_cents >= 0),
  sale_price_cents int check (sale_price_cents >= 0),
  currency char(3) not null default 'USD',
  dimensions jsonb,
  weight_grams int,
  materials text[] not null default '{}',
  colors text[] not null default '{}',
  status product_status not null default 'draft',
  inventory_quantity int not null default 0,
  low_stock_threshold int not null default 5,
  seo jsonb,
  customization_schema jsonb,
  model_url text,
  model_preview_url text,
  model_config jsonb,
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  featured boolean not null default false,
  bestseller boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt_text text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  format text not null default 'glb',
  status text not null default 'pending',
  uploaded_by uuid references public.profiles (id),
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text,
  name text,
  price_cents int not null default 0,
  compare_at_price_cents int,
  attributes jsonb not null default '{}'::jsonb,
  inventory_quantity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customization_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  group_key text not null,
  label text not null,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity int not null default 0,
  reserved int not null default 0,
  location text,
  updated_at timestamptz not null default now(),
  unique (product_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- USER CONTENT: configurations, rooms, wishlists, reviews
-- ---------------------------------------------------------------------------
create table public.product_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  option_summary text,
  unit_price_cents int not null default 0,
  computed jsonb,
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  template_key text not null,
  dimensions jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  objects jsonb not null default '[]'::jsonb,
  thumbnail_url text,
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Default',
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid,
  order_item_id uuid,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  images text[] not null default '{}',
  status review_status not null default 'pending',
  helpful_count int not null default 0,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CART / ADDRESSES
-- ---------------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  configuration jsonb,
  option_summary text,
  unit_price_cents int not null default 0,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id, option_summary)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text,
  country text not null default 'US',
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ORDERS / PAYMENTS / REFUNDS
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  guest_email text,
  status order_status not null default 'pending_payment',
  checkout_session_id text unique,
  currency char(3) not null default 'USD',
  items_subtotal_cents int not null default 0,
  discounts_total_cents int not null default 0,
  shipping_total_cents int not null default 0,
  tax_total_cents int not null default 0,
  grand_total_cents int not null default 0,
  coupon_code text,
  shipping_address jsonb,
  billing_address jsonb,
  delivery_method text,
  tracking_ref text,
  placed_at timestamptz,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid references public.product_variants (id) on delete set null,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  title text not null,
  sku text,
  image_url text,
  unit_price_cents int not null default 0,
  quantity int not null default 1,
  configuration jsonb,
  option_summary text,
  line_total_cents int not null default 0,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null default 'test',
  provider_payment_id text,
  amount_cents int not null,
  currency char(3) not null default 'USD',
  status payment_status not null default 'pending',
  method text,
  idempotency_key text unique,
  card_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete cascade,
  event_type text not null,
  payload jsonb,
  provider_event_id text unique,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  amount_cents int not null check (amount_cents >= 0),
  reason text,
  status refund_status not null default 'requested',
  admin_note text,
  requested_by uuid references public.profiles (id) on delete set null,
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- LEDGER: commissions, seller ledger, payouts
-- ---------------------------------------------------------------------------
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.order_items (id) on delete set null,
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  gross_amount_cents int not null,
  commission_rate numeric(5,4) not null,
  commission_amount_cents int not null,
  net_amount_cents int not null,
  currency char(3) not null default 'USD',
  status text not null default 'accrued', -- accrued | paid | reversed
  created_at timestamptz not null default now()
);

create table public.seller_ledger (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  entry_type ledger_entry_type not null,
  amount_cents int not null,
  balance_after_cents int not null,
  order_id uuid references public.orders (id) on delete set null,
  payout_id uuid,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  amount_cents int not null,
  currency char(3) not null default 'USD',
  status payout_status not null default 'requested',
  period_start date,
  period_end date,
  method text,
  reference text,
  requested_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- MARKETING / SUPPORT / NOTIFICATIONS / AUDIT / ANALYTICS
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent', -- percent | fixed
  discount_value numeric(10,2) not null default 0,
  min_order_cents int,
  max_discount_cents int,
  usage_limit int,
  used_count int not null default 0,
  per_user_limit int not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  seller_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  amount_cents int not null default 0,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  subject text not null,
  issue_type text,
  status ticket_status not null default 'open',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_role text not null default 'customer',
  body text not null,
  attachments text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles (id) on delete set null,
  session_id text,
  page text,
  properties jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FUNCTIONS / TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','seller_profiles','stores','categories','brands','collections','products',
    'product_variants','product_inventory','product_configurations','rooms','carts',
    'cart_items','addresses','orders','payments','refunds','payouts','coupons',
    'reviews','notification_preferences','support_tickets'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated on public.%I;', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- New auth user -> profile row (role customer by default).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ensure a default wishlist exists for new profiles.
create or replace function public.ensure_default_wishlist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wishlists (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists profiles_ensure_wishlist on public.profiles;
create trigger profiles_ensure_wishlist
  after insert on public.profiles
  for each row execute function public.ensure_default_wishlist();

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index idx_products_store on public.products (store_id);
create index idx_products_seller on public.products (seller_id);
create index idx_products_category on public.products (category_id);
create index idx_products_collection on public.products (collection_id);
create index idx_products_status on public.products (status);
create index idx_products_type on public.products (type);
create index idx_products_created on public.products (created_at desc);
create index idx_product_images_product on public.product_images (product_id, position);
create index idx_product_models_product on public.product_models (product_id);
create index idx_variants_product on public.product_variants (product_id);
create index idx_customization_product on public.customization_options (product_id, sort_order);
create index idx_inventory_product on public.product_inventory (product_id);
create index idx_configs_user on public.product_configurations (user_id, created_at desc);
create index idx_configs_share on public.product_configurations (share_token);
create index idx_rooms_user on public.rooms (user_id, created_at desc);
create index idx_rooms_share on public.rooms (share_token);
create index idx_wishlist_items_wl on public.wishlist_items (wishlist_id);
create index idx_reviews_product on public.reviews (product_id, status);
create index idx_reviews_user on public.reviews (user_id);
create index idx_cart_items_cart on public.cart_items (cart_id);
create index idx_addresses_user on public.addresses (user_id);
create index idx_orders_user on public.orders (user_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_placed on public.orders (placed_at desc);
create index idx_order_items_order on public.order_items (order_id);
create index idx_order_items_seller on public.order_items (seller_id);
create index idx_order_items_product on public.order_items (product_id);
create index idx_order_history_order on public.order_status_history (order_id, created_at);
create index idx_payments_order on public.payments (order_id);
create index idx_payments_provider on public.payments (provider_payment_id);
create index idx_payment_events_payment on public.payment_events (payment_id);
create index idx_payment_events_provider on public.payment_events (provider_event_id);
create index idx_refunds_order on public.refunds (order_id);
create index idx_refunds_status on public.refunds (status);
create index idx_commissions_seller on public.commissions (seller_id);
create index idx_commissions_order on public.commissions (order_id);
create index idx_ledger_seller on public.seller_ledger (seller_id, created_at desc);
create index idx_payouts_seller on public.payouts (seller_id);
create index idx_coupon_redemptions_coupon on public.coupon_redemptions (coupon_id);
create index idx_notifications_user on public.notifications (user_id, read_at);
create index idx_tickets_user on public.support_tickets (user_id);
create index idx_ticket_messages_ticket on public.support_messages (ticket_id);
create index idx_audit_created on public.audit_logs (created_at desc);
create index idx_analytics_type on public.analytics_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- STORAGE BUCKETS
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('avatars', 'avatars', true),
  ('rooms', 'rooms', true),
  ('models', 'models', false),
  ('public', 'public', true)
on conflict (id) do nothing;
