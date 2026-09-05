const $ = (s) => document.querySelector(s);

if (!NEXORA_READY) nexoraShowSetupNotice();

// already signed in as admin? skip straight to the dashboard
(async () => {
  const profile = await authGetProfile();
  if (profile && profile.role === "admin") location.href = "admin.html";
})();

$("#loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = $("#formMsg");
  msg.textContent = "";
  try {
    await authSignIn({ email: f.get("email"), password: f.get("password") });
    const profile = await authGetProfile();
    if (!profile || profile.role !== "admin") {
      await authSignOut();
      msg.textContent = "This account doesn't have admin access.";
      return;
    }
    location.href = "admin.html";
  } catch (err) {
    msg.textContent = err.message || "Sign in failed. Check your email and password.";
  }
};
