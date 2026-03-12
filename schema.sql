-- ═══════════════════════════════════════════════════════════
--  DANA PINTAR — Supabase Schema
--  Jalankan file ini di: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  full_name    text not null default '',
  phone        text default '',
  role         text not null default 'investor' check (role in ('investor','admin')),
  balance      numeric(18,2) not null default 0 check (balance >= 0),
  is_active    boolean not null default true,
  avatar_url   text default null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2. FUNDS (produk reksadana - dikelola admin)
create table if not exists public.funds (
  id           text primary key,
  type         text not null check (type in ('pasar-uang','obligasi','saham')),
  name         text not null,
  manager      text not null,
  icon         text not null default '📈',
  nav          numeric(18,4) not null,
  base_nav     numeric(18,4) not null,
  return_1y    numeric(6,2) not null default 0,
  return_3y    numeric(6,2) not null default 0,
  return_5y    numeric(6,2) not null default 0,
  risk_level   text not null default 'Menengah',
  min_buy      numeric(18,2) not null default 10000,
  aum          numeric(20,2) not null default 0,
  description  text default '',
  accent1      text default '#c9a84c',
  accent2      text default '#e2bb6a',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3. HOLDINGS (kepemilikan unit per user per fund)
create table if not exists public.holdings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  fund_id      text references public.funds(id) on delete cascade not null,
  units        numeric(18,6) not null default 0 check (units >= 0),
  invested     numeric(18,2) not null default 0 check (invested >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, fund_id)
);

-- 4. TRANSACTIONS (riwayat semua transaksi)
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  type         text not null check (type in ('topup','beli','jual')),
  amount       numeric(18,2) not null check (amount > 0),
  fund_id      text references public.funds(id) on delete set null,
  units        numeric(18,6) default null,
  nav_price    numeric(18,4) default null,
  note         text default '',
  status       text not null default 'sukses' check (status in ('sukses','pending','gagal')),
  created_at   timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.profiles    enable row level security;
alter table public.funds       enable row level security;
alter table public.holdings    enable row level security;
alter table public.transactions enable row level security;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update all profiles"
  on public.profiles for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- FUNDS policies (semua user bisa baca, hanya admin yang bisa ubah)
create policy "Anyone can view active funds"
  on public.funds for select using (is_active = true);

create policy "Admins can manage funds"
  on public.funds for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- HOLDINGS policies
create policy "Users can view own holdings"
  on public.holdings for select using (auth.uid() = user_id);

create policy "Users can insert own holdings"
  on public.holdings for insert with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on public.holdings for update using (auth.uid() = user_id);

create policy "Admins can view all holdings"
  on public.holdings for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- TRANSACTIONS policies
create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.transactions for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════
--  TRIGGERS
-- ═══════════════════════════════════════════════════════════

-- Auto-create profile saat user baru daftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    0
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger funds_updated_at before update on public.funds
  for each row execute procedure public.handle_updated_at();
create trigger holdings_updated_at before update on public.holdings
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
--  SEED: FUND DATA
-- ═══════════════════════════════════════════════════════════

insert into public.funds (id, type, name, manager, icon, nav, base_nav, return_1y, return_3y, return_5y, risk_level, min_buy, aum, description, accent1, accent2) values
-- PASAR UANG
('PU001','pasar-uang','Dana Likuid Pro','Manulife AM','💧',1234.56,1150,6.2,18.4,32.1,'Rendah',10000,12500000000,'Reksadana pasar uang dengan portofolio deposito dan SBI berkualitas tinggi.','#5aaeff','#8dcaff'),
('PU002','pasar-uang','Likuid Stabil','Schroders IM','💧',2045.30,1900,5.8,17.2,29.8,'Rendah',10000,8900000000,'Fokus pada instrumen pasar uang jangka pendek dengan likuiditas tinggi.','#2de0a5','#70f5cc'),
('PU003','pasar-uang','Cash Plus Fund','Trimegah AM','💧',1567.80,1450,6.5,19.1,33.5,'Rendah',100000,6200000000,'Instrumen pasar uang premium dengan yield kompetitif.','#c9a84c','#e2bb6a'),
('PU004','pasar-uang','Safe Harbour Fund','BNI AM','💧',987.45,920,5.5,16.5,28.2,'Rendah',10000,15000000000,'Dana pasar uang konservatif yang dikelola bank berpengalaman.','#a594ff','#c4baff'),
('PU005','pasar-uang','Optima Kas','Bahana TCW','💧',1122.90,1050,6.9,20.5,36.0,'Rendah',50000,4800000000,'Reksadana pasar uang dengan strategi aktif untuk return optimal.','#ffaa55','#ffc880'),
-- OBLIGASI
('OB001','obligasi','Pendapatan Tetap I','Danareksa IM','🏛️',3456.78,3100,8.9,28.2,52.1,'Menengah',100000,22000000000,'Portofolio obligasi pemerintah dan korporasi pilihan dengan kupon menarik.','#c9a84c','#e2bb6a'),
('OB002','obligasi','SBN Sejahtera','BRI Invest','🏛️',5123.45,4700,9.2,29.8,55.3,'Menengah',100000,18000000000,'Fokus pada Surat Berharga Negara (SBN) dengan imbal hasil terjamin.','#5aaeff','#8dcaff'),
('OB003','obligasi','Fixed Income Plus','Panin AM','🏛️',2789.12,2500,10.1,32.5,61.2,'Menengah-Tinggi',200000,9500000000,'Campuran obligasi korporasi berperingkat tinggi dan obligasi pemerintah.','#2de0a5','#70f5cc'),
('OB004','obligasi','Sukuk Berkah','Mandiri IM','🏛️',1890.67,1700,7.8,24.6,44.5,'Menengah',100000,11000000000,'Portofolio sukuk syariah dengan prinsip investasi halal.','#a594ff','#c4baff'),
('OB005','obligasi','Corporate Bond Elite','CIMB Principal','🏛️',4321.09,3900,11.5,36.8,70.2,'Menengah-Tinggi',500000,7200000000,'Obligasi korporasi pilihan dengan yield premium di atas obligasi pemerintah.','#ff6b8a','#ffaabb'),
-- SAHAM
('SA001','saham','Ekuitas Unggulan','Manulife AM','📊',8765.43,6500,22.4,68.5,142.3,'Tinggi',100000,45000000000,'Portofolio saham blue-chip Indonesia dengan potensi pertumbuhan optimal.','#ffaa55','#ffc880'),
('SA002','saham','Growth Fund Pro','Schroders IM','📊',12345.67,9800,18.9,58.3,118.5,'Tinggi',100000,38000000000,'Saham-saham dengan prospek pertumbuhan tinggi di berbagai sektor.','#c9a84c','#e2bb6a'),
('SA003','saham','IDX30 Index Fund','Indopremier AM','📊',6543.21,5200,25.8,79.2,168.4,'Tinggi',100000,28000000000,'Mengikuti indeks IDX30 saham terlikuid di Bursa Efek Indonesia.','#5aaeff','#8dcaff'),
('SA004','saham','Teknologi & Digital','BNI AM','📊',3456.78,2400,32.1,95.4,210.8,'Sangat Tinggi',200000,15000000000,'Fokus pada saham perusahaan teknologi dan ekonomi digital Indonesia.','#a594ff','#c4baff'),
('SA005','saham','Dividend Aristocrat','Trimegah AM','📊',9876.54,8100,15.6,47.8,95.2,'Tinggi',500000,21000000000,'Saham-saham pembagi dividen konsisten untuk passive income.','#2de0a5','#70f5cc')
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════
--  SEED: ADMIN USER
--  Setelah jalankan ini, daftar akun di app dengan email:
--  admin@danapintar.id / Admin123!
--  Lalu jalankan query berikut untuk jadikan admin:
-- ═══════════════════════════════════════════════════════════
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@danapintar.id');
