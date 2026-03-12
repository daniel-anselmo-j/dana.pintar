// ═══════════════════════════════════════════════════════════
//  js/dashboard.js — Dashboard View
// ═══════════════════════════════════════════════════════════

async function renderDashboard() {
  const el = document.getElementById('viewDashboard');
  if (!el) return;

  const uid     = window.currentUser.id;
  const profile = window.currentProfile;

  // Greeting
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';
  document.getElementById('dashGreet').textContent = `${greet}, ${(profile?.full_name || 'Pengguna').split(' ')[0]}! 👋`;

  // Load holdings & recent tx in parallel
  const [{ data: holdings }, { data: txs }] = await Promise.all([
    sb.from('holdings').select('*, funds(*)').eq('user_id', uid).gt('units', 0),
    sb.from('transactions').select('*, funds(name,icon)').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
  ]);

  const { total, modal, profit, pct } = calcPortfolioStats(holdings || []);
  const count = (holdings || []).length;

  el.innerHTML = `
    <!-- Stats -->
    <div class="grid-4 mb-24 stagger">
      ${statCard('Total Portofolio', 'Rp ' + fmtInt(total), (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', pct >= 0 ? 'up' : 'down', '💰')}
      <div class="stat-card" id="dash-profit-card">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Total Keuntungan</div>
        <div class="stat-value" id="dash-profit">${(profit >= 0 ? '+' : '')}Rp ${fmtInt(Math.abs(profit))}</div>
        <div class="stat-change ${pct >= 0 ? 'up' : 'down'}">${(pct >= 0 ? '+' : '')}${pct.toFixed(2)}%</div>
      </div>
      ${statCard('Saldo Tersedia', 'Rp ' + fmtInt(profile?.balance ?? 0), 'Siap investasi', 'neutral', '💳')}
      ${statCard('Produk Dimiliki', count + '', 'Reksadana', 'neutral', '🏦')}
    </div>

    <!-- Charts row -->
    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-title">Kinerja Portofolio (30 Hari)</div>
        <canvas id="dashLineChart" height="190"></canvas>
      </div>
      <div class="card">
        <div class="card-title">Alokasi Aset</div>
        <canvas id="dashDonutChart" height="160"></canvas>
        <div id="allocLegend" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <!-- Bottom row -->
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

  // Charts
  renderDashLineChart(total, profile?.balance ?? 0);
  renderAllocChart(holdings || []);

  // Top funds
  const topFunds = (window.allFunds || []).sort((a, b) => b.return_1y - a.return_1y).slice(0, 5);
  const tfEl = document.getElementById('dashTopFunds');
  if (tfEl) tfEl.innerHTML = topFunds.map(f => `
    <div class="portfolio-item" style="cursor:pointer;" onclick="switchView('${f.type}')">
      <div class="pi-icon">${f.icon}</div>
      <div class="pi-info"><div class="pi-name">${f.name}</div><div class="pi-sub">${f.manager} · ${f.risk_level}</div></div>
      <div class="pi-value">
        <div class="pi-amount">Rp ${fmt(getCurrentNav(f.id))}</div>
        <div class="pi-return text-green">+${f.return_1y}% / 1Y</div>
      </div>
    </div>`).join('');

  // Recent tx
  const rtEl = document.getElementById('dashRecentTx');
  if (rtEl) {
    if (!txs || !txs.length) { rtEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada transaksi.</p></div>'; }
    else rtEl.innerHTML = (txs || []).map(tx => txItemHTML(tx)).join('');
  }
}
