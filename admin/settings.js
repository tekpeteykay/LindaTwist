/**
 * ============================================================
 * ADMIN — settings.js
 * ============================================================
 */
(function(){
  "use strict";

  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let seoImageUrl = null;

  async function render(){
    if(!SUPABASE_CONFIGURED) return;
    try{
      const [settingsRes, hoursRes] = await Promise.all([
        supabaseClient.from("site_settings").select("*").eq("id",1).single(),
        supabaseClient.from("business_hours").select("*").order("day_of_week")
      ]);
      if(settingsRes.error) throw settingsRes.error;
      const s = settingsRes.data;
      document.getElementById("setBusinessName").value = s.business_name || "";
      document.getElementById("setFullName").value = s.full_name || "";
      document.getElementById("setPhone").value = s.phone || "";
      document.getElementById("setEmail").value = s.email || "";
      document.getElementById("setAddress").value = s.address || "";
      document.getElementById("setInstagram").value = s.instagram_url || "";
      document.getElementById("setFacebook").value = s.facebook_url || "";
      document.getElementById("setTiktok").value = s.tiktok_url || "";

      document.getElementById("seoTitle").value = s.seo_title || "";
      document.getElementById("seoDescription").value = s.seo_description || "";
      seoImageUrl = s.og_image_url || null;
      Admin.wireImageDrop(document.getElementById("seoImageDrop"), document.getElementById("seoImageInput"), {
        existingUrl: seoImageUrl,
        onFile: async (file, dropEl)=>{
          try{ seoImageUrl = await Admin.uploadImage(file, "seo"); dropEl.querySelector(".hint").textContent = "Uploaded ✓ (click to replace)"; }
          catch(err){ Admin.toast(err.message, "error"); }
        }
      });

      drawHoursEditor(hoursRes.data || []);
    } catch(err){
      Admin.toast("Couldn't load settings: " + err.message, "error");
    }
  }

  document.getElementById("seoForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      seo_title: document.getElementById("seoTitle").value.trim(),
      seo_description: document.getElementById("seoDescription").value.trim(),
      og_image_url: seoImageUrl
    };
    const { error } = await supabaseClient.from("site_settings").update(payload).eq("id", 1);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast("SEO settings saved.");
  });

  function drawHoursEditor(hours){
    const wrap = document.getElementById("hoursEditor");
    const byDay = {};
    hours.forEach(h => byDay[h.day_of_week] = h);

    wrap.innerHTML = DAY_NAMES.map((name, idx)=>{
      const h = byDay[idx] || { is_closed: true, open_time: "09:00", close_time: "18:00" };
      return `
        <div class="switch-row" data-day="${idx}">
          <div style="display:flex; align-items:center; gap:14px; flex:1;">
            <div style="width:90px; font-weight:600; font-size:13.5px;">${name}</div>
            <label class="switch"><input type="checkbox" class="hDayOpen" ${!h.is_closed?"checked":""}><span class="track"></span></label>
            <input type="time" class="hOpenTime" value="${h.open_time||"09:00"}" style="width:110px; padding:6px 8px; border:1px solid var(--a-border); border-radius:6px;" ${h.is_closed?"disabled":""}>
            <span style="color:var(--a-ink-soft);">to</span>
            <input type="time" class="hCloseTime" value="${h.close_time||"18:00"}" style="width:110px; padding:6px 8px; border:1px solid var(--a-border); border-radius:6px;" ${h.is_closed?"disabled":""}>
          </div>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll('[data-day]').forEach(row=>{
      const checkbox = row.querySelector(".hDayOpen");
      const times = row.querySelectorAll("input[type=time]");
      checkbox.addEventListener("change", ()=>{
        times.forEach(t => t.disabled = !checkbox.checked);
      });
    });
  }

  document.getElementById("settingsForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      business_name: document.getElementById("setBusinessName").value.trim(),
      full_name: document.getElementById("setFullName").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      email: document.getElementById("setEmail").value.trim(),
      address: document.getElementById("setAddress").value.trim(),
      instagram_url: document.getElementById("setInstagram").value.trim(),
      facebook_url: document.getElementById("setFacebook").value.trim(),
      tiktok_url: document.getElementById("setTiktok").value.trim()
    };
    const { error } = await supabaseClient.from("site_settings").update(payload).eq("id", 1);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast("Settings saved — live on the website now.");
  });

  document.getElementById("saveHoursBtn").addEventListener("click", async ()=>{
    const rows = document.querySelectorAll("#hoursEditor [data-day]");
    const updates = Array.from(rows).map(row=>{
      const day_of_week = parseInt(row.dataset.day);
      const is_closed = !row.querySelector(".hDayOpen").checked;
      const open_time = row.querySelector(".hOpenTime").value;
      const close_time = row.querySelector(".hCloseTime").value;
      return supabaseClient.from("business_hours").upsert({ day_of_week, is_closed, open_time, close_time }, { onConflict: "day_of_week" });
    });
    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if(failed){ Admin.toast(failed.error.message, "error"); return; }
    Admin.toast("Business hours saved — live on the website now.");
  });

  Admin.registerView("settings", render);
})();
