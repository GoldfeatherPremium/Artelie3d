-- ============================================================================
-- ATELIER 3D — Row Level Security (0002)
-- Helper functions: is_admin(), is_seller(), current_seller_profile(), can_manage_store()
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.seller_documents enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_models enable row level security;
alter table public.product_variants enable row level security;
alter table public.customization_options enable row level security;
alter table public.product_inventory enable row level security;
alter table public.product_configurations enable row level security;
alter table public.rooms enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reviews enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.commissions enable row level security;
alter table public.seller_ledger enable row level security;
alter table public.payouts enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (security definer, read-only)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_seller()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('seller','admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.current_seller_profile()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.seller_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.can_manage_store(store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.seller_profile_id = public.current_seller_profile()
  ) or public.is_admin();
$$;

create or replace function public.can_manage_product(product_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.products p
    where p.id = product_id and public.can_manage_store(p.store_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- PROFILES / ROLES
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "roles_select_own" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "roles_admin_all" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- SELLER PROFILES / DOCUMENTS
create policy "seller_profiles_select_own" on public.seller_profiles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "seller_profiles_insert_own" on public.seller_profiles
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "seller_profiles_update_own" on public.seller_profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "seller_documents_select_own" on public.seller_documents
  for select using (
    exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.user_id = auth.uid())
    or public.is_admin()
  );
create policy "seller_documents_insert_own" on public.seller_documents
  for insert with check (
    exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.user_id = auth.uid())
    or public.is_admin()
  );
create policy "seller_documents_update_own" on public.seller_documents
  for update using (
    exists (select 1 from public.seller_profiles sp where sp.id = seller_profile_id and sp.user_id = auth.uid())
    or public.is_admin()
  );

-- STORES
create policy "stores_select_public" on public.stores
  for select using (status = 'active' or public.is_admin());
create policy "stores_select_owner" on public.stores
  for select using (seller_profile_id = public.current_seller_profile() or public.is_admin());
create policy "stores_insert_owner" on public.stores
  for insert with check (seller_profile_id = public.current_seller_profile() or public.is_admin());
create policy "stores_update_owner" on public.stores
  for update using (seller_profile_id = public.current_seller_profile() or public.is_admin())
  with check (seller_profile_id = public.current_seller_profile() or public.is_admin());

-- CATEGORIES / BRANDS / COLLECTIONS
create policy "categories_select_public" on public.categories for select using (true);
create policy "categories_admin_all" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "brands_select_public" on public.brands for select using (true);
create policy "brands_admin_all" on public.brands for all using (public.is_admin()) with check (public.is_admin());
create policy "collections_select_public" on public.collections for select using (true);
create policy "collections_admin_all" on public.collections for all using (public.is_admin()) with check (public.is_admin());

-- PRODUCTS
create policy "products_select_public" on public.products
  for select using (status = 'approved');
create policy "products_select_seller" on public.products
  for select using (public.can_manage_product(id) or public.is_admin());
create policy "products_insert_seller" on public.products
  for insert with check (public.can_manage_store(store_id));
create policy "products_update_seller" on public.products
  for update using (public.can_manage_product(id))
  with check (public.can_manage_product(id));
create policy "products_delete_seller" on public.products
  for delete using (public.can_manage_product(id));

-- PRODUCT IMAGES
create policy "product_images_select_public" on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'approved')
    or public.can_manage_product(product_id)
  );
create policy "product_images_insert_seller" on public.product_images
  for insert with check (public.can_manage_product(product_id));
create policy "product_images_update_seller" on public.product_images
  for update using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));
create policy "product_images_delete_seller" on public.product_images
  for delete using (public.can_manage_product(product_id));

-- PRODUCT MODELS
create policy "product_models_select_owner" on public.product_models
  for select using (public.can_manage_product(product_id));
create policy "product_models_insert_seller" on public.product_models
  for insert with check (public.can_manage_product(product_id));
create policy "product_models_update_seller" on public.product_models
  for update using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));
create policy "product_models_delete_seller" on public.product_models
  for delete using (public.can_manage_product(product_id));

-- VARIANTS / INVENTORY / CUSTOMIZATION
create policy "variants_select_public" on public.product_variants
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'approved') or public.can_manage_product(product_id));
create policy "variants_insert_seller" on public.product_variants
  for insert with check (public.can_manage_product(product_id));
create policy "variants_update_seller" on public.product_variants
  for update using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));
create policy "variants_delete_seller" on public.product_variants
  for delete using (public.can_manage_product(product_id));

create policy "inventory_select_public" on public.product_inventory
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'approved') or public.can_manage_product(product_id));
create policy "inventory_insert_seller" on public.product_inventory
  for insert with check (public.can_manage_product(product_id));
create policy "inventory_update_seller" on public.product_inventory
  for update using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));

create policy "customization_select_public" on public.customization_options
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'approved') or public.can_manage_product(product_id));
create policy "customization_insert_seller" on public.customization_options
  for insert with check (public.can_manage_product(product_id));
create policy "customization_update_seller" on public.customization_options
  for update using (public.can_manage_product(product_id)) with check (public.can_manage_product(product_id));
create policy "customization_delete_seller" on public.customization_options
  for delete using (public.can_manage_product(product_id));

-- CONFIGURATIONS
create policy "configs_select_own" on public.product_configurations
  for select using (user_id = auth.uid() or public.is_admin() or (is_public and share_token is not null));
create policy "configs_insert_own" on public.product_configurations
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "configs_update_own" on public.product_configurations
  for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "configs_delete_own" on public.product_configurations
  for delete using (user_id = auth.uid() or public.is_admin());

-- ROOMS
create policy "rooms_select_own" on public.rooms
  for select using (user_id = auth.uid() or public.is_admin() or (is_public and share_token is not null));
create policy "rooms_insert_own" on public.rooms
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "rooms_update_own" on public.rooms
  for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "rooms_delete_own" on public.rooms
  for delete using (user_id = auth.uid() or public.is_admin());

-- WISHLISTS
create policy "wishlists_select_own" on public.wishlists
  for select using (user_id = auth.uid() or public.is_admin());
create policy "wishlists_insert_own" on public.wishlists
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "wishlists_update_own" on public.wishlists
  for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "wishlists_delete_own" on public.wishlists
  for delete using (user_id = auth.uid() or public.is_admin());

create policy "wishlist_items_select_own" on public.wishlist_items
  for select using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()) or public.is_admin());
create policy "wishlist_items_insert_own" on public.wishlist_items
  for insert with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()) or public.is_admin());
create policy "wishlist_items_delete_own" on public.wishlist_items
  for delete using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()) or public.is_admin());

-- REVIEWS
create policy "reviews_select_public" on public.reviews
  for select using (status = 'approved');
create policy "reviews_select_own" on public.reviews
  for select using (user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews_update_own" on public.reviews
  for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "reviews_delete_admin" on public.reviews
  for delete using (public.is_admin());

-- CARTS
create policy "carts_select_own" on public.carts
  for select using (user_id = auth.uid());
create policy "carts_insert_own" on public.carts
  for insert with check (user_id = auth.uid());
create policy "carts_update_own" on public.carts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "carts_delete_own" on public.carts
  for delete using (user_id = auth.uid());

create policy "cart_items_select_own" on public.cart_items
  for select using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "cart_items_insert_own" on public.cart_items
  for insert with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "cart_items_update_own" on public.cart_items
  for update using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "cart_items_delete_own" on public.cart_items
  for delete using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ADDRESSES
create policy "addresses_select_own" on public.addresses
  for select using (user_id = auth.uid() or public.is_admin());
create policy "addresses_insert_own" on public.addresses
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "addresses_update_own" on public.addresses
  for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "addresses_delete_own" on public.addresses
  for delete using (user_id = auth.uid() or public.is_admin());

-- ORDERS
create policy "orders_select_customer" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders_select_seller" on public.orders
  for select using (
    exists (select 1 from public.order_items oi where oi.order_id = id and oi.seller_id = auth.uid())
    or public.is_admin()
  );

-- ORDER ITEMS (seller sees line items for their own products)
create policy "order_items_select_customer" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or seller_id = auth.uid()
    or public.is_admin()
  );

create policy "order_history_select_customer" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or exists (select 1 from public.order_items oi where oi.order_id = order_id and oi.seller_id = auth.uid())
    or public.is_admin()
  );

-- PAYMENTS
create policy "payments_select_customer" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

create policy "payment_events_select_admin" on public.payment_events
  for select using (public.is_admin());

-- REFUNDS
create policy "refunds_select_customer" on public.refunds
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id where oi.order_id = refunds.order_id and oi.seller_id = auth.uid())
    or public.is_admin()
  );
create policy "refunds_insert_customer" on public.refunds
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.is_admin()
  );
create policy "refunds_update_admin" on public.refunds
  for update using (public.is_admin()) with check (public.is_admin());

-- COMMISSIONS / LEDGER / PAYOUTS
create policy "commissions_select_seller" on public.commissions
  for select using (seller_id = auth.uid() or public.is_admin());
create policy "ledger_select_seller" on public.seller_ledger
  for select using (seller_id = auth.uid() or public.is_admin());
create policy "payouts_select_seller" on public.payouts
  for select using (seller_id = auth.uid() or public.is_admin());
create policy "payouts_update_admin" on public.payouts
  for update using (public.is_admin()) with check (public.is_admin());

-- COUPONS
create policy "coupons_select_public" on public.coupons
  for select using (active or public.is_admin() or seller_id = auth.uid());
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
create policy "coupons_seller_all" on public.coupons
  for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "redemptions_select_admin" on public.coupon_redemptions
  for select using (public.is_admin());

-- NOTIFICATIONS
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications
  for delete using (user_id = auth.uid());
create policy "notification_prefs_select_own" on public.notification_preferences
  for select using (user_id = auth.uid());
create policy "notification_prefs_insert_own" on public.notification_preferences
  for insert with check (user_id = auth.uid());
create policy "notification_prefs_update_own" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SUPPORT
create policy "tickets_select_own" on public.support_tickets
  for select using (user_id = auth.uid() or public.is_admin());
create policy "tickets_insert_own" on public.support_tickets
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "tickets_update_admin" on public.support_tickets
  for update using (public.is_admin()) with check (public.is_admin());
create policy "messages_select_own" on public.support_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or public.is_admin()
  );
create policy "messages_insert_own" on public.support_messages
  for insert with check (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or public.is_admin()
  );

-- AUDIT / ANALYTICS
create policy "audit_select_admin" on public.audit_logs
  for select using (public.is_admin());
create policy "analytics_select_admin" on public.analytics_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- STORAGE POLICIES
-- ---------------------------------------------------------------------------
create policy "public_read" on storage.objects for select using (bucket_id = 'public' or bucket_id = 'product-images' or bucket_id = 'avatars' or bucket_id = 'rooms');
create policy "authenticated_upload_own" on storage.objects for insert to authenticated with check (bucket_id in ('product-images','avatars','rooms','models') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authenticated_update_own" on storage.objects for update to authenticated using (bucket_id in ('product-images','avatars','rooms','models') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "authenticated_delete_own" on storage.objects for delete to authenticated using (bucket_id in ('product-images','avatars','rooms','models') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin_storage_all" on storage.objects for all to authenticated using (public.is_admin()) with check (public.is_admin());
