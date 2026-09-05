-- ============================================================
-- NEXORA — migration v5: category cover images + Indian
-- standard size chart (admin-editable)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run even on an existing project — it only adds
-- things that don't already exist.
-- ============================================================

-- Categories can now carry an optional cover photo. When set, it shows
-- behind the gradient tile on the homepage "Shop by category" grid.
-- Leave it empty and the category keeps its automatic gradient look.
alter table public.categories
  add column if not exists image_url text;

-- Indian-standard size chart shown in the "Size guide" popup on the
-- product page (and from the cart, next to any item with a size).
-- Stored as JSON so the admin dashboard can edit it without touching code:
-- Admin → Size Chart panel → edit rows → Save.
insert into public.site_settings (key, value) values
  ('size_chart', '[{"size":"XS","in_size":"32","bust":"32","waist":"26","hip":"35"},{"size":"S","in_size":"34","bust":"34","waist":"28","hip":"37"},{"size":"M","in_size":"36","bust":"36","waist":"30","hip":"39"},{"size":"L","in_size":"38","bust":"38","waist":"32","hip":"41"},{"size":"XL","in_size":"40","bust":"40","waist":"34","hip":"43"},{"size":"XXL","in_size":"42","bust":"42","waist":"36","hip":"45"}]')
on conflict (key) do nothing;
