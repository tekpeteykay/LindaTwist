/**
 * ============================================================
 * ADMIN — promotions.js
 * ============================================================
 */
(function(){
  "use strict";
  let items = [];

  function isLive(p){
    const today = new Date().toISOString().split("T")[0];
    return p.active && (!p.start_date || p.start_date <= today) && (!p.end_date || p.end_date >= today);
  }

  async function render(){
    const grid = document.getElementById("promotionsGrid");
    grid.innerHTML = `<div class="loading-state">Loading promotions…</div>`;
    if(!SUPABASE_CONFIGURED){ grid.innerHTML = `<div class="empty-state">Connect Supabase to manage promotions.</div>`; return; }
    try{
      const { data, error } = await supabaseClient.from("promotions").select("*").order("created_at", { ascending: false });
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      grid.innerHTML = `<div class="error-state">Couldn't load promotions: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const grid = document.getElementById("promotionsGrid");
    if(!items.length){ grid.innerHTML = `<div class="empty-state">No promotions yet — click “+ Add Promotion” to create a seasonal offer.</div>`; return; }
    grid.innerHTML = "";
    items.forEach(p=>{
      const discount = p.discount_type === "percentage" ? `${p.discount_amount}% off` : `${Admin.money(p.discount_amount)} off`;
      const card = Admin.el("div", { class: "item-card" });
      card.innerHTML = `
        <div class="thumb" style="background-image:url('${p.image_url||""}')">
          <div class="flags">${isLive(p) ? '<span class="badge badge-success">Live now</span>' : (p.active ? '<span class="badge badge-warning">Scheduled/Expired</span>' : '<span class="badge badge-neutral">Inactive</span>')}</div>
        </div>
        <div class="body">
          <div class="t">${Admin.esc(p.title)}</div>
          <div class="s">${discount}${p.promo_code ? ` · Code: ${Admin.esc(p.promo_code)}` : ""}</div>
          <div class="s">${p.start_date?Admin.fmtDate(p.start_date):"No start"} → ${p.end_date?Admin.fmtDate(p.end_date):"No end"}</div>
        </div>
        <div class="foot">
          <button class="btn-ghost" data-act="edit">Edit</button>
          <div style="display:flex; gap:4px;">
            <button class="icon-btn" data-act="toggle" title="${p.active?"Deactivate":"Activate"}">${p.active?"⏸":"▶"}</button>
            <button class="icon-btn danger" data-act="delete">🗑</button>
          </div>
        </div>
      `;
      card.querySelector('[data-act="edit"]').addEventListener("click", ()=> openEditor(p));
      card.querySelector('[data-act="toggle"]').addEventListener("click", async ()=>{
        await supabaseClient.from("promotions").update({ active: !p.active }).eq("id", p.id);
        render();
      });
      card.querySelector('[data-act="delete"]').addEventListener("click", async ()=>{
        const ok = await Admin.confirmDialog({ title: "Delete Promotion?", body: `This removes "${p.title}" permanently.`, confirmLabel: "Delete" });
        if(!ok) return;
        await supabaseClient.from("promotions").delete().eq("id", p.id);
        Admin.toast("Promotion deleted.");
        render();
      });
      grid.appendChild(card);
    });
  }

  document.getElementById("addPromotionBtn").addEventListener("click", ()=> openEditor(null));

  function openEditor(p){
    const isEdit = !!p;
    let imageUrl = p ? p.image_url : null;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit?"Edit":"Add"} Promotion</h2>
        <div class="field"><label>Title</label><input type="text" id="pTitle" placeholder="e.g. Valentine's Special"></div>
        <div class="field"><label>Description</label><textarea id="pDesc" rows="2"></textarea></div>
        <div class="form-grid">
          <div class="field"><label>Discount type</label><select id="pType"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></div>
          <div class="field"><label>Discount amount</label><input type="number" step="0.01" id="pAmount"></div>
          <div class="field"><label>Promo code (optional)</label><input type="text" id="pCode" placeholder="e.g. LOVE20"></div>
          <div class="field"></div>
          <div class="field"><label>Start date (optional)</label><input type="date" id="pStart"></div>
          <div class="field"><label>End date (optional)</label><input type="date" id="pEnd"></div>
        </div>
        <div class="field"><label>Image</label><div class="image-drop" id="pImageDrop"><input type="file" accept="image/*" id="pImageInput"><div class="hint">Click or drag an image here</div></div></div>
        <div class="switch-row"><div class="lbl">Active</div><label class="switch"><input type="checkbox" id="pActive" checked><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions"><button class="btn-ghost" id="pCancel">Cancel</button><button class="btn-admin btn-solid" id="pSave">Save</button></div>
    `;
    const { close } = Admin.openModal(form, { wide: true });

    Admin.wireImageDrop(form.querySelector("#pImageDrop"), form.querySelector("#pImageInput"), {
      existingUrl: imageUrl,
      onFile: async (file, dropEl)=>{
        try{ imageUrl = await Admin.uploadImage(file, "promotions"); dropEl.querySelector(".hint").textContent = "Uploaded ✓ (click to replace)"; }
        catch(err){ Admin.toast(err.message, "error"); }
      }
    });

    if(p){
      form.querySelector("#pTitle").value = p.title;
      form.querySelector("#pDesc").value = p.description||"";
      form.querySelector("#pType").value = p.discount_type;
      form.querySelector("#pAmount").value = p.discount_amount;
      form.querySelector("#pCode").value = p.promo_code||"";
      form.querySelector("#pStart").value = p.start_date||"";
      form.querySelector("#pEnd").value = p.end_date||"";
      form.querySelector("#pActive").checked = p.active;
    }

    form.querySelector("#pCancel").addEventListener("click", close);
    form.querySelector("#pSave").addEventListener("click", async ()=>{
      const title = form.querySelector("#pTitle").value.trim();
      const amount = parseFloat(form.querySelector("#pAmount").value);
      if(!title){ Admin.toast("Title is required.", "error"); return; }
      if(isNaN(amount)){ Admin.toast("Discount amount must be a number.", "error"); return; }
      const payload = {
        title,
        description: form.querySelector("#pDesc").value.trim(),
        discount_type: form.querySelector("#pType").value,
        discount_amount: amount,
        promo_code: form.querySelector("#pCode").value.trim() || null,
        start_date: form.querySelector("#pStart").value || null,
        end_date: form.querySelector("#pEnd").value || null,
        image_url: imageUrl,
        active: form.querySelector("#pActive").checked
      };
      const query = isEdit ? supabaseClient.from("promotions").update(payload).eq("id", p.id) : supabaseClient.from("promotions").insert(payload);
      const { error } = await query;
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast(isEdit ? "Promotion updated." : "Promotion added.");
      close();
      render();
    });
  }

  Admin.registerView("promotions", render);
})();
