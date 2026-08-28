/**
 * ============================================================
 * ADMIN — common.js
 * ------------------------------------------------------------
 * Shared across every admin module: the Supabase session guard,
 * toast notifications, a reusable confirm dialog, and small DOM
 * helpers. Loaded before every other /admin/*.js file.
 * ============================================================
 */

const Admin = (function(){
  "use strict";

  /* ---------------- DOM helpers ---------------- */
  function el(tag, attrs = {}, children = []){
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k === "class") node.className = v;
      else if(k === "html") node.innerHTML = v;
      else if(k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c=>{
      if(c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function esc(str){
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function fmtDate(d, opts){
    if(!d) return "";
    return new Date(d).toLocaleDateString(undefined, opts || { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtDateTime(d){
    if(!d) return "";
    return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function money(n, currency){
    const symbol = { GBP: "£", USD: "$", EUR: "€" }[currency] || "£";
    return `${symbol}${Number(n || 0).toFixed(2)}`;
  }

  /* ---------------- Toasts ---------------- */
  let toastHost = null;
  function toast(message, type = "success"){
    if(!toastHost){
      toastHost = el("div", { class: "toast-host" });
      document.body.appendChild(toastHost);
    }
    const t = el("div", { class: `toast toast-${type}` }, message);
    toastHost.appendChild(t);
    requestAnimationFrame(()=> t.classList.add("show"));
    setTimeout(()=>{
      t.classList.remove("show");
      setTimeout(()=> t.remove(), 300);
    }, 3400);
  }

  /* ---------------- Confirm dialog ---------------- */
  function confirmDialog({ title, body, confirmLabel = "Confirm", danger = true }){
    return new Promise(resolve=>{
      const overlay = el("div", { class: "modal-overlay" });
      const box = el("div", { class: "modal-box modal-confirm" }, [
        el("h3", {}, title),
        el("p", {}, body),
        el("div", { class: "modal-actions" }, [
          el("button", { class: "btn-ghost", onclick: ()=>{ close(false); } }, "Cancel"),
          el("button", { class: danger ? "btn-danger" : "btn-primary-admin", onclick: ()=>{ close(true); } }, confirmLabel)
        ])
      ]);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      requestAnimationFrame(()=> overlay.classList.add("show"));
      function close(result){
        overlay.classList.remove("show");
        setTimeout(()=> overlay.remove(), 200);
        resolve(result);
      }
      overlay.addEventListener("click", e=>{ if(e.target === overlay) close(false); });
    });
  }

  /* ---------------- Modal (generic) ---------------- */
  function openModal(contentNode, { wide = false } = {}){
    const overlay = el("div", { class: "modal-overlay" });
    const box = el("div", { class: "modal-box" + (wide ? " modal-wide" : "") });
    box.appendChild(contentNode);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(()=> overlay.classList.add("show"));
    function close(){
      overlay.classList.remove("show");
      setTimeout(()=> overlay.remove(), 200);
    }
    overlay.addEventListener("click", e=>{ if(e.target === overlay) close(); });
    return { overlay, box, close };
  }

  /* ---------------- Auth / session guard ---------------- */
  async function requireSession(){
    if(!SUPABASE_CONFIGURED){
      document.getElementById("configWarning").style.display = "flex";
      return null;
    }
    const { data: { session } } = await supabaseClient.auth.getSession();
    if(!session){
      window.location.href = "admin.html"; // shows the login screen (no session)
      return null;
    }
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    return { session, profile };
  }

  async function logout(){
    await supabaseClient.auth.signOut();
    window.location.reload();
  }

  /* ---------------- Image upload (Supabase Storage) ---------------- */
  async function uploadImage(file, folder = "misc"){
    if(!SUPABASE_CONFIGURED) throw new Error("Supabase isn't configured.");
    const allowed = ["image/jpeg","image/jpg","image/png","image/webp","image/svg+xml"];
    if(!allowed.includes(file.type)){
      throw new Error("Please upload a JPG, PNG, WEBP or SVG image.");
    }
    if(file.size > 8 * 1024 * 1024){
      throw new Error("Images must be under 8MB.");
    }
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabaseClient.storage.from("salon-media").upload(path, file, { upsert: false });
    if(error) throw error;
    const { data } = supabaseClient.storage.from("salon-media").getPublicUrl(path);

    // Index it in the Media Library — best-effort, never blocks the upload.
    supabaseClient.from("media").insert({
      url: data.publicUrl, storage_path: path, filename: file.name, size_bytes: file.size, folder
    }).then(({error})=>{ if(error) console.warn("[Linda Twist] Media Library indexing failed:", error); });

    return data.publicUrl;
  }

  /* ---------------- Wire an .image-drop widget ---------------- */
  function wireImageDrop(dropEl, inputEl, { onFile, existingUrl } = {}){
    if(existingUrl){
      dropEl.innerHTML = `<img src="${esc(existingUrl)}" alt=""><div class="hint">Click or drag to replace</div>`;
      dropEl.appendChild(inputEl);
    }
    dropEl.addEventListener("click", ()=> inputEl.click());
    dropEl.addEventListener("dragover", e=>{ e.preventDefault(); dropEl.classList.add("dragover"); });
    dropEl.addEventListener("dragleave", ()=> dropEl.classList.remove("dragover"));
    dropEl.addEventListener("drop", e=>{
      e.preventDefault();
      dropEl.classList.remove("dragover");
      if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    inputEl.addEventListener("change", ()=>{
      if(inputEl.files[0]) handleFile(inputEl.files[0]);
    });
    function handleFile(file){
      const reader = new FileReader();
      reader.onload = ()=>{
        dropEl.innerHTML = `<img src="${reader.result}" alt=""><div class="hint">Uploading…</div>`;
        dropEl.appendChild(inputEl);
      };
      reader.readAsDataURL(file);
      onFile && onFile(file, dropEl);
    }
  }

  /* ---------------- Simple view registry ---------------- */
  const views = {};
  function registerView(name, renderFn){ views[name] = renderFn; }
  function renderView(name){ if(views[name]) views[name](); }

  return { el, esc, fmtDate, fmtDateTime, money, toast, confirmDialog, openModal, requireSession, logout, registerView, renderView, uploadImage, wireImageDrop };
})();
