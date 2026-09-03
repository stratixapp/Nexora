const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

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

function renderItems() {
  const items = cartGet();
  const box = $("#cartItems");
  if (!items.length) {
    box.innerHTML = `<div class="empty-cart"><p>Your cart is empty.</p><a class="btn dark" href="index.html">Start shopping →</a></div>`;
    $("#cartSummary").innerHTML = "";
    return;
  }
  box.innerHTML = items
    .map(
      (i) => `<div class="cart-item">
        <img src="${i.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&q=80"}">
        <div>
          <p class="ci-name">${i.name}</p>
          <p class="ci-meta">${[i.unit, i.color ? `Colour: ${i.color}` : "", i.size ? `Size: ${i.size}` : ""].filter(Boolean).join(" · ")}</p>
          ${i.stock > 0 && i.stock <= 5 ? `<p class="ci-stock">Only ${i.stock} left</p>` : ""}
          <div class="stepper" style="width:fit-content">
            <button type="button" data-minus="${i.id}" data-color="${i.color || ""}" data-size="${i.size || ""}">−</button>
            <input type="number" min="1" max="${i.stock > 0 ? i.stock : 9999}" value="${i.qty}" data-qty="${i.id}" data-color="${i.color || ""}" data-size="${i.size || ""}">
            <button type="button" data-plus="${i.id}" data-color="${i.color || ""}" data-size="${i.size || ""}" ${i.stock > 0 && i.qty >= i.stock ? "disabled title=\"Max stock reached\"" : ""}>+</button>
          </div>
        </div>
        <div style="text-align:right">
          <p class="ci-price">${money(i.price * i.qty)}</p>
          <button class="ci-remove" data-remove="${i.id}" data-color="${i.color || ""}" data-size="${i.size || ""}">Remove</button>
        </div>
      </div>`
    )
    .join("");

  box.querySelectorAll("[data-minus]").forEach((b) => (b.onclick = () => { const it = items.find((x) => x.id === b.dataset.minus && (x.color || "") === b.dataset.color && (x.size || "") === b.dataset.size); cartSetQty(it.id, it.color, it.size, it.qty - 1); render(); }));
  box.querySelectorAll("[data-plus]").forEach((b) => (b.onclick = () => { const it = items.find((x) => x.id === b.dataset.plus && (x.color || "") === b.dataset.color && (x.size || "") === b.dataset.size); cartSetQty(it.id, it.color, it.size, it.qty + 1); render(); }));
  box.querySelectorAll("[data-qty]").forEach((inp) => (inp.onchange = () => { cartSetQty(inp.dataset.qty, inp.dataset.color, inp.dataset.size, Number(inp.value)); render(); }));
  box.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = () => { cartRemove(b.dataset.remove, b.dataset.color, b.dataset.size); render(); }));
}

async function renderSummary() {
  const items = cartGet();
  if (!items.length) return;
  const subtotal = cartSubtotal();
  const deliveryCharge = Number((await dbGetSetting("delivery_charge")) ?? 49);
  const freeThreshold = Number((await dbGetSetting("free_delivery_threshold")) ?? 999);
  const delivery = subtotal >= freeThreshold ? 0 : deliveryCharge;
  const total = subtotal + delivery;
  const profile = await authGetProfile(); // may be null — guests can still order
  const guest = guestDetailsGet();

  $("#cartSummary").innerHTML = `
    ${delivery === 0 ? `<p class="free-note">🎉 You've unlocked free delivery!</p>` : `<p class="free-note" style="color:var(--muted)">Add ${money(freeThreshold - subtotal)} more for free delivery</p>`}
    ${
      profile
        ? `<div class="cart-summary" style="margin-bottom:14px">
            <p class="delivery-label">Delivering to</p>
            <p class="delivery-preview">${profile.full_name || ""}${profile.phone ? ` · ${profile.phone}` : ""}<br>${[profile.address, profile.landmark, profile.place].filter(Boolean).join(", ") || "No address saved yet"}</p>
            <a href="profile.html" class="delivery-edit">Edit in profile →</a>
          </div>`
        : `<div class="cart-summary" style="margin-bottom:14px">
            <p class="delivery-label">Your delivery details <span style="text-transform:none;font-weight:400;color:var(--muted)">(optional — helps us confirm faster)</span></p>
            <label class="guest-field">Name<input id="guestName" value="${guest.name || ""}" placeholder="Your name"></label>
            <label class="guest-field">Phone<input id="guestPhone" type="tel" value="${guest.phone || ""}" placeholder="9XXXXXXXXX"></label>
            <label class="guest-field">Delivery address<textarea id="guestAddress" placeholder="House / street / area / city">${guest.address || ""}</textarea></label>
          </div>`
    }
    <div class="cart-summary">
      <label class="guest-field">Order notes <span style="text-transform:none;font-weight:400;color:var(--muted)">(optional)</span><textarea id="orderNotes" placeholder="e.g. call before delivery, gift wrap, preferred time"></textarea></label>
      <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="row"><span>Delivery</span><span>${delivery === 0 ? "FREE" : money(delivery)}</span></div>
      <div class="row total"><span>Total</span><span>${money(total)}</span></div>
      <button class="btn dark wide" id="checkoutBtn" style="margin-top:16px;width:100%">Contact via WhatsApp <span>↗</span></button>
      <p style="font-size:10.5px;color:var(--muted);text-align:center;margin:10px 0 0">No account needed — happy to help you place the order over WhatsApp.</p>
    </div>`;

  $("#checkoutBtn").onclick = async () => {
    const waNumber = (await dbGetSetting("whatsapp_number")) || "919999999999";
    const lines = items
      .map((i) => `${i.name}${i.color ? ` (${i.color}${i.size ? `, ${i.size}` : ""})` : i.size ? ` (${i.size})` : ""} × ${i.qty} — ${money(i.price * i.qty)}`)
      .join("%0A");

    let customerLines;
    if (profile) {
      customerLines = `Name: ${profile.full_name || ""}%0APhone: ${profile.phone || ""}%0AAddress: ${[profile.address, profile.landmark, profile.place].filter(Boolean).join(", ")}%0A%0A`;
    } else {
      const name = $("#guestName")?.value.trim() || "";
      const phone = $("#guestPhone")?.value.trim() || "";
      const address = $("#guestAddress")?.value.trim() || "";
      guestDetailsSave({ name, phone, address }); // remembered locally for next time — no account needed
      customerLines = `Name: ${name}%0APhone: ${phone}%0AAddress: ${address || "(will share here)"}%0A%0A`;
    }

    const notes = $("#orderNotes")?.value.trim();
    const notesLine = notes ? `Notes: ${encodeURIComponent(notes)}%0A%0A` : "";

    const msg =
      `Hi NEXORA, I'd like to place this order:%0A%0A${lines}%0A%0A` +
      `Subtotal: ${money(subtotal)}%0ADelivery: ${delivery === 0 ? "FREE" : money(delivery)}%0A*Total: ${money(total)}*%0A%0A` +
      customerLines +
      notesLine +
      `Please confirm availability and delivery time.`;
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };
}

function render() {
  renderItems();
  renderSummary();
}

(async function init() {
  if (!NEXORA_READY) nexoraShowSetupNotice();
  render();
  buildSideMenu();
  refreshAccountLink();
})();
