const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const id = new URLSearchParams(location.search).get("id");
const KNOWN_COLORS = {
  red: "#d64545", black: "#1a1a1a", white: "#ffffff", blue: "#2f6fd6", "navy blue": "#1b2a56",
  pink: "#e88bab", green: "#3a7a4f", yellow: "#e0c020", purple: "#7a4fb0", orange: "#e0812f",
  grey: "#8a8a8a", gray: "#8a8a8a", maroon: "#6e1f2a", beige: "#d8c3a5", brown: "#6b4226",
  gold: "#c9a227", silver: "#b7b7b7", teal: "#2f7a72", olive: "#6b6b28", cream: "#f2e6cf",
};

function openSideMenu() { $("#sideMenu").classList.add("open"); $("#sideMenuOverlay").classList.add("open"); }
function closeSideMenu() { $("#sideMenu").classList.remove("open"); $("#sideMenuOverlay").classList.remove("open"); }
$("#menuBtn").onclick = openSideMenu;
$("#closeSideMenu").onclick = closeSideMenu;
$("#sideMenuOverlay").onclick = closeSideMenu;

async function refreshAccountLink() {
  const profile = await authGetProfile();
  const link = $("#accountLink");
  if (profile) { link.textContent = `Hi, ${profile.full_name?.split(" ")[0] || "there"}`; link.href = "profile.html"; }
}

async function buildSideMenu() {
  const cats = await dbGetCategories();
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
buildSideMenu();
refreshAccountLink();

(async function init() {
  if (!NEXORA_READY) { nexoraShowSetupNotice(); }
  const p = await dbGetProduct(id);
  const d = $("#detail");
  if (!p) {
    d.innerHTML = `<p class="muted">Product not found. <a href="index.html">Back to shop</a></p>`;
    return;
  }

  const fallback = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80";
  const gallery = p.image_urls && p.image_urls.length ? p.image_urls : (p.image_url ? [p.image_url] : [fallback]);

  d.innerHTML = `
    <div class="detail-image">
      <img id="mainImg" src="${gallery[0]}" alt="${p.name}">
      ${gallery.length > 1 ? `<div class="thumb-row">${gallery.map((g, i) => `<img class="thumb${i === 0 ? " active" : ""}" src="${g}" data-i="${i}">`).join("")}</div>` : ""}
    </div>
    <div class="detail-copy">
      <p class="eyebrow">${p.categories ? `${p.categories.icon} ${p.categories.name}` : ""}</p>
      <h1>${p.name}</h1>
      <div class="price">${money(p.price)} ${p.old_price ? `<span class="old">${money(p.old_price)}</span>` : ""}</div>
      <p class="desc">${p.description || ""}</p>
      ${p.unit ? `<p class="eyebrow">${p.unit}</p>` : ""}
      ${p.stock > 0 && p.stock <= 5 ? `<p class="stock-note low">Only ${p.stock} left</p>` : p.stock === 0 ? `<p class="stock-note out">Out of stock</p>` : ""}
      ${p.colors && p.colors.length ? `<div class="color-row"><p class="eyebrow">COLOUR</p><div class="color-chips">${p.colors.map((c, i) => `<button type="button" class="chip${i === 0 ? " active" : ""}" data-color="${c}">${KNOWN_COLORS[c.toLowerCase()] ? `<span class="swatch" style="background:${KNOWN_COLORS[c.toLowerCase()]}"></span>` : ""}${c}</button>`).join("")}</div></div>` : ""}
      ${p.sizes && p.sizes.length ? `<div class="color-row"><p class="eyebrow">SIZE <button type="button" id="openSizeGuide" class="size-guide-link">Size guide</button></p><div class="color-chips">${p.sizes.map((s, i) => `<button type="button" class="chip size-chip${i === 0 ? " active" : ""}" data-size="${s}">${s}</button>`).join("")}</div></div>` : ""}
      <div class="qty-row"><span class="eyebrow">QTY</span><div class="stepper"><button type="button" id="qtyMinus">−</button><input id="qtyInput" type="number" min="1" max="${p.stock > 0 ? p.stock : 99}" value="1"><button type="button" id="qtyPlus">+</button></div></div>
      <button class="btn dark wa" id="addCartBtn" ${p.stock === 0 ? "disabled" : ""}>${p.stock === 0 ? "Out of stock" : "Add to Cart"} <span>🛒</span></button>
    </div>`;

  let selectedColor = p.colors && p.colors.length ? p.colors[0] : null;
  let selectedSize = p.sizes && p.sizes.length ? p.sizes[0] : null;
  document.querySelectorAll(".thumb").forEach((t) => {
    t.onclick = () => {
      $("#mainImg").src = gallery[t.dataset.i];
      document.querySelectorAll(".thumb").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
    };
  });
  document.querySelectorAll(".chip").forEach((c) => {
    c.onclick = () => {
      const group = c.closest(".color-chips");
      group.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      if (c.dataset.color !== undefined) selectedColor = c.dataset.color;
      if (c.dataset.size !== undefined) { selectedSize = c.dataset.size; highlightSizeRow(selectedSize); }
    };
  });
  $("#openSizeGuide")?.addEventListener("click", () => {
    $("#sizeGuideModal").classList.add("open");
    highlightSizeRow(selectedSize);
  });
  $("#closeSizeGuide")?.addEventListener("click", () => $("#sizeGuideModal").classList.remove("open"));

  const maxQty = p.stock > 0 ? p.stock : 99;
  $("#qtyMinus").onclick = () => { $("#qtyInput").value = Math.max(1, Number($("#qtyInput").value) - 1); };
  $("#qtyPlus").onclick = () => { $("#qtyInput").value = Math.min(maxQty, Number($("#qtyInput").value) + 1); };

  $("#addCartBtn").onclick = () => {
    if (p.stock === 0) return;
    const qty = Math.min(maxQty, Math.max(1, Number($("#qtyInput").value) || 1));
    cartAdd({ id: p.id, name: p.name, price: p.price, image_url: gallery[0], unit: p.unit, color: selectedColor, size: selectedSize, stock: p.stock, qty });
    const btn = $("#addCartBtn");
    btn.innerHTML = "Added ✓ — View cart <span>→</span>";
    btn.onclick = () => (location.href = "cart.html");
  };
})();

function highlightSizeRow(size) {
  document.querySelectorAll(".size-guide-table tbody tr").forEach((tr) => {
    tr.classList.toggle("matched", size && tr.firstElementChild.textContent.trim().toUpperCase() === String(size).toUpperCase());
  });
}
