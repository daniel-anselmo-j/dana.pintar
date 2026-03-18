// ═══════════════════════════════════════════════════════════
//  js/charts.js — Chart.js Wrappers
// ═══════════════════════════════════════════════════════════

window.charts = {};

function destroyChart(key) {
  if (window.charts[key]) {
    try { window.charts[key].destroy(); } catch(e) {}
    delete window.charts[key];
  }
}

// ── Line chart ───────────────────────────────────────────
function renderDashLineChart(currentTotal) {
  destroyChart('dashLine');
  const canvas = document.getElementById('dashLineChart');
  if (!canvas) return;

  const parent = canvas.parentElement;
  const W = parent.offsetWidth  || 400;
  const H = 200;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.display = 'block';

  // Simulasi data 30 hari dengan seed dari total
  const base   = currentTotal > 0 ? currentTotal * 0.82 : 1000000;
  const labels = [], data = [];
  let val = base;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    // Slight upward trend + noise
    val = Math.max(base * 0.65, val * (1 + (Math.random() - 0.46) * 0.022));
    data.push(Math.round(val));
  }
  if (currentTotal > 0) data[data.length - 1] = Math.round(currentTotal);

  const ctx  = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   'rgba(201,168,76,0.20)');
  grad.addColorStop(0.7, 'rgba(201,168,76,0.04)');
  grad.addColorStop(1,   'rgba(201,168,76,0.00)');

  // Warna garis: hijau jika untung, merah jika rugi
  const isUp = data[data.length-1] >= data[0];
  const lineColor = isUp ? '#2de0a5' : '#ff6b8a';
  const gradUp = ctx.createLinearGradient(0, 0, 0, H);
  if (isUp) {
    gradUp.addColorStop(0,   'rgba(45,224,165,0.18)');
    gradUp.addColorStop(1,   'rgba(45,224,165,0.00)');
  } else {
    gradUp.addColorStop(0,   'rgba(255,107,138,0.15)');
    gradUp.addColorStop(1,   'rgba(255,107,138,0.00)');
  }

  window.charts.dashLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: lineColor,
        backgroundColor: gradUp,
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#121c32',
        pointHoverBorderWidth: 2,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      layout: { padding: { top: 6, right: 4, bottom: 2, left: 4 } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid:   { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          border: { display: false },
          ticks:  {
            color: '#3e5070',
            font:  { size: 10, family: 'DM Mono' },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          grid:   { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          border: { display: false },
          ticks:  {
            color: '#3e5070',
            font:  { size: 10, family: 'DM Mono' },
            maxTicksLimit: 5,
            callback: v => {
              if (v >= 1e9) return 'Rp' + (v/1e9).toFixed(1) + 'M';
              if (v >= 1e6) return 'Rp' + (v/1e6).toFixed(1) + 'jt';
              if (v >= 1e3) return 'Rp' + (v/1e3).toFixed(0) + 'rb';
              return 'Rp' + v;
            }
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#16203a',
          borderColor: '#243858',
          borderWidth: 1,
          titleColor: '#6a82b8',
          bodyColor: '#d8e6ff',
          padding: 10,
          callbacks: {
            label: ctx => '  Portofolio: Rp ' + Math.round(ctx.raw).toLocaleString('id-ID')
          }
        }
      }
    }
  });
}

// ── Donut chart ──────────────────────────────────────────
function renderAllocChart(holdings) {
  destroyChart('alloc');
  const canvas = document.getElementById('dashDonutChart');
  if (!canvas) return;

  const parent = canvas.parentElement;
  const W = parent.offsetWidth || 300;
  const H = 160;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.display = 'block';

  const alloc = { 'Pasar Uang': 0, 'Obligasi': 0, 'Saham': 0 };
  (holdings || []).forEach(h => {
    const fid = h.fund_id || h.funds?.id;
    const f   = h.funds || (window.allFunds||[]).find(x => x.id === fid);
    if (!f) return;
    const val = parseFloat(h.units) * getCurrentNav(fid);
    if      (f.type === 'pasar-uang') alloc['Pasar Uang'] += val;
    else if (f.type === 'obligasi')   alloc['Obligasi']   += val;
    else                               alloc['Saham']      += val;
  });

  const labels = Object.keys(alloc).filter(k => alloc[k] > 0);
  const values = labels.map(k => alloc[k]);
  const COLORS  = ['#5aaeff', '#c9a84c', '#2de0a5'];
  const legendEl = document.getElementById('allocLegend');

  if (!values.length) {
    if (legendEl) legendEl.innerHTML = `
      <div style="text-align:center;padding:16px 0;">
        <p style="color:var(--text3);font-size:12px;">Belum ada aset.</p>
        <button class="btn-sm" style="margin-top:10px;font-size:11px;" onclick="switchView('pasar-uang')">Mulai Investasi</button>
      </div>`;
    return;
  }

  window.charts.alloc = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: COLORS.slice(0, labels.length),
        borderColor: '#0d1424',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#16203a',
          borderColor: '#243858',
          borderWidth: 1,
          callbacks: {
            label: ctx => '  ' + ctx.label + ': Rp ' + Math.round(ctx.raw).toLocaleString('id-ID')
          }
        }
      }
    }
  });

  if (legendEl) {
    const total = values.reduce((a, b) => a + b, 0);
    legendEl.innerHTML = labels.map((l, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:9px;height:9px;border-radius:3px;background:${COLORS[i]};display:inline-block;flex-shrink:0;"></span>
          <span style="font-size:12px;color:var(--text2);">${l}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text);">${(values[i]/total*100).toFixed(1)}%</span>
          <div style="font-size:10px;color:var(--text3);">Rp ${fmtAUM(values[i])}</div>
        </div>
      </div>`).join('');
  }
}
