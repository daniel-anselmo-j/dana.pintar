// ═══════════════════════════════════════════════════════════
//  js/api.js — REST API Client (pengganti supabase.js)
// ═══════════════════════════════════════════════════════════

const API_BASE = '';  // same-origin, server di port yang sama

// ── Token management ─────────────────────────────────────
function getToken()        { return localStorage.getItem('dp_token'); }
function setToken(t)       { localStorage.setItem('dp_token', t); }
function clearToken()      { localStorage.removeItem('dp_token'); }

// ── In-memory cache ───────────────────────────────────────
const _cache = {};
function cacheSet(key, data, ttlMs = 30000) {
  _cache[key] = { data, exp: Date.now() + ttlMs };
}
function cacheGet(key) {
  const c = _cache[key];
  if (!c || Date.now() > c.exp) return null;
  return c.data;
}
function cacheInvalidate(prefix) {
  Object.keys(_cache).forEach(k => { if (k.startsWith(prefix)) delete _cache[k]; });
}

// ── Core fetch helper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request gagal');
  return data;
}

// ══════════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════════
const auth = {
  async login(username, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    return data;
  },

  async register(username, password, full_name, phone) {
    return apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, full_name, phone }),
    });
  },

  async me() {
    return apiFetch('/api/auth/me');
  },

  logout() {
    clearToken();
  },

  isLoggedIn() {
    return !!getToken();
  },
};

// ══════════════════════════════════════════════════════════
//  FUNDS API
// ══════════════════════════════════════════════════════════
const fundsApi = {
  async getAll() {
    const cached = cacheGet('funds:all');
    if (cached) return cached;
    const data = await apiFetch('/api/funds');
    cacheSet('funds:all', data, 300000);
    return data;
  },
};

// ══════════════════════════════════════════════════════════
//  HOLDINGS API
// ══════════════════════════════════════════════════════════
const holdingsApi = {
  async getAll() {
    return apiFetch('/api/holdings');
  },
};

// ══════════════════════════════════════════════════════════
//  TRANSACTIONS API
// ══════════════════════════════════════════════════════════
const transactionsApi = {
  async getAll(limit = 100) {
    return apiFetch(`/api/transactions?limit=${limit}`);
  },

  async topup(amount) {
    const data = await apiFetch('/api/transactions/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    cacheInvalidate('profile:');
    return data;
  },

  async beli(fund_id, amount, units, nav_price) {
    const data = await apiFetch('/api/transactions/beli', {
      method: 'POST',
      body: JSON.stringify({ fund_id, amount, units, nav_price }),
    });
    cacheInvalidate('profile:');
    return data;
  },

  async jual(fund_id, units, nav_price) {
    const data = await apiFetch('/api/transactions/jual', {
      method: 'POST',
      body: JSON.stringify({ fund_id, units, nav_price }),
    });
    cacheInvalidate('profile:');
    return data;
  },
};

// ══════════════════════════════════════════════════════════
//  ADMIN API
// ══════════════════════════════════════════════════════════
const adminApi = {
  async getUsers()        { return apiFetch('/api/admin/users'); },
  async getTransactions() { return apiFetch('/api/admin/transactions'); },
  async getHoldings()     { return apiFetch('/api/admin/holdings'); },

  async toggleUserStatus(userId, is_active) {
    return apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  },
};
