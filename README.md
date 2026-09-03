# NEXORA — Multi-category commerce platform

A mobile-first storefront built with plain HTML, CSS and JavaScript, backed by Supabase (Postgres + Auth + Storage). Sell anything from one admin dashboard — fashion, grocery, nursery products, or any category you add.

## Features
- **Multi-category catalog** — admin creates categories on the fly (Fashion, Grocery, Nursery & Baby, …), each with its own icon; products attach to any category.
- **Admin dashboard, password-protected** — real Supabase Auth login, gated to accounts marked `role = admin`. No admin panel access without it.
- **Admin adds everything** — product name, price, old price, category, unit/size/variant, description, stock, and a real uploaded photo — no code edits, ever.
- **Image upload** — product photos and the homepage banner upload straight to Supabase Storage and go live instantly.
- **Customer accounts** — sign up / sign in with name, age, gender, place, landmark and address, same Supabase Auth backend.
- **Login gate before ordering** — customers must be signed in before the WhatsApp order button works.
- **WhatsApp ordering** — no payment gateway needed; orders are confirmed over WhatsApp with product, price and unit pre-filled.
- **Fully responsive** — tested down to small phone widths; the admin sidebar collapses to icons on mobile.
- **Row Level Security** — every write is enforced by the database, not just hidden buttons on the frontend.

## Get it live
See **SETUP.md** — create a Supabase project, run one SQL file, paste two keys into `js/config.js`, and you're live. About 10 minutes.

## Project structure
```
index.html         Homepage — categories + latest arrivals
category.html       Products filtered by one category
product.html        Product detail + WhatsApp order
account.html         Customer sign in / sign up
admin-login.html      Admin-only sign in
admin.html            Admin dashboard (products, categories, banner)
supabase/schema.sql    Full database schema — run once in Supabase
js/config.js          Paste your Supabase URL + anon key here
js/supabaseClient.js  All database/storage/auth calls live here
```

## WhatsApp number
Set it once, from the admin side — no code edits needed. In Supabase: **Table Editor → site_settings → whatsapp_number**. Country code, no `+`, no spaces (e.g. `919876543210`).

## Local preview
Open `index.html` directly, or use VS Code Live Server. Nothing will load from the database until `js/config.js` has your real Supabase URL and anon key — you'll see a small notice at the bottom of the page until then.
