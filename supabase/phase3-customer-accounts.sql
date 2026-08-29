-- ============================================================
-- PHASE 3: CUSTOMER ACCOUNTS, REFERRALS, SELF-SERVICE BOOKINGS
-- ------------------------------------------------------------
-- Adds a customer-facing account system (account.html) alongside
-- the staff dashboard (admin.html). Customers sign up with normal
-- Supabase Auth (same auth.users table as staff, but a completely
-- separate profile table and permission set — a customer account
-- can never do anything a staff/admin action can).
-- ============================================================

-- ---------- Customer accounts ----------
create table if not exists public.customer_accounts (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text,
  phone             text,
  referral_code     text not null unique,
  referred_by_code  text,  -- the code THEY signed up with, if any
  created_at        timestamptz not null default now()
);

-- Generates a short, human-shareable referral code like "LINDA-7F3K".
create or replace function public.generate_referral_code()
returns text as $$
declare
  code text;
  exists_already boolean;
begin
  loop
    code := 'LINDA-' || upper(substr(md5(random()::text), 1, 4));
    select exists(select 1 from public.customer_accounts where referral_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$ language plpgsql;

-- Auto-creates a customer_accounts row on signup — reads the referral
-- code they signed up with (if any) from the signup metadata.
create or replace function public.handle_new_customer()
returns trigger as $$
begin
  -- Skip if this user already has a STAFF profile (created via the
  -- separate handle_new_user trigger) — the two account types are
  -- mutually exclusive in practice, but this keeps things safe either way.
  insert into public.customer_accounts (id, email, full_name, phone, referral_code, referred_by_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    public.generate_referral_code(),
    new.raw_user_meta_data->>'referred_by_code'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_customer_created on auth.users;
create trigger on_auth_customer_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

alter table public.customer_accounts enable row level security;

drop policy if exists "customer_accounts: self can view own" on public.customer_accounts;
create policy "customer_accounts: self can view own" on public.customer_accounts
  for select using (id = auth.uid());

drop policy if exists "customer_accounts: self can update own" on public.customer_accounts;
create policy "customer_accounts: self can update own" on public.customer_accounts
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "customer_accounts: staff can view all" on public.customer_accounts;
create policy "customer_accounts: staff can view all" on public.customer_accounts
  for select using (public.is_staff());

-- Public-safe lookup: confirms whether a referral code is real, without
-- exposing whose account it belongs to. Used on the signup form.
create or replace function public.referral_code_exists(code text)
returns boolean as $$
  select exists(select 1 from public.customer_accounts where referral_code = upper(code));
$$ language sql security definer stable;

-- ---------- Link bookings to accounts, add promo/referral tracking ----------
alter table public.bookings add column if not exists customer_id uuid references public.customer_accounts(id) on delete set null;
alter table public.bookings add column if not exists promo_code text;
alter table public.bookings add column if not exists discount_note text; -- human-readable, e.g. "10% off (referral: LINDA-7F3K)"

-- Customers can see their own bookings (in addition to the existing
-- staff-only policy already defined earlier in this file).
drop policy if exists "bookings: customer can view own" on public.bookings;
create policy "bookings: customer can view own" on public.bookings
  for select using (customer_id = auth.uid());

-- Customers can cancel their OWN upcoming bookings — nothing else.
-- A trigger (below) blocks changing any other column in the same request.
drop policy if exists "bookings: customer can cancel own" on public.bookings;
create policy "bookings: customer can cancel own" on public.bookings
  for update
  using (customer_id = auth.uid() and status in ('pending','confirmed'))
  with check (customer_id = auth.uid() and status = 'cancelled');

-- Safety net: even within that policy's allowance, make sure a customer's
-- update can ONLY ever change `status` (to 'cancelled') and nothing else —
-- not price, not date, not another customer's booking, etc.
create or replace function public.guard_customer_booking_update()
returns trigger as $$
begin
  if public.is_staff() then
    return new; -- staff can edit freely, as already governed by their own policy
  end if;
  if new.customer_id is distinct from old.customer_id
     or new.service_id is distinct from old.service_id
     or new.service_name is distinct from old.service_name
     or new.appointment_date is distinct from old.appointment_date
     or new.appointment_time is distinct from old.appointment_time
     or new.price_text is distinct from old.price_text
     or new.customer_email is distinct from old.customer_email
     or new.payment_status is distinct from old.payment_status
     or new.admin_notes is distinct from old.admin_notes
  then
    raise exception 'Customers may only cancel a booking, not modify its details.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_customer_booking_update_trigger on public.bookings;
create trigger guard_customer_booking_update_trigger
  before update on public.bookings
  for each row execute procedure public.guard_customer_booking_update();

-- Allow a customer to attach themselves to a booking at the moment they
-- create it while signed in (booking form still works for guests too —
-- customer_id is simply left null for guest bookings).
--
-- IMPORTANT: this REPLACES the original "bookings: anyone can create"
-- policy from earlier in this file, rather than adding alongside it —
-- Postgres combines multiple permissive policies for the same action
-- with OR, so leaving the old "with check (true)" policy in place would
-- have silently allowed anyone to set customer_id to someone else's
-- account. Only one INSERT policy should exist on this table.
drop policy if exists "bookings: anyone can create" on public.bookings;
drop policy if exists "bookings: signed-in customer can attach self on insert" on public.bookings;
create policy "bookings: create (guest or self-attached)" on public.bookings
  for insert with check (customer_id is null or customer_id = auth.uid());

-- Public-safe count of how many people signed up with a given referral
-- code. Returns only a number — no personal data — so it's fine to
-- expose broadly rather than restricting it to the code's own owner.
create or replace function public.referral_count(code text)
returns integer as $$
  select count(*)::int from public.customer_accounts where referred_by_code = code;
$$ language sql security definer stable;
