/**
 * ============================================================
 * ADMIN — services.js
 * ------------------------------------------------------------
 * Covers both the "Services" and "Categories" sidebar views —
 * they share data (a service belongs to a category) so they're
 * kept together rather than split into two files.
 * ============================================================
 */
(function(){
  "use strict";

  let allServices = [];
  let allCategories = [];
  let searchTerm = "";
  let categoryFilter = "";

  /* ============================================================
     SERVICES
     ============================================================ */
  async function renderServices(){
    const grid = document.getElementById("servicesGrid");
    grid.innerHTML = `<div class="loading-state">Loading services…</div>`;
    if(!SUPABASE_CONFIGURED){ grid.innerHTML = `<div class="empty-state">Connect Supabase to manage services.</div>`; return; }

    try{
      const [svcRes, catRes] = await Promise.all([
        supabaseClient.from("services").select("*").order("sort_order"),
        supabaseClient.from("service_categories").select("*").order("sort_order")
      ]);
      if(svcRes.error) throw svcRes.error;
      if(catRes.error) throw catRes.error;
      allServices = svcRes.data || [];
      allCategories = catRes.data || [];

      const filterSelect = document.getElementById("servicesCategoryFilter");
      filterSelect.innerHTML = `<option value="">All categories</option>` +
        allCategories.map(c=>`<option value="${c.id}">${Admin.esc(c.name)}</option>`).join("");

      drawServicesGrid();
    } catch(err){
      console.error(err);
      grid.innerHTML = `<div class="error-state">Couldn't load services: ${Admin.esc(err.message)}</div>`;
    }
  }

  function drawServicesGrid(){
    const grid = document.getElementById("servicesGrid");
    let list = allServices;
    if(categoryFilter) list = list.filter(s => s.category_id === categoryFilter);
    if(searchTerm) list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if(!list.length){
      grid.innerHTML = `<div class="empty-state">No services match — try “+ Add New Service”.</div>`;
      return;
    }

    grid.innerHTML = "";
    list.forEach(svc=>{
      const cat = allCategories.find(c=>c.id===svc.category_id);
      const card = Admin.el("div", { class: "item-card" });
      card.innerHTML = `
        <div class="thumb" style="background-image:url('${svc.image_url || ""}')">
          <div class="flags">
            ${svc.featured ? '<span class="badge badge-warning">Featured</span>' : ""}
            ${!svc.active ? '<span class="badge badge-neutral">Disabled</span>' : ""}
          </div>
        </div>
        <div class="body">
          <div class="t">${Admin.esc(svc.name)}</div>
          <div class="s">${cat ? Admin.esc(cat.name) : "Uncategorised"} · ${Admin.money(svc.price, svc.currency)} · ${Admin.esc(svc.duration_text||"")}</div>
        </div>
        <div class="foot">
          <button class="btn-ghost" data-act="edit">Edit</button>
          <div style="display:flex; gap:4px;">
            <button class="icon-btn" data-act="duplicate" title="Duplicate">⧉</button>
            <button class="icon-btn" data-act="toggle" title="${svc.active ? "Disable" : "Enable"}">${svc.active ? "⏸" : "▶"}</button>
            <button class="icon-btn danger" data-act="delete" title="Delete">🗑</button>
          </div>
        </div>
      `;
      card.querySelector('[data-act="edit"]').addEventListener("click", ()=> openServiceDrawer(svc));
      card.querySelector('[data-act="duplicate"]').addEventListener("click", ()=> duplicateService(svc));
      card.querySelector('[data-act="toggle"]').addEventListener("click", ()=> toggleServiceActive(svc));
      card.querySelector('[data-act="delete"]').addEventListener("click", ()=> deleteService(svc));
      grid.appendChild(card);
    });
  }

  document.getElementById("servicesSearch").addEventListener("input", e=>{ searchTerm = e.target.value; drawServicesGrid(); });
  document.getElementById("servicesCategoryFilter").addEventListener("change", e=>{ categoryFilter = e.target.value; drawServicesGrid(); });
  document.getElementById("addServiceBtn").addEventListener("click", ()=> openServiceDrawer(null));

  async function toggleServiceActive(svc){
    const { error } = await supabaseClient.from("services").update({ active: !svc.active }).eq("id", svc.id);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast(`${svc.name} ${svc.active ? "disabled" : "enabled"}.`);
    logActivity("service_updated", `${svc.name} was ${svc.active ? "disabled" : "enabled"}.`);
    renderServices();
  }

  async function duplicateService(svc){
    const copy = { ...svc };
    delete copy.id; delete copy.created_at; delete copy.updated_at;
    copy.name = `${svc.name} (Copy)`;
    const { error } = await supabaseClient.from("services").insert(copy);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast(`Duplicated “${svc.name}”.`);
    renderServices();
  }

  async function deleteService(svc){
    const ok = await Admin.confirmDialog({
      title: "Delete Service?",
      body: `This will permanently remove "${svc.name}". This action cannot be undone.`,
      confirmLabel: "Delete"
    });
    if(!ok) return;
    const { error } = await supabaseClient.from("services").delete().eq("id", svc.id);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast(`"${svc.name}" deleted.`);
    logActivity("service_deleted", `${svc.name} was deleted.`);
    renderServices();
  }

  function openServiceDrawer(svc){
    const isEdit = !!svc;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit ? "Edit Service" : "Add New Service"}</h2>

        <div class="form-section-title">Basic Information</div>
        <div class="form-grid">
          <div class="field span-2"><label>Service name</label><input type="text" id="fName" required></div>
          <div class="field span-2"><label>Short description</label><input type="text" id="fShort" placeholder="Shown on the website under the service name"></div>
          <div class="field span-2"><label>Full description (optional)</label><textarea id="fFull" rows="2"></textarea></div>
          <div class="field"><label>Category</label><select id="fCategory"><option value="">Uncategorised</option>${allCategories.map(c=>`<option value="${c.id}">${Admin.esc(c.name)}</option>`).join("")}</select></div>
        </div>

        <div class="form-section-title">Pricing &amp; Duration</div>
        <div class="form-grid">
          <div class="field"><label>Price</label><input type="number" step="0.01" id="fPrice" required></div>
          <div class="field"><label>Currency</label><select id="fCurrency"><option value="GBP">£ GBP</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select></div>
          <div class="field"><label>Duration (e.g. "4–6 hrs")</label><input type="text" id="fDuration"></div>
          <div class="field"><label>Deposit amount (optional)</label><input type="number" step="0.01" id="fDeposit"></div>
        </div>

        <div class="form-section-title">Image</div>
        <div class="field"><div class="image-drop" id="fImageDrop"><input type="file" accept="image/*" id="fImageInput"><div class="hint">Click or drag an image here</div></div></div>

        <div class="form-section-title">Booking &amp; Visibility</div>
        <div class="switch-row"><div><div class="lbl">Allow online booking</div><div class="desc">Shows a "Book this style" option on the site</div></div><label class="switch"><input type="checkbox" id="fOnlineBooking" checked><span class="track"></span></label></div>
        <div class="switch-row"><div><div class="lbl">Require deposit</div></div><label class="switch"><input type="checkbox" id="fRequiresDeposit"><span class="track"></span></label></div>
        <div class="switch-row"><div><div class="lbl">Featured</div><div class="desc">Appears in the Featured Styles gallery</div></div><label class="switch"><input type="checkbox" id="fFeatured"><span class="track"></span></label></div>
        <div class="switch-row"><div><div class="lbl">Visible on website</div></div><label class="switch"><input type="checkbox" id="fActive" checked><span class="track"></span></label></div>

        <div class="form-section-title">SEO (optional — overrides the site-wide default for this service's page)</div>
        <div class="form-grid">
          <div class="field span-2"><label>SEO title</label><input type="text" id="fSeoTitle"></div>
          <div class="field span-2"><label>SEO description</label><input type="text" id="fSeoDesc"></div>
          <div class="field span-2"><label>URL slug</label><input type="text" id="fSlug" placeholder="e.g. knotless-braids"></div>
        </div>
      </div>
      <div class="drawer-actions">
        <button class="btn-ghost" id="fCancel">Cancel</button>
        <button class="btn-admin btn-solid" id="fSave">Save Service</button>
      </div>
    `;
    const { close } = Admin.openModal(form, { wide: true });

    let uploadedImageUrl = svc ? svc.image_url : null;
    Admin.wireImageDrop(
      form.querySelector("#fImageDrop"),
      form.querySelector("#fImageInput"),
      {
        existingUrl: svc ? svc.image_url : null,
        onFile: async (file, dropEl)=>{
          try{
            uploadedImageUrl = await Admin.uploadImage(file, "services");
            dropEl.querySelector(".hint").textContent = "Uploaded ✓ (click to replace)";
          } catch(err){
            Admin.toast(err.message, "error");
          }
        }
      }
    );

    if(svc){
      form.querySelector("#fName").value = svc.name || "";
      form.querySelector("#fShort").value = svc.short_description || "";
      form.querySelector("#fFull").value = svc.description || "";
      form.querySelector("#fCategory").value = svc.category_id || "";
      form.querySelector("#fPrice").value = svc.price || "";
      form.querySelector("#fCurrency").value = svc.currency || "GBP";
      form.querySelector("#fDuration").value = svc.duration_text || "";
      form.querySelector("#fDeposit").value = svc.deposit_amount || "";
      form.querySelector("#fOnlineBooking").checked = svc.online_booking !== false;
      form.querySelector("#fRequiresDeposit").checked = !!svc.requires_deposit;
      form.querySelector("#fFeatured").checked = !!svc.featured;
      form.querySelector("#fActive").checked = svc.active !== false;
      form.querySelector("#fSeoTitle").value = svc.seo_title || "";
      form.querySelector("#fSeoDesc").value = svc.seo_description || "";
      form.querySelector("#fSlug").value = svc.slug || "";
    }

    form.querySelector("#fCancel").addEventListener("click", close);
    form.querySelector("#fSave").addEventListener("click", async ()=>{
      const name = form.querySelector("#fName").value.trim();
      const price = parseFloat(form.querySelector("#fPrice").value);
      if(!name){ Admin.toast("Service name is required.", "error"); return; }
      if(isNaN(price)){ Admin.toast("Price must be a number.", "error"); return; }

      const payload = {
        name,
        short_description: form.querySelector("#fShort").value.trim(),
        description: form.querySelector("#fFull").value.trim(),
        category_id: form.querySelector("#fCategory").value || null,
        price,
        currency: form.querySelector("#fCurrency").value,
        duration_text: form.querySelector("#fDuration").value.trim(),
        deposit_amount: form.querySelector("#fDeposit").value ? parseFloat(form.querySelector("#fDeposit").value) : null,
        image_url: uploadedImageUrl,
        online_booking: form.querySelector("#fOnlineBooking").checked,
        requires_deposit: form.querySelector("#fRequiresDeposit").checked,
        featured: form.querySelector("#fFeatured").checked,
        active: form.querySelector("#fActive").checked,
        seo_title: form.querySelector("#fSeoTitle").value.trim() || null,
        seo_description: form.querySelector("#fSeoDesc").value.trim() || null,
        slug: form.querySelector("#fSlug").value.trim() || null
      };

      const saveBtn = form.querySelector("#fSave");
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";

      const query = isEdit
        ? supabaseClient.from("services").update(payload).eq("id", svc.id)
        : supabaseClient.from("services").insert(payload);
      const { error } = await query;

      if(error){ Admin.toast(error.message, "error"); saveBtn.disabled = false; saveBtn.textContent = "Save Service"; return; }
      Admin.toast(isEdit ? "Service updated." : "Service added.");
      logActivity(isEdit ? "service_updated" : "service_created", `${name} was ${isEdit ? "updated" : "added"}.`);
      close();
      renderServices();
    });
  }

  /* ============================================================
     CATEGORIES
     ============================================================ */
  async function renderCategories(){
    const wrap = document.getElementById("categoriesTableWrap");
    wrap.innerHTML = `<div class="loading-state">Loading categories…</div>`;
    if(!SUPABASE_CONFIGURED){ wrap.innerHTML = `<div class="empty-state">Connect Supabase to manage categories.</div>`; return; }

    try{
      const { data, error } = await supabaseClient.from("service_categories").select("*").order("sort_order");
      if(error) throw error;
      allCategories = data || [];

      if(!allCategories.length){
        wrap.innerHTML = `<div class="empty-state">No categories yet — add one to start organising services.</div>`;
        return;
      }

      wrap.innerHTML = `
        <table class="a-table">
          <thead><tr><th>Name</th><th>Order</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${allCategories.map(c=>`
              <tr data-id="${c.id}">
                <td class="cell-primary">${Admin.esc(c.name)}</td>
                <td>${c.sort_order}</td>
                <td>${c.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Disabled</span>'}</td>
                <td style="text-align:right;">
                  <button class="icon-btn" data-act="edit">✎</button>
                  <button class="icon-btn" data-act="toggle">${c.active ? "⏸" : "▶"}</button>
                  <button class="icon-btn danger" data-act="delete">🗑</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

      wrap.querySelectorAll("tr[data-id]").forEach(row=>{
        const cat = allCategories.find(c=>c.id === row.dataset.id);
        row.querySelector('[data-act="edit"]').addEventListener("click", ()=> openCategoryDrawer(cat));
        row.querySelector('[data-act="toggle"]').addEventListener("click", async ()=>{
          const { error } = await supabaseClient.from("service_categories").update({ active: !cat.active }).eq("id", cat.id);
          if(error){ Admin.toast(error.message, "error"); return; }
          renderCategories();
        });
        row.querySelector('[data-act="delete"]').addEventListener("click", async ()=>{
          const ok = await Admin.confirmDialog({
            title: "Delete Category?",
            body: `Services in "${cat.name}" will become uncategorised. This cannot be undone.`,
            confirmLabel: "Delete"
          });
          if(!ok) return;
          const { error } = await supabaseClient.from("service_categories").delete().eq("id", cat.id);
          if(error){ Admin.toast(error.message, "error"); return; }
          Admin.toast(`"${cat.name}" deleted.`);
          renderCategories();
        });
      });
    } catch(err){
      wrap.innerHTML = `<div class="error-state">Couldn't load categories: ${Admin.esc(err.message)}</div>`;
    }
  }

  document.getElementById("addCategoryBtn").addEventListener("click", ()=> openCategoryDrawer(null));

  function openCategoryDrawer(cat){
    const isEdit = !!cat;
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>${isEdit ? "Edit Category" : "Add Category"}</h2>
        <div class="field"><label>Name</label><input type="text" id="cName"></div>
        <div class="field"><label>Sort order</label><input type="number" id="cOrder" value="0"></div>
        <div class="switch-row"><div class="lbl">Active</div><label class="switch"><input type="checkbox" id="cActive" checked><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions">
        <button class="btn-ghost" id="cCancel">Cancel</button>
        <button class="btn-admin btn-solid" id="cSave">Save</button>
      </div>
    `;
    const { close } = Admin.openModal(form);
    if(cat){
      form.querySelector("#cName").value = cat.name;
      form.querySelector("#cOrder").value = cat.sort_order;
      form.querySelector("#cActive").checked = cat.active;
    }
    form.querySelector("#cCancel").addEventListener("click", close);
    form.querySelector("#cSave").addEventListener("click", async ()=>{
      const name = form.querySelector("#cName").value.trim();
      if(!name){ Admin.toast("Category name is required.", "error"); return; }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
      const payload = { name, slug, sort_order: parseInt(form.querySelector("#cOrder").value)||0, active: form.querySelector("#cActive").checked };
      const query = isEdit
        ? supabaseClient.from("service_categories").update(payload).eq("id", cat.id)
        : supabaseClient.from("service_categories").insert(payload);
      const { error } = await query;
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast(isEdit ? "Category updated." : "Category added.");
      close();
      renderCategories();
    });
  }

  async function logActivity(type, description){
    if(!SUPABASE_CONFIGURED) return;
    try{ await supabaseClient.from("activity_logs").insert({ type, description }); } catch(e){ /* non-critical */ }
  }

  Admin.registerView("services", renderServices);
  Admin.registerView("categories", renderCategories);
})();
