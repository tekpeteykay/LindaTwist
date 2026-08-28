-- ============================================================
-- LINDA TWIST CMS — DATABASE SCHEMA + ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- Run this once in your Supabase project's SQL editor
-- (Dashboard → SQL Editor → New Query → paste → Run).
--
-- Safe to re-run: every statement is guarded with IF NOT EXISTS
-- or CREATE OR REPLACE where possible.
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ============================================================
-- 1. PROFILES  (one row per admin/manager/staff user)
-- ------------------------------------------------------------
-- Linked 1:1 to Supabase Auth users (auth.users). Created
-- automatically by a trigger when someone signs up, defaulting
-- to role 'staff' — promote to 'admin'/'manager' manually via SQL,
-- see the note at the bottom of this file.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin','manager','staff')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: is the current user any kind of staff (admin/manager/staff)?
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','manager','staff')
  );
$$ language sql security definer stable;

-- Helper: is the current user an admin or manager (can write content)?
create or replace function public.is_editor()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','manager')
  );
$$ language sql security definer stable;

-- Helper: is the current user a full admin (can change settings/users)?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

alter table public.profiles enable row level security;

drop policy if exists "profiles: self can view own" on public.profiles;
create policy "profiles: self can view own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles: staff can view all" on public.profiles;
create policy "profiles: staff can view all" on public.profiles
  for select using (public.is_staff());

-- ============================================================
-- 2. SERVICE CATEGORIES
-- ============================================================
create table if not exists public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.service_categories enable row level security;

drop policy if exists "categories: public can view active" on public.service_categories;
create policy "categories: public can view active" on public.service_categories
  for select using (active = true or public.is_staff());

drop policy if exists "categories: editors can write" on public.service_categories;
create policy "categories: editors can write" on public.service_categories
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 3. SERVICES
-- ============================================================
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.service_categories(id) on delete set null,
  name             text not null,
  short_description text,
  description      text,
  price            numeric(10,2) not null default 0,
  price_is_from    boolean not null default true,
  currency         text not null default 'GBP',
  duration_text    text,
  deposit_amount   numeric(10,2),
  requires_deposit boolean not null default false,
  online_booking   boolean not null default true,
  image_url        text,
  featured         boolean not null default false,
  active           boolean not null default true,
  seo_title        text,
  seo_description  text,
  slug             text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute procedure public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists "services: public can view active" on public.services;
create policy "services: public can view active" on public.services
  for select using (active = true or public.is_staff());

drop policy if exists "services: editors can write" on public.services;
create policy "services: editors can write" on public.services
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 4. GALLERY
-- ============================================================
create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  caption     text,
  category    text,
  featured    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.gallery enable row level security;

drop policy if exists "gallery: public can view" on public.gallery;
create policy "gallery: public can view" on public.gallery
  for select using (true);

drop policy if exists "gallery: editors can write" on public.gallery;
create policy "gallery: editors can write" on public.gallery
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 5. TESTIMONIALS
-- ============================================================
create table if not exists public.testimonials (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  quote          text not null,
  service        text,
  rating         int not null default 5 check (rating between 1 and 5),
  published      boolean not null default true,
  featured       boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials: public can view published" on public.testimonials;
create policy "testimonials: public can view published" on public.testimonials
  for select using (published = true or public.is_staff());

drop policy if exists "testimonials: editors can write" on public.testimonials;
create policy "testimonials: editors can write" on public.testimonials
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 6. FAQS
-- ============================================================
create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  sort_order  int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.faqs enable row level security;

drop policy if exists "faqs: public can view published" on public.faqs;
create policy "faqs: public can view published" on public.faqs
  for select using (published = true or public.is_staff());

drop policy if exists "faqs: editors can write" on public.faqs;
create policy "faqs: editors can write" on public.faqs
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 7. SITE SETTINGS  (single row: business info + homepage copy)
-- ============================================================
create table if not exists public.site_settings (
  id                 int primary key default 1 check (id = 1),
  business_name      text not null default 'Linda Twist',
  full_name          text not null default 'Linda Twist Braids & Saloon Services',
  tagline            text default 'Your hair. Your crown.',
  phone              text,
  email              text,
  address            text,
  instagram_url      text,
  facebook_url       text,
  tiktok_url         text,
  hero_heading       text default 'YOUR HAIR. YOUR CROWN.',
  hero_subheading    text default 'Expert African braiding, protective styles and beauty services crafted to make you feel effortlessly confident.',
  hero_image_url     text,
  about_heading      text default 'About Linda Twist',
  about_description  text,
  about_image_url    text,
  updated_at         timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.site_settings;
create trigger settings_set_updated_at
  before update on public.site_settings
  for each row execute procedure public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "settings: public can view" on public.site_settings;
create policy "settings: public can view" on public.site_settings
  for select using (true);

drop policy if exists "settings: admins can write" on public.site_settings;
create policy "settings: admins can write" on public.site_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 8. BUSINESS HOURS
-- ============================================================
create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  day_of_week int not null unique check (day_of_week between 0 and 6), -- 0 = Sunday
  is_closed   boolean not null default false,
  open_time   time,
  close_time  time,
  break_start time,
  break_end   time
);

insert into public.business_hours (day_of_week, is_closed, open_time, close_time)
values
  (0, false, '10:00', '16:00'),
  (1, true,  null,    null),
  (2, false, '09:00', '18:00'),
  (3, false, '09:00', '18:00'),
  (4, false, '09:00', '18:00'),
  (5, false, '09:00', '18:00'),
  (6, false, '08:00', '19:00')
on conflict (day_of_week) do nothing;

alter table public.business_hours enable row level security;

drop policy if exists "hours: public can view" on public.business_hours;
create policy "hours: public can view" on public.business_hours
  for select using (true);

drop policy if exists "hours: editors can write" on public.business_hours;
create policy "hours: editors can write" on public.business_hours
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- 9. BOOKINGS
-- ------------------------------------------------------------
-- Anyone (including anonymous website visitors) can INSERT a
-- booking — that's how the public booking form works. Only staff
-- can read, update or delete bookings, so a customer can never
-- see another customer's appointment.
-- ============================================================
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  service_id          uuid references public.services(id) on delete set null,
  service_name        text not null,
  category_name       text,
  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text,
  appointment_date    date not null,
  appointment_time    text not null,
  duration_text       text,
  price_text          text,
  customer_notes      text,
  admin_notes         text,
  status              text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  payment_status      text not null default 'unpaid' check (payment_status in ('unpaid','deposit_paid','partially_paid','paid','refunded')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "bookings: anyone can create" on public.bookings;
create policy "bookings: anyone can create" on public.bookings
  for insert with check (true);

drop policy if exists "bookings: staff can view" on public.bookings;
create policy "bookings: staff can view" on public.bookings
  for select using (public.is_staff());

drop policy if exists "bookings: staff can update" on public.bookings;
create policy "bookings: staff can update" on public.bookings
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "bookings: admins can delete" on public.bookings;
create policy "bookings: admins can delete" on public.bookings
  for delete using (public.is_admin());

-- ============================================================
-- 10. ACTIVITY LOG  (recent-activity feed on the dashboard)
-- ============================================================
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,        -- e.g. 'booking_created', 'service_updated'
  description  text not null,
  created_at   timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

drop policy if exists "activity: staff can view" on public.activity_logs;
create policy "activity: staff can view" on public.activity_logs
  for select using (public.is_staff());

drop policy if exists "activity: anyone can insert" on public.activity_logs;
create policy "activity: anyone can insert" on public.activity_logs
  for insert with check (true); -- lets the public booking flow log "New booking received"

-- ============================================================
-- DONE.
-- ------------------------------------------------------------
-- NEXT STEPS (see /README-CMS.md for the full walkthrough):
--   1. Create your first admin user in Supabase Auth (Dashboard →
--      Authentication → Add user), then run:
--
--        update public.profiles set role = 'admin'
--        where email = 'you@yourdomain.com';
--
--   2. Create a public storage bucket named "salon-media"
--      (Dashboard → Storage → New bucket → Public bucket: ON).
--   3. Paste your Project URL + anon public key into
--      /js/supabase-config.js.
-- ============================================================

-- ============================================================
-- PHASE 2 ADDITIONS — Messages, Promotions, Navigation, Media,
-- SEO fields, and admin role-management policy.
-- ------------------------------------------------------------
-- Safe to run on top of everything above (idempotent, like the
-- rest of this file). If you already ran schema.sql before this
-- section existed, just re-run the whole file — every statement
-- below is guarded the same way as the rest of it.
-- ============================================================

-- ---------- Let admins manage other staff members' roles ----------
drop policy if exists "profiles: admins can update roles" on public.profiles;
create policy "profiles: admins can update roles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- SEO fields on site_settings ----------
alter table public.site_settings add column if not exists seo_title text;
alter table public.site_settings add column if not exists seo_description text;
alter table public.site_settings add column if not exists og_image_url text;

-- ============================================================
-- MESSAGES / ENQUIRIES
-- ------------------------------------------------------------
-- Fed by a contact form on the public site. Anyone can submit one;
-- only staff can read or manage them.
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  message     text not null,
  status      text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "messages: anyone can create" on public.messages;
create policy "messages: anyone can create" on public.messages
  for insert with check (true);

drop policy if exists "messages: staff can view" on public.messages;
create policy "messages: staff can view" on public.messages
  for select using (public.is_staff());

drop policy if exists "messages: staff can update" on public.messages;
create policy "messages: staff can update" on public.messages
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "messages: admins can delete" on public.messages;
create policy "messages: admins can delete" on public.messages
  for delete using (public.is_admin());

-- ============================================================
-- PROMOTIONS
-- ============================================================
create table if not exists public.promotions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  discount_type    text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_amount  numeric(10,2) not null default 0,
  promo_code       text,
  image_url        text,
  start_date       date,
  end_date         date,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.promotions enable row level security;

drop policy if exists "promotions: public can view live" on public.promotions;
create policy "promotions: public can view live" on public.promotions
  for select using (
    public.is_staff() or (
      active = true
      and (start_date is null or start_date <= current_date)
      and (end_date is null or end_date >= current_date)
    )
  );

drop policy if exists "promotions: editors can write" on public.promotions;
create policy "promotions: editors can write" on public.promotions
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- NAVIGATION ITEMS
-- ============================================================
create table if not exists public.navigation_items (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  href        text not null,
  sort_order  int not null default 0,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.navigation_items (label, href, sort_order)
select * from (values
  ('Home', '#home', 1),
  ('Services', '#services', 2),
  ('Styles', '#styles', 3),
  ('About', '#about', 4),
  ('Gallery', '#gallery', 5),
  ('FAQs', '#faqs', 6)
) as v(label, href, sort_order)
where not exists (select 1 from public.navigation_items);

alter table public.navigation_items enable row level security;

drop policy if exists "nav: public can view enabled" on public.navigation_items;
create policy "nav: public can view enabled" on public.navigation_items
  for select using (enabled = true or public.is_staff());

drop policy if exists "nav: editors can write" on public.navigation_items;
create policy "nav: editors can write" on public.navigation_items
  for all using (public.is_editor()) with check (public.is_editor());

-- ============================================================
-- MEDIA LIBRARY
-- ------------------------------------------------------------
-- One row per file uploaded through the dashboard (the actual
-- bytes live in Supabase Storage, bucket "salon-media" — this
-- table just indexes them for the Media Library screen).
-- ============================================================
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  storage_path text,
  filename     text,
  size_bytes   bigint,
  folder       text,
  created_at   timestamptz not null default now()
);

alter table public.media enable row level security;

drop policy if exists "media: staff can view" on public.media;
create policy "media: staff can view" on public.media
  for select using (public.is_staff());

drop policy if exists "media: editors can write" on public.media;
create policy "media: editors can write" on public.media
  for all using (public.is_editor()) with check (public.is_editor());
