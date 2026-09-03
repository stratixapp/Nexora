/* ==========================================================
   NEXORA — Supabase client + shared data helpers
   Loaded by every page after config.js and the Supabase CDN
   script. Every other JS file calls the functions below
   instead of talking to Supabase directly.
   ========================================================== */

const NEXORA_READY =
  window.NEXORA_CONFIG &&
  window.NEXORA_CONFIG.SUPABASE_URL &&
  !window.NEXORA_CONFIG.SUPABASE_URL.includes("PASTE_") &&
  window.NEXORA_CONFIG.SUPABASE_ANON_KEY &&
  !window.NEXORA_CONFIG.SUPABASE_ANON_KEY.includes("PASTE_");

let sb = null;
if (NEXORA_READY) {
  sb = window.supabase.createClient(
    window.NEXORA_CONFIG.SUPABASE_URL,
    window.NEXORA_CONFIG.SUPABASE_ANON_KEY
  );
}

// Shows a friendly banner on the page instead of a blank/broken screen
// when config.js hasn't been filled in yet.
function nexoraShowSetupNotice() {
  if (document.getElementById("nexoraSetupNotice")) return;
  const bar = document.createElement("div");
  bar.id = "nexoraSetupNotice";
  bar.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:999;background:#171316;color:#fff;padding:14px 18px;font:600 12px/1.5 'DM Sans',sans-serif;text-align:center";
  bar.innerHTML =
    "Supabase not connected yet — add your project URL and anon key in <code>js/config.js</code>. See SETUP.md.";
  document.body.appendChild(bar);
}

/* ---------------- CATEGORIES ---------------- */
async function dbGetCategories() {
  if (!sb) return [];
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function dbAddCategory({ name, slug, icon }) {
  const { data, error } = await sb
    .from("categories")
    .insert({ name, slug, icon: icon || "🛍️" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteCategory(id) {
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- PRODUCTS ---------------- */
async function dbGetProducts({ categorySlug, search, includeInactive } = {}) {
  if (!sb) return [];
  const embed = categorySlug ? "categories!inner(name, slug, icon)" : "categories(name, slug, icon)";
  let q = sb.from("products").select(`*, ${embed}`);
  if (!includeInactive) q = q.eq("is_active", true);
  if (categorySlug) q = q.eq("categories.slug", categorySlug);
  if (search) q = q.ilike("name", `%${search}%`);
  q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data;
}

async function dbGetProduct(id) {
  const { data, error } = await sb
    .from("products")
    .select("*, categories(name, slug, icon)")
    .eq("id", id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbAddProduct(product) {
  const { data, error } = await sb.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
}

async function dbUpdateProduct(id, changes) {
  const { data, error } = await sb.from("products").update(changes).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function dbDeleteProduct(id) {
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- IMAGE UPLOAD ---------------- */
// Uploads a File to the "product-images" storage bucket and returns its public URL.
async function dbUploadImage(file, folder = "products") {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

// Uploads several files (e.g. 4-5 product photos) one after another and
// returns their public URLs in the same order.
async function dbUploadImages(files, folder = "products") {
  const urls = [];
  for (const file of files) {
    urls.push(await dbUploadImage(file, folder));
  }
  return urls;
}

/* ---------------- SITE SETTINGS ---------------- */
async function dbGetSetting(key) {
  if (!sb) return null;
  const { data, error } = await sb.from("site_settings").select("value").eq("key", key).single();
  if (error) return null;
  return data?.value ?? null;
}

async function dbSetSetting(key, value) {
  const { error } = await sb.from("site_settings").upsert({ key, value });
  if (error) throw error;
}

/* ---------------- AUTH ---------------- */
async function authSignUp({ email, password, full_name, age, gender, phone, place, landmark, address }) {
  // the DB trigger (handle_new_user) reads every field below out of the auth
  // metadata and writes the full profiles row at signup time — this works
  // immediately, whether or not email confirmation is switched on.
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, age, gender, email, phone, place, landmark, address },
    },
  });
  if (error) throw error;
  return data;
}

async function authSignIn({ email, password }) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function authSignInWithGoogle(redirectTo) {
  if (!sb) throw new Error("Supabase not connected yet.");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo || window.location.href },
  });
  if (error) throw error;
}

async function authSignOut() {
  await sb.auth.signOut();
}

// Any page with a <a id="footerWa"> in its footer gets it auto-linked to
// the store's WhatsApp number — no per-page script needed.
document.addEventListener("DOMContentLoaded", async () => {
  const waLink = document.getElementById("footerWa");
  if (!waLink) return;
  try {
    if (typeof NEXORA_READY === "undefined" || !NEXORA_READY) return;
    const waNumber = (await dbGetSetting("whatsapp_number")) || "919999999999";
    waLink.href = `https://wa.me/${waNumber}`;
  } catch {}
});

async function authGetSession() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function authGetProfile() {
  const session = await authGetSession();
  if (!session) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) return null;
  return data;
}

async function authUpdateProfile(fields) {
  const session = await authGetSession();
  if (!session) throw new Error("You need to sign in first.");
  const { error } = await sb.from("profiles").update(fields).eq("id", session.user.id);
  if (error) throw error;
}

async function authUpdatePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
