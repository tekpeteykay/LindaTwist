/**
 * ============================================================
 * ADMIN — gallery.js
 * ============================================================
 */
(function(){
  "use strict";

  let items = [];

  async function render(){
    const grid = document.getElementById("galleryGrid");
    grid.innerHTML = `<div class="loading-state">Loading gallery…</div>`;
    if(!SUPABASE_CONFIGURED){ grid.innerHTML = `<div class="empty-state">Connect Supabase to manage the gallery.</div>`; return; }

    try{
      const { data, error } = await supabaseClient.from("gallery").select("*").order("sort_order");
      if(error) throw error;
      items = data || [];
      draw();
    } catch(err){
      grid.innerHTML = `<div class="error-state">Couldn't load gallery: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const grid = document.getElementById("galleryGrid");
    if(!items.length){
      grid.innerHTML = `<div class="empty-state">No images yet — click “+ Upload Images” to add some.</div>`;
      return;
    }
    grid.innerHTML = "";
    items.forEach((img, i)=>{
      const card = Admin.el("div", { class: "item-card" });
      card.innerHTML = `
        <div class="thumb" style="background-image:url('${img.image_url}')">
          <div class="flags">${img.featured ? '<span class="badge badge-warning">Featured</span>' : ""}</div>
        </div>
        <div class="body">
          <div class="t">${Admin.esc(img.caption || "Untitled")}</div>
          <div class="s">${Admin.esc(img.category || "Uncategorised")}</div>
        </div>
        <div class="foot">
          <div style="display:flex; gap:2px;">
            <button class="icon-btn" data-act="up" ${i===0?"disabled":""} title="Move earlier">↑</button>
            <button class="icon-btn" data-act="down" ${i===items.length-1?"disabled":""} title="Move later">↓</button>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="btn-ghost" data-act="edit">Edit</button>
            <button class="icon-btn danger" data-act="delete">🗑</button>
          </div>
        </div>
      `;
      card.querySelector('[data-act="edit"]').addEventListener("click", ()=> openEditor(img));
      card.querySelector('[data-act="delete"]').addEventListener("click", ()=> remove(img));
      card.querySelector('[data-act="up"]').addEventListener("click", ()=> reorder(i, -1));
      card.querySelector('[data-act="down"]').addEventListener("click", ()=> reorder(i, 1));
      grid.appendChild(card);
    });
  }

  async function reorder(index, direction){
    const j = index + direction;
    if(j < 0 || j >= items.length) return;
    [items[index], items[j]] = [items[j], items[index]];
    draw();
    const updates = items.map((it, i) => supabaseClient.from("gallery").update({ sort_order: i }).eq("id", it.id));
    await Promise.all(updates);
  }

  async function remove(img){
    const ok = await Admin.confirmDialog({
      title: "Delete Image?",
      body: "This removes it from the website gallery. This action cannot be undone.",
      confirmLabel: "Delete"
    });
    if(!ok) return;
    const { error } = await supabaseClient.from("gallery").delete().eq("id", img.id);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast("Image deleted.");
    render();
  }

  document.getElementById("addGalleryBtn").addEventListener("click", openUploader);

  function openUploader(){
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>Upload Images</h2>
        <div class="field"><div class="image-drop" id="gDrop"><input type="file" accept="image/*" id="gInput" multiple><div class="hint">Click or drag one or more images here</div></div></div>
        <div id="gProgress" style="font-size:12.5px; color:var(--a-ink-soft); margin-top:10px;"></div>
      </div>
      <div class="drawer-actions"><button class="btn-ghost" id="gClose">Done</button></div>
    `;
    const { close } = Admin.openModal(form);
    const dropEl = form.querySelector("#gDrop");
    const inputEl = form.querySelector("#gInput");
    const progress = form.querySelector("#gProgress");

    dropEl.addEventListener("click", ()=> inputEl.click());
    dropEl.addEventListener("dragover", e=>{ e.preventDefault(); dropEl.classList.add("dragover"); });
    dropEl.addEventListener("dragleave", ()=> dropEl.classList.remove("dragover"));
    dropEl.addEventListener("drop", e=>{ e.preventDefault(); dropEl.classList.remove("dragover"); handleFiles(e.dataTransfer.files); });
    inputEl.addEventListener("change", ()=> handleFiles(inputEl.files));

    async function handleFiles(fileList){
      const files = Array.from(fileList);
      for(const file of files){
        progress.textContent = `Uploading ${file.name}…`;
        try{
          const url = await Admin.uploadImage(file, "gallery");
          await supabaseClient.from("gallery").insert({ image_url: url, sort_order: items.length + 1 });
          progress.textContent = `Uploaded ${file.name} ✓`;
          render();
        } catch(err){
          progress.textContent = `Failed: ${file.name} — ${err.message}`;
        }
      }
    }
    form.querySelector("#gClose").addEventListener("click", close);
  }

  function openEditor(img){
    const form = Admin.el("div");
    form.innerHTML = `
      <div class="drawer-form">
        <h2>Edit Image</h2>
        <div class="field"><img src="${img.image_url}" style="width:100%; border-radius:8px; margin-bottom:14px;"></div>
        <div class="field"><label>Caption</label><input type="text" id="giCaption" value="${Admin.esc(img.caption||"")}"></div>
        <div class="field"><label>Category</label><input type="text" id="giCategory" value="${Admin.esc(img.category||"")}" placeholder="e.g. Braids, Cornrows, Before &amp; After"></div>
        <div class="switch-row"><div class="lbl">Featured (shown in Featured Styles)</div><label class="switch"><input type="checkbox" id="giFeatured" ${img.featured?"checked":""}><span class="track"></span></label></div>
      </div>
      <div class="drawer-actions">
        <button class="btn-ghost" id="giCancel">Cancel</button>
        <button class="btn-admin btn-solid" id="giSave">Save</button>
      </div>
    `;
    const { close } = Admin.openModal(form);
    form.querySelector("#giCancel").addEventListener("click", close);
    form.querySelector("#giSave").addEventListener("click", async ()=>{
      const { error } = await supabaseClient.from("gallery").update({
        caption: form.querySelector("#giCaption").value.trim(),
        category: form.querySelector("#giCategory").value.trim(),
        featured: form.querySelector("#giFeatured").checked
      }).eq("id", img.id);
      if(error){ Admin.toast(error.message, "error"); return; }
      Admin.toast("Image updated.");
      close();
      render();
    });
  }

  Admin.registerView("gallery", render);
})();
