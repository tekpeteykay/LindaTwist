/**
 * ============================================================
 * ADMIN — dashboard.js
 * ------------------------------------------------------------
 * All numbers here come straight from the `bookings` and
 * `activity_logs` tables — nothing is fabricated. If there's no
 * data yet, the widgets say so plainly instead of showing zeros
 * that could be mistaken for real activity.
 * ============================================================
 */
(function(){
  "use strict";

  function parsePrice(text){
    if(!text) return 0;
    const n = parseFloat(String(text).replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  async function render(){
    const kpiGrid = document.getElementById("kpiGrid");
    const activityFeed = document.getElementById("activityFeed");
    const popularServices = document.getElementById("popularServices");

    kpiGrid.innerHTML = `<div class="loading-state">Loading dashboard…</div>`;
    activityFeed.innerHTML = `<div class="loading-state">Loading…</div>`;
    popularServices.innerHTML = `<div class="loading-state">Loading…</div>`;

    if(!SUPABASE_CONFIGURED){
      kpiGrid.innerHTML = `<div class="empty-state">Connect Supabase to see live dashboard data.</div>`;
      activityFeed.innerHTML = "";
      popularServices.innerHTML = "";
      return;
    }

    try{
      const [bookingsRes, activityRes] = await Promise.all([
        supabaseClient.from("bookings").select("*").order("created_at", { ascending: false }),
        supabaseClient.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10)
      ]);
      if(bookingsRes.error) throw bookingsRes.error;

      const bookings = bookingsRes.data || [];
      const todayStr = new Date().toISOString().split("T")[0];
      const todayBookings = bookings.filter(b => b.appointment_date === todayStr);

      const confirmed = todayBookings.filter(b => b.status === "confirmed").length;
      const pending = todayBookings.filter(b => b.status === "pending").length;
      const cancelled = todayBookings.filter(b => b.status === "cancelled").length;

      const upcoming = bookings
        .filter(b => b.appointment_date >= todayStr && b.status !== "cancelled")
        .sort((a,b)=> (a.appointment_date+a.appointment_time).localeCompare(b.appointment_date+b.appointment_time));

      const revenue = bookings
        .filter(b => ["confirmed","completed"].includes(b.status))
        .reduce((sum,b)=> sum + parsePrice(b.price_text), 0);

      const uniqueCustomers = new Set(bookings.map(b=>b.customer_email));
      const thisMonth = new Date().toISOString().slice(0,7);
      const newCustomerEmails = new Set(
        bookings.filter(b => (b.created_at||"").slice(0,7) === thisMonth).map(b=>b.customer_email)
      );

      kpiGrid.innerHTML = "";
      kpiGrid.appendChild(kpiCard("Today's Bookings", todayBookings.length, [
        `<b>${confirmed}</b> confirmed`, `<b>${pending}</b> pending`, `<b>${cancelled}</b> cancelled`
      ]));
      kpiGrid.appendChild(kpiCard("Upcoming Appointments", upcoming.length, [
        upcoming[0] ? `Next: <b>${Admin.fmtDate(upcoming[0].appointment_date)}</b> at ${upcoming[0].appointment_time}` : "Nothing scheduled yet"
      ]));
      kpiGrid.appendChild(kpiCard("Revenue (confirmed+)", Admin.money(revenue), [
        `From <b>${bookings.filter(b=>["confirmed","completed"].includes(b.status)).length}</b> bookings`
      ]));
      kpiGrid.appendChild(kpiCard("Customers", uniqueCustomers.size, [
        `<b>${newCustomerEmails.size}</b> new this month`
      ]));

      // ---------------- Recent activity ----------------
      const activity = activityRes.data || [];
      activityFeed.innerHTML = activity.length
        ? activity.map(a => `
            <div class="activity-item">
              <div class="activity-dot"></div>
              <div>
                <div class="desc">${Admin.esc(a.description)}</div>
                <div class="time">${Admin.fmtDateTime(a.created_at)}</div>
              </div>
            </div>`).join("")
        : `<div class="empty-state">No activity yet.</div>`;

      // ---------------- Popular services ----------------
      const counts = {};
      bookings.forEach(b=>{ counts[b.service_name] = (counts[b.service_name]||0) + 1; });
      const ranked = Object.entries(counts).sort((a,b)=> b[1]-a[1]).slice(0,6);
      popularServices.innerHTML = ranked.length
        ? ranked.map(([name,count]) => `
            <div class="mini-row">
              <span class="r-name">${Admin.esc(name)}</span>
              <span class="r-meta">${count} booking${count===1?"":"s"}</span>
            </div>`).join("")
        : `<div class="empty-state">No bookings yet.</div>`;

    } catch(err){
      console.error(err);
      kpiGrid.innerHTML = `<div class="error-state">Couldn't load dashboard data. ${Admin.esc(err.message||"")}</div>`;
      activityFeed.innerHTML = "";
      popularServices.innerHTML = "";
    }
  }

  function kpiCard(label, value, subLines){
    const card = Admin.el("div", { class: "kpi-card" });
    card.innerHTML = `
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="sub">${subLines.map(s=>`<span>${s}</span>`).join("")}</div>
    `;
    return card;
  }

  Admin.registerView("dashboard", render);
})();
