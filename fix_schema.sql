-- ═══════════════════════════════════════════════════════════
--  fix_schema.sql — Jalankan ini di Supabase SQL Editor
--  Fix RLS policies + holdings query error
-- ═══════════════════════════════════════════════════════════

-- ── 1. Drop semua policy lama yang mungkin konflik ──────
drop policy if exists "Users can view own holdings"        on public.holdings;
drop policy if exists "Users can insert own holdings"      on public.holdings;
drop policy if exists "Users can update own holdings"      on public.holdings;
drop policy if exists "Users can delete own holdings"      on public.holdings;
drop policy if exists "Admins can view all holdings"       on public.holdings;

drop policy if exists "Users can view own profile"         on public.profiles;
drop policy if exists "Users can update own profile"       on public.profiles;
drop policy if exists "Admins can view all profiles"       on public.profiles;
drop policy if exists "Admins can update all profiles"     on public.profiles;

drop policy if exists "Anyone can view active funds"       on public.funds;
drop policy if exists "Admins can manage funds"            on public.funds;

drop policy if exists "Users can view own transactions"    on public.transactions;
drop policy if exists "Users can insert own transactions"  on public.transactions;
drop policy if exists "Admins can view all transactions"   on public.transactions;

-- ── 2. Pastikan RLS aktif ────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.funds        enable row level security;
alter table public.holdings     enable row level security;
alter table public.transactions enable row level security;

-- ── 3. PROFILES policies ─────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Admin bisa lihat semua profil
create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "profiles_update_admin"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 4. FUNDS policies ────────────────────────────────────
-- Semua authenticated user bisa baca funds
create policy "funds_select_all"
  on public.funds for select
  using (auth.role() = 'authenticated');

-- Admin bisa insert/update/delete
create policy "funds_all_admin"
  on public.funds for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 5. HOLDINGS policies ─────────────────────────────────
create policy "holdings_select_own"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "holdings_insert_own"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "holdings_update_own"
  on public.holdings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "holdings_delete_own"
  on public.holdings for delete
  using (auth.uid() = user_id);

-- Admin bisa lihat semua
create policy "holdings_select_admin"
  on public.holdings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 6. TRANSACTIONS policies ─────────────────────────────
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

-- Admin bisa lihat semua
create policy "transactions_select_admin"
  on public.transactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── 7. Pastikan kolom & foreign key benar ───────────────
-- Cek apakah kolom 'units' bertipe numeric (bukan int)
alter table public.holdings
  alter column units    type numeric(18,6) using units::numeric,
  alter column invested type numeric(18,2) using invested::numeric;

-- ── 8. Test query — harusnya return rows tanpa error ────
-- (Jalankan ini terpisah setelah login sebagai user)
-- select * from holdings where user_id = auth.uid();

-- ── 9. Grant usage ke authenticated role ────────────────
grant usage  on schema public to authenticated;
grant select, insert, update, delete on public.holdings     to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update         on public.profiles     to authenticated;
grant select                         on public.funds        to authenticated;

-- ── 10. Verify: tampilkan semua policy yang aktif ───────
select schemaname, tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
