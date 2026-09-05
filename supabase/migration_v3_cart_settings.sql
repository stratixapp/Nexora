-- ============================================================
-- NEXORA — migration v3: cart delivery-charge settings
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to run even if you've already run schema.sql or earlier
-- migrations — it only inserts these two keys if missing.
-- ============================================================

insert into public.site_settings (key, value) values
  ('delivery_charge', '49'),
  ('free_delivery_threshold', '999')
on conflict (key) do nothing;

-- delivery_charge: flat delivery fee in rupees, charged when the cart
-- subtotal is below free_delivery_threshold.
-- free_delivery_threshold: cart subtotal (in rupees) at or above which
-- delivery becomes free.
-- Edit both anytime from Admin Dashboard → Settings.
