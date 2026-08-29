/**
 * ============================================================
 * ACCOUNT — promotions.js (Offers tab)
 * ============================================================
 */
(function(){
  "use strict";

  async function render(){
    const wrap = document.getElementById("dashPromotionsWrap");
    wrap.innerHTML = `<p class="body-md">Loading current offers…</p>`;
    try{
      const todayStr = new Date().toISOString().split("T")[0];
      const { data, error } = await supabaseClient
        .from("promotions")
        .select("*")
        .eq("active", true)
        .or(`start_date.is.null,start_date.lte.${todayStr}`)
        .or(`end_date.is.null,end_date.gte.${todayStr}`);
      if(error) throw error;

      if(!data || !data.length){
        wrap.innerHTML = `<div class="dash-card"><p class="body-md">No current offers — check back soon.</p></div>`;
        return;
      }

      wrap.innerHTML = "";
      data.forEach(p=>{
        const discount = p.discount_type === "percentage" ? `${p.discount_amount}% off` : `£${p.discount_amount} off`;
        const card = document.createElement("div");
        card.className = "cpromo-card";
        card.innerHTML = `
          ${p.image_url ? `<div class="img" style="background-image:url('${p.image_url}')"></div>` : ""}
          <div class="body">
            <h3>${Account.esc(p.title)}</h3>
            <p>${Account.esc(p.description || "")}</p>
            ${p.promo_code ? `
              <div class="code-row">
                <span class="code">${discount} · ${Account.esc(p.promo_code)}</span>
                <button class="link-underline" data-code="${Account.esc(p.promo_code)}" style="font-size:11px;">Copy</button>
              </div>
            ` : `<div class="code-row"><span class="code">${discount}</span></div>`}
          </div>
        `;
        const copyBtn = card.querySelector("[data-code]");
        if(copyBtn) copyBtn.addEventListener("click", ()=> Account.copyToClipboard(copyBtn.dataset.code, "Promo code copied."));
        wrap.appendChild(card);
      });
    } catch(err){
      wrap.innerHTML = `<div class="dash-card"><p class="body-md">Couldn't load offers right now.</p></div>`;
    }
  }

  Account.registerView("promotions", render);
})();
