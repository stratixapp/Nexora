-- ============================================================
-- NEXORA — migration v6: product reviews & ratings
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run even on an existing project.
-- ============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null default 'NEXORA customer',
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "reviews: public read" on public.reviews;
drop policy if exists "reviews: authenticated insert own" on public.reviews;
drop policy if exists "reviews: owner or admin delete" on public.reviews;

-- Anyone (including signed-out visitors) can read reviews.
create policy "reviews: public read"
  on public.reviews
  for select
  using (true);

-- Only a signed-in customer can post — and only under their own name/id,
-- so no one can post a review pretending to be someone else.
create policy "reviews: authenticated insert own"
  on public.reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A customer can delete their own review; the admin can delete any.
create policy "reviews: owner or admin delete"
  on public.reviews
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create index if not exists reviews_product_id_idx on public.reviews(product_id);
