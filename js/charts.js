// ═══════════════════════════════════════════════════════════
//  js/charts.js — Chart.js Wrappers
// ═══════════════════════════════════════════════════════════

window.charts = {};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

function destroyChart(key) {
  if (window.charts[key]) {
    try { window.charts[key].destroy(); } catch(e) {}
    delete window.charts[key];
  }
}

// ── Line chart: portfolio performance ───────────────────
function renderDashLineChart(currentTotal, balance) {
  destroyChart('dashLine');
  const ctx = document.getElementById('dashLineChart');
  if (!ctx) return;

  const base = currentTotal > 0 ? currentTotal * 0.82 : 500000;
  const labels = [], data = [];
  let val = base;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.getDate() + '/' + (d.getMonth() + 1));
    const noise = (Math.random() - 0.44) * 0.028;
    val = Math.max(base * 0.55, val * (1 + noise));
    data.push(parseFloat(val.toFixed(2)));
  }
  if (currentTotal > 0) data[data.length - 1] = currentTotal;

  window.charts.dashLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#c9a84c',
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          g.addColorStop(0,   'rgba(201,168,76,0.18)');
          g.addColorStop(1,   'rgba(201,168,76,0)');
          return g;
        },
        fill: true, tension: 0.45,
        pointRadius: 0, pointHoverRadius: 5,
        pointHoverBackgroundColor: '#c9a84c',
        borderWidth: 2,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#48587a', font: { size: 10, family: 'DM Mono' }, maxTicksLimit: 8 },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#48587a', font: { size: 10, family: 'DM Mono' },
            callback: v => 'Rp ' + (v / 1e6).toFixed(1) + 'jt'
          },
        }
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          backgroundColor: '#1e2b4d',
          borderColor: '#263a64',
          borderWidth: 1,
          titleColor: '#7a90c0',
          bodyColor: '#dce9ff',
          callbacks: {
            label: ctx => 'Portofolio: Rp ' + fmtInt(ctx.raw)
          }
        }
      }
    }
  });
}

// ── Donut chart: asset allocation ───────────────────────
function renderAllocChart(holdings) {
  destroyChart('alloc');
  const ctx = document.getElementById('dashDonutChart');
  if (!ctx) return;

  const alloc = { 'Pasar Uang': 0, 'Obligasi': 0, 'Saham': 0 };
  (holdings || []).forEach(h => {
    const f   = h.funds; if (!f) return;
    const val = parseFloat(h.units) * getCurrentNav(f.id);
    if      (f.type === 'pasar-uang') alloc['Pasar Uang'] += val;
    else if (f.type === 'obligasi')   alloc['Obligasi']   += val;
    else                               alloc['Saham']      += val;
  });

  const labels = Object.keys(alloc).filter(k => alloc[k] > 0);
  const values = labels.map(k => alloc[k]);
  const COLORS = ['#5aaeff', '#c9a84c', '#ff9f50'];
  const legendEl = document.getElementById('allocLegend');

  if (!values.length) {
    if (legendEl) legendEl.innerHTML = '<div class="empty-state" style="padding:20px;"><p>Belum ada alokasi.</p></div>';
    return;
  }

  window.charts.alloc = new Chart(ctx, {
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
      ...CHART_DEFAULTS,
      cutout: '68%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          backgroundColor: '#1e2b4d', borderColor: '#263a64', borderWidth: 1,
          callbacks: { label: ctx => ctx.label + ': Rp ' + fmtInt(ctx.raw) }
        }
      }
    }
  });

  if (legendEl) {
    const total = values.reduce((a, b) => a + b, 0);
    legendEl.innerHTML = labels.map((l, i) => `
      <div class="flex flex-between flex-center">
        <div class="flex flex-center gap-8">
          <span style="width:9px;height:9px;border-radius:3px;background:${COLORS[i]};display:inline-block;flex-shrink:0;"></span>
          <span class="text-sm text-muted">${l}</span>
        </div>
        <span class="text-sm font-mono">${(values[i] / total * 100).toFixed(1)}%</span>
      </div>`).join('');
  }
}
