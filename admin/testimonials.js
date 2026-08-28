/**
 * ============================================================
 * ADMIN — testimonials.js
 * ============================================================
 */
(function(){
  "use strict";
  let items = [];

  async function render(){
    const wrap = document.getElementById("testimonialsTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading testimonials…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage testimonials.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("testimonials").select("*").order("sort_order");
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load testimonials: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const wrap = document.getElementById("testimonialsTableWrap");
    if(!items.length){ wrap.innerHTML = `<div class="empty-state">No testimonials yet.</div>`; return; }
    wrap.innerHTML = `
      <table class="a-table">
        <thead><tr><th>Customer</th><th>Quote</th><th>Rating</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${items.map(t=>`
            <tr data-id="${t.id}">
              <td class="cell-primary">${Admin.esc(t.customer_name)}<div class="cell-sub">${Admin.esc(t.service||"")}</div></td>
              <td style="max-width:340px;">${Admin.esc(t.quote)}</td>
              <td>${"★".repeat(t.rating)}${"☆".repeat(5-t.rating)}</td>
              <td>${t.published ? '<span class="badge badge-success">Published</span>' : '<span class="badge badge-neutral">Hidden</span>'}${t.featured?' <span class="badge badge-warning">Featured</span>':''}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="icon-btn" data-act="edit">✎</button>
                <button class="icon-btn" data-act="toggle">${t.published?"Hide":"Show"}</button>
                <button class="icon-btn danger" data-act="delete">🗑</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("tr[data-id]").forEach(row=>{
      const t = items.find(i=>i.id===row.dataset.id);
      row.querySelector('[data-act="edit"]').addEventListener("click", ()=> openEditor(t));
      row.querySelector('[data-act="toggle"]').addEventListener("click", async ()=>{
        await supabaseClient.from("testimonials").update({ published: !t.published }).eq("id", t.id);
        render();
      });
      row.querySelector('[data-act="delete"]').addEventListener("click", async ()=>{
        const ok = await Admin.confirmDialog({ title: "Delete Testimonial?", body: "This cannot be undone.", confirmLabel: "Delete" });
        if(!ok) return;
        await supabaseClient.from("testimonials").delete().eq("id", t.id);
        Admin.toast("Testimonial deleted.");
        render();
      });
    });
  }

  document.getElementById("addTestimonialBtn").addEventListener("click", ()=> openEditor(null));

  function openEditor(t){
    const isEdit = !!t;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit?"Edit":"Add"} Testimonial</h2>
        <div class="field"><label>Customer name</label><input type="text" id="tName"></div>
        <div class="field"><label>Testimonial</label><textarea id="tQuote" rows="3"></textarea></div>
        <div class="form-grid">
          <div class="field"><label>Service used</label><input type="text" id="tService"></div>
          <div class="field"><label>Rating</label><select id="tRating">${[5,4,3,2,1].map(n=>`<option value="${n}">${n} star${n>1?"s":""}</option>`).join("")}</select></div>
        </div>
        <div class="switch-row"><div class="lbl">Published</div><label class="switch"><input type="checkbox" id="tPublished" checked><span class="track"></span></label></div>
        <div class="switch-row"><div class="lbl">Featured</div><label class="switch"><input type="checkbox" id="tFeatured"><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions"><button class="btn-ghost" id="tCancel">Cancel</button><button class="btn-admin btn-solid" id="tSave">Save</button></div>
    `;
    const { close } = Admin.openModal(form);
    if(t){
      form.querySelector("#tName").value = t.customer_name;
      form.querySelector("#tQuote").value = t.quote;
      form.querySelector("#tService").value = t.service||"";
      form.querySelector("#tRating").value = t.rating;
      form.querySelector("#tPublished").checked = t.published;
      form.querySelector("#tFeatured").checked = t.featured;
    }
    form.querySelector("#tCancel").addEventListener("click", close);
    form.querySelector("#tSave").addEventListener("click", async ()=>{
      const customer_name = form.querySelector("#tName").value.trim();
      const quote = form.querySelector("#tQuote").value.trim();
      if(!customer_name || !quote){ Admin.toast("Name and testimonial text are required.", "error"); return; }
      const payload = {
        customer_name, quote,
        service: form.querySelector("#tService").value.trim(),
        rating: parseInt(form.querySelector("#tRating").value),
        published: form.querySelector("#tPublished").checked,
        featured: form.querySelector("#tFeatured").checked
      };
      const query = isEdit ? supabaseClient.from("testimonials").update(payload).eq("id", t.id) : supabaseClient.from("testimonials").insert(payload);
      const { error } = await query;
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast(isEdit ? "Testimonial updated." : "Testimonial added.");
      close();
      render();
    });
  }

  Admin.registerView("testimonials", render);
})();
