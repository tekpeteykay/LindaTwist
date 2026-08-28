/**
 * ============================================================
 * ADMIN — messages.js
 * ============================================================
 */
(function(){
  "use strict";
  let items = [], search = "", statusFilter = "";

  async function render(){
    const wrap = document.getElementById("messagesTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading messages…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to see enquiries.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("messages").select("*").order("created_at", { ascending: false });
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load messages: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const wrap = document.getElementById("messagesTableWrap");
    let list = items;
    if(statusFilter) list = list.filter(m=>m.status===statusFilter);
    if(search){
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if(!list.length){ wrap.innerHTML = `<div class="empty-state">No messages yet.</div>`; return; }

    wrap.innerHTML = `
      <table class="a-table">
        <thead><tr><th>From</th><th>Message</th><th>Received</th><th>Status</th></tr></thead>
        <tbody>
          ${list.map(m=>`
            <tr class="clickable" data-id="${m.id}" style="${m.status==='new'?'font-weight:600;':''}">
              <td class="cell-primary">${Admin.esc(m.name)}<div class="cell-sub">${Admin.esc(m.email)}</div></td>
              <td style="max-width:360px;">${Admin.esc((m.message||"").slice(0,90))}${(m.message||"").length>90?"…":""}</td>
              <td class="cell-sub">${Admin.fmtDateTime(m.created_at)}</td>
              <td>${statusBadge(m.status)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach(row=>{
      row.addEventListener("click", ()=> openDetail(items.find(m=>m.id===row.dataset.id)));
    });
  }

  function statusBadge(status){
    const map = { new: "badge-warning", read: "badge-neutral", replied: "badge-success", archived: "badge-neutral" };
    return `<span class="badge ${map[status]||"badge-neutral"}">${status}</span>`;
  }

  document.getElementById("messagesSearch").addEventListener("input", e=>{ search = e.target.value; draw(); });
  document.getElementById("messagesStatusFilter").addEventListener("change", e=>{ statusFilter = e.target.value; draw(); });

  async function openDetail(m){
    if(m.status === "new"){
      await supabaseClient.from("messages").update({ status: "read" }).eq("id", m.id);
      m.status = "read";
    }
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>Message from ${Admin.esc(m.name)}</h2>
        <p style="font-size:13px; color:var(--a-ink-soft); margin-bottom:16px;">${Admin.esc(m.email)} ${m.phone?` · ${Admin.esc(m.phone)}`:""} · ${Admin.fmtDateTime(m.created_at)}</p>
        <p style="font-size:14.5px; line-height:1.6; padding:16px; background:var(--a-bg); border-radius:8px;">${Admin.esc(m.message)}</p>
      </div>
      <div class="drawer-actions" style="justify-content:space-between;">
        <a class="btn-ghost" href="mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Linda Twist")}">Reply by Email</a>
        <div style="display:flex; gap:10px;">
          <button class="btn-ghost" id="mArchive">Archive</button>
          <button class="btn-admin btn-solid" id="mReplied">Mark as Replied</button>
        </div>
      </div>
    `;
    const { close } = Admin.openModal(form, { wide: true });
    form.querySelector("#mArchive").addEventListener("click", async ()=>{
      await supabaseClient.from("messages").update({ status: "archived" }).eq("id", m.id);
      Admin.toast("Message archived.");
      close();
      render();
    });
    form.querySelector("#mReplied").addEventListener("click", async ()=>{
      await supabaseClient.from("messages").update({ status: "replied" }).eq("id", m.id);
      Admin.toast("Marked as replied.");
      close();
      render();
    });
  }

  Admin.registerView("messages", render);
})();
