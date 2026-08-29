/**
 * ============================================================
 * ACCOUNT — referrals.js
 * ============================================================
 */
(function(){
  "use strict";

  async function render(){
    const account = window.CURRENT_ACCOUNT;
    document.getElementById("referralsCodeBig").textContent = account.referral_code;

    const statsWrap = document.getElementById("referralsStats");
    statsWrap.innerHTML = `<p class="body-md">Loading…</p>`;
    try{
      const { data, error } = await supabaseClient.rpc("referral_count", { code: account.referral_code });
      if(error) throw error;
      const count = data || 0;
      statsWrap.innerHTML = `
        <p class="display-md" style="font-size:2rem;">${count}</p>
        <p class="body-md" style="margin-top:6px;">${count === 1 ? "person has" : "people have"} joined using your code so far.</p>
        ${count > 0 ? `<p class="body-md" style="margin-top:14px; color:var(--caramel); font-size:13px;">Mention this to us at your next visit and we'll sort out your thank-you reward.</p>` : ""}
      `;
    } catch(err){
      statsWrap.innerHTML = `<p class="body-md">Couldn't load your referral stats right now.</p>`;
    }
  }

  document.getElementById("referralsCopyBtn").addEventListener("click", ()=>{
    Account.copyToClipboard(window.CURRENT_ACCOUNT.referral_code, "Referral code copied.");
  });
  document.getElementById("referralsShareBtn").addEventListener("click", ()=>{
    const link = `${window.location.origin}/account.html?ref=${window.CURRENT_ACCOUNT.referral_code}`;
    Account.copyToClipboard(link, "Shareable link copied.");
  });

  Account.registerView("referrals", render);
})();
