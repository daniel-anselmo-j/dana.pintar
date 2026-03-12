# Dana Pintar — Platform Reksadana Digital

## Setup

### 1. Jalankan SQL Schema
Buka **Supabase Dashboard → SQL Editor**, paste isi file `schema.sql`, dan jalankan.

### 2. Buat Akun Admin
- Daftar akun baru di website dengan email `admin@danapintar.id`
- Lalu jalankan query ini di SQL Editor:
```sql
UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@danapintar.id');
```

### 3. Upload logo.png
Taruh file `logo.png` Anda di folder `assets/`.

### 4. Deploy ke GitHub Pages
- Push semua file ke repo GitHub
- Settings → Pages → Source: main / root
- Website live di: `https://username.github.io/nama-repo`

## Struktur File
```
dana-pintar/
├── index.html          # Main HTML
├── schema.sql          # Supabase DB schema (jalankan sekali)
├── README.md
├── assets/
│   └── logo.png        # Logo Anda
├── css/
│   ├── variables.css   # Design tokens
│   ├── base.css        # Reset & utilities
│   ├── auth.css        # Halaman login
│   ├── layout.css      # Sidebar & layout
│   ├── components.css  # Komponen UI
│   └── animations.css  # Animasi
└── js/
    ├── supabase.js     # Supabase client config
    ├── data.js         # Fund data & NAV simulation
    ├── ui.js           # UI helpers & modal
    ├── auth.js         # Login & register
    ├── charts.js       # Chart.js wrappers
    ├── portfolio.js    # Halaman portofolio
    ├── products.js     # Produk & beli/jual
    ├── transactions.js # Saldo & riwayat
    ├── dashboard.js    # Halaman dashboard
    ├── ticker.js       # Live ticker bar
    ├── admin.js        # Panel admin
    └── app.js          # Bootstrap & entry point
```
