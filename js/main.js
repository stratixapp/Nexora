const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

function productCard(p) {
  const img = p.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80";
  return `<a class="product-card" href="product.html?id=${p.id}">
    <div class="product-img"><img src="${img}" alt="${p.name}" loading="lazy">${p.categories ? `<span class="tag">${p.categories.icon || ""} ${p.categories.name}</span>` : ""}</div>
    <div class="p-info"><p class="p-name">${p.name}</p><p class="price">${money(p.price)}${p.old_price ? `<span class="old">${money(p.old_price)}</span>` : ""}</p></div>
  </a>`;
}

let allCategories = [];
let allProducts = [];

async function loadCategories() {
  allCategories = await dbGetCategories();
  const grid = $("#categoryGrid");
  const nav = $("#catNav");
  const filters = $("#filters");

  if (!allCategories.length) {
    grid.innerHTML = NEXORA_READY
      ? `<p class="muted">No categories yet — add some from the admin dashboard.</p>`
      : "";
    if (!NEXORA_READY) nexoraShowSetupNotice();
    return;
  }

  grid.innerHTML = allCategories
    .map((c) => `<a class="category-card" href="category.html?slug=${c.slug}"><span class="cat-icon">${c.icon}</span><span>${c.name}</span></a>`)
    .join("");

  nav.innerHTML =
    `<a href="index.html#shop">Shop</a>` +
    allCategories.map((c) => `<a href="category.html?slug=${c.slug}">${c.name}</a>`).join("");

  filters.innerHTML =
    `<button class="filter active" data-slug="">All</button>` +
    allCategories.map((c) => `<button class="filter" data-slug="${c.slug}">${c.icon} ${c.name}</button>`).join("");

  filters.querySelectorAll(".filter").forEach((btn) => {
    btn.onclick = () => {
      filters.querySelectorAll(".filter").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      renderProducts(btn.dataset.slug);
    };
  });
}

function renderProducts(slug) {
  const list = slug ? allProducts.filter((p) => p.categories?.slug === slug) : allProducts;
  $("#products").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<p class="muted">No products in this category yet.</p>`;
}

async function loadProducts() {
  allProducts = await dbGetProducts();
  renderProducts("");
}

async function refreshAccountLink() {
  const profile = await authGetProfile();
  const link = $("#accountLink");
  if (profile) {
    link.textContent = `Hi, ${profile.full_name?.split(" ")[0] || "there"}`;
    link.href = "profile.html";
  }
}

function openSideMenu() { $("#sideMenu").classList.add("open"); $("#sideMenuOverlay").classList.add("open"); }
function closeSideMenu() { $("#sideMenu").classList.remove("open"); $("#sideMenuOverlay").classList.remove("open"); }
$("#menuBtn").onclick = openSideMenu;
$("#closeSideMenu").onclick = closeSideMenu;
$("#sideMenuOverlay").onclick = closeSideMenu;

async function buildSideMenu() {
  $("#sideMenuCats").innerHTML = allCategories.length
    ? allCategories.map((c) => `<a class="side-link" href="category.html?slug=${c.slug}">${c.icon} ${c.name}</a>`).join("")
    : `<p class="muted">No categories yet</p>`;
  const profile = await authGetProfile();
  $("#sideMenuProfile").innerHTML = profile
    ? `<div class="profile-box"><strong>${profile.full_name || "NEXORA member"}</strong><span>${profile.email || ""}</span></div>
       <a class="side-link" href="settings.html">⚙️ Settings</a>
       <a class="side-link" href="cart.html">🛒 My cart (${cartCount()})</a>`
    : `<a class="side-link" href="account.html">👤 Sign in / Create account</a>
       <a class="side-link" href="cart.html">🛒 My cart (${cartCount()})</a>`;
}

async function loadHeroBanner() {
  let urls = [];
  try { urls = JSON.parse((await dbGetSetting("banner_urls")) || "[]"); } catch { urls = []; }
  if (!urls.length) {
    const legacy = await dbGetSetting("banner_url"); // backward compatibility
    if (legacy) urls = [legacy];
  }
  if (!urls.length) return;

  const el = $("#heroImage");
  el.classList.add("has-banner");

  // Two stacked layers that crossfade — avoids the timing glitches a
  // single-layer opacity flicker can run into, and guarantees rotation
  // as long as there's more than one banner image.
  const layerA = document.createElement("div");
  const layerB = document.createElement("div");
  layerA.className = "hero-layer active";
  layerB.className = "hero-layer";
  layerA.style.backgroundImage = `url(${urls[0]})`;
  el.prepend(layerB);
  el.prepend(layerA);

  if (urls.length < 2) return; // only one banner image — nothing to rotate between

  urls.forEach((u) => { const img = new Image(); img.src = u; }); // preload so swaps never flash blank

  let i = 0;
  let showingA = true;
  setInterval(() => {
    i = (i + 1) % urls.length;
    const next = showingA ? layerB : layerA;
    const current = showingA ? layerA : layerB;
    next.style.backgroundImage = `url(${urls[i]})`;
    next.classList.add("active");
    current.classList.remove("active");
    showingA = !showingA;
  }, 4500);
}

async function loadPromoBanner() {
  let urls = [];
  try { urls = JSON.parse((await dbGetSetting("promo_banner_urls")) || "[]"); } catch { urls = []; }
  const el = $("#promoBanner");
  if (!el || !urls.length) return; // hidden by default via CSS when empty

  el.classList.add("has-promo");
  const layerA = document.createElement("div");
  const layerB = document.createElement("div");
  layerA.className = "promo-layer active";
  layerB.className = "promo-layer";
  layerA.style.backgroundImage = `url(${urls[0]})`;
  el.append(layerA, layerB);

  if (urls.length < 2) return;
  urls.forEach((u) => { const img = new Image(); img.src = u; });

  let i = 0;
  let showingA = true;
  setInterval(() => {
    i = (i + 1) % urls.length;
    const next = showingA ? layerB : layerA;
    const current = showingA ? layerA : layerB;
    next.style.backgroundImage = `url(${urls[i]})`;
    next.classList.add("active");
    current.classList.remove("active");
    showingA = !showingA;
  }, 5000);
}

/* search */
$("#searchBtn").onclick = () => { $("#searchModal").classList.add("open"); $("#searchInput").focus(); };
$("#closeSearch").onclick = () => $("#searchModal").classList.remove("open");
$("#searchInput").oninput = (e) => {
  const q = e.target.value.trim().toLowerCase();
  const results = q ? allProducts.filter((p) => p.name.toLowerCase().includes(q)) : [];
  $("#searchResults").innerHTML = results
    .map((p) => `<a class="search-item" href="product.html?id=${p.id}">${p.name} — ${money(p.price)}</a>`)
    .join("");
};

(async function init() {
  await loadCategories();
  await loadProducts();
  refreshAccountLink();
  loadHeroBanner();
  loadPromoBanner();
  buildSideMenu();
  document.getElementById("nexoraLoader")?.classList.add("hide");
})();
// safety: never let the loader stay up more than 1.5s even if something stalls
setTimeout(() => document.getElementById("nexoraLoader")?.classList.add("hide"), 1500);
