// ═══════════════════════════════════════════════════════════
//  js/portfolio.js — Portfolio View
// ═══════════════════════════════════════════════════════════

async function renderPortfolio() {
  const el = document.getElementById('viewPortfolio');
  if (!el) return;
  showLoading('viewPortfolio');

  await refreshHoldingsCache();
  const holdings = window._holdingsCache;
  const { total, modal, profit, pct } = calcPortfolioStats(holdings);

  el.innerHTML = `
    <div class="grid-3 mb-24 stagger">
      ${statCard('Nilai Saat Ini',       'Rp ' + fmtInt(total),
        (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', pct >= 0 ? 'up' : 'down', '💰')}
      ${statCard('Modal Diinvestasikan', 'Rp ' + fmtInt(modal),
        'Total pembelian', 'neutral', '📥')}
      ${statCard('Keuntungan / Rugi',
        (profit >= 0 ? '+' : '') + 'Rp ' + fmtInt(Math.abs(profit)),
        (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
        pct >= 0 ? 'up' : 'down', profit >= 0 ? '📈' : '📉')}
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title" style="margin-bottom:0;">Rincian Kepemilikan</div>
        ${holdings.length ? `<span class="tag tag-neutral">${holdings.length} produk</span>` : ''}
      </div>
      <div id="holdingsList" style="margin-top:4px;"></div>
    </div>`;

  const listEl = document.getElementById('holdingsList');
  if (!listEl) return;

  if (!holdings.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>Belum ada investasi aktif.</p>
        <p class="text-sm text-muted mt-8">Mulai dari menu <strong style="color:var(--gold2)">Produk Investasi</strong> di sidebar.</p>
        <button class="btn-sm" style="margin-top:16px;" onclick="switchView('pasar-uang')">Jelajahi Produk</button>
      </div>`;
    return;
  }
  listEl.innerHTML = holdings.map(h => holdingItemHTML(h)).join('');
}

function holdingItemHTML(h) {
  const f    = h.funds; if (!f) return '';
  const nav  = getCurrentNav(f.id);
  const curr = parseFloat(h.units) * nav;
  const inv  = parseFloat(h.invested);
  const prof = curr - inv;
  const pct  = inv > 0 ? (prof / inv * 100) : 0;
  const typeCls = f.type === 'pasar-uang' ? 'tag-blue'
                : f.type === 'obligasi'   ? 'tag-gold'
                :                           'tag-green';
  return `
  <div class="portfolio-item">
    <div class="pi-icon">${f.icon}</div>
    <div class="pi-info">
      <div class="pi-name">${f.name}</div>
      <div class="pi-sub flex flex-center gap-8 mt-4">
        <span class="tag ${typeCls}">${TYPE_LABEL[f.type] || f.type}</span>
        <span>${f.manager}</span>
        <span>· ${parseFloat(h.units).toFixed(4)} unit</span>
      </div>
      <div class="text-xs text-dim mt-4">Modal: Rp ${fmtInt(h.invested)}</div>
    </div>
    <div class="pi-value">
      <div class="pi-amount" id="pi-val-${f.id}">Rp ${fmtInt(curr)}</div>
      <div class="pi-return ${pct >= 0 ? 'text-green' : 'text-red'}"
           id="pi-ret-${f.id}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn-sm"     onclick="openBuy('${f.id}')">+ Beli</button>
        <button class="btn-danger" onclick="openSell('${f.id}')">Jual</button>
      </div>
    </div>
  </div>`;
}

function calcPortfolioStats(holdings) {
  let total = 0, modal = 0;
  (holdings || []).forEach(h => {
    total += parseFloat(h.units) * getCurrentNav(h.fund_id || h.funds?.id);
    modal += parseFloat(h.invested);
  });
  const profit = total - modal;
  const pct    = modal > 0 ? (profit / modal * 100) : 0;
  return { total, modal, profit, pct };
}

function refreshLivePortfolioDOM() {
  (window._holdingsCache || []).forEach(h => {
    const fid  = h.fund_id || h.funds?.id;
    const nav  = getCurrentNav(fid);
    const curr = parseFloat(h.units) * nav;
    const inv  = parseFloat(h.invested);
    const pct  = inv > 0 ? ((curr - inv) / inv * 100) : 0;

    const valEl = document.getElementById('pi-val-' + fid);
    if (valEl) valEl.textContent = 'Rp ' + fmtInt(curr);

    const retEl = document.getElementById('pi-ret-' + fid);
    if (retEl) {
      retEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      retEl.className   = 'pi-return ' + (pct >= 0 ? 'text-green' : 'text-red');
    }
  });

  const { total, profit } = calcPortfolioStats(window._holdingsCache || []);
  const ptEl = document.getElementById('dash-porto-total');
  if (ptEl) ptEl.textContent = 'Rp ' + fmtInt(total);
  const ppEl = document.getElementById('dash-profit');
  if (ppEl) ppEl.textContent = (profit >= 0 ? '+' : '') + 'Rp ' + fmtInt(Math.abs(profit));
}

function statCard(label, value, change, changeDir, icon) {
  return `
  <div class="stat-card">
    <div class="stat-icon">${icon}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-change ${changeDir}">${change}</div>
  </div>`;
}
