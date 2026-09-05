const $ = (s) => document.querySelector(s);

(async function init() {
  if (!NEXORA_READY) return nexoraShowSetupNotice();
  const profile = await authGetProfile();
  if (!profile) { location.href = "account.html?next=settings.html"; return; }

  $("#settingsProfileCard").innerHTML = `
    <div class="profile-box" style="border-radius:8px;padding:20px">
      <strong style="font-size:17px">${profile.full_name || "NEXORA member"}</strong>
      <span style="display:block;margin-top:4px">${profile.email || ""}</span>
      ${profile.phone ? `<span style="display:block">${profile.phone}</span>` : ""}
      ${[profile.address, profile.landmark, profile.place].filter(Boolean).length ? `<span style="display:block;margin-top:6px;font-size:12px">${[profile.address, profile.landmark, profile.place].filter(Boolean).join(", ")}</span>` : ""}
    </div>`;

  const count = typeof cartCount === "function" ? cartCount() : 0;
  const note = $("#cartCountNote");
  if (note) note.textContent = count ? `${count} item${count > 1 ? "s" : ""} in your cart` : "Review items before checkout";

  const waNumber = (await dbGetSetting("whatsapp_number")) || "919999999999";
  const link = $("#whatsappHelpLink");
  if (link) link.href = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi NEXORA, I need help with an order.")}`;
})();

$("#signOutBtn").onclick = async () => {
  if (!confirm("Sign out of NEXORA on this device?")) return;
  await authSignOut();
  location.href = "index.html";
};

$("#deleteDataBtn").onclick = async () => {
  if (!confirm("This removes your saved name, phone and address from NEXORA. You'll still be able to sign in — you'd just need to re-enter these next time. Continue?")) return;
  try {
    await authUpdateProfile({ full_name: "", phone: "", address: "", landmark: "", place: "" });
    alert("Your saved details have been removed.");
    location.reload();
  } catch (err) {
    alert(err.message || "Couldn't remove your details — please try again.");
  }
};

$("#changePasswordBtn").onclick = () => $("#passwordModal").classList.add("open");
$("#closePasswordModal").onclick = () => $("#passwordModal").classList.remove("open");

$("#passwordForm").onsubmit = async (e) => {
  e.preventDefault();
  const p1 = $("#newPassword").value;
  const p2 = $("#confirmPassword").value;
  const msg = $("#passwordMsg");
  msg.textContent = "";
  if (p1.length < 6) { msg.textContent = "Password must be at least 6 characters."; return; }
  if (p1 !== p2) { msg.textContent = "Passwords don't match."; return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await authUpdatePassword(p1);
    $("#passwordModal").classList.remove("open");
    e.target.reset();
    alert("Password updated.");
  } catch (err) {
    msg.textContent = err.message || "Couldn't update your password — please try again.";
  } finally {
    btn.disabled = false;
  }
};
