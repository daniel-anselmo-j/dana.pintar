// ═══════════════════════════════════════════════════════════
//  js/ui.js — UI Helpers, Modals, Toast, Sidebar
// ═══════════════════════════════════════════════════════════

// ── Modal ────────────────────────────────────────────────
function openModal(id)  { 
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.querySelector('input')?.focus(); }
}
function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
});

// ── Toast ────────────────────────────────────────────────
const _toastQueue = [];
let _toastActive = 0;
const MAX_TOASTS = 3;

function toast(msg, type = 'success') {
  // Remove oldest toast if too many
  if (_toastActive >= MAX_TOASTS) {
    const container = document.getElementById('toastContainer');
    const first = container?.firstChild;
    if (first) { first.style.opacity = '0'; setTimeout(() => first.remove(), 200); _toastActive--; }
  }
  
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  _toastActive++;

  setTimeout(() => {
    el.style.transition = 'all 0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(20px)';
    setTimeout(() => { el.remove(); _toastActive = Math.max(0, _toastActive - 1); }, 320);
  }, 3800);
}

// ── Sidebar & Balance UI ─────────────────────────────────
function updateSidebarUI(profile) {
  if (!profile) return;
  const name = profile.full_name || 'Pengguna';
  document.getElementById('sidebarName').textContent    = name;
  document.getElementById('sidebarRole').textContent    = profile.role === 'admin' ? '⚡ Administrator' : '💼 Investor';
  document.getElementById('sidebarAvatar').textContent  = name[0].toUpperCase();
  refreshBalanceUI(profile.balance);

  const navAdmin = document.getElementById('navAdmin');
  if (navAdmin) navAdmin.style.display = profile.role === 'admin' ? 'block' : 'none';
}

function refreshBalanceUI(balance) {
  const formatted = 'Rp ' + fmtInt(balance);
  const sbEl = document.getElementById('sidebarBalance');
  const tbEl = document.getElementById('topbarBalance');
  if (sbEl) sbEl.textContent = formatted;
  if (tbEl) tbEl.textContent = formatted;
}

// ── View Switching ───────────────────────────────────────
let _currentView = null;

function switchView(view) {
  if (_currentView === view) return; // Avoid re-render same view
  _currentView = view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');

  refreshBalanceUI(window.currentProfile?.balance ?? 0);

  switch (view) {
    case 'dashboard':  renderDashboard();  break;
    case 'portfolio':  renderPortfolio();  break;
    case 'saldo':      renderSaldo();      break;
    case 'pasar-uang': renderProducts('pasar-uang'); break;
    case 'obligasi':   renderProducts('obligasi');   break;
    case 'saham':      renderProducts('saham');      break;
    case 'admin':      renderAdmin();     break;
  }
}

// Reset current view tracker when switching away
function _resetViewCache(view) {
  if (_currentView === view) _currentView = null;
}

// ── Top Up ───────────────────────────────────────────────
function setTopup(amt) { 
  const el = document.getElementById('topupAmount');
  if (el) { el.value = amt; el.focus(); }
  // Highlight selected button
  document.querySelectorAll('.quick-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.textContent.replace(/[^0-9]/g,'')) * 
      (b.textContent.includes('jt') ? 1e6 : 1e3) === amt ||
      b.getAttribute('onclick')?.includes(amt));
  });
}

async function confirmTopup() {
  const amt = parseFloat(document.getElementById('topupAmount').value) || 0;
  if (amt < 10000) { toast('Minimal top up Rp 10.000', 'error'); return; }
  if (amt > 1000000000) { toast('Maksimal top up Rp 1 miliar per transaksi', 'error'); return; }

  const btn = document.querySelector('#modalTopup .btn-gold');
  btn.textContent = 'Memproses…'; btn.disabled = true;

  const newBalance = (window.currentProfile.balance || 0) + amt;
  
  try {
    const { error: balErr } = await sb
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', window.currentUser.id);

    if (balErr) throw new Error(balErr.message);

    await sb.from('transactions').insert({
      user_id: window.currentUser.id,
      type: 'topup',
      amount: amt,
      note: 'Top Up Saldo',
      status: 'sukses',
    });

    window.currentProfile.balance = newBalance;
    cacheInvalidate('profile:');
    closeModal('modalTopup');
    toast('💳 Top Up Rp ' + fmtInt(amt) + ' berhasil!', 'success');
    refreshBalanceUI(newBalance);
    document.getElementById('topupAmount').value = '';
    // Reset quick-btn active states
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    // Refresh saldo view if active
    if (_currentView === 'saldo') { _currentView = null; renderSaldo(); }
  } catch(e) {
    toast('Gagal top up: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Top Up Sekarang'; btn.disabled = false;
  }
}

// ── Loading helpers ──────────────────────────────────────
function showLoading(containerId, msg = 'Memuat data…') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><span>${msg}</span></div>`;
}

function showEmpty(containerId, icon = '📭', msg = 'Belum ada data.') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}
