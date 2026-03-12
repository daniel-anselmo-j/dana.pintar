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
  // Load Supabase
  sb = await loadSupabase();

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await enterApp(session.user);
  }

  // Listen for auth changes
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Already handled by doLogin / enterApp
    }
    if (event === 'SIGNED_OUT') {
      window.currentUser    = null;
      window.currentProfile = null;
    }
  });
})();

// ── Enter App ─────────────────────────────────────────────
async function enterApp(user) {
  window.currentUser = user;

  // Fetch profile
  const { data: profile, error: pErr } = await sb
    .from('profiles').select('*').eq('id', user.id).single();

  if (pErr || !profile) {
    // Profile not yet created (trigger might lag), retry once
    await new Promise(r => setTimeout(r, 800));
    const { data: p2 } = await sb.from('profiles').select('*').eq('id', user.id).single();
    window.currentProfile = p2 || { balance: 0, full_name: user.email, role: 'investor' };
  } else {
    window.currentProfile = profile;
  }

  // Fetch all funds
  const { data: funds } = await sb.from('funds').select('*').eq('is_active', true).order('type');
  window.allFunds = funds || [];

  // Seed NAV cache
  window.allFunds.forEach(f => {
    NAV_CACHE[f.id] = { nav: parseFloat(f.nav), base: parseFloat(f.base_nav), mult: 1 };
  });

  // Switch to app page
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-app').classList.add('active');

  // Update sidebar
  updateSidebarUI(window.currentProfile);

  // Render product lists (they're static, render once)
  ['pasar-uang', 'obligasi', 'saham'].forEach(type => renderProducts(type));

  // Start live NAV simulation
  startNavSimulation(window.allFunds);

  // Build ticker
  buildTickerHTML(window.allFunds);

  // Load dashboard
  switchView('dashboard');
}

// ── Keyboard shortcuts ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
