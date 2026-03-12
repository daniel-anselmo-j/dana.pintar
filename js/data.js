// ═══════════════════════════════════════════════════════════
//  js/data.js — Fund Data & NAV Live Simulation
// ═══════════════════════════════════════════════════════════

// Runtime NAV cache (fetched from Supabase, then simulated live)
const NAV_CACHE = {};

// Volatility per type
const TYPE_VOL = {
  'pasar-uang': 0.0015,
  'obligasi':   0.003,
  'saham':      0.007,
};

// Risk color map
const RISK_COLOR = {
  'Rendah':          'tag-green',
  'Menengah':        'tag-gold',
  'Menengah-Tinggi': 'tag-gold',
  'Tinggi':          'tag-red',
  'Sangat Tinggi':   'tag-red',
};

const TYPE_LABEL = {
  'pasar-uang': 'Pasar Uang',
  'obligasi':   'Obligasi',
  'saham':      'Saham',
};

/**
 * Start live NAV simulation for loaded funds.
 * Updates NAV_CACHE every 3 seconds and refreshes UI elements.
 */
function startNavSimulation(funds) {
  funds.forEach(f => {
    if (!NAV_CACHE[f.id]) {
      NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
    }
  });

  setInterval(() => {
    funds.forEach(f => {
      const entry  = NAV_CACHE[f.id];
      if (!entry) return;
      const vol    = TYPE_VOL[f.type] || 0.003;
      const delta  = (Math.random() - 0.48) * vol;
      entry.mult   = Math.max(0.7, entry.mult + delta);
      entry.nav    = Math.round(entry.base * entry.mult * 10000) / 10000;

      // Update any visible NAV elements
      const el = document.getElementById('nav-display-' + f.id);
      if (el) el.textContent = 'Rp ' + fmt(entry.nav);

      // Update modal if open for this fund
      if (window.currentFundId === f.id) {
        const buyNav = document.getElementById('modalBuyNav');
        if (buyNav) buyNav.textContent = 'NAV: Rp ' + fmt(entry.nav) + ' / unit';
        const sellNav = document.getElementById('modalSellNav');
        if (sellNav) sellNav.textContent = 'NAV saat ini: Rp ' + fmt(entry.nav);
        calcLots();
        calcSellAmount();
      }
    });

    // Refresh ticker
    buildTickerHTML(funds);

    // Refresh live portfolio values
    refreshLivePortfolio();
  }, 3000);
}

function getCurrentNav(fundId) {
  return NAV_CACHE[fundId]?.nav ?? 0;
}

// ── Formatting helpers ──────────────────────────────────────
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  return parseFloat(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function fmtInt(n) {
  return Math.round(parseFloat(n) || 0).toLocaleString('id-ID');
}

function fmtAUM(n) {
  n = parseFloat(n) || 0;
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'M';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'jt';
  return fmtInt(n);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}
