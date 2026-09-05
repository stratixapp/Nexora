const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const id = new URLSearchParams(location.search).get("id");
const KNOWN_COLORS = {
  "royal pink": "#A6335E", "royal emerald": "#0E6B4F", "champagne gold": "#B8860B", "ivory white": "#FFFEF9",
  red: "#d64545", black: "#1a1a1a", white: "#ffffff", blue: "#2f6fd6", "navy blue": "#1b2a56",
  pink: "#e88bab", green: "#3a7a4f", yellow: "#e0c020", purple: "#7a4fb0", orange: "#e0812f",
  grey: "#8a8a8a", gray: "#8a8a8a", maroon: "#6e1f2a", beige: "#d8c3a5", brown: "#6b4226",
  gold: "#c9a227", silver: "#b7b7b7", teal: "#2f7a72", olive: "#6b6b28", cream: "#f2e6cf",
};

const DEFAULT_SIZE_CHART = [
  { size: "XS", in_size: "32", bust: "32", waist: "26", hip: "35" },
  { size: "S", in_size: "34", bust: "34", waist: "28", hip: "37" },
  { size: "M", in_size: "36", bust: "36", waist: "30", hip: "39" },
  { size: "L", in_size: "38", bust: "38", waist: "32", hip: "41" },
  { size: "XL", in_size: "40", bust: "40", waist: "34", hip: "43" },
  { size: "XXL", in_size: "42", bust: "42", waist: "36", hip: "45" },
];

function sizeGuideTableHtml(rows) {
  return `<table class="size-guide-table">
      <thead><tr><th>Size</th><th>IN Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.size}</td><td>${r.in_size || "—"}</td><td>${r.bust || "—"}</td><td>${r.waist || "—"}</td><td>${r.hip || "—"}</td></tr>`).join("")}</tbody>
    </table>`;
}

async function loadSizeGuide() {
  let rows = DEFAULT_SIZE_CHART;
  try {
    const raw = await dbGetSetting("size_chart");
    if (raw) { const parsed = JSON.parse(raw); if (parsed.length) rows = parsed; }
  } catch {}
  const box = document.getElementById("sizeGuideContent");
  if (box) box.innerHTML = sizeGuideTableHtml(rows);
}

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
      <div class="rating-summary" id="ratingSummary"></div>
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
  $("#openSizeGuide")?.addEventListener("click", async () => {
    $("#sizeGuideModal").classList.add("open");
    await loadSizeGuide();
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

  await loadReviews(p.id);
})();

function starRatingHtml(avg, size) {
  const pct = Math.max(0, Math.min(100, (avg / 5) * 100));
  return `<span class="star-rating" style="--pct:${pct}%${size ? `;font-size:${size}px` : ""}"><span class="star-track">★★★★★</span><span class="star-fill">★★★★★</span></span>`;
}

async function loadReviews(productId) {
  const reviews = await dbGetReviews(productId);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  const summaryBox = document.getElementById("ratingSummary");
  if (summaryBox) {
    summaryBox.innerHTML = count
      ? `${starRatingHtml(avg)} <span class="rating-count">${avg.toFixed(1)} · ${count} review${count > 1 ? "s" : ""}</span>`
      : `<span class="rating-count muted">No reviews yet — be the first</span>`;
  }

  const session = await authGetSession();
  const myId = session?.user?.id;

  const section = document.getElementById("reviewsSection");
  section.innerHTML = `
    <div class="reviews-head">
      <p class="eyebrow">Customer reviews</p>
      <h2>${count ? `${avg.toFixed(1)} out of 5` : "Be the first to review"}</h2>
      ${count ? `<p class="muted">${starRatingHtml(avg, 18)} based on ${count} review${count > 1 ? "s" : ""}</p>` : ""}
    </div>
    <div class="review-list">
      ${
        count
          ? reviews
              .map(
                (r) => `<div class="review-item">
                  <div class="review-item-head">
                    ${starRatingHtml(r.rating, 13)}
                    <strong>${r.reviewer_name}</strong>
                    <span class="review-date">${new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    ${myId === r.user_id ? `<button type="button" class="review-delete" data-del-review="${r.id}">Delete</button>` : ""}
                  </div>
                  ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ""}
                </div>`
              )
              .join("")
          : `<p class="muted">No reviews yet for this product.</p>`
      }
    </div>
    <div class="review-form-box" id="reviewFormBox"></div>
  `;

  section.querySelectorAll("[data-del-review]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete your review?")) return;
      await dbDeleteReview(btn.dataset.delReview);
      loadReviews(productId);
    };
  });

  const formBox = document.getElementById("reviewFormBox");
  if (session) {
    let chosenRating = 0;
    formBox.innerHTML = `
      <p class="eyebrow">Write a review</p>
      <div class="star-input" id="starInput">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="star-btn">★</button>`).join("")}</div>
      <textarea id="reviewComment" placeholder="Share your experience with this product…"></textarea>
      <button class="btn dark" id="submitReviewBtn">Post review</button>
      <p id="reviewMsg" style="font-size:11px;margin-top:8px"></p>
    `;
    const starBtns = formBox.querySelectorAll("[data-star]");
    starBtns.forEach((b) => {
      b.onclick = () => {
        chosenRating = Number(b.dataset.star);
        starBtns.forEach((x) => x.classList.toggle("active", Number(x.dataset.star) <= chosenRating));
      };
    });
    document.getElementById("submitReviewBtn").onclick = async () => {
      const msg = document.getElementById("reviewMsg");
      if (!chosenRating) { msg.style.color = "#b3455e"; msg.textContent = "Pick a star rating first."; return; }
      try {
        await dbAddReview({ product_id: productId, rating: chosenRating, comment: document.getElementById("reviewComment").value.trim() });
        msg.style.color = "#3a7a4f";
        msg.textContent = "Thanks — your review is live!";
        setTimeout(() => loadReviews(productId), 700);
      } catch (err) {
        msg.style.color = "#b3455e";
        msg.textContent = err.message || "Couldn't post your review.";
      }
    };
  } else {
    formBox.innerHTML = `<p class="muted">Only signed-in customers can write a review — <a href="account.html?next=product.html%3Fid%3D${productId}">sign in</a> to share yours.</p>`;
  }
}

function highlightSizeRow(size) {
  document.querySelectorAll(".size-guide-table tbody tr").forEach((tr) => {
    tr.classList.toggle("matched", size && tr.firstElementChild.textContent.trim().toUpperCase() === String(size).toUpperCase());
  });
}
