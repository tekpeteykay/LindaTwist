/**
 * ============================================================
 * ADMIN — users.js
 * ------------------------------------------------------------
 * Shows BOTH staff (profiles table) and customers (customer_accounts
 * table) in one list, since "see all users" means both audiences.
 * Only visible/actionable for admins — matches the role model set
 * up in Settings → Admin Users from the start.
 *
 * "Remove" here revokes dashboard/account access (deletes their
 * profiles or customer_accounts row) — it does NOT delete their
 * actual Supabase Auth login. A true full deletion needs the
 * service-role key, which must never run in browser code; the
 * README explains the one-click way to do that from the Supabase
 * dashboard when a full removal is genuinely needed.
 * ============================================================ */
(function(){
  "use strict";
  let currentIsAdmin = false;
  let staffRows = [], customerRows = [];
  let typeFilter = "";

  async function render(){
    const wrap = document.getElementById("usersTableWrap");
    const navBtn = document.getElementById("navUsersBtn");
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage users.</div>`; return; }

    try{
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data: me } = await supabaseClient.from("profiles").select("role").eq("id", session.user.id).single();
      currentIsAdmin = me && me.role === "admin";
      navBtn.style.display = currentIsAdmin ? "flex" : "none";

      if(!currentIsAdmin){
        wrap.innerHTML = `<div class="empty-state">Only Admins can view this page.</div>`;
        return;
      }

      const [staffRes, customersRes] = await Promise.all([
        supabaseClient.from("profiles").select("*").order("created_at"),
        supabaseClient.from("customer_accounts").select("*").order("created_at")
      ]);
      if(staffRes.error) throw staffRes.error;
      if(customersRes.error) throw customersRes.error;

      staffRows = (staffRes.data || []).map(u => ({ ...u, _type: "staff" }));
      customerRows = (customersRes.data || []).map(u => ({ ...u, _type: "customer" }));

      draw(session.user.id);
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load users: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(myId){
    const wrap = document.getElementById("usersTableWrap");
    let list = [...staffRows, ...customerRows];
    if(typeFilter) list = list.filter(u => u._type === typeFilter);
    list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

    if(!list.length){ wrap.innerHTML = `<div class="empty-state">No users found.</div>`; return; }

    wrap.innerHTML = `
      <div class="toolbar" style="margin-bottom:16px;">
        <select id="userTypeFilter">
          <option value="">All users</option>
          <option value="staff">Staff only</option>
          <option value="customer">Customers only</option>
        </select>
      </div>
      <table class="a-table">
        <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Role / Phone</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          ${list.map(u => rowHtml(u, myId)).join("")}
        </tbody>
      </table>
    `;

    document.getElementById("userTypeFilter").value = typeFilter;
    document.getElementById("userTypeFilter").addEventListener("change", (e)=>{ typeFilter = e.target.value; draw(myId); });

    list.forEach(u=>{
      const row = wrap.querySelector(`tr[data-id="${u.id}"][data-type="${u._type}"]`);
      if(!row) return;

      if(u._type === "staff"){
        const select = row.querySelector(".roleSelect");
        if(select && !select.disabled){
          select.addEventListener("change", async ()=>{
            const { error } = await supabaseClient.from("profiles").update({ role: select.value }).eq("id", u.id);
            if(error){ Admin.toast(error.message, "error"); return; }
            Admin.toast("Role updated.");
          });
        }
      }

      const removeBtn = row.querySelector('[data-act="remove"]');
      if(removeBtn){
        removeBtn.addEventListener("click", ()=> removeUser(u, myId));
      }
    });
  }

  function rowHtml(u, myId){
    const isSelf = u.id === myId;
    if(u._type === "staff"){
      return `
        <tr data-id="${u.id}" data-type="staff">
          <td class="cell-primary">${Admin.esc(u.full_name || "—")}</td>
          <td>${Admin.esc(u.email)}</td>
          <td><span class="badge badge-neutral">Staff</span></td>
          <td>
            <select class="roleSelect" ${isSelf ? "disabled title=\"You can't change your own role\"" : ""}>
              ${["staff","manager","admin"].map(r=>`<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}
            </select>
          </td>
          <td class="cell-sub">${Admin.fmtDate(u.created_at)}</td>
          <td style="text-align:right;">
            ${isSelf ? "" : `<button class="icon-btn danger" data-act="remove" title="Remove staff access">🗑</button>`}
          </td>
        </tr>`;
    }
    return `
      <tr data-id="${u.id}" data-type="customer">
        <td class="cell-primary">${Admin.esc(u.full_name || "—")}</td>
        <td>${Admin.esc(u.email)}</td>
        <td><span class="badge badge-success">Customer</span></td>
        <td class="cell-sub">${Admin.esc(u.phone || "—")}${u.referral_code ? ` · ${Admin.esc(u.referral_code)}` : ""}</td>
        <td class="cell-sub">${Admin.fmtDate(u.created_at)}</td>
        <td style="text-align:right;">
          <button class="icon-btn danger" data-act="remove" title="Remove customer access">🗑</button>
        </td>
      </tr>`;
  }

  async function removeUser(u, myId){
    const table = u._type === "staff" ? "profiles" : "customer_accounts";
    const ok = await Admin.confirmDialog({
      title: `Remove ${u._type === "staff" ? "staff" : "customer"} access?`,
      body: `This revokes ${u.full_name || u.email}'s dashboard access immediately. Their login itself isn't deleted — to remove that entirely, use Supabase Dashboard → Authentication → Users. This action cannot be undone from here.`,
      confirmLabel: "Remove Access"
    });
    if(!ok) return;
    const { error } = await supabaseClient.from(table).delete().eq("id", u.id);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast("Access removed.");
    render();
  }

  Admin.registerView("users", render);

  // Also check once at startup so the sidebar item shows/hides correctly
  // even before the admin visits the Users tab.
  (async function initialCheck(){
    if(!SUPABASE_CONFIGURED) return;
    try{
      const { data: { session } } = await supabaseClient.auth.getSession();
      if(!session) return;
      const { data: me } = await supabaseClient.from("profiles").select("role").eq("id", session.user.id).single();
      document.getElementById("navUsersBtn").style.display = (me && me.role === "admin") ? "flex" : "none";
    } catch(e){ /* sidebar just stays hidden */ }
  })();
})();