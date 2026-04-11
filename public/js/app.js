// ═══════════════════════════════════════════════════════════
//  js/app.js — Bootstrap & App Entry (MongoDB/JWT)
// ═══════════════════════════════════════════════════════════

window.currentUser    = null;
window.currentProfile = null;
window.allFunds       = [];
window.charts         = {};
window._allTxs        = [];

// ── Bootstrap ────────────────────────────────────────────
(async function init() {
  if (!auth.isLoggedIn()) return; // sudah tampil page-auth by default

  try {
    const [profile, funds] = await Promise.all([
      auth.me(),
      fundsApi.getAll(),
    ]);
    await enterApp(profile, funds);
  } catch (e) {
    // Token expired atau invalid
    auth.logout();
  }
})();

// ── Enter App ─────────────────────────────────────────────
async function enterApp(profile, funds) {
  window.currentUser    = { id: profile.id, username: profile.username };
  window.currentProfile = profile;

  // Jika funds belum diload
  if (!funds) {
    funds = await fundsApi.getAll();
  }
  window.allFunds = funds;

  // Seed NAV cache
  window.allFunds.forEach(f => {
    NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
  });

  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');

  updateSidebarUI(window.currentProfile);
  ['pasar-uang', 'obligasi', 'saham'].forEach(type => renderProducts(type));

  await refreshHoldingsCache();
  startNavSimulation(window.allFunds);
  buildTickerHTML(window.allFunds);
  switchView('dashboard');
}

// ── Keyboard shortcuts ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('offline', () => toast('⚠️ Koneksi internet terputus', 'error'));
window.addEventListener('online',  () => toast('✅ Koneksi internet pulih', 'success'));
