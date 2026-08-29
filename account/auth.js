/**
 * ============================================================
 * ACCOUNT — auth.js
 * ------------------------------------------------------------
 * Customer sign in/up/out. Completely separate audience from the
 * staff dashboard (admin.html) — a customer_accounts row, not a
 * profiles row, and none of the staff-only RLS policies apply.
 * ============================================================
 */
(function(){
  "use strict";

  const authShell = document.getElementById("authShell");
  const dashShell = document.getElementById("dashShell");
  const errorEl = document.getElementById("authError");
  const successEl = document.getElementById("authSuccess");

  function showError(msg){ errorEl.textContent = msg; errorEl.classList.add("show"); successEl.classList.remove("show"); }
  function showSuccess(msg){ successEl.textContent = msg; successEl.classList.add("show"); errorEl.classList.remove("show"); }
  function clearMessages(){ errorEl.classList.remove("show"); successEl.classList.remove("show"); }

  /* ---------------- Tab switching (Sign In / Create Account) ---------------- */
  const tabs = document.querySelectorAll(".auth-tab");
  const forms = { login: document.getElementById("loginForm"), signup: document.getElementById("signupForm") };
  tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      tabs.forEach(t=> t.classList.toggle("active", t===tab));
      Object.entries(forms).forEach(([name, form])=> form.classList.toggle("active", name===tab.dataset.tab));
      document.getElementById("resetForm").classList.remove("active");
      clearMessages();
    });
  });

  document.getElementById("forgotPwLink").addEventListener("click", (e)=>{
    e.preventDefault();
    forms.login.classList.remove("active");
    document.getElementById("resetForm").classList.add("active");
    clearMessages();
  });
  document.getElementById("backToLoginLink").addEventListener("click", (e)=>{
    e.preventDefault();
    document.getElementById("resetForm").classList.remove("active");
    forms.login.classList.add("active");
    clearMessages();
  });

  /* ---------------- Show/hide password ---------------- */
  document.getElementById("liTogglePw").addEventListener("click", (e)=>{
    const input = document.getElementById("liPassword");
    input.type = input.type === "password" ? "text" : "password";
    e.target.textContent = input.type === "password" ? "Show" : "Hide";
  });
  document.getElementById("suTogglePw").addEventListener("click", (e)=>{
    const input = document.getElementById("suPassword");
    input.type = input.type === "password" ? "text" : "password";
    e.target.textContent = input.type === "password" ? "Show" : "Hide";
  });

  /* ---------------- Pre-fill + validate a referral code from ?ref=CODE ---------------- */
  (function prefillReferral(){
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if(ref){
      document.getElementById("suReferral").value = ref.toUpperCase();
      tabs.forEach(t=> t.classList.toggle("active", t.dataset.tab === "signup"));
      forms.login.classList.remove("active");
      forms.signup.classList.add("active");
      validateReferralCode(ref);
    }
  })();

  let referralValid = null;
  async function validateReferralCode(code){
    const hint = document.getElementById("suReferralHint");
    if(!code){ hint.textContent = ""; hint.className = "field-hint-account"; referralValid = null; return; }
    if(!SUPABASE_CONFIGURED){ return; }
    try{
      const { data, error } = await supabaseClient.rpc("referral_code_exists", { code: code.toUpperCase() });
      if(error) throw error;
      referralValid = !!data;
      hint.textContent = referralValid ? "Valid code — you're all set!" : "We couldn't find that code — you can still sign up without it.";
      hint.className = "field-hint-account " + (referralValid ? "valid" : "invalid");
    } catch(err){
      hint.textContent = "";
    }
  }
  let refDebounce;
  document.getElementById("suReferral").addEventListener("input", (e)=>{
    clearTimeout(refDebounce);
    refDebounce = setTimeout(()=> validateReferralCode(e.target.value.trim()), 400);
  });

  /* ---------------- Sign in ---------------- */
  forms.login.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearMessages();
    if(!SUPABASE_CONFIGURED){ showError("Supabase isn't configured yet."); return; }
    const email = document.getElementById("liEmail").value.trim();
    const password = document.getElementById("liPassword").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Signing in…";
    try{
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error) throw error;
      window.location.reload();
    } catch(err){
      showError(err.message || "Sign in failed — please check your email and password.");
      btn.disabled = false; btn.textContent = "Sign In";
    }
  });

  /* ---------------- Create account ---------------- */
  forms.signup.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearMessages();
    if(!SUPABASE_CONFIGURED){ showError("Supabase isn't configured yet."); return; }
    const full_name = document.getElementById("suName").value.trim();
    const phone = document.getElementById("suPhone").value.trim();
    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;
    const referred_by_code = document.getElementById("suReferral").value.trim().toUpperCase() || null;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Creating account…";
    try{
      const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { full_name, phone, referred_by_code, account_type: "customer" } }
      });
      if(error) throw error;

      if(data.session){
        // Email confirmation is off — the customer is signed in immediately.
        window.location.reload();
      } else {
        // Email confirmation is required by this Supabase project's settings.
        showSuccess("Account created! Check your email to confirm your address, then sign in.");
        e.target.reset();
        tabs.forEach(t=> t.classList.toggle("active", t.dataset.tab === "login"));
        forms.signup.classList.remove("active");
        forms.login.classList.add("active");
      }
    } catch(err){
      showError(err.message || "Couldn't create your account — please try again.");
    } finally {
      btn.disabled = false; btn.textContent = "Create Account";
    }
  });

  /* ---------------- Forgot password ---------------- */
  document.getElementById("resetForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(!SUPABASE_CONFIGURED) return;
    const email = document.getElementById("resetEmail").value.trim();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Sending…";
    try{
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/account.html"
      });
      if(error) throw error;
      showSuccess("If that email has an account, a reset link is on its way.");
    } catch(err){
      showError(err.message || "Couldn't send reset email.");
    } finally {
      btn.disabled = false; btn.textContent = "Send Reset Link";
    }
  });

  /* ---------------- Sign out ---------------- */
  document.getElementById("accountLogoutBtn").addEventListener("click", async ()=>{
    await supabaseClient.auth.signOut();
    window.location.reload();
  });

  /* ---------------- Bootstrap: decide auth screen vs dashboard ---------------- */
  window.AccountReady = (async function bootstrap(){
    if(!SUPABASE_CONFIGURED){
      document.getElementById("configWarning").style.display = "block";
      return { authed: false };
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if(!session){
      authShell.style.display = "flex";
      dashShell.style.display = "none";
      return { authed: false };
    }

    const { data: account, error } = await supabaseClient
      .from("customer_accounts")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if(error || !account){
      // No matching customer account for this login. This account page
      // is exclusively for customers — it has no awareness of, or
      // connection to, the separate staff dashboard.
      authShell.style.display = "flex";
      dashShell.style.display = "none";
      showError("We couldn't find an account for that login. Please check your details, or create a new account.");
      return { authed: false };
    }

    authShell.style.display = "none";
    dashShell.style.display = "block";
    document.getElementById("accountLogoutBtn").style.display = "inline-flex";
    document.getElementById("dashWelcomeName").textContent = account.full_name ? `Welcome back, ${account.full_name.split(" ")[0]}` : "Welcome back";

    return { authed: true, session, account };
  })();
})();