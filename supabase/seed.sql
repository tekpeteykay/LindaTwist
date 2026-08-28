-- ============================================================
-- LINDA TWIST CMS — SEED DATA
-- ------------------------------------------------------------
-- Optional, but recommended: run this AFTER schema.sql to load
-- the site's existing placeholder content into the database, so
-- the CMS (and public website) start out populated instead of
-- empty. Safe to skip if you'd rather add everything by hand
-- through the admin dashboard.
-- ============================================================

-- ---------- Categories ----------
insert into public.service_categories (name, slug, sort_order) values
  ('Braiding', 'braiding', 1),
  ('Natural Hair', 'natural', 2),
  ('Wig & Extensions', 'wigs', 3),
  ('General Styling', 'general', 4)
on conflict (slug) do nothing;

-- ---------- Services ----------
do $$
declare
  cat_braiding uuid; cat_natural uuid; cat_wigs uuid; cat_general uuid;
begin
  select id into cat_braiding from public.service_categories where slug = 'braiding';
  select id into cat_natural  from public.service_categories where slug = 'natural';
  select id into cat_wigs     from public.service_categories where slug = 'wigs';
  select id into cat_general  from public.service_categories where slug = 'general';

  insert into public.services (category_id, name, short_description, price, duration_text, featured, sort_order, image_url) values
    (cat_braiding, 'Knotless Braids',   'Lightweight, neat and effortlessly versatile.',      120, '4–6 hrs',      true,  1, 'https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1000&q=80&auto=format&fit=crop'),
    (cat_braiding, 'Box Braids',        'The timeless protective style, sized to your taste.', 110, '4–6 hrs',      false, 2, null),
    (cat_braiding, 'Feed-In Braids',    'Seamless, natural-looking growth from the root.',     75,  '2–3 hrs',      false, 3, null),
    (cat_braiding, 'Stitch Braids',     'Sharp, sculptural parts for a graphic finish.',       65,  '2–3 hrs',      false, 4, null),
    (cat_braiding, 'Ghana Braids',      'Bold, raised cornrow artistry with real impact.',     80,  '3–4 hrs',      false, 5, null),
    (cat_braiding, 'Fulani Braids',     'Cornrows and accents inspired by Fulani tradition.',  95,  '3–5 hrs',      true,  6, 'https://images.unsplash.com/photo-1533674689012-136b487b7736?w=1000&q=80&auto=format&fit=crop'),
    (cat_braiding, 'Tribal Braids',     'Statement patterns with curled, textured ends.',      130, '5–7 hrs',      false, 7, null),
    (cat_braiding, 'Lemonade Braids',   'Side-swept cornrows for an off-duty editorial look.', 90,  '3–4 hrs',      false, 8, null),
    (cat_braiding, 'Passion Twists',    'Soft, bohemian twists with beautiful movement.',      125, '4–6 hrs',      false, 9, null),
    (cat_braiding, 'Senegalese Twists', 'Sleek, rope-like twists that last for weeks.',        115, '4–6 hrs',      false, 10, null),

    (cat_natural, 'Wash & Blow Dry',      'A deep cleanse and smooth, full-bodied finish.',        35, '45–60 min', false, 1, null),
    (cat_natural, 'Natural Hair Styling', 'Styled to celebrate your hair''s natural texture.',     45, '1–2 hrs',   false, 2, null),
    (cat_natural, 'Silk Press',           'Sleek, glossy straightening that stays soft.',          55, '1.5–2 hrs', true,  3, 'https://images.unsplash.com/photo-1548094878-84ced0f6896d?w=1000&q=80&auto=format&fit=crop'),
    (cat_natural, 'Cornrows',             'Clean, close-to-scalp rows, styled your way.',          45, '1–2 hrs',   false, 4, null),
    (cat_natural, 'Protective Styling',   'Low-manipulation styles that support healthy growth.',  60, '2–3 hrs',   false, 5, null),
    (cat_natural, 'Hair Treatment',       'Deep conditioning to restore strength and shine.',      30, '45 min',    false, 6, null),

    (cat_wigs, 'Wig Installation',       'A secure, natural-looking fit built to last.',      65, '1.5–2 hrs', false, 1, null),
    (cat_wigs, 'Wig Styling',            'Cut, coloured and styled to suit your face shape.', 50, '1–1.5 hrs', false, 2, null),
    (cat_wigs, 'Wig Revamp',             'Bring a tired unit back to salon-fresh condition.', 40, '1 hr',      false, 3, null),
    (cat_wigs, 'Frontal Styling',        'Precision plucking and melting for an undetectable line.', 70, '2 hrs', false, 4, null),
    (cat_wigs, 'Closure Styling',        'Neat, blended closures styled to part naturally.',  55, '1.5 hrs',   false, 5, null),
    (cat_wigs, 'Extension Installation', 'Length and volume, seamlessly integrated.',         90, '2–3 hrs',   false, 6, null),

    (cat_general, 'Blow Dry',                 'Smooth, voluminous, ready for anything.',                  25, '30–45 min',       false, 1, null),
    (cat_general, 'Curls',                    'Soft to defined curls, tailored to the occasion.',         35, '45–60 min',       false, 2, null),
    (cat_general, 'Straightening',            'Sleek, glass-like straightening with heat protection.',    30, '45 min',          false, 3, null),
    (cat_general, 'Special Occasion Styling', 'Bridal, prom and event styling that lasts all night.',     65, '1.5 hrs',         false, 4, null),
    (cat_general, 'Children''s Hairstyles',   'Gentle, playful styles for our youngest clients.',         25, '45 min – 1.5 hrs', false, 5, null)
  on conflict do nothing;
end $$;

-- ---------- Gallery ----------
insert into public.gallery (image_url, caption, category, sort_order) values
  ('https://images.unsplash.com/photo-1533675080656-5aeaec05b16c?w=1200&q=80&auto=format&fit=crop', 'Knotless braids, medium parting', 'Braids', 1),
  ('https://images.unsplash.com/photo-1518639045788-b3bceb33cd9c?w=1200&q=80&auto=format&fit=crop', 'Fulani-inspired cornrows', 'Cornrows', 2),
  ('https://images.unsplash.com/photo-1533674689012-136b487b7736?w=1200&q=80&auto=format&fit=crop', 'Gold-detailed finish', 'Braids', 3),
  ('https://images.unsplash.com/photo-1533674507447-a5896f817163?w=1200&q=80&auto=format&fit=crop', 'Wig install, natural part', 'Wigs', 4),
  ('https://images.unsplash.com/photo-1533548720187-e08d782cae40?w=1200&q=80&auto=format&fit=crop', 'Signature cornrow design', 'Cornrows', 5),
  ('https://images.unsplash.com/photo-1519237966462-3b578ee746f6?w=1200&q=80&auto=format&fit=crop', 'Passion twists, natural finish', 'Braids', 6),
  ('https://images.unsplash.com/photo-1548094878-84ced0f6896d?w=1200&q=80&auto=format&fit=crop', 'Silk press, salon finish', 'Natural Hair', 7),
  ('https://images.unsplash.com/photo-1551512167-b8834db1d639?w=1200&q=80&auto=format&fit=crop', 'Client, signature look', 'Salon', 8)
on conflict do nothing;

-- ---------- Testimonials ----------
insert into public.testimonials (customer_name, quote, service, sort_order) values
  ('Amara O.', 'I walked in feeling ordinary and walked out feeling completely transformed.', 'Knotless Braids', 1),
  ('Chioma B.', 'The most precise parting I''ve ever had. Two months later it still looks fresh.', 'Fulani Braids', 2),
  ('Temi A.', 'It felt less like an appointment and more like being taken care of.', 'Silk Press', 3),
  ('Grace N.', 'My daughter''s first braids and she hasn''t stopped smiling since.', 'Children''s Hairstyles', 4)
on conflict do nothing;

-- ---------- FAQs ----------
insert into public.faqs (question, answer, sort_order) values
  ('Do I need to bring my own hair?', 'For most braiding and extension styles, hair is included in the price unless you''d prefer a specific brand, colour or texture — in which case, bring your own and we''ll take a little off the price.', 1),
  ('How long does my appointment take?', 'It depends entirely on the style — anywhere from 30 minutes for a blow dry to 6–7 hours for detailed tribal braids. Estimated durations are listed under each service.', 2),
  ('Do you take walk-ins?', 'We prioritise booked appointments to give every client our full attention, but call ahead and we''ll always try to fit you in.', 3),
  ('How much deposit is required?', 'A 20% deposit secures your appointment and is deducted from your final price. It''s refundable with 48 hours'' notice.', 4),
  ('What happens if I''m late?', 'A short grace period is built into every appointment, but arriving more than 15 minutes late may mean your style needs to be simplified or rescheduled.', 5),
  ('Can I reschedule?', 'Absolutely — just give us at least 48 hours'' notice and we''ll find you a new slot with no penalty.', 6),
  ('Do you style children''s hair?', 'Yes — we offer a full range of gentle, playful styles for younger clients.', 7),
  ('Do you offer natural hair services?', 'Yes, from wash and blow dry to silk press and protective styling — natural hair is a core part of what we do.', 8),
  ('How should I prepare before my appointment?', 'Arrive with clean, detangled hair where possible, and let us know about any scalp sensitivities when you book.', 9)
on conflict do nothing;

-- ---------- Site settings (business info + hero/about copy) ----------
update public.site_settings set
  phone             = '+44 7000 000 000',
  email             = 'hello@lindatwist.co.uk',
  address           = '14 Wenlock Terrace, Telford, TF3 4AH',
  instagram_url     = 'https://instagram.com/lindatwistbraids',
  facebook_url      = 'https://facebook.com/lindatwistbraids',
  tiktok_url        = 'https://tiktok.com/@lindatwistbraids',
  about_description = 'At Linda Twist, hair is treated with the attention it deserves — healthy hair practices, professional technique, and a comfortable space where you''re never rushed.'
where id = 1;
