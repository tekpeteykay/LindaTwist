/**
 * ============================================================
 * ADMIN — media.js
 * ------------------------------------------------------------
 * "Usage" is computed by cross-referencing each media URL against
 * the services, gallery, and site_settings tables — a lightweight
 * stand-in for a full usage-tracking system, accurate for
 * everything actually uploaded through the dashboard.
 * ============================================================ */
(function(){
  "use strict";
  let items = [], usageMap = {}, search = "";

  async function render(){
    const grid = document.getElementById("mediaGrid");
    grid.innerHTML = `<div class="loading-state">Loading media library…</div>`;
    if(!SUPABASE_CONFIGURED){ grid.innerHTML = `<div class="empty-state">Connect Supabase to see uploaded media.</div>`; return; }
    try{
      const [mediaRes, servicesRes, galleryRes, settingsRes, promoRes] = await Promise.all([
        supabaseClient.from("media").select("*").order("created_at", { ascending: false }),
        supabaseClient.from("services").select("id,name,image_url"),
        supabaseClient.from("gallery").select("id,image_url"),
        supabaseClient.from("site_settings").select("*").eq("id",1).single(),
        supabaseClient.from("promotions").select("id,title,image_url")
      ]);
      if(mediaRes.error) throw mediaRes.error;
      items = mediaRes.data || [];

      usageMap = {};
      (servicesRes.data||[]).forEach(s=>{ if(s.image_url) usageMap[s.image_url] = `Service: ${s.name}`; });
      (galleryRes.data||[]).forEach(g=>{ if(g.image_url) usageMap[g.image_url] = "Gallery"; });
      (promoRes.data||[]).forEach(p=>{ if(p.image_url) usageMap[p.image_url] = `Promotion: ${p.title}`; });
      const s = settingsRes.data;
      if(s){
        if(s.hero_image_url) usageMap[s.hero_image_url] = "Homepage hero";
        if(s.about_image_url) usageMap[s.about_image_url] = "Homepage about";
        if(s.og_image_url) usageMap[s.og_image_url] = "SEO social image";
      }

      draw();
    } catch(err){
      grid.innerHTML = `<div class="error-state">Couldn't load media library: ${Admin.esc(err.message)}</div>`;
    }
  }

  function draw(){
    const grid = document.getElementById("mediaGrid");
    let list = items;
    if(search) list = list.filter(m => (m.filename||"").toLowerCase().includes(search.toLowerCase()));
    if(!list.length){ grid.innerHTML = `<div class="empty-state">No uploads yet — images you upload anywhere in the dashboard will show up here.</div>`; return; }

    grid.innerHTML = "";
    list.forEach(m=>{
      const usage = usageMap[m.url];
      const card = Admin.el("div", { class: "item-card" });
      card.innerHTML = `
        <div class="thumb" style="background-image:url('${m.url}')"></div>
        <div class="body">
          <div class="t" style="font-size:12.5px; word-break:break-all;">${Admin.esc(m.filename||"untitled")}</div>
          <div class="s">${m.size_bytes ? (m.size_bytes/1024).toFixed(0)+" KB" : ""} · ${Admin.fmtDate(m.created_at)}</div>
          <div class="s">${usage ? `<span class="badge badge-success">In use</span> ${Admin.esc(usage)}` : '<span class="badge badge-neutral">Unused</span>'}</div>
        </div>
        <div class="foot">
          <button class="btn-ghost" data-act="copy">Copy URL</button>
          <button class="icon-btn danger" data-act="delete" title="${usage?'In use — remove from its section first':'Delete'}" ${usage?"disabled":""}>🗑</button>
        </div>
      `;
      card.querySelector('[data-act="copy"]').addEventListener("click", ()=>{
        navigator.clipboard.writeText(m.url).then(()=> Admin.toast("Image URL copied."));
      });
      const delBtn = card.querySelector('[data-act="delete"]');
      if(!usage){
        delBtn.addEventListener("click", async ()=>{
          const ok = await Admin.confirmDialog({ title: "Delete Image?", body: "This permanently removes the file from storage. This cannot be undone.", confirmLabel: "Delete" });
          if(!ok) return;
          if(m.storage_path){
            await supabaseClient.storage.from("salon-media").remove([m.storage_path]);
          }
          await supabaseClient.from("media").delete().eq("id", m.id);
          Admin.toast("Image deleted.");
          render();
        });
      }
      grid.appendChild(card);
    });
  }

  document.getElementById("mediaSearch").addEventListener("input", e=>{ search = e.target.value; draw(); });

  Admin.registerView("media", render);
})();
