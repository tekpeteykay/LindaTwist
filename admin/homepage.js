/**
 * ============================================================
 * ADMIN — homepage.js
 * ============================================================
 */
(function(){
  "use strict";

  let heroImageUrl = null, aboutImageUrl = null;

  async function render(){
    const form = document.getElementById("homepageForm");
    if(!SUPABASE_CONFIGURED){ Admin.toast("Connect Supabase to edit homepage content.", "error"); return; }

    try{
      const { data, error } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
      if(error) throw error;

      document.getElementById("hpHeroHeading").value = data.hero_heading || "";
      document.getElementById("hpHeroSub").value = data.hero_subheading || "";
      document.getElementById("hpAboutDesc").value = data.about_description || "";
      heroImageUrl = data.hero_image_url;
      aboutImageUrl = data.about_image_url;

      Admin.wireImageDrop(
        document.getElementById("hpHeroImageDrop"),
        document.getElementById("hpHeroImageInput"),
        { existingUrl: heroImageUrl, onFile: async (file, dropEl)=>{
          try{ heroImageUrl = await Admin.uploadImage(file, "homepage"); dropEl.querySelector(".hint").textContent = "Uploaded ✓ (click to replace)"; }
          catch(err){ Admin.toast(err.message, "error"); }
        }}
      );
      Admin.wireImageDrop(
        document.getElementById("hpAboutImageDrop"),
        document.getElementById("hpAboutImageInput"),
        { existingUrl: aboutImageUrl, onFile: async (file, dropEl)=>{
          try{ aboutImageUrl = await Admin.uploadImage(file, "homepage"); dropEl.querySelector(".hint").textContent = "Uploaded ✓ (click to replace)"; }
          catch(err){ Admin.toast(err.message, "error"); }
        }}
      );
    } catch(err){
      Admin.toast("Couldn't load homepage content: " + err.message, "error");
    }
  }

  const form = document.getElementById("homepageForm");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      hero_heading: document.getElementById("hpHeroHeading").value.trim(),
      hero_subheading: document.getElementById("hpHeroSub").value.trim(),
      hero_image_url: heroImageUrl,
      about_description: document.getElementById("hpAboutDesc").value.trim(),
      about_image_url: aboutImageUrl
    };
    const { error } = await supabaseClient.from("site_settings").update(payload).eq("id", 1);
    if(error){ Admin.toast(error.message, "error"); return; }
    Admin.toast("Homepage content updated — live on the website now.");
  });

  Admin.registerView("homepage", render);
})();
