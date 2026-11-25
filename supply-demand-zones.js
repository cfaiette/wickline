// Supply and Demand Zones for Wickline
// Paste into Script editor and press Ctrl+Enter.
// Higher timeframe candles are aggregated from the chart's loaded candles.
indicator('Supply and Demand Zones MTF', { overlay: true, shortName: 'S&D MTF' });

const scale = input('Zone Difference Scale', 1.8, { min: 1, max: 100, step: 0.1 });
const showSupply = input('Supply zones', true);
const showDemand = input('Demand zones', true);
const showForming = input('Show forming zones', false);
const tf30 = input('30m', true);
const tf45 = input('45m', true);
const tf60 = input('1h', true);
const tf120 = input('2h', true);
const tf180 = input('3h', true);
const tf240 = input('4h', true);
const tfD = input('Daily', false);
const tfW = input('Weekly', false);

const frames = [
  ['30m', 1800, tf30], ['45m', 2700, tf45], ['1h', 3600, tf60],
  ['2h', 7200, tf120], ['3h', 10800, tf180], ['4h', 14400, tf240],
  ['D', 86400, tfD], ['W', 604800, tfW],
];
const chartSeconds = timeframe.seconds;
// Two active zones per direction per timeframe fit Wickline's 64 plot limit.
const slots = 2;

for (const [label, seconds, enabled] of frames) {
  if (!enabled || !chartSeconds || seconds < chartSeconds || seconds % chartSeconds !== 0) continue;
  const candles = [];
  for (let i = 0; i < n; i++) {
    // Weekly buckets start Monday 00:00 UTC. All other buckets use UTC boundaries.
    const offset = seconds === 604800 ? 259200 : 0;
    const key = Math.floor((time[i] + offset) / seconds) * seconds - offset;
    let c = candles[candles.length - 1];
    if (!c || c.key !== key) {
      c = { key, open: open[i], high: high[i], low: low[i], close: close[i], start: i, end: i };
      candles.push(c);
    } else {
      c.high = Math.max(c.high, high[i]);
      c.low = Math.min(c.low, low[i]);
      c.close = close[i];
      c.end = i;
    }
  }
  const zones = [];
  for (let j = 1; j < candles.length; j++) {
    // A candle is confirmed once a candle in the next bucket appears.
    if (!showForming && j === candles.length - 1) break;
    const a = candles[j - 1], b = candles[j];
    const oldBody = Math.abs(a.close - a.open), body = Math.abs(b.close - b.open);
    // A zero-sized prior body is treated as an infinite ratio, as in Pine.
    if (body === 0 || (oldBody !== 0 && body / oldBody < scale)) continue;
    if (showSupply && b.close < b.open && a.close >= a.open && a.close >= b.close && a.open <= b.open) {
      zones.push({ type: 'Supply', top: Math.max(a.high, b.high), bottom: a.open, start: a.start, confirmedAt: b.end });
    }
    if (showDemand && b.close > b.open && a.close <= a.open && a.close <= b.close && a.open >= b.open) {
      zones.push({ type: 'Demand', top: a.open, bottom: Math.min(a.low, b.low), start: a.start, confirmedAt: b.end });
    }
  }
  for (const kind of ['Supply', 'Demand']) {
    const active = zones.filter((z) => {
      if (z.type !== kind) return false;
      for (let i = z.confirmedAt + 1; i < n; i++) {
        if (kind === 'Supply' ? high[i] > z.top : low[i] < z.bottom) return false;
      }
      return true;
    }).slice(-slots);
    for (let k = 0; k < active.length; k++) {
      const z = active[k];
      const upper = Array(n).fill(NaN), lower = Array(n).fill(NaN);
      for (let i = z.start; i < n; i++) { upper[i] = z.top; lower[i] = z.bottom; }
      const edge = kind === 'Supply' ? 'rgba(242, 54, 69, 0.3)' : 'rgba(76, 175, 80, 0.3)';
      const shade = kind === 'Supply' ? 'rgba(242, 54, 69, 0.06)' : 'rgba(76, 175, 80, 0.06)';
      const top = plot(upper, { title: label + ' ' + kind + ' top ' + (k + 1), color: edge, style: 'step', width: 1, hideLegend: true });
      const bottom = plot(lower, { title: label + ' ' + kind + ' bottom ' + (k + 1), color: edge, style: 'step', width: 1, hideLegend: true });
      fill(top, bottom, { color: shade, label });
    }
  }
}
