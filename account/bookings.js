/**
 * ============================================================
 * ACCOUNT — bookings.js (My Bookings tab)
 * ============================================================
 */
(function(){
  "use strict";

  let allBookings = [];
  let activeSub = "upcoming";

  async function render(){
    const wrap = document.getElementById("bookingsListWrap");
    wrap.innerHTML = `<div class="body-md">Loading your bookings…</div>`;
    try{
      const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .eq("customer_id", window.CURRENT_ACCOUNT.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });
      if(error) throw error;
      allBookings = data || [];
      draw();
    } catch(err){
      wrap.innerHTML = `<div class="body-md">Couldn't load your bookings right now.</div>`;
    }
  }

  function draw(){
    const wrap = document.getElementById("bookingsListWrap");
    const todayStr = new Date().toISOString().split("T")[0];

    const list = allBookings.filter(b=>{
      const isUpcoming = b.appointment_date >= todayStr && b.status !== "cancelled" && b.status !== "completed";
      return activeSub === "upcoming" ? isUpcoming : !isUpcoming;
    });

    if(!list.length){
      wrap.innerHTML = `<div class="dash-card"><p class="body-md">${activeSub === "upcoming" ? "No upcoming appointments." : "No past appointments yet."}</p></div>`;
      return;
    }

    wrap.innerHTML = "";
    list.forEach(b=>{
      const card = document.createElement("div");
      card.className = "cbooking-card";
      const canCancel = activeSub === "upcoming" && ["pending","confirmed"].includes(b.status);
      card.innerHTML = `
        <div class="cbooking-info">
          <div class="name">${Account.esc(b.service_name)}</div>
          <div class="meta">${Account.fmtDate(b.appointment_date, { month:"short", day:"numeric", year:"numeric" })} · ${Account.esc(b.appointment_time)} · ${statusLabel(b.status)}</div>
        </div>
        <div class="cbooking-actions">
          <button class="btn btn-outline btn-sm" data-act="reorder">Book Again</button>
          ${canCancel ? `<button class="btn btn-outline btn-sm" data-act="cancel" style="border-color:#8c3b32; color:#8c3b32;">Cancel</button>` : ""}
        </div>
      `;
      card.querySelector('[data-act="reorder"]').addEventListener("click", ()=> reorder(b));
      const cancelBtn = card.querySelector('[data-act="cancel"]');
      if(cancelBtn) cancelBtn.addEventListener("click", ()=> cancelBooking(b));
      wrap.appendChild(card);
    });
  }

  function statusLabel(s){
    return { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" }[s] || s;
  }

  function reorder(b){
    localStorage.setItem("ltReorder", JSON.stringify({
      service: { name: b.service_name, price: b.price_text, duration: b.duration_text },
      category: b.category_name
    }));
    window.location.href = "index.html#booking";
  }

  async function cancelBooking(b){
    const ok = confirm(`Cancel your ${b.service_name} appointment on ${new Date(b.appointment_date).toLocaleDateString()}?`);
    if(!ok) return;
    try{
      const { error } = await supabaseClient.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
      if(error) throw error;
      Account.toast("Appointment cancelled.");
      render();
    } catch(err){
      Account.toast("Couldn't cancel that appointment — please contact us directly.", "error");
    }
  }

  document.querySelectorAll("#bookingSubtabs button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll("#bookingSubtabs button").forEach(b=> b.classList.toggle("active", b===btn));
      activeSub = btn.dataset.sub;
      draw();
    });
  });

  Account.registerView("bookings", render);
})();
