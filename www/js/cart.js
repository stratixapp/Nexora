/* ==========================================================
   NEXORA — shopping cart
   The cart itself lives in the browser (localStorage) so people
   can browse and build a cart without signing in. Signing in is
   only required at checkout, when the order goes to WhatsApp.
   ========================================================== */
const NEXORA_CART_KEY = "nexora_cart";
const NEXORA_GUEST_KEY = "nexora_guest_details";

function guestDetailsGet() {
  try {
    const d = JSON.parse(localStorage.getItem(NEXORA_GUEST_KEY));
    return d && typeof d === "object" ? d : { name: "", phone: "", address: "" };
  } catch {
    return { name: "", phone: "", address: "" };
  }
}

function guestDetailsSave(d) {
  localStorage.setItem(NEXORA_GUEST_KEY, JSON.stringify(d));
}

function cartGet() {
  try {
    const items = JSON.parse(localStorage.getItem(NEXORA_CART_KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function cartSave(items) {
  localStorage.setItem(NEXORA_CART_KEY, JSON.stringify(items));
  cartUpdateBadge();
}

// key = product id + colour + size, so the same product in a different
// colour or size is tracked as its own line
function cartLineKey(id, color, size) {
  return `${id}::${color || ""}::${size || ""}`;
}

function cartAdd({ id, name, price, image_url, unit, color, size, stock, qty }) {
  const items = cartGet();
  const key = cartLineKey(id, color, size);
  const existing = items.find((i) => cartLineKey(i.id, i.color, i.size) === key);
  const cap = stock > 0 ? stock : 9999;
  if (existing) existing.qty = Math.min(cap, existing.qty + (qty || 1));
  else items.push({ id, name, price, image_url, unit: unit || "", color: color || null, size: size || null, stock: stock ?? null, qty: Math.min(cap, qty || 1) });
  cartSave(items);
}

function cartSetQty(id, color, size, qty) {
  const items = cartGet();
  const key = cartLineKey(id, color, size);
  const item = items.find((i) => cartLineKey(i.id, i.color, i.size) === key);
  if (item) {
    const cap = item.stock > 0 ? item.stock : 9999;
    item.qty = Math.min(cap, Math.max(1, Math.floor(qty) || 1));
  }
  cartSave(items);
}

function cartRemove(id, color, size) {
  const key = cartLineKey(id, color, size);
  cartSave(cartGet().filter((i) => cartLineKey(i.id, i.color, i.size) !== key));
}

function cartClear() {
  cartSave([]);
}

function cartCount() {
  return cartGet().reduce((n, i) => n + i.qty, 0);
}

function cartSubtotal() {
  return cartGet().reduce((s, i) => s + i.price * i.qty, 0);
}

function cartUpdateBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", cartUpdateBadge);
