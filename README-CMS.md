# Linda Twist — CMS Setup Guide

This turns the Linda Twist website into a real content-managed site: a
secure `/admin.html` dashboard, backed by a real Supabase database,
authentication and image storage. Changes made in the dashboard appear
on the public website automatically — no code edits required.

Budget about **20–30 minutes** for the one-time setup below.

---

## 1. How it fits together

```
/index.html              ← public website (unchanged design/animations)
/admin.html              ← admin dashboard (new)
/admin/*.js              ← one module per dashboard section
/js/config.js            ← static fallback content (used if Supabase isn't configured)
/js/supabase-config.js   ← YOUR Supabase URL + anon key go here
/js/data-loader.js       ← fetches live content from Supabase into the public site
/supabase/schema.sql     ← database tables + security rules (run once)
/supabase/seed.sql       ← optional starter content (run once, after schema.sql)
```

There's no separate backend server. The public site and the admin
dashboard both talk **directly to Supabase** from the browser, using
the public "anon" key. Security isn't based on hiding that key — it's
enforced by **Row Level Security (RLS)** policies in `schema.sql`,
which is the standard, secure way to build this on Supabase:

- Anyone can *read* published services, gallery images, testimonials,
  FAQs, and settings — that's the public website.
- Anyone can *create* a booking (that's the booking form) — but only
  signed-in staff can *read or change* bookings.
- Only signed-in staff (checked against the `profiles` table) can
  create, edit or delete content.

The **service-role key** (which bypasses RLS entirely) is never used
anywhere in this project — it isn't needed for anything the CMS does.

---

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up (free tier is
   plenty for this) → **New Project**.
2. Pick a name, a database password (save it somewhere), and a region
   close to your customers.
3. Wait ~2 minutes for it to provision.

---

## 3. Run the database schema

1. In your project, go to **SQL Editor → New query**.
2. Open `/supabase/schema.sql` from this project, copy its entire
   contents, paste into the editor, and click **Run**.
3. *(Recommended)* Do the same with `/supabase/seed.sql` — this loads
   the salon's existing services, gallery, testimonials and FAQs into
   the database so the CMS starts populated instead of empty.

Both files are safe to re-run if you need to.

---

## 4. Create a storage bucket for images

1. Go to **Storage → New bucket**.
2. Name it exactly **`salon-media`**.
3. Toggle **Public bucket: ON** (images need to be publicly viewable
   on the website — this is normal for a media bucket; write access
   is still restricted to signed-in staff, enforced by `schema.sql`).
4. Create.

---

## 5. Connect the website to your project

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **`anon` `public`** key (NOT the
   `service_role` key).
3. Open `/js/supabase-config.js` in this project and paste them in:

   ```js
   const SUPABASE_URL = "https://your-project.supabase.co";
   const SUPABASE_ANON_KEY = "your-long-anon-key";
   ```

That's the only file that needs editing to go from "static demo" to
"live CMS-backed site."

---

## 6. Create your first admin user

1. In Supabase: **Authentication → Users → Add user** (create user
   manually). Use the salon owner's real email and a password.
2. Back in **SQL Editor**, run:

   ```sql
   update public.profiles set role = 'admin'
   where email = 'the-email-you-just-used@example.com';
   ```

   (The `profiles` row is created automatically the moment the user
   exists — this just promotes it from the default `staff` role to
   `admin`, which can change settings and other things staff can't.)

3. Go to `/admin.html` on your site and sign in with that email and
   password.

**Roles:** `admin` (everything, including Settings), `manager` (all
content + bookings, not Settings), `staff` (view/manage bookings and
customers only). Assign roles the same way — via that same `update`
statement — there's no in-dashboard "add another admin" screen yet
(see Section 9, "What's not included").

---

## 7. Local testing

This is a static site — no build step, no server required.

```bash
cd linda-twist
python3 -m http.server 8080
# then open http://localhost:8080          → public site
# and    http://localhost:8080/admin.html  → dashboard
```

Or just double-click `index.html` — everything works from `file://`
too, except Supabase calls, which need `http(s)://` (any local server
is fine, including VS Code's "Live Server" extension).

**Test the full loop** end to end:
1. Sign in to `/admin.html`.
2. Edit a service's price in **Services**.
3. Refresh the public site — the new price should show immediately in
   the Services section and the booking flow.
4. Submit a test booking on the public site.
5. Refresh **Bookings** in the dashboard — it should appear there,
   and on **Dashboard** the "Today's Bookings" / "Revenue" numbers
   should update.

---

## 8. Deploy (GitHub + Vercel)

1. Push this project to a new GitHub repository.
2. In [Vercel](https://vercel.com): **New Project → Import** that
   repo.
3. Framework preset: **Other** (it's a static site — no build command
   needed). Leave build/output settings blank/default.
4. Deploy.

There are no environment variables to set in Vercel — the Supabase
URL and anon key live in `/js/supabase-config.js`, which is fine to
commit (see Section 1 on why the anon key is safe to expose). If
you'd rather keep it out of git history, add
`js/supabase-config.js` to `.gitignore` and instead commit
`js/supabase-config.example.js` with blank placeholders, filling in
the real file only on your deployed server / locally.

Once deployed, update the **Site URL** and **Redirect URLs** in
Supabase → **Authentication → URL Configuration** to your real Vercel
domain, so "forgot password" email links work correctly.

---

## 9. What's included vs. deferred

**Fully built and functional:** admin login/logout/password reset,
role-based access via RLS (`admin`/`manager`/`staff`, enforced in the
database, plus an Admin Users screen to change someone's role),
Services + Categories CRUD with image upload and per-service SEO
overrides, Gallery manager with upload/reorder/captions, Testimonials
CRUD, FAQ CRUD with reordering, Bookings list + detail view with
status/payment updates, a month Calendar view, Homepage hero/about
editor, Promotions (seasonal offers with discount type/code/date
range, shown as a dismissible banner on the live site), a Navigation
manager (with a confirmation prompt before removing a menu item),
Messages/enquiries fed by a real "Get In Touch" contact form on the
public site, a Media Library indexing every upload with usage
detection, site-wide SEO fields (title/description/social image),
Business Settings + hours editor, and a live Dashboard (today's
bookings, revenue, customers, popular services, recent activity).
The public site fetches all of it live, the booking form checks
real-time availability and writes directly into `bookings`, and the
contact form writes into `messages`.

**Deliberately simplified** — flagging these rather than shipping a
shallow version of each:
- **Inviting brand-new admin users** happens via Supabase Dashboard
  (Section 6), not a button in the CMS — creating an auth user from
  the browser with the public anon key would sign the current admin
  out and switch sessions to the new account, which is worse UX than
  one extra step in Supabase. Changing an *existing* user's role is
  fully self-service, in Admin Users.
- **Drag-to-reorder** — gallery/FAQ/navigation reordering uses
  up/down buttons rather than drag handles; same result, less code
  and no extra library.
- **SEO fields don't change what search-engine crawlers see** — since
  this is a static single-page site with no server-side rendering,
  the title/description are applied via JavaScript after the page
  loads. That's genuinely useful for browser tabs, bookmarks and
  most social-preview crawlers, but a search engine that doesn't
  execute JavaScript would still see the original `<head>` tags. True
  crawler-visible per-page SEO would need server-side rendering,
  which is a bigger architectural change than this pass covers.

Nothing here is stubbed — every screen above does real reads/writes
against the database.
