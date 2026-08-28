/**
 * ============================================================
 * ADMIN — faqs.js
 * ============================================================
 */
(function(){
  "use strict";
  let items = [];

  async function render(){
    const wrap = document.getElementById("faqsTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading FAQs…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage FAQs.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("faqs").select("*").order("sort_order");
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load FAQs: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const wrap = document.getElementById("faqsTableWrap");
    if(!items.length){ wrap.innerHTML = `<div class="empty-state">No FAQs yet.</div>`; return; }
    wrap.innerHTML = `
      <table class="a-table">
        <thead><tr><th style="width:40px;">Order</th><th>Question</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${items.map((f,i)=>`
            <tr data-id="${f.id}">
              <td>
                <button class="icon-btn" data-act="up" ${i===0?"disabled":""}>↑</button>
                <button class="icon-btn" data-act="down" ${i===items.length-1?"disabled":""}>↓</button>
              </td>
              <td class="cell-primary">${Admin.esc(f.question)}</td>
              <td>${f.published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-neutral">Hidden</span>'}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="icon-btn" data-act="edit">✎</button>
                <button class="icon-btn danger" data-act="delete">🗑</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach(row=>{
      const idx = items.findIndex(i=>i.id===row.dataset.id);
      const f = items[idx];
      row.querySelector('[data-act="edit"]').addEventListener("click", ()=> openEditor(f));
      row.querySelector('[data-act="delete"]').addEventListener("click", async ()=>{
        const ok = await Admin.confirmDialog({ title: "Delete FAQ?", body: "This cannot be undone.", confirmLabel: "Delete" });
        if(!ok) return;
        await supabaseClient.from("faqs").delete().eq("id", f.id);
        Admin.toast("FAQ deleted.");
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
    await Promise.all(items.map((it,i)=> supabaseClient.from("faqs").update({ sort_order: i }).eq("id", it.id)));
  }

  document.getElementById("addFaqBtn").addEventListener("click", ()=> openEditor(null));

  function openEditor(f){
    const isEdit = !!f;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit?"Edit":"Add"} FAQ</h2>
        <div class="field"><label>Question</label><input type="text" id="faqQ"></div>
        <div class="field"><label>Answer</label><textarea id="faqA" rows="4"></textarea></div>
        <div class="switch-row"><div class="lbl">Published</div><label class="switch"><input type="checkbox" id="faqPub" checked><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions"><button class="btn-ghost" id="faqCancel">Cancel</button><button class="btn-admin btn-solid" id="faqSave">Save</button></div>
    `;
    const { close } = Admin.openModal(form);
    if(f){
      form.querySelector("#faqQ").value = f.question;
      form.querySelector("#faqA").value = f.answer;
      form.querySelector("#faqPub").checked = f.published;
    }
    form.querySelector("#faqCancel").addEventListener("click", close);
    form.querySelector("#faqSave").addEventListener("click", async ()=>{
      const question = form.querySelector("#faqQ").value.trim();
      const answer = form.querySelector("#faqA").value.trim();
      if(!question || !answer){ Admin.toast("Question and answer are both required.", "error"); return; }
      const payload = { question, answer, published: form.querySelector("#faqPub").checked, sort_order: isEdit ? f.sort_order : items.length };
      const query = isEdit ? supabaseClient.from("faqs").update(payload).eq("id", f.id) : supabaseClient.from("faqs").insert(payload);
      const { error } = await query;
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast(isEdit ? "FAQ updated." : "FAQ added.");
      close();
      render();
    });
  }

  Admin.registerView("faqs", render);
})();
