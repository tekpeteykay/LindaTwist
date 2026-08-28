/**
 * ============================================================
 * ADMIN — app.js
 * ------------------------------------------------------------
 * The glue: waits for auth to resolve, wires up sidebar navigation
 * (view switching + mobile drawer), and renders the initial view.
 * Each admin/*.js module registers itself via Admin.registerView()
 * and is (re)rendered every time its sidebar item is clicked, so
 * data is always fresh from the database.
 * ============================================================
 */
(async function(){
  "use strict";

  const { authed } = await window.AdminAuthReady;
  if(!authed) return; // login screen is already showing

  document.getElementById("topbarDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

  const navButtons = document.querySelectorAll(".sidebar-nav button");
  const viewSections = document.querySelectorAll(".view");

  function activate(viewName){
    navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === viewName));
    viewSections.forEach(v => v.classList.toggle("active", v.id === `view-${viewName}`));
    Admin.renderView(viewName);
    document.getElementById("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  navButtons.forEach(btn=>{
    btn.addEventListener("click", ()=> activate(btn.dataset.view));
  });

  document.getElementById("adminHamburger").addEventListener("click", ()=>{
    document.getElementById("sidebar").classList.toggle("open");
  });

  // Simple global search: jumps to the relevant view and pre-fills
  // that view's own search box, rather than building a second
  // parallel search index.
  document.getElementById("globalSearch").addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    const q = e.target.value.trim();
    if(!q) return;
    activate("services");
    setTimeout(()=>{
      const input = document.getElementById("servicesSearch");
      if(input){ input.value = q; input.dispatchEvent(new Event("input")); }
    }, 50);
  });

  activate("dashboard");
})();
