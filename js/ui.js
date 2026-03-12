// ═══════════════════════════════════════════════════════════
//  js/ui.js — UI Helpers, Modals, Toast, Sidebar
// ═══════════════════════════════════════════════════════════

// ── Modal ────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
});

// ── Toast ────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all 0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(20px)';
    setTimeout(() => el.remove(), 320);
  }, 3800);
}

// ── Sidebar & Balance UI ─────────────────────────────────
function updateSidebarUI(profile) {
  if (!profile) return;
  document.getElementById('sidebarName').textContent    = profile.full_name || 'Pengguna';
  document.getElementById('sidebarRole').textContent    = profile.role === 'admin' ? '⚡ Administrator' : 'Investor';
  document.getElementById('sidebarAvatar').textContent  = (profile.full_name || 'U')[0].toUpperCase();
  refreshBalanceUI(profile.balance);

  const navAdmin = document.getElementById('navAdmin');
  navAdmin.style.display = profile.role === 'admin' ? 'block' : 'none';
}

function refreshBalanceUI(balance) {
  const formatted = 'Rp ' + fmtInt(balance);
  document.getElementById('sidebarBalance').textContent = formatted;
  const tb = document.getElementById('topbarBalance');
  if (tb) tb.textContent = formatted;
}

// ── View Switching ───────────────────────────────────────
function switchView(view) {
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

// ── Top Up ───────────────────────────────────────────────
function setTopup(amt) { document.getElementById('topupAmount').value = amt; }

async function confirmTopup() {
  const amt = parseFloat(document.getElementById('topupAmount').value) || 0;
  if (amt < 10000) { toast('Minimal top up Rp 10.000', 'error'); return; }

  const btn = document.querySelector('#modalTopup .btn-gold');
  btn.textContent = 'Memproses…'; btn.disabled = true;

  // Update balance in DB
  const newBalance = (window.currentProfile.balance || 0) + amt;
  const { error: balErr } = await sb
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', window.currentUser.id);

  if (balErr) { toast('Gagal top up: ' + balErr.message, 'error'); btn.textContent = 'Top Up Sekarang'; btn.disabled = false; return; }

  // Insert transaction
  await sb.from('transactions').insert({
    user_id: window.currentUser.id,
    type: 'topup',
    amount: amt,
    note: 'Top Up Saldo',
    status: 'sukses',
  });

  window.currentProfile.balance = newBalance;
  closeModal('modalTopup');
  btn.textContent = 'Top Up Sekarang'; btn.disabled = false;
  toast('💳 Top Up Rp ' + fmtInt(amt) + ' berhasil!', 'success');
  refreshBalanceUI(newBalance);
  document.getElementById('topupAmount').value = '';
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
