/**
 * ============================================================
 * ACCOUNT — profile.js (My Details tab)
 * ============================================================
 */
(function(){
  "use strict";

  function render(){
    const account = window.CURRENT_ACCOUNT;
    document.getElementById("pfName").value = account.full_name || "";
    document.getElementById("pfPhone").value = account.phone || "";
    document.getElementById("pfEmail").value = account.email || "";
  }

  document.getElementById("profileForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const status = document.getElementById("profileSaveStatus");
    status.textContent = "Saving…";
    try{
      const payload = {
        full_name: document.getElementById("pfName").value.trim(),
        phone: document.getElementById("pfPhone").value.trim()
      };
      const { error } = await supabaseClient.from("customer_accounts").update(payload).eq("id", window.CURRENT_ACCOUNT.id);
      if(error) throw error;
      Object.assign(window.CURRENT_ACCOUNT, payload);
      status.textContent = "Saved ✓";
      setTimeout(()=> status.textContent = "", 2500);
    } catch(err){
      status.textContent = "Couldn't save — please try again.";
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const status = document.getElementById("passwordSaveStatus");
    const newPassword = document.getElementById("pfNewPassword").value;
    status.textContent = "Updating…";
    try{
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if(error) throw error;
      status.textContent = "Password updated ✓";
      e.target.reset();
      setTimeout(()=> status.textContent = "", 2500);
    } catch(err){
      status.textContent = err.message || "Couldn't update password.";
    }
  });

  Account.registerView("profile", render);
})();
