/**
 * ============================================================
 * ADMIN — auth.js
 * ------------------------------------------------------------
 * Handles the login screen (sign in, show/hide password, forgot
 * password) and decides, on page load, whether to show the login
 * screen or the dashboard based on the current Supabase session.
 *
 * Real Supabase Auth — no credentials are ever hard-coded here.
 * ============================================================
 */
(function(){
  "use strict";

  const loginScreen = document.getElementById("loginScreen");
  const appShell = document.getElementById("appShell");
  const loginForm = document.getElementById("loginForm");
  const resetForm = document.getElementById("resetForm");
  const loginError = document.getElementById("loginError");

  function showError(msg){
    loginError.textContent = msg;
    loginError.classList.add("show");
  }
  function clearError(){
    loginError.classList.remove("show");
  }

  /* ---------------- Show/hide password ---------------- */
  document.getElementById("togglePw").addEventListener("click", (e)=>{
    const input = document.getElementById("loginPassword");
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    e.target.textContent = isHidden ? "Hide" : "Show";
  });

  /* ---------------- Forgot password toggle ---------------- */
  document.getElementById("forgotPwLink").addEventListener("click", (e)=>{
    e.preventDefault();
    loginForm.style.display = "none";
    resetForm.style.display = "block";
    clearError();
  });
  document.getElementById("backToLoginLink").addEventListener("click", (e)=>{
    e.preventDefault();
    resetForm.style.display = "none";
    loginForm.style.display = "block";
    clearError();
  });

  /* ---------------- Sign in ---------------- */
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearError();

    if(!SUPABASE_CONFIGURED){
      showError("Supabase isn't configured yet — see the banner above.");
      return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("loginSubmit");
    const remember = document.getElementById("rememberMe").checked;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try{
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error) throw error;

      // Supabase persists sessions in localStorage by default; if the
      // admin unchecked "keep me signed in", we simply don't rely on
      // that persistence surviving a full browser restart by marking
      // it session-only here (best-effort, since supabase-js always
      // persists to localStorage under the hood).
      if(!remember){
        sessionStorage.setItem("lindaTwistSessionOnly", "1");
      } else {
        sessionStorage.removeItem("lindaTwistSessionOnly");
      }

      window.location.reload();
    } catch(err){
      showError(err.message || "Sign in failed. Please check your email and password.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });

  /* ---------------- Forgot password ---------------- */
  resetForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!SUPABASE_CONFIGURED) return;
    const email = document.getElementById("resetEmail").value.trim();
    const btn = document.getElementById("resetSubmit");
    btn.disabled = true;
    btn.textContent = "Sending…";
    try{
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/admin.html"
      });
      if(error) throw error;
      Admin.toast("If that email has an account, a reset link is on its way.", "success");
      resetForm.style.display = "none";
      loginForm.style.display = "block";
    } catch(err){
      Admin.toast(err.message || "Couldn't send reset email.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Reset Link";
    }
  });

  /* ---------------- Bootstrap: session check ---------------- */
  window.AdminAuthReady = (async function bootstrap(){
    if(!SUPABASE_CONFIGURED){
      loginScreen.style.display = "flex";
      return { authed: false };
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if(!session){
      loginScreen.style.display = "flex";
      return { authed: false };
    }

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if(error || !profile){
      // No staff profile for this login — most commonly because this is
      // actually a customer account (customers and staff are entirely
      // separate systems; see account.html for the customer side).
      // Deliberately NOT signing them out here: this admin page has no
      // business destroying a session that may be perfectly valid and
      // in active use elsewhere (e.g. a customer's account.html tab).
      loginScreen.style.display = "flex";
      showError("This login isn't recognised as staff access. If you're a customer, please use the account page on the main site instead.");
      return { authed: false };
    }

    loginScreen.style.display = "none";
    appShell.style.display = "flex";

    document.getElementById("sidebarUserName").textContent = profile.full_name || profile.email;
    document.getElementById("sidebarUserRole").textContent = profile.role;
    document.getElementById("sidebarAvatar").textContent = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

    return { authed: true, session, profile };
  })();

  document.getElementById("logoutBtn").addEventListener("click", ()=> Admin.logout());
})();