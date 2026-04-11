// ═══════════════════════════════════════════════════════════
//  js/transactions.js — Saldo & Riwayat Transaksi
// ═══════════════════════════════════════════════════════════

let txFilterActive = 'all';

async function renderSaldo() {
  const el = document.getElementById('viewSaldo');
  if (!el) return;
  showLoading('viewSaldo');

  const balance = window.currentProfile?.balance ?? 0;

  let txs = [];
  try {
    const raw = await transactionsApi.getAll();
    txs = raw.map(tx => ({
      ...tx,
      funds: window.allFunds.find(f => f.id === tx.fund_id) || null,
    }));
  } catch(e) {
    console.error('Transactions fetch error:', e);
  }

  const topups = txs.filter(t => t.type === 'topup').reduce((a, t) => a + parseFloat(t.amount), 0);
  const buys   = txs.filter(t => t.type === 'beli' ).reduce((a, t) => a + parseFloat(t.amount), 0);
  const sells  = txs.filter(t => t.type === 'jual' ).reduce((a, t) => a + parseFloat(t.amount), 0);

  el.innerHTML = `
    <div class="grid-2 mb-24">
      <div class="card saldo-main-card">
        <div class="card-title" style="color:var(--gold);">💳 Saldo Aktif</div>
        <div class="saldo-amount">Rp ${fmtInt(balance)}</div>
        <p class="text-muted text-sm mb-16">Siap diinvestasikan kapan saja</p>
        <button class="btn-sm" onclick="openModal('modalTopup')">+ Top Up Saldo</button>
      </div>
      <div class="card">
        <div class="card-title">Ringkasan Keuangan</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="lot-display">
            <span class="ld-label">💰 Total Top Up</span>
            <span class="ld-val text-green">Rp ${fmtInt(topups)}</span>
          </div>
          <div class="lot-display">
            <span class="ld-label">🛒 Total Pembelian</span>
            <span class="ld-val text-red">− Rp ${fmtInt(buys)}</span>
          </div>
          <div class="lot-display">
            <span class="ld-label">💸 Total Penjualan</span>
            <span class="ld-val text-green">+ Rp ${fmtInt(sells)}</span>
          </div>
          <div class="lot-display" style="border-color:var(--border2);">
            <span class="ld-label fw-600">📊 Total Transaksi</span>
            <span class="ld-val fw-600">${txs.length}x</span>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title" style="margin-bottom:0;">📋 Riwayat Transaksi</div>
        <div class="filter-tabs" style="margin-bottom:0;">
          <button class="filter-tab active" onclick="filterTxView('all',this)">Semua <span class="tx-count">${txs.length}</span></button>
          <button class="filter-tab" onclick="filterTxView('topup',this)">Top Up</button>
          <button class="filter-tab" onclick="filterTxView('beli',this)">Pembelian</button>
          <button class="filter-tab" onclick="filterTxView('jual',this)">Penjualan</button>
        </div>
      </div>
      <div id="txListContainer" style="margin-top:16px;"></div>
    </div>`;

  window._allTxs = txs;
  filterTxView('all');
}

function filterTxView(type, btnEl) {
  txFilterActive = type;
  document.querySelectorAll('#viewSaldo .filter-tab').forEach(b => {
    const isMatch = (type === 'all'   && b.textContent.startsWith('Semua')) ||
                    (type === 'topup' && b.textContent === 'Top Up')         ||
                    (type === 'beli'  && b.textContent === 'Pembelian')      ||
                    (type === 'jual'  && b.textContent === 'Penjualan');
    b.classList.toggle('active', btnEl ? b === btnEl : isMatch);
  });

  const filtered = type === 'all'
    ? window._allTxs
    : (window._allTxs || []).filter(t => t.type === type);

  const el = document.getElementById('txListContainer');
  if (!el) return;

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Tidak ada transaksi di kategori ini.</p></div>';
    return;
  }
  el.innerHTML = filtered.map(tx => txItemHTML(tx)).join('');
}

function txItemHTML(tx) {
  const icons  = { topup: '💳', beli: '🛒', jual: '💸' };
  const labels = { topup: 'Top Up', beli: 'Pembelian', jual: 'Penjualan' };
  const amtCls = tx.type === 'beli' ? 'text-red' : 'text-green';
  const sign   = tx.type === 'beli' ? '−' : '+';
  const fundName = tx.funds?.name || (tx.fund_id
    ? (window.allFunds.find(f => f.id === tx.fund_id)?.name || '')
    : '');
  const note   = tx.note || labels[tx.type] + (fundName ? ' · ' + fundName : '');
  const tagCls = tx.type === 'topup' ? 'tag-blue' : tx.type === 'beli' ? 'tag-red' : 'tag-green';

  return `
  <div class="tx-item">
    <div class="tx-icon">${icons[tx.type] || '📋'}</div>
    <div class="tx-info">
      <div class="tx-note">${note}</div>
      <div class="tx-date">${fmtDate(tx.created_at)}</div>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div class="tx-amount ${amtCls}">${sign}Rp ${fmtInt(tx.amount)}</div>
      <span class="tag ${tagCls} text-xs mt-4">${tx.status || 'sukses'}</span>
    </div>
  </div>`;
}
