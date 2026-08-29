/**
 * LINDA TWIST — main.js
 * Renders all dynamic content from SITE_CONFIG, then wires up
 * navigation, the custom cursor, scroll reveals, GSAP/ScrollTrigger
 * motion, the booking flow, and the gallery / testimonials / FAQ.
 *
 * BOOKING_INTEGRATION marks the single spot to wire a real
 * scheduling provider in.
 */
(async function(){
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  // Pinned/parallax-heavy effects are reserved for larger, non-touch,
  // motion-tolerant viewports — narrower screens get the same content
  // with normal, lighter-weight scrolling instead.
  const enableHeavyMotion = !prefersReducedMotion && !isTouch && window.innerWidth > 900;

  // Wait for the CMS content fetch (js/data-loader.js) to finish merging
  // live Supabase data into SITE_CONFIG before rendering anything. This
  // resolves immediately if Supabase isn't configured, or on fetch failure.
  if(window.LINDA_TWIST_READY) await window.LINDA_TWIST_READY;
  const cfg = SITE_CONFIG;

  /* ============================================================
     EMAIL CONFIRMATIONS (EmailJS)
     ============================================================ */
  const emailCfg = cfg.emailjs || {};
  // Base setup: just needs a service + public key. Each email flow
  // below then checks its own specific template ID independently,
  // so e.g. message notifications work even if booking templates
  // were never filled in, and vice versa.
  const emailBaseConfigured = !!(emailCfg.serviceId && emailCfg.publicKey);
  const emailIsConfigured = emailBaseConfigured && !!emailCfg.clientTemplateId; // kept for the booking flow specifically
  if(emailBaseConfigured && window.emailjs){
    emailjs.init({ publicKey: emailCfg.publicKey });
  }

  /**
   * Sends the client confirmation email (and, if configured, a
   * separate owner-notification email) via EmailJS. Resolves with
   * { sent: boolean, error?: string } — never throws, so a booking
   * can always complete even if email sending fails or isn't set up.
   */
  async function sendBookingEmails(){
    if(!emailIsConfigured || !window.emailjs){
      console.warn("[Linda Twist] EmailJS isn't configured yet — see js/config.js → emailjs. Booking confirmed locally without sending real email.");
      return { sent: false, reason: "not-configured" };
    }

    const dateLabel = booking.date
      ? new Date(booking.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "";

    const templateParams = {
      to_email: booking.email,
      client_name: booking.name,
      client_phone: booking.phone,
      service_name: booking.service ? booking.service.name : "",
      service_category: booking.categoryLabel || "",
      date: dateLabel,
      time: booking.time || "",
      duration: booking.service ? booking.service.duration : "",
      price: booking.service ? booking.service.price : "",
      salon_name: cfg.business.fullName,
      salon_address: cfg.business.address,
      salon_phone: cfg.business.phone,
      notes: booking.notes || "—",
      status_headline: "Your appointment is confirmed!",
      status_body: "We can't wait to see you — if anything changes, just get in touch."
    };

    try{
      await emailjs.send(emailCfg.serviceId, emailCfg.clientTemplateId, templateParams);

      if(emailCfg.ownerTemplateId){
        // Fire-and-forget: the client's confirmation matters more than
        // the owner's copy, so a failure here doesn't affect the result.
        emailjs.send(emailCfg.serviceId, emailCfg.ownerTemplateId, templateParams)
          .catch(err => console.warn("[Linda Twist] Owner notification email failed:", err));
      }
      return { sent: true };
    } catch(err){
      console.error("[Linda Twist] Client confirmation email failed:", err);
      return { sent: false, reason: "send-error", error: err };
    }
  }

  /**
   * Writes the booking to Supabase (if configured) so it appears in
   * the admin dashboard's Bookings list and Calendar, and logs a
   * "New booking received" activity entry. Never throws — a booking
   * still completes for the customer even if this fails.
   */
  async function saveBookingToSupabase(){
    if(!SUPABASE_CONFIGURED) return { saved: false, reason: "not-configured" };

    try{
      const { error } = await supabaseClient.from("bookings").insert({
        service_id: booking.service && booking.service.id ? booking.service.id : null,
        service_name: booking.service ? booking.service.name : "",
        category_name: booking.categoryLabel || "",
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        appointment_date: booking.date,
        appointment_time: booking.time,
        duration_text: booking.service ? booking.service.duration : "",
        price_text: booking.service ? booking.service.price : "",
        customer_notes: booking.notes || null
      });
      if(error) throw error;

      window.logActivity && window.logActivity(
        "booking_created",
        `New booking: ${booking.name} — ${booking.service ? booking.service.name : ""} on ${booking.date} at ${booking.time}`
      );
      return { saved: true };
    } catch(err){
      console.error("[Linda Twist] Saving booking to Supabase failed:", err);
      return { saved: false, reason: "save-error", error: err };
    }
  }

  /**
   * Sends the two message/enquiry emails via EmailJS: a notification
   * to the salon owner, and (if configured) an auto-reply to whoever
   * submitted the contact form. Both are optional and independent —
   * never throws, since the message is already safely saved in
   * Supabase regardless of whether either email goes out.
   */
  async function sendMessageEmails({ name, email, phone, message }){
    if(!emailBaseConfigured || !window.emailjs) return { sent: false, reason: "not-configured" };

    const templateParams = {
      sender_name: name,
      sender_email: email,
      sender_phone: phone || "—",
      message,
      salon_name: cfg.business.fullName
    };

    let ownerSent = false, clientSent = false;

    if(emailCfg.messageOwnerTemplateId){
      try{
        await emailjs.send(emailCfg.serviceId, emailCfg.messageOwnerTemplateId, templateParams);
        ownerSent = true;
      } catch(err){
        console.error("[Linda Twist] Owner enquiry notification failed:", err);
      }
    }

    if(emailCfg.messageClientTemplateId){
      try{
        await emailjs.send(emailCfg.serviceId, emailCfg.messageClientTemplateId, { ...templateParams, to_email: email });
        clientSent = true;
      } catch(err){
        console.error("[Linda Twist] Enquiry auto-reply failed:", err);
      }
    }

    return { sent: ownerSent || clientSent, ownerSent, clientSent };
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ============================================================
     RENDER: footer / nav-driven content from config
     ============================================================ */
  function renderFooter(){
    const navUl = document.getElementById("footerNav");
    cfg.nav.forEach(item=>{
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.href}">${item.label}</a>`;
      navUl.appendChild(li);
    });

    const hoursUl = document.getElementById("footerHours");
    cfg.business.hours.forEach(h=>{
      const li = document.createElement("li");
      li.textContent = `${h.day} — ${h.time}`;
      hoursUl.appendChild(li);
    });

    const addr = document.getElementById("footerContact");
    addr.innerHTML = `${cfg.business.address}<br>${cfg.business.phone}<br>${cfg.business.email}`;

    ["fsInstagram","fsFacebook","fsTiktok","mmInstagram","mmFacebook","mmTiktok"].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      if(id.includes("Instagram")) el.href = cfg.business.instagram;
      if(id.includes("Facebook")) el.href = cfg.business.facebook;
      if(id.includes("Tiktok")) el.href = cfg.business.tiktok;
    });
  }
  renderFooter();

  /* ============================================================
     NAVIGATION — header + mobile menu, rendered from cfg.nav so a
     change in the CMS's Navigation manager is reflected everywhere.
     ============================================================ */
  (function renderNav(){
    document.getElementById("navLinks").innerHTML = cfg.nav.map(n => `<a href="${n.href}">${n.label}</a>`).join("");
    const mobileLinks = document.querySelector(".mobile-menu-links");
    mobileLinks.innerHTML = cfg.nav.map(n => `<a href="${n.href}">${n.label}</a>`).join("");
    mobileLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", ()=> toggleMenu(false)));
  })();

  /* ============================================================
     SEO — apply CMS-edited title/description if present
     ============================================================ */
  (function applySeo(){
    const seo = cfg._seo;
    if(!seo) return;
    if(seo.title) document.title = seo.title;
    if(seo.description){
      const tag = document.querySelector('meta[name="description"]');
      if(tag) tag.setAttribute("content", seo.description);
    }
    if(seo.ogImage){
      const og = document.querySelector('meta[property="og:image"]');
      if(og) og.setAttribute("content", seo.ogImage);
    }
  })();

  /* ============================================================
     PROMO BANNER
     ============================================================ */
  (function applyPromo(){
    const promo = cfg._promo;
    if(!promo) return;
    const banner = document.getElementById("promoBanner");
    document.getElementById("promoBannerText").innerHTML = `${promo.title} — <b>${promo.discount}</b>${promo.code ? ` · Code <b>${promo.code}</b>` : ""}`;
    banner.style.display = "flex";
    document.getElementById("promoBannerClose").addEventListener("click", ()=>{ banner.style.display = "none"; });
  })();

  /* ============================================================
     CONTACT FORM (Get In Touch)
     ============================================================ */
  (function contactForm(){
    const form = document.getElementById("contactForm");
    const status = document.getElementById("contactStatus");
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const phone = document.getElementById("contactPhone").value.trim();
      const message = document.getElementById("contactMessage").value.trim();
      if(!name || !email || !message) return;

      const btn = document.getElementById("contactSubmit");
      btn.disabled = true;
      const originalLabel = btn.innerHTML;
      btn.innerHTML = "Sending…";

      if(SUPABASE_CONFIGURED){
        try{
          const { error } = await supabaseClient.from("messages").insert({ name, email, phone: phone || null, message });
          if(error) throw error;
          status.textContent = "Thanks — we'll get back to you soon.";
          form.reset();
          window.logActivity && window.logActivity("message_received", `New enquiry from ${name}`);
          sendMessageEmails({ name, email, phone, message }); // fire-and-forget — the message is already saved either way
        } catch(err){
          console.error(err);
          status.textContent = `Couldn't send that just now — please email us directly at ${cfg.business.email}.`;
        }
      } else {
        // Fallback with no backend configured: hand off to the visitor's email client.
        window.location.href = `mailto:${cfg.business.email}?subject=${encodeURIComponent("Enquiry from "+name)}&body=${encodeURIComponent(message + "\n\n" + email + " " + phone)}`;
        status.textContent = "Opening your email client…";
      }

      btn.disabled = false;
      btn.innerHTML = originalLabel;
    });
  })();

  /* ============================================================
     HERO OVERRIDE — apply CMS-edited heading/subheading/image
     (from Homepage settings in the admin dashboard) while keeping
     the per-line reveal-animation structure intact.
     ============================================================ */
  (function applyHeroOverride(){
    const hero = cfg._hero;
    if(!hero) return;

    if(hero.heading){
      const wrap = document.querySelector(".hero-headline");
      wrap.innerHTML = hero.heading.split("\n").map(line =>
        `<span class="line"><span>${line}</span></span>`
      ).join("");
    }
    if(hero.subheading){
      document.getElementById("heroSub").textContent = hero.subheading;
    }
    if(hero.image){
      document.querySelector("#heroMedia img").src = hero.image;
    }
  })();

  /* ============================================================
     LOADER
     ============================================================ */
  function runLoader(){
    const loader = document.getElementById("loader");
    const barEl = loader.querySelector(".loader-bar");

    if(prefersReducedMotion){
      loader.style.display = "none";
      playHeroIntro();
      return;
    }

    // Animate a real fill element (can't tween a ::after pseudo-element directly)
    barEl.style.position = "relative";
    barEl.style.overflow = "hidden";
    const fill = document.createElement("div");
    fill.style.cssText = "position:absolute;left:0;top:0;bottom:0;width:0%;background:var(--accent);";
    barEl.appendChild(fill);
    gsap.to(fill, { width: "100%", duration: 1.1, ease: "power2.inOut" });

    const tl = gsap.timeline({
      onComplete: ()=>{
        loader.style.pointerEvents = "none";
        playHeroIntro();
      }
    });
    tl.to(loader, { yPercent: -100, duration: 0.9, ease: "power3.inOut", delay: 1.35 })
      .set(loader, { display: "none" });
  }

  /* ============================================================
     HERO INTRO ANIMATION
     ============================================================ */
  function playHeroIntro(){
    if(prefersReducedMotion){
      document.body.classList.remove("no-scroll");
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("#heroMedia img", { scale: 1.16, autoAlpha: 0 }, { scale: 1.08, autoAlpha: 1, duration: 1.6 })
      .fromTo(".hero-eyebrow span", { yPercent: 120 }, { yPercent: 0, duration: 0.8 }, "-=1.0")
      .fromTo(".hero-headline .line span", { yPercent: 120 }, { yPercent: 0, duration: 0.9, stagger: 0.12 }, "-=0.5")
      .fromTo("#heroSub", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.5")
      .fromTo("#heroCtas .btn", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, "-=0.4");
  }

  document.body.classList.add("no-scroll");
  window.addEventListener("load", ()=>{
    document.body.classList.remove("no-scroll");
    runLoader();
  });
  // Fallback in case load event already fired
  setTimeout(()=>{
    if(document.body.classList.contains("no-scroll")){
      document.body.classList.remove("no-scroll");
      runLoader();
    }
  }, 1200);

  /* ============================================================
     NAV: scroll state + mobile menu
     ============================================================ */
  const navEl = document.getElementById("siteNav");
  window.addEventListener("scroll", ()=>{
    navEl.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });

  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  let menuOpen = false;
  function toggleMenu(open){
    menuOpen = open;
    hamburger.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", open);
    mobileMenu.classList.toggle("open", open);
    document.body.classList.toggle("no-scroll", open);
    const links = mobileMenu.querySelectorAll(".mobile-menu-links a");
    if(open){
      gsap.to(links, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: "power3.out", delay: 0.1 });
    } else {
      gsap.set(links, { opacity: 0, y: 24 });
    }
  }
  hamburger.addEventListener("click", ()=> toggleMenu(!menuOpen));
  mobileMenu.querySelectorAll("a").forEach(a=> a.addEventListener("click", ()=> toggleMenu(false)));

  /* ============================================================
     CUSTOM CURSOR (desktop only)
     ============================================================ */
  if(!isTouch && !prefersReducedMotion){
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    let mx=0,my=0, rx=0, ry=0;
    window.addEventListener("mousemove", e=>{ mx=e.clientX; my=e.clientY; dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    function loop(){
      rx += (mx-rx)*0.16; ry += (my-ry)*0.16;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.querySelectorAll("img, .masonry-item, .gallery-card, .meeting-image").forEach(el=>{
      el.addEventListener("mouseenter", ()=>{ ring.classList.add("grow"); ring.querySelector("span").textContent="View"; });
      el.addEventListener("mouseleave", ()=>{ ring.classList.remove("grow"); });
    });
    document.querySelectorAll("a[href='#booking'], .nav-book, #bookingNext").forEach(el=>{
      el.addEventListener("mouseenter", ()=>{ ring.classList.add("grow"); ring.querySelector("span").textContent="Book"; });
      el.addEventListener("mouseleave", ()=>{ ring.classList.remove("grow"); });
    });
  } else {
    document.querySelector(".cursor-dot").style.display="none";
    document.querySelector(".cursor-ring").style.display="none";
  }

  /* ============================================================
     SCROLL REVEAL (IntersectionObserver)
     ============================================================ */
  const revealItems = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealItems.forEach(el=> io.observe(el));

  /* ============================================================
     GSAP / ScrollTrigger setup
     ============================================================ */
  gsap.registerPlugin(ScrollTrigger);

  if(!prefersReducedMotion){
    // Hero parallax
    gsap.to("#heroMedia img", {
      yPercent: 14, scale: 1.14, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-content", {
      yPercent: 22, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Final CTA parallax
    gsap.to("#finalCtaMedia img", {
      yPercent: 16, ease: "none",
      scrollTrigger: { trigger: ".final-cta", start: "top bottom", end: "bottom top", scrub: true }
    });

    // About image gentle parallax, independent from text
    gsap.to("#aboutMedia", {
      yPercent: -8, ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  /* ============================================================
     MEETING MOMENT 1: image pinned, dark panel rises + shrinks image
     — this relies on lightweight CSS `position: sticky` (not a JS
     scroll-jacking pin), so it stays on for touch/mobile too; only
     `prefers-reduced-motion` turns it off.
     ============================================================ */
  if(!prefersReducedMotion){
    const m1 = gsap.timeline({
      scrollTrigger: {
        trigger: "#meeting1",
        start: "top top",
        end: "bottom top",
        scrub: 0.6
      }
    });
    m1.to("#meetingRise1", { yPercent: -100, ease: "none" }, 0)
      .to("#meetingImage1", { scale: 0.86, borderRadius: "6px", ease: "none" }, 0);
  }

  /* ============================================================
     THE ART OF THE TWIST — pinned panels
     ============================================================ */
  (function craft(){
    const progressWrap = document.getElementById("craftProgress");
    const rightWrap = document.getElementById("craftRight");

    cfg.craftPanels.forEach((p, i)=>{
      const dash = document.createElement("div");
      dash.className = "dash" + (i===0 ? " active" : "");
      dash.innerHTML = "<i></i>";
      progressWrap.appendChild(dash);

      const panel = document.createElement("div");
      panel.className = "craft-panel" + (i===0 ? " active" : "");
      panel.innerHTML = `
        <div class="craft-panel-head">
          <span class="num">${p.number}</span>
          <span class="title">${p.title}</span>
        </div>
        <div class="craft-panel-img"><img src="${p.image}" alt="${p.title} hairstyle detail" loading="lazy"></div>
      `;
      rightWrap.appendChild(panel);
    });

    if(!enableHeavyMotion){
      // Lighter weight for reduced-motion, touch and narrow-viewport
      // visitors: normal document flow, but each panel still fades
      // and slides in as it's scrolled into view.
      document.querySelector(".craft-pin").style.cssText = "position:static; height:auto; display:block; padding:80px var(--gutter);";
      rightWrap.style.cssText = "position:static; height:auto; margin-top:40px;";
      rightWrap.querySelectorAll(".craft-panel").forEach(p=>{
        p.style.cssText = "position:relative; visibility:visible; margin-bottom:36px;";
        if(prefersReducedMotion){
          p.style.opacity = "1";
        } else {
          p.classList.add("reveal");
          io.observe(p);
        }
      });
      return;
    }

    const dashes = progressWrap.querySelectorAll(".dash");
    const panels = rightWrap.querySelectorAll(".craft-panel");
    const total = cfg.craftPanels.length;

    ScrollTrigger.create({
      trigger: "#craftSection",
      start: "top top",
      end: `+=${total * 100}%`,
      pin: true,
      scrub: 0.4,
      onUpdate(self){
        const idx = Math.min(total-1, Math.floor(self.progress * total));
        dashes.forEach((d,i)=> d.classList.toggle("active", i<=idx));
        panels.forEach((p,i)=> p.classList.toggle("active", i===idx));
      }
    });
  })();

  /* ============================================================
     SERVICES — interactive list + preview
     ============================================================ */
  let activeServiceCategory = cfg.serviceCategories[0].id;

  function renderServiceTabs(){
    const wrap = document.getElementById("serviceTabs");
    wrap.innerHTML = "";
    cfg.serviceCategories.forEach(cat=>{
      const btn = document.createElement("button");
      btn.className = "service-tab" + (cat.id===activeServiceCategory ? " active" : "");
      btn.textContent = cat.label;
      btn.addEventListener("click", ()=>{
        activeServiceCategory = cat.id;
        renderServiceTabs();
        renderServiceList();
      });
      wrap.appendChild(btn);
    });
  }

  function renderServiceList(){
    const list = document.getElementById("serviceList");
    list.innerHTML = "";
    const cat = cfg.serviceCategories.find(c=>c.id===activeServiceCategory);
    const previewImg = document.getElementById("servicePreview");
    const previewLabel = document.getElementById("previewLabel");

    // clear old preview images
    previewImg.querySelectorAll("img").forEach(i=>i.remove());

    cat.services.forEach((svc, i)=>{
      const row = document.createElement("div");
      row.className = "service-row";
      row.innerHTML = `
        <span class="idx">${String(i+1).padStart(2,"0")}</span>
        <span class="name-wrap">
          <span class="name">${svc.name}</span>
          <span class="desc">${svc.blurb}</span>
        </span>
        <span class="price">From ${svc.price}</span>
        <span class="duration">${svc.duration}</span>
        <span class="arrow-btn">→</span>
      `;
      // use featuredStyles / craftPanels images as a rotating placeholder set for preview
      const imgUrl = cfg.featuredStyles[i % cfg.featuredStyles.length].image;
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = svc.name;
      img.loading = "lazy";
      previewImg.insertBefore(img, previewLabel);
      if(i===0) img.classList.add("active");

      row.addEventListener("mouseenter", ()=>{
        previewImg.querySelectorAll("img").forEach(im=>im.classList.remove("active"));
        img.classList.add("active");
        previewLabel.textContent = svc.name;
      });
      row.addEventListener("click", ()=>{
        window.location.hash = "#booking";
        preselectBookingService(svc, cat.label);
      });
      list.appendChild(row);
    });
    previewLabel.textContent = cat.services[0].name;
  }

  renderServiceTabs();
  renderServiceList();

  /* ============================================================
     FEATURED STYLES — masonry
     ============================================================ */
  (function masonry(){
    const grid = document.getElementById("masonryGrid");
    cfg.featuredStyles.forEach(s=>{
      const item = document.createElement("div");
      item.className = "masonry-item " + s.size;
      item.innerHTML = `
        <img src="${s.image}" alt="${s.name} hairstyle" loading="lazy">
        <div class="masonry-caption">
          <span>
            <span class="cap-tag">${s.tag}</span><br>
            <span class="cap-name">${s.name}</span>
          </span>
          <span class="cap-view">View Style</span>
        </div>
      `;
      item.addEventListener("click", ()=>{
        window.location.hash = "#booking";
      });
      grid.appendChild(item);
    });
  })();

  /* ============================================================
     TRANSFORMATION — scroll-driven reveal
     ============================================================ */
  (function transformation(){
    document.getElementById("beforeImg").src = cfg.transformation.before;
    document.getElementById("afterImg").src = cfg.transformation.after;

    const afterLayer = document.getElementById("afterLayer");
    const divider = document.getElementById("transformDivider");

    function setProgress(p){
      p = Math.max(0, Math.min(1, p));
      afterLayer.style.clipPath = `inset(0 ${100-(p*100)}% 0 0)`;
      divider.style.left = `${p*100}%`;
    }
    setProgress(0.02);

    if(prefersReducedMotion){
      setProgress(0.5);
      return;
    }

    ScrollTrigger.create({
      trigger: "#transformFrame",
      start: "top 75%",
      end: "bottom 40%",
      scrub: 0.5,
      onUpdate(self){ setProgress(self.progress); }
    });

    // Allow manual drag too, for a tactile interactive touch
    const frame = document.getElementById("transformFrame");
    let dragging = false;
    function fromEvent(e){
      const rect = frame.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      setProgress(x/rect.width);
    }
    frame.addEventListener("mousedown", e=>{ dragging=true; fromEvent(e); });
    window.addEventListener("mousemove", e=>{ if(dragging) fromEvent(e); });
    window.addEventListener("mouseup", ()=> dragging=false);
    frame.addEventListener("touchstart", e=>{ dragging=true; fromEvent(e); });
    frame.addEventListener("touchmove", e=>{ if(dragging) fromEvent(e); });
    frame.addEventListener("touchend", ()=> dragging=false);
  })();

  /* ============================================================
     ABOUT
     ============================================================ */
  document.getElementById("aboutImg").src = cfg.about.image;
  document.getElementById("aboutQuote").textContent = `“${cfg.about.quote}”`;

  /* ============================================================
     WHY US
     ============================================================ */
  (function whyUs(){
    const grid = document.getElementById("whyGrid");
    cfg.whyUs.forEach(item=>{
      const el = document.createElement("div");
      el.className = "why-item reveal";
      el.innerHTML = `
        <span class="num-label">${item.number}</span>
        <div>
          <h3>${item.title}</h3>
          <p>${item.copy}</p>
        </div>
      `;
      grid.appendChild(el);
      io.observe(el);
    });
  })();

  /* ============================================================
     GALLERY — pinned horizontal scroll
     ============================================================ */
  (function gallery(){
    const track = document.getElementById("galleryTrack");
    const cards = [];
    cfg.gallery.forEach(g=>{
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.innerHTML = `<img src="${g.image}" alt="${g.caption}" loading="lazy"><span class="cap">${g.caption}</span>`;
      track.appendChild(card);
      cards.push(card);
    });

    if(!enableHeavyMotion){
      // Native horizontal scroll-snap fallback: no scroll-jacking pin
      // on touch/narrow screens, but cards still fade/slide in as they
      // scroll into view so the section doesn't feel static.
      if(!prefersReducedMotion){
        cards.forEach(card=>{
          card.classList.add("reveal");
          io.observe(card);
        });
        document.querySelectorAll(".gallery-head .eyebrow, .gallery-head h2").forEach(el=>{
          el.classList.add("reveal");
          io.observe(el);
        });
      }
      return;
    }

    requestAnimationFrame(()=>{
      const trackWidth = track.scrollWidth;
      const viewportW = window.innerWidth;
      const distance = Math.max(0, trackWidth - viewportW + 100);

      gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: ".gallery-section",
          start: "top top",
          end: () => `+=${distance + window.innerHeight}`,
          scrub: 0.6,
          pin: ".gallery-pin",
          invalidateOnRefresh: true
        }
      });
    });
  })();

  /* ============================================================
     TESTIMONIALS — auto-rotating quote
     ============================================================ */
  (function testimonials(){
    const quoteEl = document.getElementById("testiQuote");
    const metaEl = document.getElementById("testiMeta");
    const dotsEl = document.getElementById("testiDots");
    let idx = 0, timer;

    cfg.testimonials.forEach((t,i)=>{
      const dot = document.createElement("button");
      dot.className = i===0 ? "active" : "";
      dot.setAttribute("aria-label", `Show testimonial ${i+1}`);
      dot.addEventListener("click", ()=> show(i, true));
      dotsEl.appendChild(dot);
    });

    function show(i, manual){
      idx = i;
      const t = cfg.testimonials[idx];
      if(prefersReducedMotion){
        quoteEl.textContent = `“${t.quote}”`;
      } else {
        gsap.to(quoteEl, { opacity: 0, y: 10, duration: 0.35, onComplete: ()=>{
          quoteEl.textContent = `“${t.quote}”`;
          gsap.to(quoteEl, { opacity: 1, y: 0, duration: 0.5 });
        }});
      }
      metaEl.innerHTML = `<strong>${t.name}</strong> — ${t.service}`;
      dotsEl.querySelectorAll("button").forEach((d,di)=> d.classList.toggle("active", di===idx));
      if(manual) restart();
    }
    function restart(){
      clearInterval(timer);
      timer = setInterval(()=> show((idx+1)%cfg.testimonials.length), 6000);
    }
    show(0);
    restart();
  })();

  /* ============================================================
     FAQ — accordion
     ============================================================ */
  (function faq(){
    const list = document.getElementById("faqList");
    cfg.faqs.forEach(f=>{
      const item = document.createElement("div");
      item.className = "faq-item";
      item.innerHTML = `
        <button class="faq-q">${f.q}<span class="plus"></span></button>
        <div class="faq-a"><p>${f.a}</p></div>
      `;
      const btn = item.querySelector(".faq-q");
      const ans = item.querySelector(".faq-a");
      btn.addEventListener("click", ()=>{
        const isOpen = item.classList.contains("open");
        list.querySelectorAll(".faq-item.open").forEach(o=>{
          o.classList.remove("open");
          o.querySelector(".faq-a").style.maxHeight = null;
        });
        if(!isOpen){
          item.classList.add("open");
          ans.style.maxHeight = ans.scrollHeight + "px";
        }
      });
      list.appendChild(item);
    });
  })();

  /* ============================================================
     BOOKING FLOW
     ============================================================ */
  const booking = {
    step: 0,
    service: null,
    categoryLabel: null,
    date: null,
    time: null,
  };

  function allServicesFlat(){
    const out = [];
    cfg.serviceCategories.forEach(cat=> cat.services.forEach(s=> out.push({...s, category: cat.label})));
    return out;
  }

  function renderBookingServiceGrid(){
    const grid = document.getElementById("bookingServiceGrid");
    grid.innerHTML = "";
    allServicesFlat().forEach(s=>{
      const opt = document.createElement("div");
      opt.className = "book-option";
      opt.innerHTML = `
        <div class="opt-name">${s.name}</div>
        <div class="opt-meta"><span>From ${s.price}</span><span>${s.duration}</span></div>
      `;
      opt.addEventListener("click", ()=>{
        grid.querySelectorAll(".book-option").forEach(o=>o.classList.remove("selected"));
        opt.classList.add("selected");
        booking.service = s;
        booking.categoryLabel = s.category;
        updateChip();
      });
      grid.appendChild(opt);
    });
  }
  renderBookingServiceGrid();

  window.preselectBookingService = function(svc, categoryLabel){
    booking.service = svc;
    booking.categoryLabel = categoryLabel;
    document.querySelectorAll("#bookingServiceGrid .book-option").forEach(opt=>{
      opt.classList.toggle("selected", opt.querySelector(".opt-name").textContent === svc.name);
    });
    updateChip();
    goToStep(1);
  };

  // Time slots — real availability once Supabase is connected: booked
  // times for the selected date are fetched and disabled live.
  const ALL_SLOTS = ["9:00 AM","10:00 AM","11:30 AM","1:00 PM","2:30 PM","4:00 PM","5:30 PM"];
  function renderTimeSlots(bookedTimes){
    const wrap = document.getElementById("timeSlots");
    wrap.innerHTML = "";
    ALL_SLOTS.forEach((slot)=>{
      const el = document.createElement("div");
      const isBooked = (bookedTimes || []).includes(slot);
      el.className = "time-slot" + (isBooked ? " disabled" : "");
      el.textContent = isBooked ? `${slot} · Booked` : slot;
      el.addEventListener("click", ()=>{
        if(el.classList.contains("disabled")) return;
        wrap.querySelectorAll(".time-slot").forEach(s=>s.classList.remove("selected"));
        el.classList.add("selected");
        booking.time = slot;
        updateChip();
      });
      wrap.appendChild(el);
    });
  }
  renderTimeSlots();

  /**
   * Looks up already-booked times for a given date from Supabase, so
   * two customers can't be offered the same slot. Returns [] if
   * Supabase isn't configured or the lookup fails — the site simply
   * shows every slot as open in that case, matching prior behaviour.
   */
  async function fetchBookedTimes(dateStr){
    if(!SUPABASE_CONFIGURED || !dateStr) return [];
    try{
      const { data, error } = await supabaseClient
        .from("bookings")
        .select("appointment_time")
        .eq("appointment_date", dateStr)
        .neq("status", "cancelled");
      if(error) throw error;
      return (data || []).map(r => r.appointment_time);
    } catch(err){
      console.warn("[Linda Twist] Availability lookup failed — showing all times as open.", err);
      return [];
    }
  }

  const dateInput = document.getElementById("bookingDate");
  const today = new Date();
  dateInput.min = today.toISOString().split("T")[0];
  dateInput.addEventListener("change", async ()=>{
    booking.date = dateInput.value;
    booking.time = null;
    updateChip();
    const wrap = document.getElementById("timeSlots");
    wrap.style.opacity = "0.5";
    const bookedTimes = await fetchBookedTimes(booking.date);
    wrap.style.opacity = "1";
    renderTimeSlots(bookedTimes);
  });

  function updateChip(){
    const chip = document.getElementById("bookingChip");
    const parts = [];
    if(booking.service) parts.push(booking.service.name);
    if(booking.date) parts.push(new Date(booking.date+"T00:00").toLocaleDateString(undefined,{month:"short", day:"numeric"}));
    if(booking.time) parts.push(booking.time);
    chip.textContent = parts.join(" · ");
    document.getElementById("bookingServiceReadout").value = booking.service ? booking.service.name : "";
    document.getElementById("clientServiceReadout").value = booking.service ? booking.service.name : "";
  }

  const steps = document.querySelectorAll(".booking-steps .step");
  const panels = document.querySelectorAll(".booking-panel");
  const backBtn = document.getElementById("bookingBack");
  const nextBtn = document.getElementById("bookingNext");

  function goToStep(n, emailResult){
    booking.step = n;
    steps.forEach((s,i)=>{
      s.classList.toggle("active", i===n);
      s.classList.toggle("done", i<n);
    });
    panels.forEach((p,i)=> p.classList.toggle("active", i===n));
    backBtn.style.visibility = n===0 ? "hidden" : "visible";
    nextBtn.textContent = n===3 ? "" : (n===2 ? "Confirm Appointment" : "Continue");
    if(n!==3) nextBtn.innerHTML += ' <span class="arrow">→</span>';
    document.getElementById("bookingNav").style.display = n===3 ? "none" : "flex";
    if(n===3) buildConfirmation(emailResult);
    document.querySelector(".booking-shell").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  function validateStep(n){
    if(n===0 && !booking.service){ alert("Please choose a service to continue."); return false; }
    if(n===1 && (!booking.date || !booking.time)){ alert("Please select a date and time to continue."); return false; }
    if(n===2){
      const name = document.getElementById("clientName").value.trim();
      const email = document.getElementById("clientEmail").value.trim();
      const phone = document.getElementById("clientPhone").value.trim();
      if(!name || !email || !phone){ alert("Please fill in your name, email and phone to confirm."); return false; }
      booking.name = name; booking.email = email; booking.phone = phone;
      booking.notes = document.getElementById("clientNotes").value.trim();
    }
    return true;
  }

  nextBtn.addEventListener("click", async ()=>{
    if(!validateStep(booking.step)) return;
    if(booking.step === 2){
      /**
       * BOOKING_INTEGRATION
       * Real email sending happens in sendBookingEmails() (EmailJS) above —
       * configure the three values in js/config.js → emailjs to activate it.
       * This is also the spot to add a scheduling backend (Calendly, Fresha,
       * Square, SimplyBook.me, a custom API + Stripe deposit, etc.) alongside
       * or instead of the email step. The confirmation screen renders from
       * local `booking` state regardless of which integrations are wired in.
       */
      const originalLabel = nextBtn.innerHTML;
      nextBtn.disabled = true;
      nextBtn.innerHTML = "Confirming your appointment…";
      const [emailResult] = await Promise.all([
        sendBookingEmails(),
        saveBookingToSupabase()
      ]);
      nextBtn.disabled = false;
      nextBtn.innerHTML = originalLabel;
      goToStep(3, emailResult);
      return;
    }
    goToStep(Math.min(3, booking.step+1));
  });
  backBtn.addEventListener("click", ()=> goToStep(Math.max(0, booking.step-1)));

  function buildConfirmation(emailResult){
    const wrap = document.getElementById("confirmDetails");
    const dateLabel = booking.date ? new Date(booking.date+"T00:00").toLocaleDateString(undefined,{weekday:"long", month:"long", day:"numeric"}) : "";
    wrap.innerHTML = `
      <div class="row"><span>Service</span><span>${booking.service ? booking.service.name : ""}</span></div>
      <div class="row"><span>Date</span><span>${dateLabel}</span></div>
      <div class="row"><span>Time</span><span>${booking.time || ""}</span></div>
      <div class="row"><span>Duration</span><span>${booking.service ? booking.service.duration : ""}</span></div>
      <div class="row"><span>Price</span><span>From ${booking.service ? booking.service.price : ""}</span></div>
      <div class="row"><span>Salon</span><span>${cfg.business.address}</span></div>
    `;
    document.getElementById("confirmAddress").textContent = cfg.business.address;

    const introEl = document.querySelector(".confirmation p.body-md");
    const statusEl = document.getElementById("emailStatusNote");
    if(emailResult && emailResult.sent){
      introEl.textContent = `A confirmation has been sent to ${booking.email}. We can't wait to see you.`;
      statusEl.textContent = "";
    } else if(emailResult && emailResult.reason === "not-configured"){
      introEl.textContent = "Your appointment is booked below. We can't wait to see you.";
      statusEl.textContent = "Note: email confirmations aren't connected yet — see js/config.js → emailjs to enable them.";
    } else if(emailResult && emailResult.reason === "send-error"){
      introEl.textContent = "Your appointment is booked below. We can't wait to see you.";
      statusEl.textContent = `We couldn't send an email confirmation to ${booking.email} just now — please save these details, and we'll follow up directly.`;
    } else {
      introEl.textContent = "Your appointment is booked below. We can't wait to see you.";
      statusEl.textContent = "";
    }
  }

})();