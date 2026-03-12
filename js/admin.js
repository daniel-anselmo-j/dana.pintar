// ═══════════════════════════════════════════════════════════
//  js/admin.js — Admin Panel
// ═══════════════════════════════════════════════════════════

async function renderAdmin() {
  const el = document.getElementById('viewAdmin');
  if (!el) return;
  showLoading('viewAdmin', 'Memuat data admin…');

  // Check admin role
  if (window.currentProfile?.role !== 'admin') {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><p>Akses ditolak. Halaman ini hanya untuk administrator.</p></div>';
    return;
  }

  // Fetch all data in parallel
  const [{ data: profiles }, { data: txs }, { data: holdings }] = await Promise.all([
    sb.from('profiles').select('*').neq('role', 'admin'),
    sb.from('transactions').select('*, profiles(full_name), funds(name,icon)').order('created_at', { ascending: false }).limit(100),
    sb.from('holdings').select('*, funds(*)'),
  ]);

  // Compute AUM
  let totalAUM = 0;
  (holdings || []).forEach(h => {
    totalAUM += parseFloat(h.units) * getCurrentNav(h.fund_id);
  });

  el.innerHTML = `
    <!-- Stats -->
    <div class="grid-4 mb-24 stagger">
      <div class="admin-stat">
        <div class="admin-stat-icon" style="background:rgba(201,168,76,0.1);">👥</div>
        <div><div class="as-label">Total Investor</div><div class="as-value">${(profiles || []).length}</div></div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-icon" style="background:var(--green-dim);">💰</div>
        <div><div class="as-label">Total AUM</div><div class="as-value">Rp ${fmtAUM(totalAUM)}</div></div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-icon" style="background:var(--blue-dim);">📋</div>
        <div><div class="as-label">Total Transaksi</div><div class="as-value">${(txs || []).length}</div></div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-icon" style="background:rgba(165,148,255,0.1);">📈</div>
        <div><div class="as-label">Produk Aktif</div><div class="as-value">${(window.allFunds || []).length}</div></div>
      </div>
    </div>

    <!-- Users table -->
    <div class="card mb-24">
      <div class="card-header">
        <div class="card-title" style="margin-bottom:0;">Manajemen Pengguna</div>
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 12px;">
          <span style="color:var(--text3);">🔍</span>
          <input type="text" id="adminSearch" placeholder="Cari pengguna…"
            style="background:none;border:none;outline:none;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;width:200px;"
            oninput="filterAdminUsers()">
        </div>
      </div>
      <div class="table-wrap" style="margin-top:4px;">
        <table>
          <thead><tr>
            <th>Nama</th><th>Email</th><th>Saldo</th><th>Total Investasi</th><th>Status</th><th>Aksi</th>
          </tr></thead>
          <tbody id="adminUsersBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Transactions table -->
    <div class="card">
      <div class="card-title">Semua Transaksi Platform</div>
      <div class="table-wrap" style="margin-top:4px;">
        <table>
          <thead><tr>
            <th>Waktu</th><th>Pengguna</th><th>Jenis</th><th>Produk</th><th>Nominal</th><th>Status</th>
          </tr></thead>
          <tbody id="adminTxBody"></tbody>
        </table>
      </div>
    </div>`;

  // Store for filtering
  window._adminProfiles  = profiles  || [];
  window._adminHoldings  = holdings  || [];
  window._adminTxs       = txs       || [];

  filterAdminUsers();
  renderAdminTxTable(txs || []);
}

function filterAdminUsers() {
  const q        = (document.getElementById('adminSearch')?.value || '').toLowerCase();
  const profiles = (window._adminProfiles || []).filter(p =>
    p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
  renderAdminUsersTable(profiles);
}

function renderAdminUsersTable(profiles) {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;
  const holdings = window._adminHoldings || [];

  tbody.innerHTML = profiles.map(p => {
    const userHoldings = holdings.filter(h => h.user_id === p.id);
    let investVal = 0;
    userHoldings.forEach(h => { investVal += parseFloat(h.units) * getCurrentNav(h.fund_id); });

    return `<tr>
      <td><div class="fw-600">${p.full_name}</div></td>
      <td class="text-muted text-sm">${p.email}</td>
      <td class="td-mono">Rp ${fmtInt(p.balance)}</td>
      <td class="td-mono">Rp ${fmtInt(investVal)}</td>
      <td><span class="tag ${p.is_active ? 'tag-green' : 'tag-red'}">${p.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
      <td>
        <button class="btn-danger" onclick="toggleUserStatus('${p.id}', ${p.is_active})">
          ${p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

function renderAdminTxTable(txs) {
  const tbody = document.getElementById('adminTxBody');
  if (!tbody) return;
  const icons  = { topup: '💳', beli: '🛒', jual: '💸' };
  const labels = { topup: 'Top Up', beli: 'Pembelian', jual: 'Penjualan' };
  const tagCls = { topup: 'tag-blue', beli: 'tag-red', jual: 'tag-green' };

  tbody.innerHTML = txs.slice(0, 60).map(tx => `
    <tr>
      <td class="text-sm text-muted">${fmtDate(tx.created_at)}</td>
      <td class="fw-600 text-sm">${tx.profiles?.full_name || '—'}</td>
      <td><span class="tag ${tagCls[tx.type] || 'tag-neutral'}">${icons[tx.type] || ''} ${labels[tx.type] || tx.type}</span></td>
      <td class="text-sm text-muted">${tx.funds?.name || '—'}</td>
      <td class="td-mono">Rp ${fmtInt(tx.amount)}</td>
      <td><span class="tag tag-green">${tx.status || 'sukses'}</span></td>
    </tr>`).join('');
}

async function toggleUserStatus(userId, currentActive) {
  const { error } = await sb.from('profiles').update({ is_active: !currentActive }).eq('id', userId);
  if (error) { toast('Gagal mengubah status: ' + error.message, 'error'); return; }

  const p = window._adminProfiles.find(x => x.id === userId);
  if (p) p.is_active = !currentActive;
  filterAdminUsers();
  toast(!currentActive ? '✅ Akun diaktifkan' : '🚫 Akun dinonaktifkan', 'success');
}
