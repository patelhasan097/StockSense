// ═══════════════════════════════════════════════════════
//  technical.js  —  Pure JS Technical Indicator Engine
//  Input: Array of candles  { time, open, high, low, close, volume }
//  No external API needed — sab kuch yahan calculate hoga
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────
// 1. EMA — Exponential Moving Average
// ─────────────────────────────────────────
function calcEMA(closes, period) {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ─────────────────────────────────────────
// 2. SMA — Simple Moving Average
// ─────────────────────────────────────────
function calcSMA(closes, period) {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

// ─────────────────────────────────────────
// 3. RSI — Relative Strength Index (14)
// ─────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsiArr = [];

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArr.push(100 - 100 / (1 + rs));
  }

  // Initial value for period
  const initRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRSI = 100 - 100 / (1 + initRS);

  return {
    value: rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : firstRSI,
    history: rsiArr,
  };
}

// ─────────────────────────────────────────
// 4. MACD — (12, 26, 9)
// ─────────────────────────────────────────
function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (ema12.length === 0 || ema26.length === 0) return null;

  // Align lengths (ema26 is shorter)
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((v, i) => ema12[i + offset] - v);

  const signalLine = calcEMA(macdLine, 9);
  if (signalLine.length === 0) return null;

  const sigOffset = macdLine.length - signalLine.length;
  const lastMACD   = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const lastHist   = lastMACD - lastSignal;

  return {
    macd:      lastMACD,
    signal:    lastSignal,
    histogram: lastHist,
    macdLine,
    signalLine,
  };
}

// ─────────────────────────────────────────
// 5. Bollinger Bands — (20, 2)
// ─────────────────────────────────────────
function calcBollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = mean + stdDev * sd;
  const lower = mean - stdDev * sd;
  return {
    upper,
    middle: mean,
    lower,
    bandwidth: ((upper - lower) / mean) * 100,
  };
}

// ─────────────────────────────────────────
// 6. Support & Resistance  (pivot-based)
// ─────────────────────────────────────────
function calcSupportResistance(candles, lookback = 60) {
  const recent = candles.slice(-lookback);
  const highs  = recent.map(c => c.high);
  const lows   = recent.map(c => c.low);

  const pivotHighs = [];
  const pivotLows  = [];

  for (let i = 2; i < recent.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      pivotHighs.push(highs[i]);
    }
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      pivotLows.push(lows[i]);
    }
  }

  // Cluster nearby levels (within 1%)
  function cluster(levels) {
    const sorted = [...new Set(levels)].sort((a, b) => b - a);
    const clusters = [];
    for (const l of sorted) {
      const found = clusters.find(c => Math.abs(c - l) / c < 0.015);
      if (!found) clusters.push(l);
    }
    return clusters.slice(0, 3);
  }

  return {
    resistance: cluster(pivotHighs),
    support:    cluster(pivotLows),
  };
}

// ─────────────────────────────────────────
// 7. Volume Analysis
// ─────────────────────────────────────────
function analyzeVolume(candles) {
  const recent = candles.slice(-20);
  const avgVol = recent.slice(0, 19).reduce((s, c) => s + c.volume, 0) / 19;
  const lastVol = candles[candles.length - 1].volume;
  const lastClose = candles[candles.length - 1].close;
  const prevClose = candles[candles.length - 2].close;
  const priceUp = lastClose > prevClose;
  const ratio = lastVol / avgVol;

  if (ratio > 1.5 && priceUp)  return { signal: "📈 High volume + price up = Strong bullish move", type: "bullish" };
  if (ratio > 1.5 && !priceUp) return { signal: "📉 High volume + price down = Strong selling pressure", type: "bearish" };
  if (ratio < 0.7 && priceUp)  return { signal: "⚠️ Price up but low volume = Weak move, caution", type: "neutral" };
  if (ratio < 0.7 && !priceUp) return { signal: "📉 Price down on low volume = Sellers weak", type: "neutral" };
  return { signal: "➡️ Volume normal — no strong signal", type: "neutral" };
}

// ─────────────────────────────────────────
// 8. Golden / Death Cross detector
// ─────────────────────────────────────────
function detectCross(closes) {
  if (closes.length < 210) return null;
  const ema50  = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const offset = ema50.length - ema200.length;
  const len = ema200.length;
  const last50  = ema50[len + offset - 1];
  const last200 = ema200[len - 1];
  const prev50  = ema50[len + offset - 2];
  const prev200 = ema200[len - 2];

  if (prev50 < prev200 && last50 > last200) return { type: "golden", label: "🌟 Golden Cross — Bullish signal!" };
  if (prev50 > prev200 && last50 < last200) return { type: "death",  label: "💀 Death Cross — Bearish signal!" };
  if (last50 > last200) return { type: "above", label: "✅ EMA50 above EMA200 — Uptrend" };
  return { type: "below", label: "🔴 EMA50 below EMA200 — Downtrend" };
}

// ─────────────────────────────────────────
// 9. MASTER FUNCTION — run everything
// ─────────────────────────────────────────
function runTechnicalAnalysis(candles) {
  const closes  = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];

  // EMA values
  const ema20arr  = calcEMA(closes, 20);
  const ema50arr  = calcEMA(closes, 50);
  const ema200arr = calcEMA(closes, 200);
  const ema20  = ema20arr.length  ? ema20arr[ema20arr.length - 1]   : null;
  const ema50  = ema50arr.length  ? ema50arr[ema50arr.length - 1]   : null;
  const ema200 = ema200arr.length ? ema200arr[ema200arr.length - 1] : null;

  const rsi   = calcRSI(closes);
  const macd  = calcMACD(closes);
  const bb    = calcBollingerBands(closes);
  const sr    = calcSupportResistance(candles);
  const vol   = analyzeVolume(candles);
  const cross = detectCross(closes);

  // ── Overall Signal Score ──
  let bullCount = 0, bearCount = 0;

  // RSI
  let rsiSignal = "NEUTRAL";
  if (rsi) {
    if (rsi.value < 30)      { rsiSignal = "BUY (Oversold)";  bullCount++; }
    else if (rsi.value > 70) { rsiSignal = "SELL (Overbought)"; bearCount++; }
    else if (rsi.value < 50) { rsiSignal = "NEUTRAL (Bearish zone)"; }
    else                     { rsiSignal = "NEUTRAL (Bullish zone)"; bullCount += 0.5; }
  }

  // MACD
  let macdSignal = "NEUTRAL";
  if (macd) {
    if (macd.macd > macd.signal && macd.histogram > 0) { macdSignal = "BUY";  bullCount++; }
    else if (macd.macd < macd.signal)                  { macdSignal = "SELL"; bearCount++; }
    else                                               { macdSignal = "NEUTRAL"; }
  }

  // MA Signal
  let maSignal = "NEUTRAL";
  if (ema20 && ema50 && currentPrice) {
    if (currentPrice > ema20 && currentPrice > ema50)   { maSignal = "BUY (Above MAs)"; bullCount++; }
    else if (currentPrice < ema20 && currentPrice < ema50) { maSignal = "SELL (Below MAs)"; bearCount++; }
    else { maSignal = "NEUTRAL (Mixed)"; }
  }

  // BB Signal
  let bbSignal = "NEUTRAL";
  if (bb) {
    if (currentPrice < bb.lower)  { bbSignal = "BUY (Oversold)";  bullCount++; }
    else if (currentPrice > bb.upper) { bbSignal = "SELL (Overbought)"; bearCount++; }
    else if (currentPrice > bb.middle) { bbSignal = "NEUTRAL (Upper half)"; bullCount += 0.5; }
    else { bbSignal = "NEUTRAL (Lower half)"; }
  }

  // Volume
  if (vol.type === "bullish") bullCount++;
  if (vol.type === "bearish") bearCount++;

  // Overall
  let overallSignal = "NEUTRAL";
  if (bullCount >= 3)      overallSignal = "STRONG BUY";
  else if (bullCount >= 2) overallSignal = "BUY";
  else if (bearCount >= 3) overallSignal = "STRONG SELL";
  else if (bearCount >= 2) overallSignal = "SELL";
  else                     overallSignal = "NEUTRAL";

  return {
    currentPrice,
    ema20, ema50, ema200,
    rsi:   rsi   ? parseFloat(rsi.value.toFixed(2)) : null,
    macd:  macd  ? { macd: macd.macd, signal: macd.signal, histogram: macd.histogram } : null,
    bb,
    sr,
    vol,
    cross,
    signals: { rsiSignal, macdSignal, maSignal, bbSignal, overall: overallSignal },
    bullCount, bearCount,
  };
}

// ─────────────────────────────────────────
// Helper — Format price to 2 decimals
// ─────────────────────────────────────────
function fmt(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return "N/A";
  return parseFloat(n).toFixed(decimals);
}
