# NEXORA — Setup guide (Supabase backend)

Follow this once. It takes about 10 minutes.

## 1. Create your Supabase project
1. Go to [supabase.com](https://supabase.com) → New project.
2. Pick a name, a database password (save it somewhere safe), and a region close to your customers.
3. Wait for the project to finish setting up.

## 2. Run the database schema
1. In your project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy all of it, paste it in, and click **Run**.
3. This creates every table (`profiles`, `categories`, `products`, `site_settings`), turns on Row Level Security, seeds 3 starter categories, and creates the `product-images` storage bucket with its access rules — in one go.

## 3. Connect the site to your project
1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public key**.
3. Open `js/config.js` in this project and paste them in:
   ```js
   window.NEXORA_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
   };
   ```
4. Save. That's the only file you need to edit to go live.

## 4. Email confirmation (optional)
By default Supabase makes new users confirm their email before they can sign in. Profile details (name, age, place, etc.) now save correctly either way, since the database fills them in at signup time. This step only affects how fast someone can log in after creating an account:
- **Leave it on** if you want every customer's email verified before their first order.
- **Turn it off** (Authentication → Providers → Email → toggle off **Confirm email**) if you'd rather they can sign in immediately after creating an account.

## 5. Create your admin account
The admin dashboard is locked — only an account marked `role = admin` can get in.

1. Open the live site → **Sign in** → **Create account**, and sign up with the email/password you want to use as the store owner. (Or in Supabase: **Authentication → Users → Add user**.)
2. In Supabase: **Table Editor → profiles**, find the row with your email, and change its `role` column from `customer` to `admin`.
3. Go to `admin-login.html` on your site and sign in with that email and password. You're in.

You can repeat this for any staff member who should have admin access.

## 6. Set your WhatsApp number
1. In Supabase: **Table Editor → site_settings**.
2. Find the row with key `whatsapp_number` and set its value to your number **with country code, no `+` and no spaces** — e.g. `919876543210`.

## 7. Add your categories and products
1. Go to `admin.html` → **Categories** → add Fashion, Grocery, Nursery & Baby, or anything else you sell.
2. Go to **Products** → **+ Add product** → fill in the name, price, category, an optional unit/size (`1 kg`, `S / M / L`, `0–6 months`), a description, and upload a real photo. It uploads straight to Supabase Storage and appears on the storefront immediately.

## 8. Put it online
Any static host works since this is plain HTML/CSS/JS:
- **GitHub Pages**: push this folder to a repo → Settings → Pages → deploy from branch.
- **Netlify / Vercel**: drag-and-drop the folder, or connect the repo.

No build step is required — deploy the files as they are.

## Already live? Run the newest migration
If you set up NEXORA before this version, run these once in the SQL Editor
(in order, if you're behind on more than one):
- **`supabase/migration_v5_category_image_sizechart.sql`** — category cover
  photos + the Indian-standard size chart (Admin → Size Chart).
- **`supabase/migration_v6_reviews.sql`** — customer reviews & star ratings on
  every product, moderated from Admin → Reviews.

Brand-new projects get all of this automatically from `schema.sql` — no extra
step needed.

## Notes
- Product photos and the hero banner live in Supabase Storage (`product-images` bucket), not in the code, so uploads survive redeploys.
- Every write (add/edit/delete product or category, change banner) is protected by Row Level Security — only signed-in admins can do it, enforced by the database itself, not just by hiding buttons.
- To add a second admin later, just repeat step 5 for their account.
