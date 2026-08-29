/**
 * ============================================================
 * LINDA TWIST — SITE CONFIGURATION
 * ------------------------------------------------------------
 * Everything a real salon owner would need to change lives here:
 * business info, services, prices, gallery images, testimonials,
 * FAQs, and social links. Nothing below this file should need
 * to be touched to update copy or content.
 *
 * All images are PLACEHOLDER photography (free-license Unsplash)
 * marked with "// PLACEHOLDER" — swap the URLs for the salon's
 * own photography before launch. All prices, hours and contact
 * details are illustrative placeholders — replace with real data.
 * ============================================================
 */

const SITE_CONFIG = {

  business: {
    name: "Linda Twist",
    fullName: "Linda Twist Braids & Saloon Services",
    tagline: "Your hair. Your crown.",
    phone: "+44 7000 000 000",          // PLACEHOLDER
    email: "hello@lindatwist.co.uk",     // PLACEHOLDER
    address: "14 Wenlock Terrace, Telford, TF3 4AH", // PLACEHOLDER
    instagram: "https://instagram.com/lindatwistbraids",   // PLACEHOLDER
    facebook: "https://facebook.com/lindatwistbraids",     // PLACEHOLDER
    tiktok: "https://tiktok.com/@lindatwistbraids",        // PLACEHOLDER
    hours: [
      { day: "Tuesday – Friday", time: "9:00 AM – 6:00 PM" },
      { day: "Saturday",         time: "8:00 AM – 7:00 PM" },
      { day: "Sunday",           time: "10:00 AM – 4:00 PM" },
      { day: "Monday",           time: "Closed" }
    ],
    // Where a booking request should ultimately be sent.
    // Swap this out for a real Calendly / Fresha / Square / SimplyBook.me
    // scheduling link, or point BOOKING_INTEGRATION (in main.js) at an API.
    bookingUrl: "#booking"
  },

  /**
   * EMAIL CONFIRMATIONS (via EmailJS — https://www.emailjs.com)
   * ------------------------------------------------------------
   * This lets the booking form send a real confirmation email to the
   * CLIENT's own inbox, plus an optional notification to the salon's
   * inbox — with no backend server required. It's free for low volume.
   *
   * SETUP (about 5 minutes):
   *   1. Create a free account at emailjs.com.
   *   2. Add an "Email Service" and connect the salon's Gmail/Outlook/
   *      other inbox — this is the address emails will be sent FROM.
   *      Copy its Service ID into `serviceId` below.
   *   3. Create an Email Template for the CLIENT confirmation. Use
   *      merge fields in the template body such as {{to_email}},
   *      {{client_name}}, {{service_name}}, {{date}}, {{time}},
   *      {{duration}}, {{price}}, {{salon_address}}, {{notes}} — set
   *      the template's "To Email" field to {{to_email}}. Copy its
   *      Template ID into `clientTemplateId`.
   *   4. (Optional) Create a second template that notifies the SALON
   *      of a new booking — set its "To Email" field to the salon's
   *      own address (hard-coded, not a merge field) and use the same
   *      merge fields. Copy its Template ID into `ownerTemplateId`,
   *      or leave blank to skip owner notifications.
   *   5. Find the Public Key under Account → General, and paste it
   *      into `publicKey`.
   *
   * Until these three values are filled in, the booking flow still
   * works end-to-end in the browser — it just won't send real email.
   */
  emailjs: {
    serviceId: "",         // PLACEHOLDER — e.g. "service_abc1234"
    clientTemplateId: "template_pgtyllg",  // PLACEHOLDER — e.g. "template_client_confirm"
    ownerTemplateId: "",   // PLACEHOLDER, optional — e.g. "template_owner_notify"
    publicKey: ""          // PLACEHOLDER — e.g. "AbCdEfGhIjKlMnOp"
  },

  nav: [
    { label: "Home",     href: "#home" },
    { label: "Services", href: "#services" },
    { label: "Styles",   href: "#styles" },
    { label: "About",    href: "#about" },
    { label: "Gallery",  href: "#gallery" },
    { label: "FAQs",     href: "#faqs" }
  ],

  /**
   * SERVICES
   * Grouped by category. Each service can be booked directly —
   * selecting "Book this style" pre-fills the booking section.
   */
  serviceCategories: [
    {
      id: "braiding",
      label: "Braiding",
      services: [
        { name: "Knotless Braids",   blurb: "Lightweight, neat and effortlessly versatile.",           price: "£120", duration: "4–6 hrs" },
        { name: "Box Braids",        blurb: "The timeless protective style, sized to your taste.",     price: "£110", duration: "4–6 hrs" },
        { name: "Feed-In Braids",    blurb: "Seamless, natural-looking growth from the root.",         price: "£75",  duration: "2–3 hrs" },
        { name: "Stitch Braids",     blurb: "Sharp, sculptural parts for a graphic finish.",            price: "£65",  duration: "2–3 hrs" },
        { name: "Ghana Braids",      blurb: "Bold, raised cornrow artistry with real impact.",          price: "£80",  duration: "3–4 hrs" },
        { name: "Fulani Braids",     blurb: "Cornrows and accents inspired by Fulani tradition.",       price: "£95",  duration: "3–5 hrs" },
        { name: "Tribal Braids",     blurb: "Statement patterns with curled, textured ends.",           price: "£130", duration: "5–7 hrs" },
        { name: "Lemonade Braids",   blurb: "Side-swept cornrows for an off-duty editorial look.",      price: "£90",  duration: "3–4 hrs" },
        { name: "Passion Twists",    blurb: "Soft, bohemian twists with beautiful movement.",           price: "£125", duration: "4–6 hrs" },
        { name: "Senegalese Twists", blurb: "Sleek, rope-like twists that last for weeks.",             price: "£115", duration: "4–6 hrs" }
      ]
    },
    {
      id: "natural",
      label: "Natural Hair",
      services: [
        { name: "Wash & Blow Dry",        blurb: "A deep cleanse and smooth, full-bodied finish.", price: "£35", duration: "45–60 min" },
        { name: "Natural Hair Styling",   blurb: "Styled to celebrate your hair's natural texture.", price: "£45", duration: "1–2 hrs" },
        { name: "Silk Press",             blurb: "Sleek, glossy straightening that stays soft.",    price: "£55", duration: "1.5–2 hrs" },
        { name: "Cornrows",               blurb: "Clean, close-to-scalp rows, styled your way.",    price: "£45", duration: "1–2 hrs" },
        { name: "Protective Styling",     blurb: "Low-manipulation styles that support healthy growth.", price: "£60", duration: "2–3 hrs" },
        { name: "Hair Treatment",         blurb: "Deep conditioning to restore strength and shine.", price: "£30", duration: "45 min" }
      ]
    },
    {
      id: "wigs",
      label: "Wig & Extensions",
      services: [
        { name: "Wig Installation",   blurb: "A secure, natural-looking fit built to last.",     price: "£65",  duration: "1.5–2 hrs" },
        { name: "Wig Styling",        blurb: "Cut, coloured and styled to suit your face shape.", price: "£50",  duration: "1–1.5 hrs" },
        { name: "Wig Revamp",         blurb: "Bring a tired unit back to salon-fresh condition.", price: "£40",  duration: "1 hr" },
        { name: "Frontal Styling",    blurb: "Precision plucking and melting for an undetectable line.", price: "£70", duration: "2 hrs" },
        { name: "Closure Styling",    blurb: "Neat, blended closures styled to part naturally.",  price: "£55",  duration: "1.5 hrs" },
        { name: "Extension Installation", blurb: "Length and volume, seamlessly integrated.",     price: "£90",  duration: "2–3 hrs" }
      ]
    },
    {
      id: "general",
      label: "General Styling",
      services: [
        { name: "Blow Dry",                blurb: "Smooth, voluminous, ready for anything.",         price: "£25", duration: "30–45 min" },
        { name: "Curls",                   blurb: "Soft to defined curls, tailored to the occasion.", price: "£35", duration: "45–60 min" },
        { name: "Straightening",           blurb: "Sleek, glass-like straightening with heat protection.", price: "£30", duration: "45 min" },
        { name: "Special Occasion Styling", blurb: "Bridal, prom and event styling that lasts all night.", price: "£65", duration: "1.5 hrs" },
        { name: "Children's Hairstyles",   blurb: "Gentle, playful styles for our youngest clients.", price: "£25", duration: "45 min – 1.5 hrs" }
      ]
    }
  ],

  /**
   * FEATURED STYLES — the editorial masonry section.
   * "size" controls the grid placement (see CSS classes: sm / md / lg / tall / wide).
   */
  featuredStyles: [
    { name: "Knotless Braids", tag: "Braiding",   size: "lg",   image: "https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1400&q=80&auto=format&fit=crop" },
    { name: "Fulani Braids",   tag: "Braiding",   size: "tall", image: "https://images.unsplash.com/photo-1533674689012-136b487b7736?w=1000&q=80&auto=format&fit=crop" },
    { name: "Silk Press",      tag: "Natural Hair", size: "sm", image: "https://images.unsplash.com/photo-1548094878-84ced0f6896d?w=900&q=80&auto=format&fit=crop" },
    { name: "Signature Twists", tag: "Braiding",  size: "wide", image: "https://images.unsplash.com/photo-1519237966462-3b578ee746f6?w=1600&q=80&auto=format&fit=crop" },
    { name: "Wig Styling",     tag: "Wigs",       size: "sm",   image: "https://images.unsplash.com/photo-1533674507447-a5896f817163?w=900&q=80&auto=format&fit=crop" },
    { name: "Cornrows",        tag: "Natural Hair", size: "tall", image: "https://images.unsplash.com/photo-1533548720187-e08d782cae40?w=1000&q=80&auto=format&fit=crop" }
  ],

  /**
   * THE ART OF THE TWIST — pinned storytelling panels.
   */
  craftPanels: [
    { number: "01", title: "Braiding",            copy: "Every parting is planned before a single strand is picked up — precision first, artistry second.", image: "https://images.unsplash.com/photo-1518639045788-b3bceb33cd9c?w=1200&q=80&auto=format&fit=crop" },
    { number: "02", title: "Protective Styling",  copy: "Styles built to guard your natural hair while it grows, without asking you to compromise on beauty.", image: "https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1200&q=80&auto=format&fit=crop" },
    { number: "03", title: "Natural Hair",        copy: "Texture is celebrated, not corrected. We work with what grows from your scalp, not against it.", image: "https://images.unsplash.com/photo-1551512167-b8834db1d639?w=1200&q=80&auto=format&fit=crop" },
    { number: "04", title: "Signature Finishes",  copy: "The final ten minutes — edges, parting, shine — are where a good style becomes a great one.", image: "https://images.unsplash.com/photo-1543756779-ea44ce4f4e64?w=1200&q=80&auto=format&fit=crop" }
  ],

  /**
   * GALLERY — the horizontal-scroll pinned strip.
   */
  gallery: [
    { image: "https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1200&q=80&auto=format&fit=crop", caption: "Knotless braids, medium parting" },
    { image: "https://images.unsplash.com/photo-1518639045788-b3bceb33cd9c?w=1200&q=80&auto=format&fit=crop", caption: "Fulani-inspired cornrows" },
    { image: "https://images.unsplash.com/photo-1533674689012-136b487b7736?w=1200&q=80&auto=format&fit=crop", caption: "Gold-detailed finish" },
    { image: "https://images.unsplash.com/photo-1533674507447-a5896f817163?w=1200&q=80&auto=format&fit=crop", caption: "Wig install, natural part" },
    { image: "https://images.unsplash.com/photo-1533548720187-e08d782cae40?w=1200&q=80&auto=format&fit=crop", caption: "Signature cornrow design" },
    { image: "https://images.unsplash.com/photo-1519237966462-3b578ee746f6?w=1200&q=80&auto=format&fit=crop", caption: "Passion twists, natural finish" },
    { image: "https://images.unsplash.com/photo-1548094878-84ced0f6896d?w=1200&q=80&auto=format&fit=crop", caption: "Silk press, salon finish" },
    { image: "https://images.unsplash.com/photo-1551512167-b8834db1d639?w=1200&q=80&auto=format&fit=crop", caption: "Client, signature look" }
  ],

  transformation: {
    before: "https://images.unsplash.com/photo-1573497619951-6c9477fb83b4?w=1200&q=80&auto=format&fit=crop", // PLACEHOLDER
    after:  "https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1200&q=80&auto=format&fit=crop"  // PLACEHOLDER
  },

  about: {
    image: "https://images.unsplash.com/photo-1543756779-ea44ce4f4e64?w=1200&q=80&auto=format&fit=crop", // PLACEHOLDER — swap for a real portrait of Linda / the salon
    quote: "Hair is more than a service here. It's craftsmanship, confidence and self-expression."
  },

  whyUs: [
    { number: "01", title: "Expert Craft",              copy: "Beautiful styles built with precision, from the first section to the last strand." },
    { number: "02", title: "Your Time Matters",         copy: "Efficient appointments that never rush the finish." },
    { number: "03", title: "Style That Lasts",          copy: "Professional techniques designed to hold for weeks, not days." },
    { number: "04", title: "Beauty Without Compromise", copy: "Your comfort and satisfaction come first, always." },
    { number: "05", title: "Made For You",              copy: "Every hairstyle is adapted to your hair, your face and your life." }
  ],

  testimonials: [
    { quote: "I walked in feeling ordinary and walked out feeling completely transformed.", name: "Amara O.", service: "Knotless Braids" },
    { quote: "The most precise parting I've ever had. Two months later it still looks fresh.", name: "Chioma B.", service: "Fulani Braids" },
    { quote: "It felt less like an appointment and more like being taken care of.", name: "Temi A.", service: "Silk Press" },
    { quote: "My daughter's first braids and she hasn't stopped smiling since.", name: "Grace N.", service: "Children's Hairstyles" }
  ],

  faqs: [
    { q: "Do I need to bring my own hair?", a: "For most braiding and extension styles, hair is included in the price unless you'd prefer a specific brand, colour or texture — in which case, bring your own and we'll take a little off the price." },
    { q: "How long does my appointment take?", a: "It depends entirely on the style — anywhere from 30 minutes for a blow dry to 6–7 hours for detailed tribal braids. Estimated durations are listed under each service." },
    { q: "Do you take walk-ins?", a: "We prioritise booked appointments to give every client our full attention, but call ahead and we'll always try to fit you in." },
    { q: "How much deposit is required?", a: "A 20% deposit secures your appointment and is deducted from your final price. It's refundable with 48 hours' notice." },
    { q: "What happens if I'm late?", a: "A short grace period is built into every appointment, but arriving more than 15 minutes late may mean your style needs to be simplified or rescheduled." },
    { q: "Can I reschedule?", a: "Absolutely — just give us at least 48 hours' notice and we'll find you a new slot with no penalty." },
    { q: "Do you style children's hair?", a: "Yes — we offer a full range of gentle, playful styles for younger clients." },
    { q: "Do you offer natural hair services?", a: "Yes, from wash and blow dry to silk press and protective styling — natural hair is a core part of what we do." },
    { q: "How should I prepare before my appointment?", a: "Arrive with clean, detangled hair where possible, and let us know about any scalp sensitivities when you book." }
  ]

};
