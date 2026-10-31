-- ============================================================================
-- ATELIER 3D — Demo Seed (0003)
-- Clearly-labeled demonstration data. Money in cents. Images are remote
-- Unsplash URLs (see next.config.ts remotePatterns).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- DEMO AUTH USERS
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@atelier3d.com', crypt('AtelierAdmin!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Atelier Admin"}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller1@atelier3d.com', crypt('AtelierSeller!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Maya Lindqvist"}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller2@atelier3d.com', crypt('AtelierSeller!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Jonas Weber"}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller3@atelier3d.com', crypt('AtelierSeller!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Amara Okafor"}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@atelier3d.com', crypt('AtelierUser!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Omar Haddad"}'::jsonb, now(), now()),
  ('20000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lena@atelier3d.com', crypt('AtelierUser!1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Lena Fischer"}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id, format('{"sub":"%s","email":"%s"}', u.id, u.email)::jsonb, 'email', now(), now(), now()
from auth.users u
where u.id in (
  '20000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000002'::uuid,
  '20000000-0000-4000-8000-000000000003'::uuid,
  '20000000-0000-4000-8000-000000000004'::uuid,
  '20000000-0000-4000-8000-000000000005'::uuid,
  '20000000-0000-4000-8000-000000000006'::uuid
)
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- PROFILES / ROLES / SELLERS / STORES
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, role, email_verified) values
  ('20000000-0000-4000-8000-000000000001', 'admin@atelier3d.com', 'Atelier Admin', 'admin', true),
  ('20000000-0000-4000-8000-000000000002', 'seller1@atelier3d.com', 'Maya Lindqvist', 'seller', true),
  ('20000000-0000-4000-8000-000000000003', 'seller2@atelier3d.com', 'Jonas Weber', 'seller', true),
  ('20000000-0000-4000-8000-000000000004', 'seller3@atelier3d.com', 'Amara Okafor', 'seller', true),
  ('20000000-0000-4000-8000-000000000005', 'customer@atelier3d.com', 'Omar Haddad', 'customer', true),
  ('20000000-0000-4000-8000-000000000006', 'lena@atelier3d.com', 'Lena Fischer', 'customer', true)
on conflict (id) do nothing;

insert into public.user_roles (user_id, role) values
  ('20000000-0000-4000-8000-000000000001', 'admin'),
  ('20000000-0000-4000-8000-000000000002', 'seller'),
  ('20000000-0000-4000-8000-000000000003', 'seller'),
  ('20000000-0000-4000-8000-000000000004', 'seller'),
  ('20000000-0000-4000-8000-000000000005', 'customer'),
  ('20000000-0000-4000-8000-000000000006', 'customer')
on conflict do nothing;

insert into public.seller_profiles (id, user_id, business_name, legal_name, contact_email, phone, country, status, agreed_to_terms, agreed_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Atelier Maison', 'Atelier Maison LLC', 'seller1@atelier3d.com', '+1 212 555 0111', 'US', 'approved', true, now()),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'Studio North', 'Studio North AB', 'seller2@atelier3d.com', '+46 8 555 0112', 'SE', 'approved', true, now()),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'Noma Living', 'Noma Living Ltd', 'seller3@atelier3d.com', '+44 20 555 0113', 'GB', 'approved', true, now())
on conflict (id) do nothing;

insert into public.stores (id, seller_profile_id, name, slug, description, status, platform_commission_rate) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Atelier Maison', 'atelier-maison', 'Modern heirloom furniture, crafted for the way you live.', 'active', 0.0800),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Studio North', 'studio-north', 'Scandinavian minimalism with sculptural warmth.', 'active', 0.0750),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Noma Living', 'noma-living', 'Quietly bold pieces for considered interiors.', 'active', 0.0850)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- CATEGORIES / BRANDS / COLLECTIONS
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, slug, description, sort_order) values
  ('50000000-0000-4000-8000-000000000001', 'Sofas & Sectionals', 'sofas', 'Comfort at the center of the room.', 10),
  ('50000000-0000-4000-8000-000000000002', 'Armchairs & Chaises', 'armchairs', 'A place to land, read, and think.', 20),
  ('50000000-0000-4000-8000-000000000003', 'Tables & Desks', 'tables', 'Surfaces that anchor a space.', 30),
  ('50000000-0000-4000-8000-000000000004', 'Lighting', 'lighting', 'Light as material.', 40),
  ('50000000-0000-4000-8000-000000000005', 'Storage & Shelving', 'storage', 'Containment with character.', 50),
  ('50000000-0000-4000-8000-000000000006', 'Bedroom', 'bedroom', 'Rest, made deliberate.', 60),
  ('50000000-0000-4000-8000-000000000007', 'Office', 'office', 'For the work of making.', 70),
  ('50000000-0000-4000-8000-000000000008', 'Decor & Objects', 'decor', 'The finishing gestures.', 80)
on conflict (id) do nothing;

insert into public.brands (id, name, slug, description) values
  ('60000000-0000-4000-8000-000000000001', 'Meridian', 'meridian', 'Sculptural forms in natural materials.'),
  ('60000000-0000-4000-8000-000000000002', 'Basil & Oak', 'basil-oak', 'Quiet luxury, built to last generations.'),
  ('60000000-0000-4000-8000-000000000003', 'Halden', 'halden', 'Precision joinery from the North.'),
  ('60000000-0000-4000-8000-000000000004', 'Atelier Maison', 'atelier-maison', 'Modern heirlooms by Atelier Maison.'),
  ('60000000-0000-4000-8000-000000000005', 'Noma Studio', 'noma-studio', 'Bold silhouettes by Noma Studio.')
on conflict (id) do nothing;

insert into public.collections (id, name, slug, description, status, published_at) values
  ('70000000-0000-4000-8000-000000000001', 'Quiet Luxury', 'quiet-luxury', 'Tailored, tactile, timeless.', 'active', now()),
  ('70000000-0000-4000-8000-000000000002', 'The Foundry', 'the-foundry', 'Cast, carved, and formed by hand.', 'active', now()),
  ('70000000-0000-4000-8000-000000000003', 'Sculptural Forms', 'sculptural-forms', 'Furniture as art object.', 'active', now()),
  ('70000000-0000-4000-8000-000000000004', 'Nordic Light', 'nordic-light', 'Light, air, and long winters.', 'active', now()),
  ('70000000-0000-4000-8000-000000000005', 'Archive 01', 'archive-01', 'First editions from our founding makers.', 'active', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------
insert into public.products (
  id, store_id, seller_id, category_id, collection_id, brand_id,
  name, slug, description, sku, type, base_price_cents, sale_price_cents,
  dimensions, weight_grams, materials, colors, status, inventory_quantity,
  seo, customization_schema, model_config, featured, bestseller, metadata
) values
(
  '80000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
  'Meridian Lounge Sofa', 'meridian-lounge-sofa',
  'A low, generous three-seat sofa with a floating silhouette. Deep seating wrapped in natural linen, on a solid oak frame.',
  'AM-SFA-001', 'configurable', 389000, 349000,
  '{"width":224,"depth":102,"height":78,"seatHeight":38}'::jsonb, 72000,
  array['Oak','Linen','Feather'], array['Ivory','Sage','Sand'],
  'approved', 24, '{"title":"Meridian Lounge Sofa — Atelier Maison"}'::jsonb,
  '{"groups":[{"key":"size","label":"Size","required":true,"single":true,"options":[{"value":"2-seat","label":"Two-seat","priceAddCents":0},{"value":"3-seat","label":"Three-seat","priceAddCents":60000},{"value":"4-seat","label":"Four-seat","priceAddCents":120000}]},{"key":"fabric","label":"Fabric","required":true,"single":true,"options":[{"value":"ivory-linen","label":"Ivory Linen","priceAddCents":0,"material":{"name":"seat","kind":"color","color":"#E9E2D4","roughness":0.9}},{"value":"sage-linen","label":"Sage Linen","priceAddCents":9000,"material":{"name":"seat","kind":"color","color":"#A9AE9B","roughness":0.9}},{"value":"sand-wool","label":"Sand Bouclé","priceAddCents":18000,"material":{"name":"seat","kind":"color","color":"#D6C7AC","roughness":0.95}},{"value":"charcoal-velvet","label":"Charcoal Velvet","priceAddCents":24000,"material":{"name":"seat","kind":"color","color":"#3A3A38","roughness":0.5}}]},{"key":"wood","label":"Wood finish","required":false,"single":true,"options":[{"value":"natural-oak","label":"Natural Oak","priceAddCents":0,"material":{"name":"frame","kind":"color","color":"#C6A97E","roughness":0.35}},{"value":"smoked-oak","label":"Smoked Oak","priceAddCents":6000,"material":{"name":"frame","kind":"color","color":"#6B5B4A","roughness":0.35}},{"value":"ebony","label":"Ebony","priceAddCents":12000,"material":{"name":"frame","kind":"color","color":"#2B2620","roughness":0.3}}]},{"key":"legs","label":"Leg style","required":false,"single":true,"options":[{"value":"standard","label":"Standard","priceAddCents":0},{"value":"tapered","label":"Tapered brass","priceAddCents":15000},{"value":"sled","label":"Sled steel","priceAddCents":10000}]}]}'::jsonb,
  '{"camera":{"position":[2.6,1.6,3.4],"fov":38},"groups":["seat","frame","cushions","legs"]}'::jsonb,
  true, true, '{"demo":true,"builder":"procedural"}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001',
  'Arc Lounge Chair', 'arc-lounge-chair',
  'A sculptural cocoon with an enveloping curved back. Leather or bouclé, over a spun-metal base.',
  'AM-ARM-002', 'configurable', 249000, 219000,
  '{"width":82,"depth":86,"height":88,"seatHeight":42}'::jsonb, 28000,
  array['Leather','Bouclé','Steel'], array['Oxblood','Cream','Black','Sage'],
  'approved', 31, '{"title":"Arc Lounge Chair — Atelier Maison"}'::jsonb,
  '{"groups":[{"key":"upholstery","label":"Upholstery","required":true,"single":true,"options":[{"value":"cream-boucle","label":"Cream Bouclé","priceAddCents":0,"material":{"name":"seat","kind":"color","color":"#EDE6DA","roughness":0.95}},{"value":"oxblood-leather","label":"Oxblood Leather","priceAddCents":28000,"material":{"name":"seat","kind":"color","color":"#6E2F2A","roughness":0.25}},{"value":"black-leather","label":"Black Leather","priceAddCents":28000,"material":{"name":"seat","kind":"color","color":"#262625","roughness":0.25}},{"value":"sage-boucle","label":"Sage Bouclé","priceAddCents":5000,"material":{"name":"seat","kind":"color","color":"#A9AE9B","roughness":0.95}}]},{"key":"base","label":"Base finish","required":false,"single":true,"options":[{"value":"brushed-steel","label":"Brushed Steel","priceAddCents":0,"material":{"name":"legs","kind":"color","color":"#9A9A98","roughness":0.4}},{"value":"black-steel","label":"Black Steel","priceAddCents":0,"material":{"name":"legs","kind":"color","color":"#2A2A28","roughness":0.5}},{"value":"brass","label":"Polished Brass","priceAddCents":12000,"material":{"name":"legs","kind":"color","color":"#A88C69","roughness":0.2}}]}]}'::jsonb,
  '{"camera":{"position":[1.8,1.3,2.4],"fov":40},"groups":["seat","back","legs"]}'::jsonb,
  true, false, '{"demo":true,"builder":"procedural"}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002',
  'Morrow Dining Table', 'morrow-dining-table',
  'A monumental yet airy table in solid walnut or oak, with a hidden expansion leaf.',
  'AM-TBL-003', 'configurable', 129000, null,
  '{"width":200,"depth":100,"height":75}'::jsonb, 58000,
  array['Walnut','Oak'], array['Walnut','Oak','Black'],
  'approved', 12, '{"title":"Morrow Dining Table — Atelier Maison"}'::jsonb,
  '{"groups":[{"key":"wood","label":"Wood","required":true,"single":true,"options":[{"value":"walnut","label":"American Walnut","priceAddCents":0,"material":{"name":"top","kind":"color","color":"#5B4636","roughness":0.3}},{"value":"oak","label":"Natural Oak","priceAddCents":-12000,"material":{"name":"top","kind":"color","color":"#C6A97E","roughness":0.35}},{"value":"charred-oak","label":"Charred Oak","priceAddCents":15000,"material":{"name":"top","kind":"color","color":"#2E2A26","roughness":0.5}}]},{"key":"size","label":"Seats","required":true,"single":true,"options":[{"value":"6","label":"Six seats","priceAddCents":0},{"value":"8","label":"Eight seats","priceAddCents":20000}]}]}'::jsonb,
  '{"camera":{"position":[2.4,1.5,2.8],"fov":38},"groups":["top","base","legs"]}'::jsonb,
  false, false, '{"demo":true,"builder":"procedural"}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000003',
  'Halden Sideboard', 'halden-sideboard',
  'A slim, floating sideboard in ash with reeded doors and soft-close hardware.',
  'SN-STO-001', 'standard', 289000, 259000,
  '{"width":160,"depth":45,"height":65}'::jsonb, 52000,
  array['Ash','Steel'], array['Natural','Black'],
  'approved', 9, '{"title":"Halden Sideboard — Studio North"}'::jsonb,
  null, null, true, true, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000005',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002',
  'Basil & Oak Coffee Table', 'basil-oak-coffee-table',
  'A generous oval coffee table in travertine and oak, with a lower display shelf.',
  'SN-TBL-002', 'standard', 189000, null,
  '{"width":110,"depth":60,"height":36}'::jsonb, 45000,
  array['Travertine','Oak'], array['Travertine','Charcoal'],
  'approved', 17, '{"title":"Basil & Oak Coffee Table — Studio North"}'::jsonb,
  null, null, true, true, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000006',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001',
  'Meridian Floor Lamp', 'meridian-floor-lamp',
  'A bent-steel arc lamp with a linen shade — light that draws a room together.',
  'SN-LGT-003', 'standard', 79000, 69000,
  '{"height":190,"baseDiameter":30}'::jsonb, 11000,
  array['Steel','Linen'], array['Black','Brass'],
  'approved', 22, '{"title":"Meridian Floor Lamp — Studio North"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000007',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003',
  'Noma Media Console', 'noma-media-console',
  'A low walnut console with woven cane doors and cable-managed back panel.',
  'SN-STO-004', 'standard', 224000, null,
  '{"width":180,"depth":40,"height":50}'::jsonb, 41000,
  array['Walnut','Cane'], array['Walnut','Black'],
  'approved', 14, '{"title":"Noma Media Console — Studio North"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000008',
  '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004',
  '50000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000003',
  'Halden Desk', 'halden-desk',
  'A clean-lined writing desk in solid oak with a single drawer and cable tray.',
  'NL-OFF-001', 'standard', 159000, null,
  '{"width":140,"depth":70,"height":74}'::jsonb, 38000,
  array['Oak','Steel'], array['Natural','Black'],
  'approved', 19, '{"title":"Halden Desk — Noma Living"}'::jsonb,
  null, null, false, true, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000009',
  '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004',
  '50000000-0000-4000-8000-000000000006', '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004',
  'Atelier Maison Bed Frame', 'atelier-maison-bed-frame',
  'A low platform bed in ebonized oak with a softly upholstered headboard.',
  'NL-BDR-002', 'standard', 349000, 319000,
  '{"width":160,"depth":210,"height":95}'::jsonb, 84000,
  array['Oak','Linen'], array['Black','Ivory'],
  'approved', 7, '{"title":"Atelier Maison Bed Frame — Noma Living"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000010',
  '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004',
  '50000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000005',
  'Noma Pendant Light', 'noma-pendant-light',
  'A hand-blown glass pendant that diffuses a warm, even glow.',
  'NL-LGT-003', 'standard', 42000, null,
  '{"diameter":38,"height":45}'::jsonb, 3500,
  array['Glass','Brass'], array['Smoke','Amber','Clear'],
  'approved', 40, '{"title":"Noma Pendant Light — Noma Living"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000011',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003',
  'Studio North Nesting Tables', 'studio-north-nesting-tables',
  'Three graduated side tables in travertine and steel, designed to pile or scatter.',
  'SN-TBL-005', 'standard', 98000, null,
  '{"width":45,"depth":45,"height":45}'::jsonb, 26000,
  array['Travertine','Steel'], array['Travertine','Black'],
  'approved', 26, '{"title":"Studio North Nesting Tables — Studio North"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000012',
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000001',
  'Meridian Bookcase', 'meridian-bookcase',
  'A modular oak bookcase with adjustable shelves and an optional brass rail.',
  'AM-STO-006', 'standard', 134000, null,
  '{"width":90,"depth":34,"height":200}'::jsonb, 49000,
  array['Oak','Brass'], array['Natural','Black'],
  'approved', 15, '{"title":"Meridian Bookcase — Atelier Maison"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000013',
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002',
  'Arc Ottoman', 'arc-ottoman',
  'The Arc chair''s companion — a low, rounded ottoman in matching upholstery.',
  'AM-ARM-007', 'standard', 124000, 109000,
  '{"width":70,"depth":70,"height":42}'::jsonb, 18000,
  array['Bouclé','Feather'], array['Cream','Sage','Charcoal'],
  'approved', 28, '{"title":"Arc Ottoman — Atelier Maison"}'::jsonb,
  null, null, false, false, '{"demo":true}'::jsonb
),
(
  '80000000-0000-4000-8000-000000000014',
  '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003',
  '50000000-0000-4000-8000-000000000002', null, '60000000-0000-4000-8000-000000000003',
  'Halden Lounge Chair', 'halden-lounge-chair',
  'A deep, enveloping lounge chair in wool felt with a swivel base.',
  'SN-ARM-008', 'standard', 219000, null,
  '{"width":78,"depth":82,"height":80}'::jsonb, 24000,
  array['Wool felt','Steel'], array['Grey','Mustard','Sage'],
  'pending_review', 0, '{"title":"Halden Lounge Chair — Studio North"}'::jsonb,
  null, null, false, false, '{"demo":true,"moderation":"pending"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- PRODUCT IMAGES (Unsplash remote, demo only)
-- ---------------------------------------------------------------------------
insert into public.product_images (id, product_id, url, alt_text, position) values
  ('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc', 'Meridian Lounge Sofa in ivory linen', 0),
  ('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8', 'Meridian Lounge Sofa detail', 1),
  ('90000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c', 'Arc Lounge Chair in cream bouclé', 0),
  ('90000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc', 'Morrow Dining Table in walnut', 0),
  ('90000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1594620302200-9a762244a156', 'Halden Sideboard in ash', 0),
  ('90000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4', 'Basil & Oak coffee table in travertine', 0),
  ('90000000-0000-4000-8000-000000000007', '80000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c', 'Meridian floor lamp with linen shade', 0),
  ('90000000-0000-4000-8000-000000000008', '80000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7', 'Noma media console in walnut', 0),
  ('90000000-0000-4000-8000-000000000009', '80000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd', 'Halden desk in oak', 0),
  ('90000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85', 'Atelier Maison bed frame with upholstered headboard', 0),
  ('90000000-0000-4000-8000-000000000011', '80000000-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', 'Noma pendant light in smoke glass', 0),
  ('90000000-0000-4000-8000-000000000012', '80000000-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1532372320572-cda25653a694', 'Studio North nesting tables', 0),
  ('90000000-0000-4000-8000-000000000013', '80000000-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe', 'Meridian bookcase in oak', 0),
  ('90000000-0000-4000-8000-000000000014', '80000000-0000-4000-8000-000000000013', 'https://images.unsplash.com/photo-1540574163026-643ea20ade25', 'Arc ottoman in cream bouclé', 0),
  ('90000000-0000-4000-8000-000000000015', '80000000-0000-4000-8000-000000000014', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace', 'Halden lounge chair in wool felt', 0);

-- ---------------------------------------------------------------------------
-- VARIANTS (standard products)
-- ---------------------------------------------------------------------------
insert into public.product_variants (id, product_id, sku, name, price_cents, compare_at_price_cents, attributes, inventory_quantity) values
  ('a0000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000004', 'SN-STO-001-N', 'Halden Sideboard — Natural', 289000, null, '{"color":"Natural"}'::jsonb, 4),
  ('a0000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000004', 'SN-STO-001-B', 'Halden Sideboard — Black', 299000, null, '{"color":"Black"}'::jsonb, 5),
  ('a0000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000010', 'NL-LGT-003-S', 'Noma Pendant — Smoke', 42000, null, '{"color":"Smoke"}'::jsonb, 18),
  ('a0000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000010', 'NL-LGT-003-A', 'Noma Pendant — Amber', 45000, null, '{"color":"Amber"}'::jsonb, 12),
  ('a0000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000010', 'NL-LGT-003-C', 'Noma Pendant — Clear', 39000, null, '{"color":"Clear"}'::jsonb, 10);

-- ---------------------------------------------------------------------------
-- CUSTOMIZATION OPTIONS (configurable products)
-- ---------------------------------------------------------------------------
insert into public.customization_options (id, product_id, group_key, label, options, required, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'size', 'Size', '[{"value":"2-seat","label":"Two-seat","priceAddCents":0},{"value":"3-seat","label":"Three-seat","priceAddCents":60000},{"value":"4-seat","label":"Four-seat","priceAddCents":120000}]'::jsonb, true, 10),
  ('b0000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'fabric', 'Fabric', '[{"value":"ivory-linen","label":"Ivory Linen","priceAddCents":0},{"value":"sage-linen","label":"Sage Linen","priceAddCents":9000},{"value":"sand-wool","label":"Sand Bouclé","priceAddCents":18000},{"value":"charcoal-velvet","label":"Charcoal Velvet","priceAddCents":24000}]'::jsonb, true, 20),
  ('b0000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000001', 'wood', 'Wood finish', '[{"value":"natural-oak","label":"Natural Oak","priceAddCents":0},{"value":"smoked-oak","label":"Smoked Oak","priceAddCents":6000},{"value":"ebony","label":"Ebony","priceAddCents":12000}]'::jsonb, false, 30),
  ('b0000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000001', 'legs', 'Leg style', '[{"value":"standard","label":"Standard","priceAddCents":0},{"value":"tapered","label":"Tapered brass","priceAddCents":15000},{"value":"sled","label":"Sled steel","priceAddCents":10000}]'::jsonb, false, 40),
  ('b0000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000002', 'upholstery', 'Upholstery', '[{"value":"cream-boucle","label":"Cream Bouclé","priceAddCents":0},{"value":"oxblood-leather","label":"Oxblood Leather","priceAddCents":28000},{"value":"black-leather","label":"Black Leather","priceAddCents":28000},{"value":"sage-boucle","label":"Sage Bouclé","priceAddCents":5000}]'::jsonb, true, 10),
  ('b0000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000002', 'base', 'Base finish', '[{"value":"brushed-steel","label":"Brushed Steel","priceAddCents":0},{"value":"black-steel","label":"Black Steel","priceAddCents":0},{"value":"brass","label":"Polished Brass","priceAddCents":12000}]'::jsonb, false, 20),
  ('b0000000-0000-4000-8000-000000000007', '80000000-0000-4000-8000-000000000003', 'wood', 'Wood', '[{"value":"walnut","label":"American Walnut","priceAddCents":0},{"value":"oak","label":"Natural Oak","priceAddCents":-12000},{"value":"charred-oak","label":"Charred Oak","priceAddCents":15000}]'::jsonb, true, 10),
  ('b0000000-0000-4000-8000-000000000008', '80000000-0000-4000-8000-000000000003', 'size', 'Seats', '[{"value":"6","label":"Six seats","priceAddCents":0},{"value":"8","label":"Eight seats","priceAddCents":20000}]'::jsonb, true, 20);

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------
insert into public.coupons (id, code, description, discount_type, discount_value, min_order_cents, max_discount_cents, usage_limit, active, starts_at, ends_at) values
  ('c0000000-0000-4000-8000-000000000001', 'WELCOME10', '10% off your first order', 'percent', 10, 20000, 50000, 500, true, now() - interval '30 days', now() + interval '180 days'),
  ('c0000000-0000-4000-8000-000000000002', 'MAISON200', '$200 off orders over $2,000', 'fixed', 20000, 200000, 20000, 200, true, now() - interval '10 days', now() + interval '90 days'),
  ('c0000000-0000-4000-8000-000000000003', 'STUDIO15', '15% off Studio North', 'percent', 15, 10000, 30000, 300, true, now(), now() + interval '60 days');

-- ---------------------------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------------------------
insert into public.reviews (id, product_id, user_id, rating, title, body, status, verified_purchase) values
  ('d0000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 5, 'The centerpiece of our living room', 'The fabric is incredible and the proportions are perfect. Delivery was well communicated.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 4, 'Beautiful, just breaks in slowly', 'Gorgeous shape. Cushions are firm at first but soften beautifully.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 5, 'Like sitting inside a sculpture', 'The Arc chair is even better in person. The leather option is worth it.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000006', 5, 'Solid, heavy, beautiful', 'Travertine top is stunning; construction feels permanent.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000005', 4, 'Great work-from-home desk', 'Clean lines, cable tray is genuinely useful.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000006', 5, 'Flawless finish', 'The reeded doors are flawless. Worth every cent.', 'approved', true),
  ('d0000000-0000-4000-8000-000000000007', '80000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 3, 'Shipping took longer than expected', 'Product is great, but fulfillment was slow.', 'pending', true);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS (demo)
-- ---------------------------------------------------------------------------
insert into public.notifications (id, user_id, type, title, body, link) values
  ('e0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'system', 'Welcome to ATELIER 3D', 'Explore the collection, or configure your first piece in 3D.', '/shop'),
  ('e0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'seller_approval', 'Store approved', 'Your store Atelier Maison is now live.', '/seller');
