const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

let products = [];
let categories = [];

/* ---------------- auth guard ---------------- */
(async function guard() {
  if (!NEXORA_READY) { nexoraShowSetupNotice(); return boot(); }
  const profile = await authGetProfile();
  if (!profile || profile.role !== "admin") {
    location.href = "admin-login.html";
    return;
  }
  $("#greeting").textContent = `Welcome back, ${profile.full_name || "Admin"}.`;
  boot();
})();

$("#signOutBtn").onclick = async () => { await authSignOut(); location.href = "admin-login.html"; };

/* ---------------- nav ---------------- */
document.querySelectorAll(".side[data-panel]").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".side").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
    $("#" + b.dataset.panel).classList.add("active");
  };
});
document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => document.querySelector(`[data-panel="${b.dataset.go}"]`).click()));

/* ---------------- boot / refresh ---------------- */
async function boot() {
  await refreshCategories();
  await refreshProducts();
  await refreshBanner();
  await refreshPromo();
  await refreshSizeChart();
  await refreshReviews();
  await refreshSettings();
}

async function refreshCategories() {
  categories = await dbGetCategories();
  $("#statCats").textContent = categories.length;

  $("#categoryManager").innerHTML = categories.length
    ? categories
        .map(
          (c) =>
            `<div class="category-row">
              <span class="cinfo">
                <span class="cat-thumb"${c.image_url ? ` style="background-image:url('${c.image_url}')"` : ""}>${c.image_url ? "" : c.icon}</span>
                ${c.icon} ${c.name}
              </span>
              <span class="cat-row-actions">
                <label class="cat-img-upload">Change photo<input type="file" accept="image/*" data-cat-image="${c.id}"></label>
                <button class="danger" data-del-cat="${c.id}">Delete</button>
              </span>
            </div>`
        )
        .join("")
    : `<p class="muted">No categories yet — add your first one below.</p>`;

  document.querySelectorAll("[data-del-cat]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this category? Products inside it will keep showing but lose their category tag.")) return;
      await dbDeleteCategory(btn.dataset.delCat);
      await refreshCategories();
    };
  });

  document.querySelectorAll("[data-cat-image]").forEach((input) => {
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const url = await dbUploadImage(file, "categories");
        await dbUpdateCategory(input.dataset.catImage, { image_url: url });
        await refreshCategories();
      } catch (err) {
        alert(err.message || "Couldn't upload that photo.");
      }
    };
  });

  $("#categorySelect").innerHTML = categories.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
}

$("#categoryForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const name = f.get("name").trim();
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    let image_url = null;
    const file = f.get("image");
    if (file && file.size) {
      submitBtn.textContent = "Uploading photo…";
      image_url = await dbUploadImage(file, "categories");
    }
    await dbAddCategory({ name, slug, icon: f.get("icon") || "🛍️", image_url });
    e.target.reset();
    await refreshCategories();
  } catch (err) {
    alert(err.message || "Couldn't add category — the name might already exist.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "+ Add category";
  }
};

async function refreshProducts() {
  products = await dbGetProducts({ includeInactive: true });
  $("#statProducts").textContent = products.length;
  $("#countPill").textContent = products.length + " products";

  $("#productList").innerHTML = products.length
    ? products
        .map(
          (p) => `<div class="admin-product">
            <img src="${p.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80"}">
            <div class="meta">
              <h3>${p.name}</h3>
              <p>${money(p.price)} · ${p.categories ? p.categories.name : "Uncategorized"} · ${p.unit || ""}</p>
              <button class="danger" data-del="${p.id}">Delete product</button>
            </div>
          </div>`
        )
        .join("")
    : `<p class="muted">No products yet — click “+ Add product” to create your first listing.</p>`;

  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this product?")) return;
      await dbDeleteProduct(btn.dataset.del);
      await refreshProducts();
    };
  });
}

/* ---------------- colours ---------------- */
const KNOWN_COLORS = {
  "royal pink": "#A6335E", "royal emerald": "#0E6B4F", "champagne gold": "#B8860B", "ivory white": "#FFFEF9",
  red: "#d64545", black: "#1a1a1a", white: "#ffffff", blue: "#2f6fd6", "navy blue": "#1b2a56",
  pink: "#e88bab", green: "#3a7a4f", yellow: "#e0c020", purple: "#7a4fb0", orange: "#e0812f",
  grey: "#8a8a8a", gray: "#8a8a8a", maroon: "#6e1f2a", beige: "#d8c3a5", brown: "#6b4226",
  gold: "#c9a227", silver: "#b7b7b7", teal: "#2f7a72", olive: "#6b6b28", cream: "#f2e6cf",
};
let currentColors = [];

function renderColorChips() {
  $("#colorChipRow").innerHTML = currentColors
    .map((c, i) => {
      const swatch = KNOWN_COLORS[c.toLowerCase()];
      return `<span class="color-chip">${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ""}${c}<button type="button" data-remove-color="${i}">×</button></span>`;
    })
    .join("");
  $("#colorChipRow").querySelectorAll("[data-remove-color]").forEach((b) => {
    b.onclick = () => { currentColors.splice(Number(b.dataset.removeColor), 1); renderColorChips(); };
  });
}

function addColorFromInput() {
  const input = $("#colorInput");
  const val = input.value.trim();
  if (val && !currentColors.some((c) => c.toLowerCase() === val.toLowerCase())) {
    currentColors.push(val);
    renderColorChips();
  }
  input.value = "";
  input.focus();
}

$("#addColorBtn").onclick = addColorFromInput;
$("#colorInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addColorFromInput(); }
});

/* ---------------- sizes ---------------- */
const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
let currentSizes = [];

function renderQuickSizes() {
  $("#quickSizeRow").innerHTML = QUICK_SIZES
    .map((s) => `<button type="button" class="quick-size${currentSizes.includes(s) ? " added" : ""}" data-quick-size="${s}">${s}</button>`)
    .join("");
  $("#quickSizeRow").querySelectorAll("[data-quick-size]").forEach((b) => {
    b.onclick = () => {
      const s = b.dataset.quickSize;
      if (currentSizes.includes(s)) currentSizes = currentSizes.filter((x) => x !== s);
      else currentSizes.push(s);
      renderQuickSizes();
      renderSizeChips();
    };
  });
}

function renderSizeChips() {
  $("#sizeChipRow").innerHTML = currentSizes
    .map((s, i) => `<span class="color-chip">${s}<button type="button" data-remove-size="${i}">×</button></span>`)
    .join("");
  $("#sizeChipRow").querySelectorAll("[data-remove-size]").forEach((b) => {
    b.onclick = () => { currentSizes.splice(Number(b.dataset.removeSize), 1); renderQuickSizes(); renderSizeChips(); };
  });
}

function addSizeFromInput() {
  const input = $("#sizeInput");
  const val = input.value.trim();
  if (val && !currentSizes.some((s) => s.toLowerCase() === val.toLowerCase())) {
    currentSizes.push(val);
    renderQuickSizes();
    renderSizeChips();
  }
  input.value = "";
  input.focus();
}

$("#addSizeBtn").onclick = addSizeFromInput;
$("#sizeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addSizeFromInput(); }
});
renderQuickSizes();

/* ---------------- product drawer ---------------- */
$("#addBtn").onclick = () => {
  currentColors = [];
  renderColorChips();
  currentSizes = [];
  renderQuickSizes();
  renderSizeChips();
  $("#imagePreviewRow").innerHTML = "";
  $("#imageCountHint").textContent = "No photos selected yet — add at least 3.";
  $("#imageCountHint").classList.remove("ok");
  $("#drawer").classList.add("open");
};
$("#closeDrawer").onclick = () => $("#drawer").classList.remove("open");

document.querySelector('[name="images"]').onchange = (e) => {
  const files = [...e.target.files].slice(0, 5);
  const row = $("#imagePreviewRow");
  row.innerHTML = "";
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const div = document.createElement("div");
      div.className = "cover-tag";
      div.innerHTML = `<img src="${reader.result}">`;
      row.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  if (e.target.files.length > 5) alert("Only the first 5 photos will be used.");

  const hint = $("#imageCountHint");
  const count = e.target.files.length;
  if (count === 0) {
    hint.textContent = "No photos selected yet — add at least 3.";
    hint.classList.remove("ok");
  } else if (count < 3) {
    hint.textContent = `${count} photo${count > 1 ? "s" : ""} selected — add ${3 - count} more (minimum 3).`;
    hint.classList.remove("ok");
  } else {
    hint.textContent = `${count} photos selected — looking good.`;
    hint.classList.add("ok");
  }

  const oversized = files.filter((f) => f.size > 2 * 1024 * 1024);
  if (oversized.length) alert(`${oversized.length} photo(s) are over 2MB. Large photos load slowly for customers — consider compressing them before upload.`);
};

$("#productForm").onsubmit = async (e) => {
  e.preventDefault();
  const f0 = new FormData(e.target);
  const chosenFiles = [...(f0.getAll("images") || [])].filter((f) => f && f.size);
  if (chosenFiles.length < 3) {
    alert("Please add at least 3 product photos before saving — customers trust listings with clear, multiple photos (like on Flipkart/Myntra). Right now you have " + chosenFiles.length + ".");
    return;
  }
  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";
  try {
    const f = new FormData(e.target);
    let image_urls = [];
    const files = [...(f.getAll("images") || [])].filter((f) => f && f.size).slice(0, 5);
    if (files.length) {
      submitBtn.textContent = `Uploading ${files.length} photo(s)…`;
      image_urls = await dbUploadImages(files);
    }
    const colors = [...currentColors];
    const sizes = [...currentSizes];
    await dbAddProduct({
      name: f.get("name"),
      price: Number(f.get("price")),
      old_price: f.get("old_price") ? Number(f.get("old_price")) : null,
      category_id: f.get("category_id"),
      unit: f.get("unit") || "",
      description: f.get("description") || "",
      stock: Number(f.get("stock")) || 0,
      image_url: image_urls[0] || null,
      image_urls,
      colors,
      sizes,
    });
    e.target.reset();
    currentColors = [];
    renderColorChips();
    currentSizes = [];
    renderQuickSizes();
    renderSizeChips();
    $("#imagePreviewRow").innerHTML = "";
    $("#drawer").classList.remove("open");
    await refreshProducts();
    document.querySelector('[data-panel="products"]').click();
  } catch (err) {
    alert(err.message || "Couldn't save the product. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save product";
  }
};

/* ---------------- banner ---------------- */
let pendingBannerFiles = [];

async function refreshBanner() {
  let urls = [];
  try { urls = JSON.parse((await dbGetSetting("banner_urls")) || "[]"); } catch { urls = []; }
  if (!urls.length) {
    const legacy = await dbGetSetting("banner_url"); // backward compatibility with the old single-image banner
    if (legacy) urls = [legacy];
  }
  $("#bannerPreview").style.backgroundImage = urls.length ? `url(${urls[0]})` : "linear-gradient(135deg,#e9c0cf,#f8e9ee)";
  const note = $("#bannerRotateNote");
  if (note) {
    note.textContent = urls.length > 1
      ? `${urls.length} images live — rotating on the homepage.`
      : urls.length === 1
      ? "Only 1 image live — add at least 1 more below so it rotates."
      : "No banner uploaded yet.";
  }
}

function renderBannerFileList() {
  const row = $("#bannerFileList");
  row.innerHTML = "";
  pendingBannerFiles.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = () => {
      const div = document.createElement("div");
      div.className = "cover-tag";
      div.innerHTML = `<img src="${reader.result}"><button type="button" class="thumb-remove" title="Remove">×</button>`;
      div.querySelector(".thumb-remove").onclick = () => {
        pendingBannerFiles.splice(idx, 1);
        renderBannerFileList();
      };
      row.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  const hint = $("#bannerCountHint");
  if (hint) {
    const n = pendingBannerFiles.length;
    hint.textContent = n === 0
      ? "No new images selected yet."
      : n === 1
      ? "1 image selected — add at least 1 more so it rotates, or publish as a single static banner."
      : `${n} images selected — ready to rotate.`;
  }
}

$("#bannerFile").onchange = (e) => {
  const incoming = [...e.target.files];
  for (const file of incoming) {
    if (pendingBannerFiles.length >= 5) { alert("Maximum 5 banner images — remove one before adding more."); break; }
    pendingBannerFiles.push(file);
  }
  e.target.value = ""; // reset so picking the same file again still fires onchange
  renderBannerFileList();
};

$("#publishBanner").onclick = async () => {
  if (!pendingBannerFiles.length) return alert("Choose at least one image first.");
  const btn = $("#publishBanner");
  btn.disabled = true;
  btn.textContent = `Uploading ${pendingBannerFiles.length} image(s)…`;
  try {
    const urls = await dbUploadImages(pendingBannerFiles, "banners");
    await dbSetSetting("banner_urls", JSON.stringify(urls));
    pendingBannerFiles = [];
    $("#bannerFileList").innerHTML = "";
    await refreshBanner();
    alert(urls.length > 1 ? "Banner published — open the store to see it rotate." : "Banner published. Add a 2nd image later if you want it to rotate.");
  } catch (err) {
    alert(err.message || "Couldn't publish the banner.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Publish banner";
  }
};

/* ---------------- promo banner (2nd strip, between hero and categories) ---------------- */
let pendingPromoFiles = [];

async function refreshPromo() {
  let urls = [];
  try { urls = JSON.parse((await dbGetSetting("promo_banner_urls")) || "[]"); } catch { urls = []; }
  $("#promoPreview").style.backgroundImage = urls.length ? `url(${urls[0]})` : "linear-gradient(135deg,#e9c0cf,#f8e9ee)";
  const note = $("#promoRotateNote");
  if (note) {
    note.textContent = urls.length > 1
      ? `${urls.length} images live — rotating on the homepage.`
      : urls.length === 1
      ? "1 image live — static (add 1 more to rotate)."
      : "No promo banner uploaded — this section is hidden on the homepage.";
  }
}

function renderPromoFileList() {
  const row = $("#promoFileList");
  row.innerHTML = "";
  pendingPromoFiles.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = () => {
      const div = document.createElement("div");
      div.className = "cover-tag";
      div.innerHTML = `<img src="${reader.result}"><button type="button" class="thumb-remove" title="Remove">×</button>`;
      div.querySelector(".thumb-remove").onclick = () => {
        pendingPromoFiles.splice(idx, 1);
        renderPromoFileList();
      };
      row.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  const hint = $("#promoCountHint");
  if (hint) {
    const n = pendingPromoFiles.length;
    hint.textContent = n === 0 ? "No new images selected yet." : `${n} image${n > 1 ? "s" : ""} selected.`;
  }
}

$("#promoFile").onchange = (e) => {
  const incoming = [...e.target.files];
  for (const file of incoming) {
    if (pendingPromoFiles.length >= 5) { alert("Maximum 5 images — remove one before adding more."); break; }
    pendingPromoFiles.push(file);
  }
  e.target.value = "";
  renderPromoFileList();
};

$("#publishPromo").onclick = async () => {
  if (!pendingPromoFiles.length) return alert("Choose at least one image first.");
  const btn = $("#publishPromo");
  btn.disabled = true;
  btn.textContent = `Uploading ${pendingPromoFiles.length} image(s)…`;
  try {
    const urls = await dbUploadImages(pendingPromoFiles, "banners");
    await dbSetSetting("promo_banner_urls", JSON.stringify(urls));
    pendingPromoFiles = [];
    $("#promoFileList").innerHTML = "";
    await refreshPromo();
    alert("Promo banner published.");
  } catch (err) {
    alert(err.message || "Couldn't publish the promo banner.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Publish promo banner";
  }
};

$("#clearPromo").onclick = async () => {
  if (!confirm("Remove the promo banner? The section will disappear from the homepage.")) return;
  await dbSetSetting("promo_banner_urls", "[]");
  await refreshPromo();
};

/* ---------------- size chart (Indian standard, admin-editable) ---------------- */
const DEFAULT_SIZE_CHART = [
  { size: "XS", in_size: "32", bust: "32", waist: "26", hip: "35" },
  { size: "S", in_size: "34", bust: "34", waist: "28", hip: "37" },
  { size: "M", in_size: "36", bust: "36", waist: "30", hip: "39" },
  { size: "L", in_size: "38", bust: "38", waist: "32", hip: "41" },
  { size: "XL", in_size: "40", bust: "40", waist: "34", hip: "43" },
  { size: "XXL", in_size: "42", bust: "42", waist: "36", hip: "45" },
];
let sizeChartRows = [];

function renderSizeChartRows() {
  $("#sizeChartRows").innerHTML =
    `<div class="size-chart-header"><span>Size</span><span>IN Size</span><span>Bust (in)</span><span>Waist (in)</span><span>Hip (in)</span><span></span></div>` +
    sizeChartRows
      .map(
        (r, i) => `<div class="size-chart-row">
          <input data-row="${i}" data-field="size" value="${r.size || ""}" placeholder="M">
          <input data-row="${i}" data-field="in_size" value="${r.in_size || ""}" placeholder="36">
          <input data-row="${i}" data-field="bust" value="${r.bust || ""}" placeholder="36">
          <input data-row="${i}" data-field="waist" value="${r.waist || ""}" placeholder="30">
          <input data-row="${i}" data-field="hip" value="${r.hip || ""}" placeholder="39">
          <button type="button" class="danger" data-remove-row="${i}">×</button>
        </div>`
      )
      .join("");

  $("#sizeChartRows").querySelectorAll("[data-row]").forEach((inp) => {
    inp.oninput = () => { sizeChartRows[Number(inp.dataset.row)][inp.dataset.field] = inp.value; };
  });
  $("#sizeChartRows").querySelectorAll("[data-remove-row]").forEach((btn) => {
    btn.onclick = () => { sizeChartRows.splice(Number(btn.dataset.removeRow), 1); renderSizeChartRows(); };
  });
}

async function refreshSizeChart() {
  try {
    const raw = await dbGetSetting("size_chart");
    sizeChartRows = raw ? JSON.parse(raw) : DEFAULT_SIZE_CHART.map((r) => ({ ...r }));
  } catch {
    sizeChartRows = DEFAULT_SIZE_CHART.map((r) => ({ ...r }));
  }
  renderSizeChartRows();
}

$("#addSizeRowBtn").onclick = () => {
  sizeChartRows.push({ size: "", in_size: "", bust: "", waist: "", hip: "" });
  renderSizeChartRows();
};

$("#saveSizeChartBtn").onclick = async () => {
  const msg = $("#sizeChartMsg");
  msg.style.color = "var(--muted)";
  msg.textContent = "Saving…";
  try {
    const clean = sizeChartRows.filter((r) => r.size && r.size.trim());
    await dbSetSetting("size_chart", JSON.stringify(clean));
    sizeChartRows = clean;
    renderSizeChartRows();
    msg.style.color = "#3a7a4f";
    msg.textContent = "Saved — live on every product page now.";
  } catch (err) {
    msg.style.color = "#b3455e";
    msg.textContent = err.message || "Couldn't save the size chart.";
  }
};

/* ---------------- reviews (moderation) ---------------- */
async function refreshReviews() {
  const reviews = await dbGetAllReviewsAdmin();
  $("#reviewsManager").innerHTML = reviews.length
    ? reviews
        .map(
          (r) => `<div class="review-admin-row">
            <div>
              <p class="review-admin-meta">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} · <strong>${r.reviewer_name}</strong> on <em>${r.products?.name || "a deleted product"}</em> · ${new Date(r.created_at).toLocaleDateString("en-IN")}</p>
              ${r.comment ? `<p class="review-admin-comment">${r.comment}</p>` : `<p class="review-admin-comment muted">(no comment left)</p>`}
            </div>
            <button class="danger" data-del-review-admin="${r.id}">Delete</button>
          </div>`
        )
        .join("")
    : `<p class="muted">No reviews yet.</p>`;

  document.querySelectorAll("[data-del-review-admin]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this review permanently?")) return;
      await dbDeleteReview(btn.dataset.delReviewAdmin);
      await refreshReviews();
    };
  });
}

/* ---------------- settings ---------------- */
async function refreshSettings() {
  const f = $("#settingsForm");
  f.store_name.value = (await dbGetSetting("store_name")) || "NEXORA";
  f.whatsapp_number.value = (await dbGetSetting("whatsapp_number")) || "";
  f.delivery_charge.value = (await dbGetSetting("delivery_charge")) ?? 49;
  f.free_delivery_threshold.value = (await dbGetSetting("free_delivery_threshold")) ?? 999;
}

$("#settingsForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = $("#settingsMsg");
  msg.textContent = "Saving…";
  msg.style.color = "var(--muted)";
  try {
    await dbSetSetting("store_name", f.get("store_name") || "NEXORA");
    await dbSetSetting("whatsapp_number", (f.get("whatsapp_number") || "").replace(/[^0-9]/g, ""));
    await dbSetSetting("delivery_charge", String(Number(f.get("delivery_charge")) || 0));
    await dbSetSetting("free_delivery_threshold", String(Number(f.get("free_delivery_threshold")) || 0));
    msg.style.color = "#3a7a4f";
    msg.textContent = "Saved!";
  } catch (err) {
    msg.style.color = "#b3455e";
    msg.textContent = err.message || "Couldn't save settings.";
  }
};
