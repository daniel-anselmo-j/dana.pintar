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
  // SDK sudah dimuat via <script> di index.html
  // createClient langsung tanpa dynamic import
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: {
      // Tambah retry logic bawaan
      fetch: (...args) => fetch(...args),
    }
  });

  // Check existing session (1 request saat load)
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
  });
})();

// ── Enter App ─────────────────────────────────────────────
async function enterApp(user) {
  window.currentUser = user;

  // Fetch profile + funds in parallel (2 requests total, cached)
  const [profileRes, fundsRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('funds').select('*').eq('is_active', true).order('type'),
  ]);

  // Handle profile
  if (profileRes.error || !profileRes.data) {
    await new Promise(r => setTimeout(r, 1000));
    const { data: p2 } = await sb.from('profiles').select('*').eq('id', user.id).single();
    window.currentProfile = p2 || { balance: 0, full_name: user.email, role: 'investor' };
  } else {
    window.currentProfile = profileRes.data;
  }

  // Cache profile
  cacheSet('profile:' + user.id, window.currentProfile, 60000);

  // Handle funds
  window.allFunds = fundsRes.data || [];
  cacheSet('funds:all', window.allFunds, 300000); // cache 5 menit

  // Seed NAV cache
  window.allFunds.forEach(f => {
    NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
  });

  // Switch to app page
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');

  updateSidebarUI(window.currentProfile);
  ['pasar-uang', 'obligasi', 'saham'].forEach(type => renderProducts(type));
  // Pre-load holdings cache (1 request saat login)
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
