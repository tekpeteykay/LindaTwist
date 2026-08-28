/**
 * ============================================================
 * PUBLIC SITE — DYNAMIC DATA LOADER
 * ------------------------------------------------------------
 * Fetches CMS-managed content (services, gallery, testimonials,
 * FAQs, business info) from Supabase and merges it into the
 * SITE_CONFIG object that main.js renders from — so a change made
 * in /admin.html shows up on the public site with no code edits.
 *
 * If Supabase isn't configured yet, or a fetch fails for any
 * reason (offline, RLS misconfigured, etc.), this quietly leaves
 * the static placeholder content from js/config.js in place —
 * the site never breaks because of a data-loading problem.
 *
 * main.js awaits `window.LINDA_TWIST_READY` before rendering
 * anything, so this always finishes first.
 * ============================================================
 */
window.LINDA_TWIST_READY = (async function loadDynamicContent(){
  if(!SUPABASE_CONFIGURED){
    return; // static config.js content stands as-is
  }

  try{
    const todayStr = new Date().toISOString().split("T")[0];

    const [
      categoriesRes,
      servicesRes,
      galleryRes,
      testimonialsRes,
      faqsRes,
      settingsRes,
      hoursRes,
      navRes,
      promoRes
    ] = await Promise.all([
      supabaseClient.from("service_categories").select("*").eq("active", true).order("sort_order"),
      supabaseClient.from("services").select("*").eq("active", true).order("sort_order"),
      supabaseClient.from("gallery").select("*").order("sort_order"),
      supabaseClient.from("testimonials").select("*").eq("published", true).order("sort_order"),
      supabaseClient.from("faqs").select("*").eq("published", true).order("sort_order"),
      supabaseClient.from("site_settings").select("*").eq("id", 1).single(),
      supabaseClient.from("business_hours").select("*").order("day_of_week"),
      supabaseClient.from("navigation_items").select("*").eq("enabled", true).order("sort_order"),
      supabaseClient.from("promotions").select("*").eq("active", true)
        .or(`start_date.is.null,start_date.lte.${todayStr}`)
        .or(`end_date.is.null,end_date.gte.${todayStr}`)
        .limit(1)
    ]);

    // ---------- Services + categories ----------
    if(categoriesRes.data && servicesRes.data && categoriesRes.data.length){
      SITE_CONFIG.serviceCategories = categoriesRes.data.map(cat => ({
        id: cat.slug,
        label: cat.name,
        services: servicesRes.data
          .filter(s => s.category_id === cat.id)
          .map(s => ({
            id: s.id,
            name: s.name,
            blurb: s.short_description || "",
            price: `${currencySymbol(s.currency)}${Number(s.price).toFixed(0)}`,
            duration: s.duration_text || "",
            image: s.image_url || null
          }))
      })).filter(cat => cat.services.length > 0);

      // Featured styles (masonry) — pull from services flagged "featured"
      const featured = servicesRes.data.filter(s => s.featured && s.image_url);
      if(featured.length){
        const sizes = ["lg","tall","sm","wide","sm","tall"];
        SITE_CONFIG.featuredStyles = featured.map((s,i) => ({
          name: s.name,
          tag: (categoriesRes.data.find(c=>c.id===s.category_id) || {}).name || "",
          size: sizes[i % sizes.length],
          image: s.image_url
        }));
      }
    }

    // ---------- Gallery ----------
    if(galleryRes.data && galleryRes.data.length){
      SITE_CONFIG.gallery = galleryRes.data.map(g => ({
        image: g.image_url,
        caption: g.caption || ""
      }));
    }

    // ---------- Testimonials ----------
    if(testimonialsRes.data && testimonialsRes.data.length){
      SITE_CONFIG.testimonials = testimonialsRes.data.map(t => ({
        quote: t.quote,
        name: t.customer_name,
        service: t.service || ""
      }));
    }

    // ---------- FAQs ----------
    if(faqsRes.data && faqsRes.data.length){
      SITE_CONFIG.faqs = faqsRes.data.map(f => ({ q: f.question, a: f.answer }));
    }

    // ---------- Business info + homepage copy ----------
    const s = settingsRes.data;
    if(s){
      Object.assign(SITE_CONFIG.business, {
        name: s.business_name || SITE_CONFIG.business.name,
        fullName: s.full_name || SITE_CONFIG.business.fullName,
        tagline: s.tagline || SITE_CONFIG.business.tagline,
        phone: s.phone || SITE_CONFIG.business.phone,
        email: s.email || SITE_CONFIG.business.email,
        address: s.address || SITE_CONFIG.business.address,
        instagram: s.instagram_url || SITE_CONFIG.business.instagram,
        facebook: s.facebook_url || SITE_CONFIG.business.facebook,
        tiktok: s.tiktok_url || SITE_CONFIG.business.tiktok
      });
      SITE_CONFIG._hero = {
        heading: s.hero_heading || null,     // e.g. "YOUR HAIR.\nYOUR CROWN."
        subheading: s.hero_subheading || null,
        image: s.hero_image_url || null
      };
      if(s.about_description) SITE_CONFIG.about.quote = s.about_description;
      if(s.about_image_url) SITE_CONFIG.about.image = s.about_image_url;

      SITE_CONFIG._seo = {
        title: s.seo_title || null,
        description: s.seo_description || null,
        ogImage: s.og_image_url || null
      };
    }

    // ---------- Navigation ----------
    if(navRes.data && navRes.data.length){
      SITE_CONFIG.nav = navRes.data.map(n => ({ label: n.label, href: n.href }));
    }

    // ---------- Active promotion (banner) ----------
    if(promoRes.data && promoRes.data.length){
      const p = promoRes.data[0];
      const discount = p.discount_type === "percentage" ? `${p.discount_amount}% off` : `${currencySymbol(SITE_CONFIG.business.currency)}${p.discount_amount} off`;
      SITE_CONFIG._promo = {
        title: p.title,
        discount,
        code: p.promo_code || null
      };
    }

    // ---------- Business hours ----------
    if(hoursRes.data && hoursRes.data.length){
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      SITE_CONFIG.business.hours = hoursRes.data.map(h => ({
        day: dayNames[h.day_of_week],
        time: h.is_closed ? "Closed" : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`
      }));
    }

  } catch(err){
    console.warn("[Linda Twist] Live content fetch failed — showing static placeholder content instead.", err);
  }
})();

function currencySymbol(code){
  return { GBP: "£", USD: "$", EUR: "€" }[code] || "£";
}
function formatTime(t){
  if(!t) return "";
  const [h,m] = t.split(":");
  const hour = parseInt(h,10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${m} ${suffix}`;
}

/**
 * Records a lightweight activity-log entry that shows up in the
 * admin dashboard's "Recent Activity" feed. Never blocks or throws —
 * a failed log write should never affect the visitor's experience.
 */
window.logActivity = async function(type, description){
  if(!SUPABASE_CONFIGURED) return;
  try{
    await supabaseClient.from("activity_logs").insert({ type, description });
  } catch(err){
    console.warn("[Linda Twist] Activity log failed:", err);
  }
};
