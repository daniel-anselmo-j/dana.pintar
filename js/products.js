// ═══════════════════════════════════════════════════════════
//  js/products.js — Product Cards + Buy/Sell
// ═══════════════════════════════════════════════════════════

window.currentFundId = null;

function renderProducts(type) {
  const idMap = {
    'pasar-uang': 'listPasarUang',
    'obligasi':   'listObligasi',
    'saham':      'listSaham',
  };
  const el = document.getElementById(idMap[type]);
  if (!el) return;

  const funds = (window.allFunds || []).filter(f => f.type === type);
  if (!funds.length) {
    showEmpty(idMap[type], '🔍', 'Produk tidak ditemukan.');
    return;
  }
  el.innerHTML = funds.map(f => productCardHTML(f)).join('');
}

function productCardHTML(f) {
  const riskCls = RISK_COLOR[f.risk_level] || 'tag-gold';
  const nav     = getCurrentNav(f.id);
  const returnClass = parseFloat(f.return_1y) >= 0 ? 'text-green' : 'text-red';
  const returnSign  = parseFloat(f.return_1y) >= 0 ? '+' : '';
  return `
  <div class="product-card">
    <div class="product-card-accent" style="--pc-c1:${f.accent1};--pc-c2:${f.accent2};"></div>
    <div class="product-card-body">
      <div class="pc-type">${TYPE_LABEL[f.type] || f.type}</div>
      <div class="pc-name">${f.name}</div>
      <div class="pc-manager">${f.manager}</div>
      <div class="pc-desc">${f.description || ''}</div>
      <div class="product-card-footer">
        <div class="pc-nav-row">
          <div>
            <div class="pc-nav-label">NAV / unit</div>
            <div class="pc-nav" id="nav-display-${f.id}">Rp ${fmt(nav)}</div>
          </div>
          <div style="text-align:right;">
            <div class="pc-nav-label">Return 1 Tahun</div>
            <div class="pc-return ${returnClass}">${returnSign}${f.return_1y}%</div>
          </div>
        </div>
        <div class="pc-meta">
          <span class="tag ${riskCls}">${f.risk_level}</span>
          <span class="tag tag-blue">Min Rp ${fmtInt(f.min_buy)}</span>
          <span class="tag tag-neutral">AUM ${fmtAUM(f.aum)}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="pc-buy-btn" onclick="openBuy('${f.id}')">🛒 Beli Sekarang</button>
          <button class="pc-info-btn" onclick="openFundDetail('${f.id}')" title="Detail produk">ℹ️</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Fund Detail Modal ─────────────────────────────────────
function openFundDetail(fundId) {
  const f = (window.allFunds || []).find(x => x.id === fundId);
  if (!f) return;
  const nav   = getCurrentNav(fundId);
  const base  = parseFloat(f.base_nav);
  const chg   = base > 0 ? ((nav - base) / base * 100) : 0;
  const chgCls = chg >= 0 ? 'text-green' : 'text-red';

  // Use existing buy modal as detail, or just show info toast
  toast(`📊 ${f.name} — NAV: Rp ${fmt(nav)} (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% dari base)`, 'success');
}

// ── BUY ─────────────────────────────────────────────────
function openBuy(fundId) {
  window.currentFundId = fundId;
  const f   = (window.allFunds || []).find(x => x.id === fundId);
  if (!f) return;
  const nav = getCurrentNav(fundId);

  document.getElementById('modalBuyType').textContent   = TYPE_LABEL[f.type] || f.type;
  document.getElementById('modalBuyIcon').textContent   = f.icon;
  document.getElementById('modalBuyName').textContent   = f.name;
  document.getElementById('modalBuyNav').textContent    = 'NAV: Rp ' + fmt(nav) + ' / unit';
  document.getElementById('modalBuyReturn').textContent = '+' + f.return_1y + '%';
  document.getElementById('buyBalance').textContent     = 'Rp ' + fmtInt(window.currentProfile?.balance ?? 0);
  document.getElementById('buyAmount').value            = '';
  document.getElementById('buyLots').textContent        = '0.0000 unit';
  document.getElementById('buyError').style.display    = 'none';
  document.getElementById('buyError').textContent      = '';
  openModal('modalBuy');
}

function calcLots() {
  const amt   = parseFloat(document.getElementById('buyAmount').value) || 0;
  const nav   = getCurrentNav(window.currentFundId);
  const units = nav > 0 ? amt / nav : 0;
  document.getElementById('buyLots').textContent = units.toFixed(4) + ' unit';
  
  // Live validation hint
  const f = (window.allFunds || []).find(x => x.id === window.currentFundId);
  const errEl = document.getElementById('buyError');
  const bal = window.currentProfile?.balance ?? 0;
  if (amt > 0 && f && amt < parseFloat(f.min_buy)) {
    errEl.textContent = `Minimal pembelian Rp ${fmtInt(f.min_buy)}`;
    errEl.style.display = 'block';
  } else if (amt > bal) {
    errEl.textContent = 'Saldo tidak cukup. Silakan Top Up terlebih dahulu.';
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
}

async function confirmBuy() {
  const amt   = parseFloat(document.getElementById('buyAmount').value) || 0;
  const f     = (window.allFunds || []).find(x => x.id === window.currentFundId);
  const errEl = document.getElementById('buyError');
  errEl.style.display = 'none';
  if (!f) return;

  if (amt < parseFloat(f.min_buy)) {
    errEl.textContent = 'Minimal pembelian Rp ' + fmtInt(f.min_buy);
    errEl.style.display = 'block'; return;
  }
  if (amt > (window.currentProfile?.balance ?? 0)) {
    errEl.textContent = 'Saldo tidak cukup. Silakan Top Up terlebih dahulu.';
    errEl.style.display = 'block'; return;
  }

  const btn = document.querySelector('#modalBuy .btn-gold');
  btn.textContent = 'Memproses...'; btn.disabled = true;

  const nav        = getCurrentNav(window.currentFundId);
  const units      = amt / nav;
  const uid        = window.currentUser.id;
  const newBalance = (window.currentProfile.balance || 0) - amt;

  try {
    // 1. Kurangi balance
    const { error: balErr } = await sb.from('profiles')
      .update({ balance: newBalance }).eq('id', uid);
    if (balErr) throw new Error(balErr.message);

    // 2. Upsert holding
    const { data: existArr } = await sb.from('holdings')
      .select('id, units, invested')
      .eq('user_id', uid)
      .eq('fund_id', f.id)
      .limit(1);

    const existing = existArr?.[0] || null;
    if (existing) {
      await sb.from('holdings').update({
        units:    parseFloat(existing.units)    + units,
        invested: parseFloat(existing.invested) + amt,
      }).eq('id', existing.id);
    } else {
      await sb.from('holdings').insert({
        user_id: uid, fund_id: f.id, units, invested: amt,
      });
    }

    // 3. Catat transaksi
    await sb.from('transactions').insert({
      user_id: uid, type: 'beli', amount: amt,
      fund_id: f.id, units, nav_price: nav,
      note: 'Beli ' + f.name + ' (' + units.toFixed(4) + ' unit)',
      status: 'sukses',
    });

    window.currentProfile.balance = newBalance;
    cacheInvalidate('profile:');
    closeModal('modalBuy');
    toast('✅ Berhasil membeli ' + units.toFixed(4) + ' unit ' + f.name, 'success');
    refreshBalanceUI(newBalance);
    await refreshHoldingsCache();

    // Refresh current view if portfolio
    if (_currentView === 'portfolio') { _currentView = null; renderPortfolio(); }
    if (_currentView === 'dashboard') { _currentView = null; renderDashboard(); }

  } catch(e) {
    errEl.textContent = 'Transaksi gagal: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Konfirmasi Pembelian'; btn.disabled = false;
  }
}

// ── SELL ────────────────────────────────────────────────
async function openSell(fundId) {
  window.currentFundId = fundId;
  const f    = (window.allFunds || []).find(x => x.id === fundId);
  if (!f) return;
  const nav  = getCurrentNav(fundId);
  const uid  = window.currentUser.id;

  const { data: holdingArr } = await sb.from('holdings')
    .select('id, units, invested')
    .eq('user_id', uid)
    .eq('fund_id', fundId)
    .limit(1);

  const h     = holdingArr?.[0] || null;
  const owned = h ? parseFloat(h.units) : 0;

  document.getElementById('modalSellType').textContent  = TYPE_LABEL[f.type] || f.type;
  document.getElementById('modalSellIcon').textContent  = f.icon;
  document.getElementById('modalSellName').textContent  = f.name;
  document.getElementById('modalSellNav').textContent   = 'NAV saat ini: Rp ' + fmt(nav);
  document.getElementById('sellOwnedUnits').textContent = owned.toFixed(4) + ' unit';
  document.getElementById('sellUnits').value            = '';
  document.getElementById('sellEstimate').textContent   = 'Rp 0';
  document.getElementById('sellError').style.display   = 'none';
  document.getElementById('sellError').textContent     = '';
  openModal('modalSell');
}

function calcSellAmount() {
  const units = parseFloat(document.getElementById('sellUnits').value) || 0;
  const nav   = getCurrentNav(window.currentFundId);
  document.getElementById('sellEstimate').textContent = 'Rp ' + fmtInt(units * nav);
}

// "Jual Semua" helper
function setSellMax() {
  const owned = parseFloat(document.getElementById('sellOwnedUnits').textContent) || 0;
  document.getElementById('sellUnits').value = owned.toFixed(4);
  calcSellAmount();
}

async function confirmSell() {
  const units  = parseFloat(document.getElementById('sellUnits').value) || 0;
  const f      = (window.allFunds || []).find(x => x.id === window.currentFundId);
  const errEl  = document.getElementById('sellError');
  errEl.style.display = 'none';
  
  if (!f || units <= 0) {
    errEl.textContent = 'Masukkan jumlah unit yang valid.';
    errEl.style.display = 'block'; return;
  }

  const uid = window.currentUser.id;
  const { data: holdingArr } = await sb.from('holdings')
    .select('id, units, invested')
    .eq('user_id', uid)
    .eq('fund_id', f.id)
    .limit(1);

  const h     = holdingArr?.[0] || null;
  const owned = h ? parseFloat(h.units) : 0;

  if (units > owned + 0.00001) { // Slight tolerance for floating point
    errEl.textContent = 'Unit tidak cukup. Anda hanya punya ' + owned.toFixed(4) + ' unit.';
    errEl.style.display = 'block'; return;
  }

  const btn = document.querySelector('#modalSell .btn-gold');
  btn.textContent = 'Memproses...'; btn.disabled = true;

  const nav        = getCurrentNav(f.id);
  const sellUnits  = Math.min(units, owned); // Clamp to owned
  const proceeds   = sellUnits * nav;
  const ratio      = owned > 0 ? sellUnits / owned : 0;
  const modalSold  = parseFloat(h.invested) * ratio;
  const newUnits   = owned - sellUnits;
  const newInvest  = parseFloat(h.invested) - modalSold;
  const newBalance = (window.currentProfile.balance || 0) + proceeds;

  try {
    // 1. Update atau hapus holding
    if (newUnits < 0.0001) {
      await sb.from('holdings').delete().eq('id', h.id);
    } else {
      await sb.from('holdings').update({
        units: newUnits, invested: Math.max(0, newInvest),
      }).eq('id', h.id);
    }

    // 2. Update balance
    await sb.from('profiles').update({ balance: newBalance }).eq('id', uid);

    // 3. Catat transaksi
    await sb.from('transactions').insert({
      user_id: uid, type: 'jual', amount: proceeds,
      fund_id: f.id, units: sellUnits, nav_price: nav,
      note: 'Jual ' + f.name + ' (' + sellUnits.toFixed(4) + ' unit)',
      status: 'sukses',
    });

    window.currentProfile.balance = newBalance;
    cacheInvalidate('profile:');
    closeModal('modalSell');
    toast('💸 Penjualan berhasil! Rp ' + fmtInt(proceeds) + ' masuk saldo.', 'success');
    refreshBalanceUI(newBalance);
    await refreshHoldingsCache();
    
    // Refresh views
    if (_currentView === 'portfolio') { _currentView = null; renderPortfolio(); }
    if (_currentView === 'dashboard') { _currentView = null; renderDashboard(); }

  } catch(e) {
    errEl.textContent = 'Transaksi gagal: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Konfirmasi Penjualan'; btn.disabled = false;
  }
}
