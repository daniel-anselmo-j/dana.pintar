// ═══════════════════════════════════════════════════════════
//  js/admin.js — Admin Panel
// ═══════════════════════════════════════════════════════════

async function renderAdmin() {
  const el = document.getElementById('viewAdmin');
  if (!el) return;
  showLoading('viewAdmin', 'Memuat data admin...');

  if (window.currentProfile?.role !== 'admin') {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><p>Akses ditolak. Halaman ini hanya untuk administrator.</p></div>';
    return;
  }

  try {
    const [profiles, txs, holdings] = await Promise.all([
      adminApi.getUsers(),
      adminApi.getTransactions(),
      adminApi.getHoldings(),
    ]);

    let totalAUM = 0;
    holdings.forEach(h => { totalAUM += parseFloat(h.units) * getCurrentNav(h.fund_id); });

    const profileMap  = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    const activeUsers  = profiles.filter(p => p.is_active).length;
    const totalBalance = profiles.reduce((a, p) => a + parseFloat(p.balance || 0), 0);

    el.innerHTML = `
      <div class="grid-4 mb-24 stagger">
        <div class="admin-stat">
          <div class="admin-stat-icon" style="background:rgba(201,168,76,0.1);">👥</div>
          <div>
            <div class="as-label">Total Investor</div>
            <div class="as-value">${profiles.length}</div>
            <div class="text-xs text-muted mt-4">${activeUsers} aktif</div>
          </div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-icon" style="background:var(--green-dim);">💰</div>
          <div>
            <div class="as-label">Total AUM</div>
            <div class="as-value">Rp ${fmtAUM(totalAUM)}</div>
          </div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-icon" style="background:var(--blue-dim);">📋</div>
          <div>
            <div class="as-label">Total Transaksi</div>
            <div class="as-value">${txs.length}</div>
          </div>
        </div>
        <div class="admin-stat">
          <div class="admin-stat-icon" style="background:rgba(165,148,255,0.1);">💼</div>
          <div>
            <div class="as-label">Total Saldo User</div>
            <div class="as-value">Rp ${fmtAUM(totalBalance)}</div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="card-header">
          <div class="card-title" style="margin-bottom:0;">Manajemen Pengguna</div>
          <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 12px;">
            <span style="color:var(--text3);">🔍</span>
            <input type="text" id="adminSearch" placeholder="Cari nama atau username..."
              style="background:none;border:none;outline:none;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;width:200px;"
              oninput="filterAdminUsers()">
          </div>
        </div>
        <div class="table-wrap" style="margin-top:12px;">
          <table>
            <thead><tr>
              <th>Nama</th><th>Username</th><th>Saldo</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody id="adminUsersBody"></tbody>
          </table>
        </div>
      </div>

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

    window._adminProfiles = profiles;
    window._adminTxs      = txs;
    window._profileMap    = profileMap;

    filterAdminUsers();
    renderAdminTxTable(txs, profileMap);

  } catch (e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Gagal memuat data: ${e.message}</p></div>`;
  }
}

function filterAdminUsers() {
  const q = (document.getElementById('adminSearch')?.value || '').toLowerCase();
  const profiles = (window._adminProfiles || []).filter(p =>
    (p.full_name || '').toLowerCase().includes(q) ||
    (p.username  || '').toLowerCase().includes(q)
  );
  renderAdminUsersTable(profiles);
}

function renderAdminUsersTable(profiles) {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;
  if (!profiles.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px;">Tidak ada pengguna ditemukan.</td></tr>';
    return;
  }
  tbody.innerHTML = profiles.map(p => `
    <tr>
      <td><div class="fw-600">${p.full_name || '—'}</div></td>
      <td class="text-sm text-muted">@${p.username || '—'}</td>
      <td class="td-mono">Rp ${fmtInt(p.balance)}</td>
      <td><span class="tag ${p.is_active ? 'tag-green' : 'tag-red'}">${p.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
      <td>
        <button class="btn-danger" onclick="toggleUserStatus('${p.id}', ${p.is_active})">
          ${p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </td>
    </tr>`).join('');
}

function renderAdminTxTable(txs, profileMap) {
  const tbody = document.getElementById('adminTxBody');
  if (!tbody) return;
  const icons  = { topup:'💳', beli:'🛒', jual:'💸' };
  const labels = { topup:'Top Up', beli:'Pembelian', jual:'Penjualan' };
  const tagCls = { topup:'tag-blue', beli:'tag-red', jual:'tag-green' };

  tbody.innerHTML = txs.slice(0, 60).map(tx => {
    const pMap  = profileMap || window._profileMap || {};
    const uName = pMap[tx.user_id]?.full_name || tx.user_id?.slice(0, 8) + '...';
    const uname = pMap[tx.user_id]?.username  ? `@${pMap[tx.user_id].username}` : '';
    const fund  = window.allFunds?.find(f => f.id === tx.fund_id);
    return `<tr>
      <td class="text-sm text-muted">${fmtDate(tx.created_at)}</td>
      <td class="fw-600 text-sm">${uName}<br><span class="text-muted" style="font-size:11px;">${uname}</span></td>
      <td><span class="tag ${tagCls[tx.type] || 'tag-neutral'}">${icons[tx.type] || ''} ${labels[tx.type] || tx.type}</span></td>
      <td class="text-sm text-muted">${fund?.name || '—'}</td>
      <td class="td-mono">Rp ${fmtInt(tx.amount)}</td>
      <td><span class="tag tag-green">${tx.status || 'sukses'}</span></td>
    </tr>`;
  }).join('');
}

async function toggleUserStatus(userId, currentActive) {
  try {
    await adminApi.toggleUserStatus(userId, !currentActive);
    const p = (window._adminProfiles || []).find(x => x.id === userId);
    if (p) p.is_active = !currentActive;
    filterAdminUsers();
    toast(!currentActive ? '✅ Akun diaktifkan' : '🚫 Akun dinonaktifkan', 'success');
  } catch (e) {
    toast('Gagal: ' + e.message, 'error');
  }
}
