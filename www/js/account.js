const $ = (s) => document.querySelector(s);
const next = new URLSearchParams(location.search).get("next") || "index.html";
let mode = "login";

sessionStorage.setItem("nexoraEntered", "1"); // reaching the intro fulfils the "show intro first" step
if (!NEXORA_READY) nexoraShowSetupNotice();
setTimeout(() => document.getElementById("nexoraLoader")?.classList.add("hide"), 500);

// redirect straight through if already signed in
(async () => {
  const session = await authGetSession();
  if (session) location.href = next;
})();

// safety net for the Google OAuth redirect: the session is sometimes
// only ready a moment after the page reloads with the auth tokens in the URL
if (typeof sb !== "undefined" && sb) {
  sb.auth.onAuthStateChange((_event, session) => {
    if (session) location.href = next;
  });
}

$("#googleSignIn").onclick = async () => {
  const btn = $("#googleSignIn");
  const original = btn.innerHTML;
  btn.disabled = true;
  try {
    await authSignInWithGoogle(`${location.origin}${location.pathname}${location.search}`);
    // browser now navigates to Google — nothing else to do here
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = original;
    $("#formMsg").textContent = err.message || "Google sign-in isn't set up yet — ask the store owner to enable it in Supabase.";
  }
};

document.querySelectorAll(".tab").forEach((t) => {
  t.onclick = () => setMode(t.dataset.mode);
});
$("#switchBtn").onclick = () => setMode(mode === "login" ? "signup" : "login");

function setMode(m) {
  mode = m;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === m));
  $("#signupFields").style.display = m === "signup" ? "block" : "none";
  $("#submitBtn").innerHTML = m === "signup" ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  $("#switchText").innerHTML =
    m === "signup"
      ? `Already have an account? <button type="button" id="switchBtn">Sign in</button>`
      : `New to NEXORA? <button type="button" id="switchBtn">Create an account</button>`;
  $("#switchBtn").onclick = () => setMode(mode === "login" ? "signup" : "login");
  $("#formMsg").textContent = "";
}

$("#accountForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = $("#formMsg");
  msg.style.color = "#b3455e";
  msg.textContent = "";
  try {
    if (mode === "signup") {
      await authSignUp({
        email: f.get("email"),
        password: f.get("password"),
        full_name: f.get("full_name"),
        age: f.get("age") ? Number(f.get("age")) : null,
        gender: f.get("gender"),
        phone: f.get("phone"),
        place: f.get("place"),
        landmark: f.get("landmark"),
        address: f.get("address"),
      });
      msg.style.color = "#3a7a4f";
      msg.textContent = "Account created! Check your email if confirmation is required, then sign in.";
      setMode("login");
    } else {
      await authSignIn({ email: f.get("email"), password: f.get("password") });
      location.href = next;
    }
  } catch (err) {
    msg.textContent = err.message || "Something went wrong. Please try again.";
  }
};
