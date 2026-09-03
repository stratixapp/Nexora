const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const slug = new URLSearchParams(location.search).get("slug");

function productCard(p) {
  const img = p.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80";
  return `<a class="product-card" href="product.html?id=${p.id}">
    <div class="product-img"><img src="${img}" alt="${p.name}" loading="lazy"></div>
    <div class="p-info"><p class="p-name">${p.name}</p><p class="price">${money(p.price)}${p.old_price ? `<span class="old">${money(p.old_price)}</span>` : ""}</p></div>
  </a>`;
}

let allProducts = [];

$("#searchBtn").onclick = () => { $("#searchModal").classList.add("open"); $("#searchInput").focus(); };
$("#closeSearch").onclick = () => $("#searchModal").classList.remove("open");
$("#searchInput").oninput = (e) => {
  const q = e.target.value.trim().toLowerCase();
  const results = q ? allProducts.filter((p) => p.name.toLowerCase().includes(q)) : [];
  $("#searchResults").innerHTML = results
    .map((p) => `<a class="search-item" href="product.html?id=${p.id}">${p.name} — ${money(p.price)}</a>`)
    .join("");
};

async function refreshAccountLink() {
  const profile = await authGetProfile();
  const link = $("#accountLink");
  if (profile) { link.textContent = `Hi, ${profile.full_name?.split(" ")[0] || "there"}`; link.href = "profile.html"; }
}

async function buildNav() {
  const cats = await dbGetCategories();
  $("#catNav").innerHTML = `<a href="index.html#shop">Shop</a>` + cats.map((c) => `<a href="category.html?slug=${c.slug}">${c.name}</a>`).join("");
  return cats;
}

function openSideMenu() { $("#sideMenu").classList.add("open"); $("#sideMenuOverlay").classList.add("open"); }
function closeSideMenu() { $("#sideMenu").classList.remove("open"); $("#sideMenuOverlay").classList.remove("open"); }
$("#menuBtn").onclick = openSideMenu;
$("#closeSideMenu").onclick = closeSideMenu;
$("#sideMenuOverlay").onclick = closeSideMenu;

async function buildSideMenu(cats) {
  $("#sideMenuCats").innerHTML = cats.length
    ? cats.map((c) => `<a class="side-link" href="category.html?slug=${c.slug}">${c.icon} ${c.name}</a>`).join("")
    : `<p class="muted">No categories yet</p>`;
  const profile = await authGetProfile();
  $("#sideMenuProfile").innerHTML = profile
    ? `<div class="profile-box"><strong>${profile.full_name || "NEXORA member"}</strong><span>${profile.email || ""}</span></div>
       <a class="side-link" href="settings.html">⚙️ Settings</a>
       <a class="side-link" href="cart.html">🛒 My cart (${cartCount()})</a>`
    : `<a class="side-link" href="account.html">👤 Sign in / Create account</a>
       <a class="side-link" href="cart.html">🛒 My cart (${cartCount()})</a>`;
}

(async function init() {
  const cats = await buildNav();
  const cat = cats.find((c) => c.slug === slug);
  $("#catEyebrow").textContent = "CATEGORY";
  $("#catTitle").textContent = cat ? `${cat.icon} ${cat.name}` : "All products";

  allProducts = await dbGetProducts({ categorySlug: slug || undefined });
  $("#products").innerHTML = allProducts.length
    ? allProducts.map(productCard).join("")
    : `<p class="muted">No products in this category yet — check back soon.</p>`;

  refreshAccountLink();
  buildSideMenu(cats);
})();
