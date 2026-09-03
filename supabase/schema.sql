-- ============================================================
-- NEXORA — Supabase production-ready starter schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age int,
  gender text,
  email text,
  phone text,
  place text,
  landmark text,
  address text,
  role text not null default 'customer'
    check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 0. Helper: safely check whether the current user is an admin.
-- SECURITY DEFINER avoids recursive RLS checks on public.profiles.
-- (Must come after the profiles table exists, since this function
-- queries it directly.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Make this script safely re-runnable.
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: admin read all" on public.profiles;

create policy "profiles: read own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "profiles: update own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "profiles: insert own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 2. CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text default '🛍️',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories: public read" on public.categories;
drop policy if exists "categories: admin write" on public.categories;

create policy "categories: public read"
  on public.categories
  for select
  using (true);

create policy "categories: admin write"
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default '',
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2),
  unit text default '',
  stock int default 0 check (stock >= 0),
  image_url text,
  image_urls text[] not null default '{}',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- safe to re-run: adds these columns even if the table already existed
-- from an earlier version of this schema
alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists colors text[] not null default '{}';
alter table public.products add column if not exists sizes text[] not null default '{}';

drop policy if exists "products: public read active" on public.products;
drop policy if exists "products: admin read all" on public.products;
drop policy if exists "products: admin write" on public.products;

create policy "products: public read active"
  on public.products
  for select
  using (is_active = true);

create policy "products: admin read all"
  on public.products
  for select
  to authenticated
  using (public.is_admin());

create policy "products: admin write"
  on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. SITE SETTINGS
create table if not exists public.site_settings (
  key text primary key,
  value text
);

alter table public.site_settings enable row level security;

drop policy if exists "settings: public read" on public.site_settings;
drop policy if exists "settings: admin write" on public.site_settings;

create policy "settings: public read"
  on public.site_settings
  for select
  using (true);

create policy "settings: admin write"
  on public.site_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. STARTER DATA
insert into public.categories (name, slug, icon, sort_order) values
  ('Fashion', 'fashion', '👗', 1),
  ('Grocery', 'grocery', '🛒', 2),
  ('Nursery & Baby', 'nursery', '🧸', 3)
on conflict (slug) do nothing;

insert into public.site_settings (key, value) values
  ('store_name', 'NEXORA'),
  ('whatsapp_number', '911234567890'),
  ('banner_url', ''),
  ('delivery_charge', '49'),
  ('free_delivery_threshold', '999')
on conflict (key) do nothing;

-- 6. STORAGE
-- Creates a PUBLIC bucket for product/banner images.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product-images: public read" on storage.objects;
drop policy if exists "product-images: admin upload" on storage.objects;
drop policy if exists "product-images: admin update" on storage.objects;
drop policy if exists "product-images: admin delete" on storage.objects;

create policy "product-images: public read"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product-images: admin upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

create policy "product-images: admin update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
  );

create policy "product-images: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
  );

-- 7. AUTO-CREATE PROFILE AFTER SIGNUP
-- Full profile details can be supplied in auth metadata by the frontend.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    age,
    gender,
    email,
    phone,
    place,
    landmark,
    address,
    role
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    case
      when coalesce(new.raw_user_meta_data->>'age', '') ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'age')::int
      else null
    end,
    new.raw_user_meta_data->>'gender',
    coalesce(new.raw_user_meta_data->>'email', new.email),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'place',
    new.raw_user_meta_data->>'landmark',
    new.raw_user_meta_data->>'address',
    'customer'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    age = excluded.age,
    gender = excluded.gender,
    email = excluded.email,
    phone = excluded.phone,
    place = excluded.place,
    landmark = excluded.landmark,
    address = excluded.address;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- DONE
--
-- After running:
-- 1. Create your customer account through NEXORA.
-- 2. Open Table Editor → profiles.
-- 3. Change that account's role from 'customer' to 'admin'
--    for your own admin account only.
--
-- IMPORTANT:
-- Never put a Supabase secret/service_role key in frontend JS.
-- ============================================================
