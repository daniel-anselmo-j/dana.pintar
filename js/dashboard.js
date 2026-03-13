// ═══════════════════════════════════════════════════════════
//  js/dashboard.js — Dashboard View
// ═══════════════════════════════════════════════════════════

async function renderDashboard() {
  const el = document.getElementById('viewDashboard');
  if (!el) return;
  showLoading('viewDashboard');

  const uid     = window.currentUser?.id;
  const profile = window.currentProfile;
  if (!uid) return;

  // Greeting
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';
  document.getElementById('dashGreet').textContent =
    greet + ', ' + (profile?.full_name || 'Pengguna').split(' ')[0] + '!';

  // Load holdings dari cache (sudah di-load saat enterApp)
  const holdings = window._holdingsCache || [];

  // Load recent transactions (query simpel, tanpa join ke funds)
  let txs = [];
  try {
    const { data } = await sb
      .from('transactions')
      .select('id, type, amount, fund_id, note, status, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(5);
    // Gabungkan fund name dari allFunds cache
    txs = (data || []).map(tx => ({
      ...tx,
      funds: window.allFunds.find(f => f.id === tx.fund_id) || null,
    }));
  } catch(e) {
    console.error('Tx fetch error:', e);
  }

  const { total, modal, profit, pct } = calcPortfolioStats(holdings);
  const count = holdings.length;

  el.innerHTML = `
    <div class="grid-4 mb-24 stagger">
      ${statCard('Total Portofolio',
        '<span id="dash-porto-total">Rp ' + fmtInt(total) + '</span>',
        (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
        pct >= 0 ? 'up' : 'down', '&#x1F4B0;')}
      ${statCard('Total Keuntungan',
        '<span id="dash-profit">' + (profit >= 0 ? '+' : '') + 'Rp ' + fmtInt(Math.abs(profit)) + '</span>',
        (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
        pct >= 0 ? 'up' : 'down', '&#x1F4C8;')}
      ${statCard('Saldo Tersedia',
        'Rp ' + fmtInt(profile?.balance ?? 0),
        'Siap investasi', 'neutral', '&#x1F4B3;')}
      ${statCard('Produk Dimiliki',
        count + '', 'Reksadana', 'neutral', '&#x1F3E6;')}
    </div>

    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-title">Kinerja Portofolio (30 Hari)</div>
        <div style="position:relative;height:200px;width:100%;">
          <canvas id="dashLineChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Alokasi Aset</div>
        <div style="position:relative;height:160px;width:100%;">
          <canvas id="dashDonutChart"></canvas>
        </div>
        <div id="allocLegend" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="margin-bottom:0;">Produk Terpopuler</div>
          <button class="btn-sm" onclick="switchView('saham')">Lihat Semua</button>
        </div>
        <div id="dashTopFunds"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="margin-bottom:0;">Transaksi Terakhir</div>
          <button class="btn-sm" onclick="switchView('saldo')">Lihat Semua</button>
        </div>
        <div id="dashRecentTx"></div>
      </div>
    </div>`;

  // Tunggu DOM benar-benar terpaint sebelum init chart
  // (el.innerHTML baru saja diset, canvas belum punya ukuran)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderDashLineChart(total, profile?.balance ?? 0);
      renderAllocChart(holdings);
    });
  });

  // Top funds
  const topFunds = (window.allFunds || [])
    .sort((a, b) => b.return_1y - a.return_1y).slice(0, 5);
  const tfEl = document.getElementById('dashTopFunds');
  if (tfEl) {
    tfEl.innerHTML = topFunds.length ? topFunds.map(f => `
      <div class="portfolio-item" style="cursor:pointer;" onclick="switchView('${f.type}')">
        <div class="pi-icon">${f.icon}</div>
        <div class="pi-info">
          <div class="pi-name">${f.name}</div>
          <div class="pi-sub">${f.manager} &#xB7; ${f.risk_level}</div>
        </div>
        <div class="pi-value">
          <div class="pi-amount">Rp ${fmt(getCurrentNav(f.id))}</div>
          <div class="pi-return text-green">+${f.return_1y}% / 1Y</div>
        </div>
      </div>`).join('')
    : '<div class="empty-state" style="padding:24px;"><p>Memuat produk...</p></div>';
  }

  // Recent transactions
  const rtEl = document.getElementById('dashRecentTx');
  if (rtEl) {
    rtEl.innerHTML = txs.length
      ? txs.map(tx => txItemHTML(tx)).join('')
      : '<div class="empty-state" style="padding:24px;"><div class="empty-icon">&#x1F4CB;</div><p>Belum ada transaksi.</p></div>';
  }
}
