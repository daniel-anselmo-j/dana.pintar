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

  // Greeting berdasarkan waktu
  const hour  = new Date().getHours();
  const greet = hour < 5 ? 'Selamat Malam' : hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const firstName = (profile?.full_name || 'Pengguna').split(' ')[0];
  const greetEl = document.getElementById('dashGreet');
  if (greetEl) greetEl.textContent = greet + ', ' + firstName + '!';

  const holdings = window._holdingsCache || [];

  // Fetch 5 transaksi terakhir
  let txs = [];
  try {
    const { data } = await sb
      .from('transactions')
      .select('id, type, amount, fund_id, note, status, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(5);
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
        pct >= 0 ? 'up' : 'down', '💰')}
      ${statCard('Total Keuntungan',
        '<span id="dash-profit">' + (profit >= 0 ? '+' : '') + 'Rp ' + fmtInt(Math.abs(profit)) + '</span>',
        (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
        pct >= 0 ? 'up' : 'down', '📈')}
      ${statCard('Saldo Tersedia',
        'Rp ' + fmtInt(profile?.balance ?? 0),
        'Siap investasi', 'neutral', '💳')}
      ${statCard('Produk Dimiliki',
        count + '', count === 0 ? 'Belum ada' : count === 1 ? '1 Reksadana' : count + ' Reksadana', 'neutral', '🏦')}
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

  // Init charts setelah DOM siap
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderDashLineChart(total, profile?.balance ?? 0);
      renderAllocChart(holdings);
    });
  });

  // Top funds — sorted by return
  const topFunds = (window.allFunds || [])
    .sort((a, b) => b.return_1y - a.return_1y).slice(0, 5);
  const tfEl = document.getElementById('dashTopFunds');
  if (tfEl) {
    tfEl.innerHTML = topFunds.length ? topFunds.map(f => `
      <div class="portfolio-item" style="cursor:pointer;" onclick="switchView('${f.type}')">
        <div class="pi-icon">${f.icon}</div>
        <div class="pi-info">
          <div class="pi-name">${f.name}</div>
          <div class="pi-sub">${f.manager} · <span class="tag tag-neutral" style="font-size:10px;">${TYPE_LABEL[f.type]}</span></div>
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
      : '<div class="empty-state" style="padding:24px;"><div class="empty-icon">📋</div><p>Belum ada transaksi. Yuk mulai investasi!</p></div>';
  }
}
