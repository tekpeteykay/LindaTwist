/**
 * ============================================================
 * ADMIN — navigation.js
 * ============================================================
 */
(function(){
  "use strict";
  let items = [];

  async function render(){
    const wrap = document.getElementById("navTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading navigation…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage navigation.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("navigation_items").select("*").order("sort_order");
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load navigation: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const wrap = document.getElementById("navTableWrap");
    if(!items.length){ wrap.innerHTML = `<div class="empty-state">No navigation items yet.</div>`; return; }
    wrap.innerHTML = `
      <table class="a-table">
        <thead><tr><th style="width:70px;">Order</th><th>Label</th><th>Link</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${items.map((n,i)=>`
            <tr data-id="${n.id}">
              <td>
                <button class="icon-btn" data-act="up" ${i===0?"disabled":""}>↑</button>
                <button class="icon-btn" data-act="down" ${i===items.length-1?"disabled":""}>↓</button>
              </td>
              <td class="cell-primary">${Admin.esc(n.label)}</td>
              <td class="cell-sub">${Admin.esc(n.href)}</td>
              <td>${n.enabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-neutral">Hidden</span>'}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="icon-btn" data-act="edit">✎</button>
                <button class="icon-btn danger" data-act="delete">🗑</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach(row=>{
      const idx = items.findIndex(i=>i.id===row.dataset.id);
      const n = items[idx];
      row.querySelector('[data-act="edit"]').addEventListener("click", ()=> openEditor(n));
      row.querySelector('[data-act="delete"]').addEventListener("click", async ()=>{
        const ok = await Admin.confirmDialog({
          title: "Remove navigation item?",
          body: `"${n.label}" will disappear from the website's menu immediately. Make sure this isn't a link visitors rely on.`,
          confirmLabel: "Remove"
        });
        if(!ok) return;
        await supabaseClient.from("navigation_items").delete().eq("id", n.id);
        Admin.toast("Navigation item removed.");
        render();
      });
      const upBtn = row.querySelector('[data-act="up"]');
      const downBtn = row.querySelector('[data-act="down"]');
      if(upBtn) upBtn.addEventListener("click", ()=> reorder(idx, -1));
      if(downBtn) downBtn.addEventListener("click", ()=> reorder(idx, 1));
    });
  }

  async function reorder(index, dir){
    const j = index + dir;
    if(j < 0 || j >= items.length) return;
    [items[index], items[j]] = [items[j], items[index]];
    draw();
    await Promise.all(items.map((it,i)=> supabaseClient.from("navigation_items").update({ sort_order: i }).eq("id", it.id)));
  }

  document.getElementById("addNavItemBtn").addEventListener("click", ()=> openEditor(null));

  function openEditor(n){
    const isEdit = !!n;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit?"Edit":"Add"} Navigation Item</h2>
        <div class="field"><label>Label</label><input type="text" id="nLabel" placeholder="e.g. Gallery"></div>
        <div class="field"><label>Link</label><input type="text" id="nHref" placeholder="e.g. #gallery or https://…"></div>
        <div class="switch-row"><div class="lbl">Enabled</div><label class="switch"><input type="checkbox" id="nEnabled" checked><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions"><button class="btn-ghost" id="nCancel">Cancel</button><button class="btn-admin btn-solid" id="nSave">Save</button></div>
    `;
    const { close } = Admin.openModal(form);
    if(n){
      form.querySelector("#nLabel").value = n.label;
      form.querySelector("#nHref").value = n.href;
      form.querySelector("#nEnabled").checked = n.enabled;
    }
    form.querySelector("#nCancel").addEventListener("click", close);
    form.querySelector("#nSave").addEventListener("click", async ()=>{
      const label = form.querySelector("#nLabel").value.trim();
      const href = form.querySelector("#nHref").value.trim();
      if(!label || !href){ Admin.toast("Label and link are both required.", "error"); return; }
      const payload = { label, href, enabled: form.querySelector("#nEnabled").checked, sort_order: isEdit ? n.sort_order : items.length };
      const query = isEdit ? supabaseClient.from("navigation_items").update(payload).eq("id", n.id) : supabaseClient.from("navigation_items").insert(payload);
      const { error } = await query;
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast(isEdit ? "Navigation item updated." : "Navigation item added.");
      close();
      render();
    });
  }

  Admin.registerView("navigation", render);
})();
