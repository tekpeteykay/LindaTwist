/**
 * ============================================================
 * ACCOUNT — common.js
 * ------------------------------------------------------------
 * Lightweight shared helpers for the customer dashboard, mirroring
 * the pattern in admin/common.js but scoped to what account.html
 * actually needs.
 * ============================================================
 */
const Account = (function(){
  "use strict";

  function esc(str){
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function fmtDate(d, opts){
    if(!d) return "";
    return new Date(d).toLocaleDateString(undefined, opts || { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  let toastHost = null;
  function toast(message, type = "success"){
    if(!toastHost){
      toastHost = document.createElement("div");
      toastHost.className = "toast-host";
      document.body.appendChild(toastHost);
    }
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = message;
    toastHost.appendChild(t);
    requestAnimationFrame(()=> t.classList.add("show"));
    setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=> t.remove(), 300); }, 3400);
  }

  async function copyToClipboard(text, successMessage){
    try{
      await navigator.clipboard.writeText(text);
      toast(successMessage || "Copied to clipboard.");
    } catch(err){
      toast("Couldn't copy automatically — please copy it manually.", "error");
    }
  }

  const views = {};
  function registerView(name, renderFn){ views[name] = renderFn; }
  function renderView(name){ if(views[name]) views[name](); }

  return { esc, fmtDate, toast, copyToClipboard, registerView, renderView };
})();
