/**
 * ============================================================
 * ACCOUNT — app.js
 * ============================================================
 */
(async function(){
  "use strict";

  const { authed, account } = await window.AccountReady;
  if(!authed) return;

  window.CURRENT_ACCOUNT = account; // shared read-only reference for other account/*.js modules

  const tabs = document.querySelectorAll("#dashTabs button");
  const views = document.querySelectorAll(".dash-view");

  function activate(name){
    tabs.forEach(t=> t.classList.toggle("active", t.dataset.view === name));
    views.forEach(v=> v.classList.toggle("active", v.id === `dview-${name}`));
    Account.renderView(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs.forEach(t=> t.addEventListener("click", ()=> activate(t.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(btn=>{
    btn.addEventListener("click", ()=> activate(btn.dataset.goto));
  });

  activate("overview");
})();
