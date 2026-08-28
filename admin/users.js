/**
 * ============================================================
 * ADMIN — users.js
 * ------------------------------------------------------------
 * Adding brand-new users still happens in the Supabase dashboard
 * (see README-CMS.md) — creating an auth user from the browser
 * with the anon key would sign the current admin out and swap
 * sessions to the new account, which is worse UX than one extra
 * step in Supabase. This screen covers the part that's safe and
 * useful client-side: viewing staff and changing their role.
 * ============================================================ */
(function(){
  "use strict";
  let currentIsAdmin = false;

  async function render(){
    const wrap = document.getElementById("usersTableWrap");
    const navBtn = document.getElementById("navUsersBtn");
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage admin users.</div>`; return; }

    try{
      const { data: { session } } = await supabaseClient.auth.getSession();
      const { data: me } = await supabaseClient.from("profiles").select("role").eq("id", session.user.id).single();
      currentIsAdmin = me && me.role === "admin";
      navBtn.style.display = currentIsAdmin ? "flex" : "none";

      if(!currentIsAdmin){
        wrap.innerHTML = `<div class="empty-state">Only Admins can view this page.</div>`;
        return;
      }

      const { data, error } = await supabaseClient.from("profiles").select("*").order("created_at");
      if(error) throw error;

      wrap.innerHTML = `
        <table class="a-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>
            ${data.map(u=>`
              <tr data-id="${u.id}">
                <td class="cell-primary">${Admin.esc(u.full_name || "—")}</td>
                <td>${Admin.esc(u.email)}</td>
                <td>
                  <select class="roleSelect" ${u.id===session.user.id?"disabled title='You can\\'t change your own role'":""}>
                    ${["staff","manager","admin"].map(r=>`<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}
                  </select>
                </td>
                <td class="cell-sub">${Admin.fmtDate(u.created_at)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll("tr[data-id]").forEach(row=>{
        const select = row.querySelector(".roleSelect");
        if(select.disabled) return;
        select.addEventListener("change", async ()=>{
          const newRole = select.value;
          const { error } = await supabaseClient.from("profiles").update({ role: newRole }).eq("id", row.dataset.id);
          if(error){ Admin.toast(error.message, "error"); return; }
          Admin.toast("Role updated.");
        });
      });
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load users: ${Admin.esc(err.message)}</div>`;
    }
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
