-- ============================================================
-- NEXORA — migration v2: multiple product photos + colour options
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run even if you already ran schema.sql earlier —
-- it only adds columns if they don't already exist.
-- ============================================================

alter table public.products
  add column if not exists image_urls text[] not null default '{}';

alter table public.products
  add column if not exists colors text[] not null default '{}';

-- image_url (singular) is kept as the "cover" photo for product grids;
-- image_urls holds every photo (4-5 recommended) shown on the product page.
