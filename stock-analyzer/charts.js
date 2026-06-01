// ═══════════════════════════════════════════════════════
//  charts.js  —  Chart Rendering (TradingView lightweight-charts)
// ═══════════════════════════════════════════════════════

let mainChart     = null;
let candleSeries  = null;
let volumeSeries  = null;
let ema20Series   = null;
let ema50Series   = null;
let ema200Series  = null;
let allCandles    = [];   // full 1Y dataset
let currentTF     = "3M";

// ─────────────────────────────────────────
// 1. Init chart (first load)
// ─────────────────────────────────────────
function initChart(candles) {
  allCandles = candles;

  const container = document.getElementById("priceChart");
  container.innerHTML = ""; // clear previous

  mainChart = LightweightCharts.createChart(container, {
    width:  container.clientWidth,
    height: 340,
    layout: {
      background:  { type: "solid", color: "#161b22" },
      textColor:   "#8b949e",
    },
    grid: {
      vertLines:   { color: "#21262d" },
      horzLines:   { color: "#21262d" },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        width: 1,
        color: "#388bfd",
        style: LightweightCharts.LineStyle.Dashed,
      },
      horzLine: {
        width: 1,
        color: "#388bfd",
        style: LightweightCharts.LineStyle.Dashed,
      },
    },
    rightPriceScale: {
      borderColor:  "#30363d",
      scaleMargins: { top: 0.1, bottom: 0.25 },
    },
    timeScale: {
      borderColor:      "#30363d",
      timeVisible:      true,
      secondsVisible:   false,
      rightOffset:      5,
      barSpacing:       8,
    },
    handleScroll:  true,
    handleScale:   true,
  });

  // ── Candlestick ──
  candleSeries = mainChart.addCandlestickSeries({
    upColor:        "#3fb950",
    downColor:      "#f85149",
    borderUpColor:  "#3fb950",
    borderDownColor:"#f85149",
    wickUpColor:    "#3fb950",
    wickDownColor:  "#f85149",
  });

  // ── Volume (histogram in lower pane via overlay trick) ──
  volumeSeries = mainChart.addHistogramSeries({
    priceFormat:      { type: "volume" },
    priceScaleId:     "volume",
    scaleMargins:     { top: 0.8, bottom: 0 },
    color:            "rgba(56,139,253,0.3)",
  });

  // ── EMA Lines ──
  ema20Series = mainChart.addLineSeries({
    color:       "#e3b341",
    lineWidth:   1,
    priceLineVisible: false,
    lastValueVisible: true,
    title:       "EMA20",
  });
  ema50Series = mainChart.addLineSeries({
    color:       "#58a6ff",
    lineWidth:   1,
    priceLineVisible: false,
    lastValueVisible: true,
    title:       "EMA50",
  });
  ema200Series = mainChart.addLineSeries({
    color:       "#f78166",
    lineWidth:   1.5,
    priceLineVisible: false,
    lastValueVisible: true,
    title:       "EMA200",
  });

  // ── Resize observer ──
  new ResizeObserver(() => {
    if (mainChart) {
      mainChart.applyOptions({ width: container.clientWidth });
    }
  }).observe(container);

  // Apply default timeframe
  applyTimeframe(currentTF, candles);
}

// ─────────────────────────────────────────
// 2. Apply timeframe filter
// ─────────────────────────────────────────
function applyTimeframe(tf, candles) {
  currentTF = tf;
  const now   = new Date();
  let cutoff  = new Date();

  if (tf === "1W")      cutoff.setDate(now.getDate() - 7);
  else if (tf === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (tf === "3M") cutoff.setMonth(now.getMonth() - 3);
  else if (tf === "6M") cutoff.setMonth(now.getMonth() - 6);
  else                  cutoff = new Date("1970-01-01"); // 1Y = all

  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered  = (candles || allCandles).filter(c => c.time >= cutoffStr);

  if (filtered.length === 0) return;

  // Candle data
  candleSeries.setData(filtered);

  // Volume
  const volData = filtered.map(c => ({
    time:  c.time,
    value: c.volume,
    color: c.close >= c.open ? "rgba(63,185,80,0.35)" : "rgba(248,81,73,0.35)",
  }));
  volumeSeries.setData(volData);

  // EMA lines (calculate on filtered closes)
  const closes = filtered.map(c => c.close);
  const times  = filtered.map(c => c.time);

  setEMASeries(ema20Series,  calcEMA(closes, 20),  times, 20);
  setEMASeries(ema50Series,  calcEMA(closes, 50),  times, 50);
  setEMASeries(ema200Series, calcEMA(closes, 200), times, 200);

  mainChart.timeScale().fitContent();
}

// Helper: build {time, value} array for EMA
function setEMASeries(series, emaArr, times, period) {
  if (!emaArr || emaArr.length === 0) { series.setData([]); return; }
  const offset = times.length - emaArr.length;
  const data   = emaArr.map((v, i) => ({
    time:  times[i + offset],
    value: parseFloat(v.toFixed(2)),
  }));
  series.setData(data);
}

// ─────────────────────────────────────────
// 3. changeTimeframe — called by UI buttons
// ─────────────────────────────────────────
function changeTimeframe(tf) {
  // Update active button style
  document.querySelectorAll(".tf-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tf === tf);
  });
  applyTimeframe(tf, allCandles);
}
