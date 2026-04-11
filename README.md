# Dana Pintar — Setup Guide (MongoDB)

## Struktur Folder

```
danapintar/
├── server/
│   └── index.js          ← Express API server
├── public/
│   ├── index.html
│   ├── css/              ← Semua CSS (tidak berubah)
│   ├── js/
│   │   ├── api.js        ← REST API client (pengganti supabase.js)
│   │   ├── app.js        ← Bootstrap + JWT auth
│   │   ├── auth.js       ← Login/register (username-based)
│   │   ├── data.js       ← NAV simulation
│   │   ├── ui.js         ← UI helpers, modal, toast
│   │   ├── dashboard.js
│   │   ├── portfolio.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   ├── admin.js
│   │   ├── charts.js
│   │   └── ticker.js
│   └── assets/
├── .env                  ← Konfigurasi (JANGAN di-commit ke git)
├── package.json
└── README.md
```

## Cara Menjalankan

### 1. Isi .env
```
MONGO_URI=mongodb+srv://danapintar:PASSWORD_ANDA@cluster0.s76bgmg.mongodb.net/danapintar?appName=Cluster0
JWT_SECRET=string_random_panjang_aman
PORT=3000
```

### 2. Install dependencies
```bash
npm install
```

### 3. Jalankan server
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

Server akan berjalan di: **http://localhost:3000**

### 4. Buat akun Admin (sekali saja)
```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password_admin","full_name":"Administrator"}'
```

Atau dengan Postman/Thunder Client:
- POST `http://localhost:3000/api/admin/setup`
- Body JSON: `{"username":"admin","password":"password_anda","full_name":"Administrator"}`

---

## Perubahan dari Versi Supabase

| Sebelum (Supabase) | Sesudah (MongoDB) |
|---|---|
| Login dengan Email | Login dengan Username |
| Supabase SDK browser | REST API + JWT Token |
| Supabase Auth | bcrypt + JWT |
| RLS Policy | Middleware auth di server |
| `sb.from('table').select()` | `fetch('/api/endpoint')` |

## API Endpoints

### Auth
- `POST /api/auth/register` — daftar akun baru
- `POST /api/auth/login` — login, dapat JWT token
- `GET  /api/auth/me` — profil user saat ini

### Data
- `GET  /api/funds` — daftar produk reksadana
- `GET  /api/holdings` — kepemilikan user
- `GET  /api/transactions` — riwayat transaksi

### Transaksi
- `POST /api/transactions/topup` — top up saldo
- `POST /api/transactions/beli` — beli reksadana
- `POST /api/transactions/jual` — jual reksadana

### Admin (butuh role admin)
- `GET   /api/admin/users` — semua user
- `GET   /api/admin/transactions` — semua transaksi
- `PATCH /api/admin/users/:id/status` — aktifkan/nonaktifkan user

## Deploy ke VPS / Railway / Render

Tambahkan environment variables di platform hosting:
- `MONGO_URI` = connection string MongoDB Atlas
- `JWT_SECRET` = string random panjang
- `PORT` = (biasanya otomatis)
