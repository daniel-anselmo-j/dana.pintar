// ═══════════════════════════════════════════════════════════
//  js/transactions.js — Saldo & Riwayat Transaksi
// ═══════════════════════════════════════════════════════════

let txFilterActive = 'all';

async function renderSaldo() {
  const el = document.getElementById('viewSaldo');
  if (!el) return;
  showLoading('viewSaldo');

  const uid = window.currentUser.id;
  const { data: txs } = await sb
    .from('transactions')
    .select('*, funds(name,icon)')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  const balance = window.currentProfile?.balance ?? 0;
  const topups  = (txs || []).filter(t => t.type === 'topup').reduce((a, t) => a + parseFloat(t.amount), 0);
  const buys    = (txs || []).filter(t => t.type === 'beli').reduce((a, t) => a + parseFloat(t.amount), 0);
  const sells   = (txs || []).filter(t => t.type === 'jual').reduce((a, t) => a + parseFloat(t.amount), 0);

  el.innerHTML = `
    <div class="grid-2 mb-24">
      <div class="card" style="background:linear-gradient(135deg,rgba(201,168,76,0.07),var(--card));border-color:rgba(201,168,76,0.2);">
        <div class="card-title" style="color:var(--gold);">Saldo Aktif</div>
        <div style="font-family:'DM Mono',monospace;font-size:38px;font-weight:500;color:var(--gold2);margin:6px 0 14px;">Rp ${fmtInt(balance)}</div>
        <p class="text-muted text-sm mb-16">Siap diinvestasikan kapan saja</p>
        <button class="btn-sm" onclick="openModal('modalTopup')">+ Top Up Saldo</button>
      </div>
      <div class="card">
        <div class="card-title">Ringkasan Keuangan</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="lot-display"><span class="ld-label">Total Top Up</span><span class="ld-val text-green">Rp ${fmtInt(topups)}</span></div>
          <div class="lot-display"><span class="ld-label">Total Pembelian</span><span class="ld-val text-red">- Rp ${fmtInt(buys)}</span></div>
          <div class="lot-display"><span class="ld-label">Total Penjualan</span><span class="ld-val text-green">+ Rp ${fmtInt(sells)}</span></div>
          <div class="lot-display"><span class="ld-label">Total Transaksi</span><span class="ld-val">${(txs || []).length}x</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title" style="margin-bottom:0;">Riwayat Transaksi</div>
        <div class="filter-tabs" style="margin-bottom:0;">
          <button class="filter-tab active" onclick="filterTxView('all', this)">Semua</button>
          <button class="filter-tab" onclick="filterTxView('topup', this)">Top Up</button>
          <button class="filter-tab" onclick="filterTxView('beli', this)">Pembelian</button>
          <button class="filter-tab" onclick="filterTxView('jual', this)">Penjualan</button>
        </div>
      </div>
      <div id="txListContainer" style="margin-top:16px;"></div>
    </div>`;

  window._allTxs = txs || [];
  filterTxView('all');
}

function filterTxView(type, btnEl) {
  txFilterActive = type;
  document.querySelectorAll('#viewSaldo .filter-tab').forEach(b => {
    b.classList.toggle('active', b === btnEl || (!btnEl && b.textContent.toLowerCase().includes(type === 'all' ? 'semua' : type)));
  });
  const filtered = type === 'all' ? window._allTxs : (window._allTxs || []).filter(t => t.type === type);
  const el = document.getElementById('txListContainer');
  if (!el) return;
  if (!filtered.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Tidak ada transaksi.</p></div>'; return; }
  el.innerHTML = filtered.map(tx => txItemHTML(tx)).join('');
}

function txItemHTML(tx) {
  const icons  = { topup: '💳', beli: '🛒', jual: '💸' };
  const labels = { topup: 'Top Up', beli: 'Pembelian', jual: 'Penjualan' };
  const amtCls = tx.type === 'beli' ? 'text-red' : 'text-green';
  const sign   = tx.type === 'beli' ? '-' : '+';
  const fundName = tx.funds?.name || '';
  const note   = tx.note || (labels[tx.type] + (fundName ? ' · ' + fundName : ''));

  return `
  <div class="tx-item">
    <div class="tx-icon">${icons[tx.type] || '📋'}</div>
    <div class="tx-info">
      <div class="tx-note">${note}</div>
      <div class="tx-date">${fmtDate(tx.created_at)}</div>
    </div>
    <div>
      <div class="tx-amount ${amtCls}">${sign}Rp ${fmtInt(tx.amount)}</div>
      <div class="tag tag-green text-xs mt-4" style="float:right;">${tx.status || 'sukses'}</div>
    </div>
  </div>`;
}
