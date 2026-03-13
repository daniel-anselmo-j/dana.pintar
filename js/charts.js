// ═══════════════════════════════════════════════════════════
//  js/charts.js — Chart.js Wrappers (fixed height)
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

  // Kunci ukuran canvas secara eksplisit SEBELUM Chart.js init
  const parent = canvas.parentElement;
  const W = parent.offsetWidth  || 400;
  const H = 200;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.display = 'block';

  // Generate data 30 hari
  const base   = currentTotal > 0 ? currentTotal * 0.80 : 1000000;
  const labels = [], data = [];
  let val = base;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    val = Math.max(base * 0.6, val * (1 + (Math.random() - 0.44) * 0.025));
    data.push(Math.round(val));
  }
  if (currentTotal > 0) data[data.length - 1] = Math.round(currentTotal);

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   'rgba(201,168,76,0.22)');
  grad.addColorStop(1,   'rgba(201,168,76,0.00)');

  window.charts.dashLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#c9a84c',
        backgroundColor: grad,
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#c9a84c',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: false,          // ← KUNCI: matikan responsive resize
      maintainAspectRatio: false,
      animation: false,           // ← tidak perlu animasi
      layout: { padding: { top: 6, right: 4, bottom: 2, left: 4 } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid:   { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          border: { display: false },
          ticks:  {
            color: '#48587a',
            font:  { size: 10, family: 'DM Mono' },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          grid:   { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          border: { display: false },
          ticks:  {
            color: '#48587a',
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
          backgroundColor: '#1e2b4d',
          borderColor: '#263a64',
          borderWidth: 1,
          titleColor: '#7a90c0',
          bodyColor: '#dce9ff',
          padding: 10,
          callbacks: {
            label: ctx => 'Portofolio: Rp ' + Math.round(ctx.raw).toLocaleString('id-ID')
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
  const COLORS  = ['#5aaeff', '#c9a84c', '#ff9f50'];
  const legendEl = document.getElementById('allocLegend');

  if (!values.length) {
    if (legendEl) legendEl.innerHTML = '<p style="text-align:center;color:var(--text3);font-size:12px;padding:12px 0;">Belum ada aset.</p>';
    return;
  }

  window.charts.alloc = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: COLORS,
        borderColor: '#121c32',
        borderWidth: 4,
        hoverOffset: 5,
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e2b4d',
          borderColor: '#263a64',
          borderWidth: 1,
          callbacks: {
            label: ctx => ctx.label + ': Rp ' + Math.round(ctx.raw).toLocaleString('id-ID')
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
          <span style="width:9px;height:9px;border-radius:3px;background:${COLORS[i]};display:inline-block;"></span>
          <span style="font-size:12px;color:var(--text2);">${l}</span>
        </div>
        <span style="font-size:12px;font-family:'DM Mono',monospace;">${(values[i]/total*100).toFixed(1)}%</span>
      </div>`).join('');
  }
}
