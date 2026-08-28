/**
 * ============================================================
 * ADMIN — bookings.js
 * ------------------------------------------------------------
 * Covers both the "Bookings" list/detail view and the "Calendar"
 * month view — both read from the same `bookings` table.
 * ============================================================
 */
(function(){
  "use strict";

  let allBookings = [];
  let bSearch = "", bStatus = "";
  let calDate = new Date();

  const STATUS_BADGE = {
    pending: "badge-warning", confirmed: "badge-success", completed: "badge-neutral",
    cancelled: "badge-danger", no_show: "badge-danger"
  };
  const STATUS_LABEL = {
    pending: "Pending", confirmed: "Confirmed", completed: "Completed",
    cancelled: "Cancelled", no_show: "No-show"
  };

  /* ============================================================
     BOOKINGS LIST
     ============================================================ */
  async function renderBookings(){
    const wrap = document.getElementById("bookingsTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading bookings…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage bookings.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("bookings").select("*").order("appointment_date", { ascending: false }).order("created_at", { ascending: false });
      if(error) throw error;
      allBookings = data || [];
      drawBookingsTable();
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load bookings: ${Admin.esc(err.message)}</div>`;
    }
  }

  function drawBookingsTable(){
    const wrap = document.getElementById("bookingsTableWrap");
    let list = allBookings;
    if(bStatus) list = list.filter(b=>b.status===bStatus);
    if(bSearch){
      const q = bSearch.toLowerCase();
      list = list.filter(b => b.customer_name.toLowerCase().includes(q) || b.service_name.toLowerCase().includes(q) || b.customer_email.toLowerCase().includes(q));
    }
    if(!list.length){ wrap.innerHTML = `<div class="empty-state">No bookings yet.</div>`; return; }

    wrap.innerHTML = `
      <table class="a-table">
        <thead><tr><th>Customer</th><th>Service</th><th>Date &amp; Time</th><th>Status</th><th>Payment</th></tr></thead>
        <tbody>
          ${list.map(b=>`
            <tr class="clickable" data-id="${b.id}">
              <td class="cell-primary">${Admin.esc(b.customer_name)}<div class="cell-sub">${Admin.esc(b.customer_email)}</div></td>
              <td>${Admin.esc(b.service_name)}</td>
              <td>${Admin.fmtDate(b.appointment_date)} · ${Admin.esc(b.appointment_time)}</td>
              <td><span class="badge ${STATUS_BADGE[b.status]||"badge-neutral"}">${STATUS_LABEL[b.status]||b.status}</span></td>
              <td><span class="badge badge-neutral">${(b.payment_status||"unpaid").replace("_"," ")}</span></td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach(row=>{
      row.addEventListener("click", ()=> openBookingDetail(allBookings.find(b=>b.id===row.dataset.id)));
    });
  }

  document.getElementById("bookingsSearch").addEventListener("input", e=>{ bSearch = e.target.value; drawBookingsTable(); });
  document.getElementById("bookingsStatusFilter").addEventListener("change", e=>{ bStatus = e.target.value; drawBookingsTable(); });

  function openBookingDetail(b){
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>Booking Details</h2>

        <div class="form-section-title">Customer</div>
        <p style="font-size:14px;"><b>${Admin.esc(b.customer_name)}</b><br>${Admin.esc(b.customer_email)}<br>${Admin.esc(b.customer_phone||"—")}</p>

        <div class="form-section-title">Service</div>
        <p style="font-size:14px;">${Admin.esc(b.service_name)} ${b.category_name?`· ${Admin.esc(b.category_name)}`:""}<br>${Admin.esc(b.duration_text||"")} · ${Admin.esc(b.price_text||"")}</p>

        <div class="form-section-title">Appointment</div>
        <p style="font-size:14px;">${Admin.fmtDate(b.appointment_date,{weekday:"long",month:"long",day:"numeric",year:"numeric"})} at ${Admin.esc(b.appointment_time)}</p>

        <div class="form-section-title">Status</div>
        <div class="form-grid">
          <div class="field"><label>Booking status</label><select id="bdStatus">${Object.keys(STATUS_LABEL).map(s=>`<option value="${s}" ${s===b.status?"selected":""}>${STATUS_LABEL[s]}</option>`).join("")}</select></div>
          <div class="field"><label>Payment status</label><select id="bdPayment">${["unpaid","deposit_paid","partially_paid","paid","refunded"].map(p=>`<option value="${p}" ${p===b.payment_status?"selected":""}>${p.replace("_"," ")}</option>`).join("")}</select></div>
        </div>

        <div class="field"><label>Customer notes</label><p style="font-size:13.5px; color:var(--a-ink-soft);">${Admin.esc(b.customer_notes||"—")}</p></div>
        <div class="field"><label>Admin notes (private)</label><textarea id="bdAdminNotes" rows="3">${Admin.esc(b.admin_notes||"")}</textarea></div>
      </div>
      <div class="drawer-actions" style="justify-content:space-between;">
        <a class="btn-ghost" href="mailto:${b.customer_email}?subject=${encodeURIComponent("Your Linda Twist appointment")}">Contact Customer</a>
        <div style="display:flex; gap:10px;">
          <button class="btn-danger" id="bdDelete">Cancel &amp; Remove</button>
          <button class="btn-admin btn-solid" id="bdSave">Save Changes</button>
        </div>
      </div>
    `;
    const { close } = Admin.openModal(form, { wide: true });

    form.querySelector("#bdSave").addEventListener("click", async ()=>{
      const payload = {
        status: form.querySelector("#bdStatus").value,
        payment_status: form.querySelector("#bdPayment").value,
        admin_notes: form.querySelector("#bdAdminNotes").value.trim()
      };
      const { error } = await supabaseClient.from("bookings").update(payload).eq("id", b.id);
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast("Booking updated.");
      logActivity("booking_updated", `${b.customer_name}'s booking marked ${STATUS_LABEL[payload.status]}.`);
      close();
      renderBookings();
    });

    form.querySelector("#bdDelete").addEventListener("click", async ()=>{
      const ok = await Admin.confirmDialog({
        title: "Cancel this appointment?",
        body: `This cancels ${b.customer_name}'s booking. This cannot be undone.`,
        confirmLabel: "Cancel Appointment"
      });
      if(!ok) return;
      const { error } = await supabaseClient.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast("Appointment cancelled.");
      close();
      renderBookings();
    });
  }

  /* ============================================================
     CALENDAR (month view)
     ============================================================ */
  async function renderCalendar(){
    document.getElementById("calLabel").textContent = calDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const grid = document.getElementById("calGrid");
    grid.innerHTML = `<div class="loading-state">Loading calendar…</div>`;
    if(!SUPABASE_CONFIGURED){ grid.innerHTML = `<div class="empty-state">Connect Supabase to see the calendar.</div>`; return; }

    try{
      const year = calDate.getFullYear(), month = calDate.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .gte("appointment_date", monthStart.toISOString().split("T")[0])
        .lte("appointment_date", monthEnd.toISOString().split("T")[0]);
      if(error) throw error;

      const byDate = {};
      (data||[]).forEach(b=>{ (byDate[b.appointment_date] = byDate[b.appointment_date]||[]).push(b); });

      const firstWeekday = monthStart.getDay();
      const daysInMonth = monthEnd.getDate();

      let cells = "";
      for(let i=0;i<firstWeekday;i++) cells += `<div class="cal-cell cal-empty"></div>`;
      for(let d=1; d<=daysInMonth; d++){
        const dateStr = new Date(year, month, d).toISOString().split("T")[0];
        const dayBookings = byDate[dateStr] || [];
        cells += `
          <div class="cal-cell">
            <div class="cal-day-num">${d}</div>
            ${dayBookings.slice(0,3).map(b=>`<div class="cal-chip cal-${b.status}" data-id="${b.id}" title="${Admin.esc(b.customer_name)} — ${Admin.esc(b.service_name)}">${Admin.esc(b.appointment_time)} ${Admin.esc(b.customer_name)}</div>`).join("")}
            ${dayBookings.length>3 ? `<div class="cal-more">+${dayBookings.length-3} more</div>` : ""}
          </div>`;
      }

      grid.innerHTML = `
        <style>
          .cal-grid-inner{ display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
          .cal-weekday{ font-size:11px; font-weight:700; text-transform:uppercase; color:var(--a-ink-soft); text-align:center; padding-bottom:6px; }
          .cal-cell{ background:var(--a-surface); border:1px solid var(--a-border); border-radius:8px; min-height:96px; padding:8px; font-size:11.5px; }
          .cal-empty{ background:transparent; border:none; }
          .cal-day-num{ font-weight:700; margin-bottom:6px; }
          .cal-chip{ padding:3px 6px; border-radius:5px; margin-bottom:3px; font-size:10.5px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .cal-pending{ background:var(--a-warning-tint); color:var(--a-warning); }
          .cal-confirmed{ background:var(--a-success-tint); color:var(--a-success); }
          .cal-completed{ background:var(--a-bg); color:var(--a-ink-soft); }
          .cal-cancelled, .cal-no_show{ background:var(--a-danger-tint); color:var(--a-danger); text-decoration:line-through; }
          .cal-more{ font-size:10px; color:var(--a-ink-soft); }
        </style>
        <div class="cal-grid-inner">
          ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="cal-weekday">${d}</div>`).join("")}
          ${cells}
        </div>
      `;
      grid.querySelectorAll(".cal-chip").forEach(chip=>{
        chip.addEventListener("click", ()=> openBookingDetail((data||[]).find(b=>b.id===chip.dataset.id)));
      });
    } catch(err){
      grid.innerHTML = `<div class="error-state">Couldn't load calendar: ${Admin.esc(err.message)}</div>`;
    }
  }

  document.getElementById("calPrev").addEventListener("click", ()=>{ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
  document.getElementById("calNext").addEventListener("click", ()=>{ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
  document.getElementById("calToday").addEventListener("click", ()=>{ calDate = new Date(); renderCalendar(); });

  async function logActivity(type, description){
    if(!SUPABASE_CONFIGURED) return;
    try{ await supabaseClient.from("activity_logs").insert({ type, description }); } catch(e){}
  }

  Admin.registerView("bookings", renderBookings);
  Admin.registerView("calendar", renderCalendar);
})();
