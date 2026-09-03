const $ = (s) => document.querySelector(s);

(async function init() {
  if (!NEXORA_READY) return nexoraShowSetupNotice();
  const profile = await authGetProfile();
  if (!profile) { location.href = "account.html?next=profile.html"; return; }

  const f = $("#profileForm");
  f.full_name.value = profile.full_name || "";
  f.age.value = profile.age || "";
  f.gender.value = profile.gender || "";
  f.email.value = profile.email || "";
  f.phone.value = profile.phone || "";
  f.place.value = profile.place || "";
  f.landmark.value = profile.landmark || "";
  f.address.value = profile.address || "";
})();

$("#profileForm").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const msg = $("#formMsg");
  msg.textContent = "";
  try {
    await authUpdateProfile({
      full_name: fd.get("full_name"),
      age: fd.get("age") ? Number(fd.get("age")) : null,
      gender: fd.get("gender"),
      phone: fd.get("phone"),
      place: fd.get("place"),
      landmark: fd.get("landmark"),
      address: fd.get("address"),
    });
    msg.style.color = "#3a7a4f";
    msg.textContent = "Saved!";
  } catch (err) {
    msg.style.color = "#b3455e";
    msg.textContent = err.message || "Couldn't save. Please try again.";
  }
};

$("#signOutBtn").onclick = async () => { await authSignOut(); location.href = "index.html"; };
