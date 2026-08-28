/**
 * ============================================================
 * SUPABASE CONNECTION CONFIG
 * ------------------------------------------------------------
 * Paste your project's values in below. Both of these are SAFE
 * to expose in browser code — this is the public "anon" key,
 * not the secret service-role key. Security is enforced by the
 * Row Level Security policies in /supabase/schema.sql, not by
 * hiding this key.
 *
 * Find these at: Supabase Dashboard → Project Settings → API
 *   - Project URL           → SUPABASE_URL
 *   - Project API keys→anon → SUPABASE_ANON_KEY
 *
 * NEVER paste the "service_role" key here or anywhere in
 * frontend code — that key bypasses Row Level Security entirely.
 * ============================================================
 */
const SUPABASE_URL = "";       // PLACEHOLDER — e.g. "https://abcxyz.supabase.co"
const SUPABASE_ANON_KEY = "";  // PLACEHOLDER — a long public anon key

const SUPABASE_CONFIGURED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Single shared client instance, used by both the public site and
// the admin dashboard. `window.supabase` is the global exposed by
// the supabase-js CDN script tag loaded before this file.
const supabaseClient = SUPABASE_CONFIGURED
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if(!SUPABASE_CONFIGURED){
  console.warn("[Linda Twist] Supabase isn't configured yet — see js/supabase-config.js. Falling back to local static content.");
}
