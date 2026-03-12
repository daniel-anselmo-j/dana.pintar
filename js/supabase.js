// ═══════════════════════════════════════════════════════════
//  js/supabase.js — Supabase Client
//  SDK dimuat via tag <script> di index.html (bukan dinamis)
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://sycwptzzxcxrqrcjvhdj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3dwdHp6eGN4cnFyY2p2aGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDg2ODYsImV4cCI6MjA4ODg4NDY4Nn0.1MD7I0aFnEbPLWSp1tBkJLmaIO1ODXPJGGhLn3FbR2Q';

// Global client — di-assign setelah SDK siap di app.js
let sb = null;

// ── Simple in-memory cache untuk mengurangi request ─────
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

// ── Rate-limit guard: max 1 request per key per interval ─
const _lastCall = {};
function throttled(key, intervalMs = 2000) {
  const now = Date.now();
  if (_lastCall[key] && now - _lastCall[key] < intervalMs) return false;
  _lastCall[key] = now;
  return true;
}
