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

// ── Line chart: portfolio performance (30 hari) ─────────
function renderDashLineChart(currentTotal, balance) {
  destroyChart('dashLine');
  const canvas = document.getElementById('dashLineChart');
  if (!canvas) return;

  // FIX: set explicit pixel height supaya tidak memanjang ke bawah
  const wrapper = canvas.parentElement;
  canvas.style.height = '200px';
  canvas.style.maxHeight = '200px';
  canvas.style.width = '100%';

  const base = currentTotal > 0 ? currentTotal * 0.82 : 1000000;
  const labels = [], data = [];
  let val = base;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    val = Math.max(base * 0.6, val * (1 + (Math.random() - 0.44) * 0.028));
    data.push(Math.round(val));
  }
  if (currentTotal > 0) data[data.length - 1] = Math.round(currentTotal);

  window.charts.dashLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#c9a84c',
        backgroundColor: function(ctx) {
          const c = ctx.chart.ctx;
          if (!c) return 'transparent';
          const g = c.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0,   'rgba(201,168,76,0.20)');
          g.addColorStop(1,   'rgba(201,168,76,0.00)');
          return g;
        },
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#c9a84c',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600 },
      layout: { padding: { top: 8, bottom: 4 } },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#48587a',
            font: { size: 10, family: 'DM Mono' },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#48587a',
            font: { size: 10, family: 'DM Mono' },
            maxTicksLimit: 5,
            callback: v => {
              if (v >= 1e9) return 'Rp' + (v/1e9).toFixed(1) + 'M';
              if (v >= 1e6) return 'Rp' + (v/1e6).toFixed(1) + 'jt';
              if (v >= 1e3) return 'Rp' + (v/1e3).toFixed(0) + 'rb';
              return 'Rp' + v;
            }
          },
          border: { display: false },
        }
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

// ── Donut chart: asset allocation ───────────────────────
function renderAllocChart(holdings) {
  destroyChart('alloc');
  const canvas = document.getElementById('dashDonutChart');
  if (!canvas) return;

  canvas.style.height = '160px';
  canvas.style.maxHeight = '160px';
  canvas.style.width = '100%';

  const alloc = { 'Pasar Uang': 0, 'Obligasi': 0, 'Saham': 0 };
  (holdings || []).forEach(h => {
    const f   = h.funds; if (!f) return;
    const val = parseFloat(h.units) * getCurrentNav(f.id || h.fund_id);
    if      (f.type === 'pasar-uang') alloc['Pasar Uang'] += val;
    else if (f.type === 'obligasi')   alloc['Obligasi']   += val;
    else                               alloc['Saham']      += val;
  });

  const labels = Object.keys(alloc).filter(k => alloc[k] > 0);
  const values = labels.map(k => alloc[k]);
  const COLORS  = ['#5aaeff', '#c9a84c', '#ff9f50'];
  const legendEl = document.getElementById('allocLegend');

  if (!values.length) {
    if (legendEl) legendEl.innerHTML = '<p class="text-muted text-sm" style="text-align:center;padding:12px;">Belum ada alokasi aset.</p>';
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
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 600 },
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
          <span style="width:9px;height:9px;border-radius:3px;background:${COLORS[i]};display:inline-block;flex-shrink:0;"></span>
          <span style="font-size:12px;color:var(--text2);">${l}</span>
        </div>
        <span style="font-size:12px;font-family:'DM Mono',monospace;">${(values[i]/total*100).toFixed(1)}%</span>
      </div>`).join('');
  }
}
