// ═══════════════════════════════════════════════════════════
//  js/ticker.js — Live Ticker Bar
// ═══════════════════════════════════════════════════════════

function buildTickerHTML(funds) {
  const track = document.getElementById('tickerTrack');
  if (!track || !funds || !funds.length) return;

  const items = funds.map(f => {
    const nav  = getCurrentNav(f.id);
    const base = parseFloat(f.base_nav);
    const chg  = base > 0 ? ((nav - base) / base * 100) : 0;
    const cls  = chg >= 0 ? 'tick-up' : 'tick-down';
    const sign = chg >= 0 ? '+' : '';
    return `<span class="tick-item">
      <span class="tick-name">${f.id}</span>
      <span class="tick-val">Rp ${fmt(nav)}</span>
      <span class="${cls}">${sign}${chg.toFixed(2)}%</span>
    </span>`;
  }).join('');

  // Duplicate for seamless loop
  track.innerHTML = items + items;
}
