/**
 * ============================================================
 * ACCOUNT — dashboard.js (Overview tab)
 * ============================================================
 */
(function(){
  "use strict";

  async function render(){
    const account = window.CURRENT_ACCOUNT;
    document.getElementById("overviewReferralCode").textContent = account.referral_code;

    const upcomingWrap = document.getElementById("upcomingContent");
    upcomingWrap.innerHTML = `<div class="body-md">Loading…</div>`;

    try{
      const todayStr = new Date().toISOString().split("T")[0];
      const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("customer_id", account.id)
        .gte("appointment_date", todayStr)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(1);
      if(error) throw error;

      if(data && data[0]){
        const b = data[0];
        upcomingWrap.innerHTML = `
          <p class="display-md" style="font-size:1.3rem;">${Account.esc(b.service_name)}</p>
          <p class="body-md" style="margin-top:6px;">${Account.fmtDate(b.appointment_date, { weekday:"long", month:"long", day:"numeric" })} at ${Account.esc(b.appointment_time)}</p>
        `;
      } else {
        upcomingWrap.innerHTML = `<p class="body-md">No upcoming appointments yet. <a href="index.html#booking" class="link-underline">Book one now →</a></p>`;
      }
    } catch(err){
      upcomingWrap.innerHTML = `<p class="body-md">Couldn't load your appointments right now.</p>`;
    }
  }

  document.getElementById("overviewCopyBtn").addEventListener("click", ()=>{
    Account.copyToClipboard(window.CURRENT_ACCOUNT.referral_code, "Referral code copied.");
  });

  Account.registerView("overview", render);
})();
