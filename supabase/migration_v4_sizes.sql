-- ============================================================
-- NEXORA — migration v4: product sizes (S, M, L, XL, etc.)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run even if you already ran schema.sql earlier —
-- it only adds the column if it doesn't already exist.
-- ============================================================

alter table public.products
  add column if not exists sizes text[] not null default '{}';

-- sizes holds every size a product is available in (e.g. {S,M,L,XL}).
-- Shown as selectable chips on the product page, same pattern as colours.
-- The existing "unit" field is unaffected — keep using it for grocery/baby
-- items (e.g. "1 kg", "0-6 months") where a size chip list doesn't fit.
