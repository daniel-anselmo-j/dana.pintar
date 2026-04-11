// ═══════════════════════════════════════════════════════════
//  server/index.js — Dana Pintar API Server (MongoDB)
// ═══════════════════════════════════════════════════════════

const express  = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── Config ───────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://danapintar:<password>@cluster0.s76bgmg.mongodb.net/?appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || 'danapintar_secret_key_2024_ganti_ini';
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── MongoDB ──────────────────────────────────────────────
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('danapintar');
  console.log('✅ MongoDB terhubung');

  // Create indexes
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('holdings').createIndex({ user_id: 1, fund_id: 1 });
  await db.collection('transactions').createIndex({ user_id: 1, created_at: -1 });

  // Seed funds jika belum ada
  const fundCount = await db.collection('funds').countDocuments();
  if (fundCount === 0) await seedFunds();
}

// ── Auth Middleware ──────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token diperlukan' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Akses admin diperlukan' });
  next();
}

// ══════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, phone } = req.body;

    if (!username || !password || !full_name)
      return res.status(400).json({ error: 'Username, password, dan nama lengkap wajib diisi.' });
    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ error: 'Username harus 3–30 karakter.' });
    if (!/^[a-z0-9_]+$/i.test(username))
      return res.status(400).json({ error: 'Username hanya boleh huruf, angka, dan underscore.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });

    const existing = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Username sudah digunakan.' });

    const hash = await bcrypt.hash(password, 10);
    const user = {
      username:   username.toLowerCase(),
      password:   hash,
      full_name,
      phone:      phone || '',
      balance:    0,
      role:       'investor',
      is_active:  true,
      created_at: new Date(),
    };

    const result = await db.collection('users').insertOne(user);
    res.json({ success: true, message: 'Akun berhasil dibuat!' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });

    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Username atau password salah.' });
    if (!user.is_active) return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi admin.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Username atau password salah.' });

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const profile = {
      id:         user._id.toString(),
      username:   user.username,
      full_name:  user.full_name,
      phone:      user.phone,
      balance:    user.balance,
      role:       user.role,
      is_active:  user.is_active,
      created_at: user.created_at,
    };

    res.json({ token, user: profile });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.json({
      id:        user._id.toString(),
      username:  user.username,
      full_name: user.full_name,
      phone:     user.phone,
      balance:   user.balance,
      role:      user.role,
      is_active: user.is_active,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
//  FUNDS ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/funds', authMiddleware, async (req, res) => {
  try {
    const funds = await db.collection('funds')
      .find({ is_active: true })
      .sort({ type: 1 })
      .toArray();

    res.json(funds.map(f => ({ ...f, id: f._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
//  HOLDINGS ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/holdings', authMiddleware, async (req, res) => {
  try {
    const holdings = await db.collection('holdings')
      .find({ user_id: req.user.id, units: { $gt: 0 } })
      .toArray();
    res.json(holdings.map(h => ({ ...h, id: h._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
//  TRANSACTIONS ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const txs = await db.collection('transactions')
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    res.json(txs.map(t => ({ ...t, id: t._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Top Up
app.post('/api/transactions/topup', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10000) return res.status(400).json({ error: 'Minimal top up Rp 10.000' });
    if (amount > 1000000000) return res.status(400).json({ error: 'Maksimal top up Rp 1 miliar' });

    const uid = req.user.id;
    const user = await db.collection('users').findOne({ _id: new ObjectId(uid) });
    const newBalance = (user.balance || 0) + amount;

    await db.collection('users').updateOne({ _id: new ObjectId(uid) }, { $set: { balance: newBalance } });
    await db.collection('transactions').insertOne({
      user_id: uid, type: 'topup', amount,
      fund_id: null, units: 0, nav_price: 0,
      note: 'Top Up Saldo', status: 'sukses',
      created_at: new Date(),
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Beli
app.post('/api/transactions/beli', authMiddleware, async (req, res) => {
  try {
    const { fund_id, amount, units, nav_price } = req.body;
    const uid = req.user.id;

    const user = await db.collection('users').findOne({ _id: new ObjectId(uid) });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    if ((user.balance || 0) < amount) return res.status(400).json({ error: 'Saldo tidak cukup' });

    const fund = await db.collection('funds').findOne({ _id: new ObjectId(fund_id) });
    if (!fund) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    if (amount < fund.min_buy) return res.status(400).json({ error: `Minimal pembelian Rp ${fund.min_buy}` });

    const newBalance = user.balance - amount;
    await db.collection('users').updateOne({ _id: new ObjectId(uid) }, { $set: { balance: newBalance } });

    // Upsert holding
    const existing = await db.collection('holdings').findOne({ user_id: uid, fund_id });
    if (existing) {
      await db.collection('holdings').updateOne(
        { _id: existing._id },
        { $set: {
          units:      existing.units + units,
          invested:   existing.invested + amount,
          updated_at: new Date(),
        }}
      );
    } else {
      await db.collection('holdings').insertOne({
        user_id: uid, fund_id, units, invested: amount,
        created_at: new Date(), updated_at: new Date(),
      });
    }

    await db.collection('transactions').insertOne({
      user_id: uid, type: 'beli', amount, fund_id,
      units, nav_price,
      note: `Beli ${fund.name} (${units.toFixed(4)} unit)`,
      status: 'sukses', created_at: new Date(),
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Jual
app.post('/api/transactions/jual', authMiddleware, async (req, res) => {
  try {
    const { fund_id, units, nav_price } = req.body;
    const uid = req.user.id;

    const holding = await db.collection('holdings').findOne({ user_id: uid, fund_id });
    if (!holding || holding.units < units - 0.00001)
      return res.status(400).json({ error: 'Unit tidak cukup' });

    const fund = await db.collection('funds').findOne({ _id: new ObjectId(fund_id) });
    const proceeds  = units * nav_price;
    const ratio     = holding.units > 0 ? Math.min(units, holding.units) / holding.units : 0;
    const modalSold = holding.invested * ratio;
    const newUnits  = holding.units - units;
    const newInvest = Math.max(0, holding.invested - modalSold);

    const user = await db.collection('users').findOne({ _id: new ObjectId(uid) });
    const newBalance = (user.balance || 0) + proceeds;

    if (newUnits < 0.0001) {
      await db.collection('holdings').deleteOne({ _id: holding._id });
    } else {
      await db.collection('holdings').updateOne(
        { _id: holding._id },
        { $set: { units: newUnits, invested: newInvest, updated_at: new Date() } }
      );
    }

    await db.collection('users').updateOne({ _id: new ObjectId(uid) }, { $set: { balance: newBalance } });
    await db.collection('transactions').insertOne({
      user_id: uid, type: 'jual', amount: proceeds, fund_id,
      units, nav_price,
      note: `Jual ${fund?.name || fund_id} (${units.toFixed(4)} unit)`,
      status: 'sukses', created_at: new Date(),
    });

    res.json({ success: true, balance: newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await db.collection('users')
      .find({ role: { $ne: 'admin' } }, { projection: { password: 0 } })
      .toArray();
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/transactions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const txs = await db.collection('transactions')
      .find({}).sort({ created_at: -1 }).limit(200).toArray();
    res.json(txs.map(t => ({ ...t, id: t._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/holdings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const holdings = await db.collection('holdings').find({}).toArray();
    res.json(holdings.map(h => ({ ...h, id: h._id.toString() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { is_active } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: buat akun admin pertama (hanya jika belum ada admin)
app.post('/api/admin/setup', async (req, res) => {
  try {
    const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
    if (adminCount > 0) return res.status(400).json({ error: 'Admin sudah ada' });

    const { username, password, full_name } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib' });

    const hash = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({
      username: username.toLowerCase(),
      password: hash,
      full_name: full_name || 'Administrator',
      phone: '', balance: 0, role: 'admin',
      is_active: true, created_at: new Date(),
    });
    res.json({ success: true, message: 'Admin berhasil dibuat' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
//  SEED FUNDS
// ══════════════════════════════════════════════════════════

async function seedFunds() {
  const funds = [
    // Pasar Uang
    { name: 'Mandiri Pasar Uang Syariah', type: 'pasar-uang', manager: 'Mandiri Investasi', nav: 1823.45, base_nav: 1800, return_1y: 4.82, risk_level: 'Rendah', min_buy: 10000, aum: 8500000000000, icon: '💧', description: 'Reksadana pasar uang syariah dengan portofolio instrumen keuangan halal. Likuid dan aman.', accent1: '#1a3a4a', accent2: '#2a6a7a', is_active: true, created_at: new Date() },
    { name: 'BCA Dana Tunai', type: 'pasar-uang', manager: 'BCA Sekuritas', nav: 1421.30, base_nav: 1400, return_1y: 4.23, risk_level: 'Rendah', min_buy: 10000, aum: 12300000000000, icon: '🏦', description: 'Pilihan ideal untuk dana darurat dengan likuiditas tinggi dan potensi return stabil.', accent1: '#1a2a4a', accent2: '#2a4a8a', is_active: true, created_at: new Date() },
    { name: 'Schroder Dana Likuid', type: 'pasar-uang', manager: 'Schroder Investment', nav: 2156.78, base_nav: 2100, return_1y: 4.51, risk_level: 'Rendah', min_buy: 10000, aum: 5200000000000, icon: '💰', description: 'Dikelola oleh manajer investasi global dengan track record terpercaya.', accent1: '#1a3a2a', accent2: '#2a5a3a', is_active: true, created_at: new Date() },
    // Obligasi
    { name: 'Manulife Obligasi Negara Indonesia', type: 'obligasi', manager: 'Manulife Aset Manajemen', nav: 3245.90, base_nav: 3100, return_1y: 7.85, risk_level: 'Menengah', min_buy: 50000, aum: 18900000000000, icon: '🏛️', description: 'Berinvestasi pada Surat Utang Negara (SUN) dengan imbal hasil kompetitif.', accent1: '#2a2a1a', accent2: '#4a4a2a', is_active: true, created_at: new Date() },
    { name: 'Trimegah Pendapatan Tetap Prima', type: 'obligasi', manager: 'Trimegah Asset Management', nav: 1876.45, base_nav: 1800, return_1y: 8.12, risk_level: 'Menengah', min_buy: 50000, aum: 7800000000000, icon: '📊', description: 'Portofolio obligasi korporasi dan pemerintah dengan rating tinggi.', accent1: '#2a1a2a', accent2: '#4a2a4a', is_active: true, created_at: new Date() },
    { name: 'Batavia Obligasi Unggulan', type: 'obligasi', manager: 'Batavia Prosperindo Aset', nav: 2987.34, base_nav: 2850, return_1y: 7.43, risk_level: 'Menengah-Tinggi', min_buy: 50000, aum: 9200000000000, icon: '💼', description: 'Fokus pada obligasi korporasi investment grade dengan yield menarik.', accent1: '#1a2a3a', accent2: '#2a4a5a', is_active: true, created_at: new Date() },
    // Saham
    { name: 'Eastspring IDX Value Select', type: 'saham', manager: 'Eastspring Investments', nav: 4521.67, base_nav: 4000, return_1y: 14.23, risk_level: 'Tinggi', min_buy: 100000, aum: 23400000000000, icon: '📈', description: 'Value investing pada saham-saham IDX undervalued dengan fundamental kuat.', accent1: '#1a2a1a', accent2: '#2a5a2a', is_active: true, created_at: new Date() },
    { name: 'Mirae Asset ESG Sector Leaders', type: 'saham', manager: 'Mirae Asset Sekuritas', nav: 3876.90, base_nav: 3500, return_1y: 16.78, risk_level: 'Tinggi', min_buy: 100000, aum: 15600000000000, icon: '🌱', description: 'Berinvestasi pada pemimpin sektor dengan kriteria ESG tinggi untuk pertumbuhan berkelanjutan.', accent1: '#1a3a1a', accent2: '#2a6a3a', is_active: true, created_at: new Date() },
    { name: 'Sucorinvest Equity Fund', type: 'saham', manager: 'Sucorinvest Asset Management', nav: 5123.45, base_nav: 4500, return_1y: 19.45, risk_level: 'Sangat Tinggi', min_buy: 100000, aum: 8900000000000, icon: '🚀', description: 'Return maksimal dengan eksposur penuh pada saham-saham growth momentum.', accent1: '#2a1a1a', accent2: '#5a2a2a', is_active: true, created_at: new Date() },
  ];

  await db.collection('funds').insertMany(funds);
  console.log('✅ Fund data di-seed');
}

// ── Start ────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Dana Pintar server berjalan di http://localhost:${PORT}`);
    console.log(`📋 Setup admin: POST http://localhost:${PORT}/api/admin/setup`);
  });
}).catch(e => {
  console.error('❌ Gagal terhubung MongoDB:', e.message);
  process.exit(1);
});
