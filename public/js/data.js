// ═══════════════════════════════════════════════════════════
//  js/data.js — Fund Data & NAV Live Simulation
//  ZERO server requests di dalam loop simulasi
// ═══════════════════════════════════════════════════════════

const NAV_CACHE = {};

const TYPE_VOL = {
  'pasar-uang': 0.0012,
  'obligasi':   0.0025,
  'saham':      0.006,
};

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

window._holdingsCache = [];

async function refreshHoldingsCache() {
  if (!window.currentUser) return;
  try {
    const holdings = await holdingsApi.getAll();
    window._holdingsCache = holdings.map(h => ({
      ...h,
      funds: window.allFunds.find(f => f.id === h.fund_id) || null,
    }));
  } catch (e) {
    console.error('Holdings cache error:', e);
  }
}

// ── NAV Simulation — PURE client-side ────────────────────
let _simInterval = null;

function startNavSimulation(funds) {
  if (_simInterval) clearInterval(_simInterval);

  funds.forEach(f => {
    if (!NAV_CACHE[f.id]) {
      NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
    }
  });

  _simInterval = setInterval(() => {
    funds.forEach(f => {
      const entry = NAV_CACHE[f.id];
      if (!entry) return;
      const vol   = TYPE_VOL[f.type] || 0.003;
      const delta = (Math.random() - 0.47) * vol;
      entry.mult  = Math.max(0.75, Math.min(1.75, entry.mult + delta));
      entry.nav   = Math.round(entry.base * entry.mult * 10000) / 10000;

      const navEl = document.getElementById('nav-display-' + f.id);
      if (navEl) navEl.textContent = 'Rp ' + fmt(entry.nav);

      if (window.currentFundId === f.id) {
        const buyNav  = document.getElementById('modalBuyNav');
        const sellNav = document.getElementById('modalSellNav');
        if (buyNav)  buyNav.textContent  = 'NAV: Rp ' + fmt(entry.nav) + ' / unit';
        if (sellNav) sellNav.textContent = 'NAV saat ini: Rp ' + fmt(entry.nav);
        calcLots();
        calcSellAmount();
      }
    });

    buildTickerHTML(funds);
    refreshLivePortfolioDOM();
  }, 3000);
}

function getCurrentNav(fundId) {
  return NAV_CACHE[fundId]?.nav ?? 0;
}

// ── Formatting helpers ───────────────────────────────────
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
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'M';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'jt';
  return fmtInt(n);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
    + ' · ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}
