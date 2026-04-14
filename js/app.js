// ═══════════════════════════════════════════════════════════
//  js/app.js — Main Bootstrap & App Entry
// ═══════════════════════════════════════════════════════════

window.currentUser    = null;
window.currentProfile = null;
window.allFunds       = [];
window.charts         = {};
window._allTxs        = [];

// ── Bootstrap ────────────────────────────────────────────
(async function init() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await enterApp(session.user);
  }

  // Listen for auth changes
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      window.currentUser    = null;
      window.currentProfile = null;
    }
    // Handle SIGNED_IN only if we don't have a current user (e.g. email confirm redirect)
    if (event === 'SIGNED_IN' && session?.user && !window.currentUser) {
      await enterApp(session.user);
    }
  });
})();

// ── Enter App ─────────────────────────────────────────────
async function enterApp(user) {
  window.currentUser = user;

  // Fetch profile + funds in parallel
  const [profileRes, fundsRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('funds').select('*').eq('is_active', true).order('type'),
  ]);

  // Handle profile with retry
  if (profileRes.error || !profileRes.data) {
    await new Promise(r => setTimeout(r, 1200));
    const { data: p2 } = await sb.from('profiles').select('*').eq('id', user.id).single();
    const fallbackName = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Pengguna';
    window.currentProfile = p2 || { balance: 0, full_name: fallbackName, role: 'investor' };
  } else {
    window.currentProfile = profileRes.data;
  }

  cacheSet('profile:' + user.id, window.currentProfile, 60000);

  // Handle funds
  window.allFunds = fundsRes.data || [];
  cacheSet('funds:all', window.allFunds, 300000);

  // Seed NAV cache
  window.allFunds.forEach(f => {
    NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
  });

  // Switch to app page with smooth transition
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');

  updateSidebarUI(window.currentProfile);
  ['pasar-uang', 'obligasi', 'saham'].forEach(type => renderProducts(type));

  // Pre-load holdings cache
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

// ── Global error handler ──────────────────────────────────
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  // Jangan tampilkan error ke user untuk promise non-kritis
});

// ── Online/offline detection ──────────────────────────────
window.addEventListener('offline', () => {
  toast('⚠️ Koneksi internet terputus', 'error');
});
window.addEventListener('online', () => {
  toast('✅ Koneksi internet pulih', 'success');
});
