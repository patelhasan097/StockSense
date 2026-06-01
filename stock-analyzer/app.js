// ═══════════════════════════════════════════════════════
//  app.js  —  Main App Brain
//  Search → Fetch → Analyze → Render UI
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────
// Enter key on search input
// ─────────────────────────────────────────
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") searchStock();
});

// ─────────────────────────────────────────
// Quick pick buttons
// ─────────────────────────────────────────
function quickSearch(symbol) {
  document.getElementById("searchInput").value = symbol;
  searchStock();
}

// ─────────────────────────────────────────
// MAIN SEARCH FUNCTION
// ─────────────────────────────────────────
async function searchStock() {
  const raw = document.getElementById("searchInput").value.trim();
  if (!raw) return;

  // Check API keys
  if (CONFIG.TWELVE_DATA_KEY === "YOUR_TWELVE_DATA_API_KEY") {
    showError("⚠️ Pehle config.js mein apni API keys daalo! Twelve Data key missing hai.");
    return;
  }

  showLoading();

  try {
    const nseSymbol = toNSESymbol(raw);

    // ── Step 1: Price + History (parallel) ──
    setStep("lstep-price", "active");
    const [quote, candles] = await Promise.all([
      fetchQuote(nseSymbol),
      fetchHistory(nseSymbol, 365),
    ]);
    setStep("lstep-price", "done");

    // ── Step 2: Technical Indicators ──
    setStep("lstep-technical", "active");
    const technical = runTechnicalAnalysis(candles);
    setStep("lstep-technical", "done");

    // ── Step 3: Fundamentals ──
    setStep("lstep-fundamental", "active");
    const fundamentals = await fetchFundamentals(nseSymbol);
    setStep("lstep-fundamental", "done");

    // ── Step 4: Halal Screening ──
    setStep("lstep-halal", "active");
    const halal = runHalalScreening(
      nseSymbol,
      fundamentals.sector,
      fundamentals.totalDebt,
      fundamentals.marketCap
    );
    setStep("lstep-halal", "done");

    // ── Step 5: News ──
    setStep("lstep-news", "active");
    const news = await fetchNews(quote.name || raw, nseSymbol);
    setStep("lstep-news", "done");

    // ── Step 6: Gemini AI ──
    setStep("lstep-ai", "active");
    const ai = await runGeminiAnalysis({ quote, fundamentals, technical, halal, news });
    setStep("lstep-ai", "done");

    // ── Render everything ──
    hideLoading();
    renderResults({ quote, candles, technical, fundamentals, halal, news, ai });

  } catch (err) {
    console.error(err);
    showError(err.message || "Kuch galat hua. Symbol check karo aur dobara try karo.");
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════

function renderResults({ quote, candles, technical, fundamentals, halal, news, ai }) {
  // Show results container
  document.getElementById("resultsContainer").classList.remove("hidden");

  renderStockHeader(quote, halal, ai);
  renderMetricsStrip(quote, fundamentals);
  initChart(candles);
  renderTechnical(technical, quote);
  renderFundamentals(fundamentals, ai);
  renderHalal(halal, ai);
  renderNews(news, ai);
  renderAIReport(ai, quote);

  // Scroll to results
  setTimeout(() => {
    document.getElementById("resultsContainer").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ─────────────────────────────────────────
// 1. Stock Header
// ─────────────────────────────────────────
function renderStockHeader(quote, halal, ai) {
  setText("stockName",     quote.symbol?.replace(":NSE", "") || "—");
  setText("stockSector",   halal.sectorName || fundamentals?.sector || "—");
  setText("stockFullName", quote.name || "—");
  setText("exchangeBadge", quote.exchange || "NSE");

  // Price
  setText("currentPrice", `₹${quote.close?.toFixed(2)}`);
  const changeEl = document.getElementById("priceChange");
  const isPos    = quote.change >= 0;
  changeEl.textContent  = `${isPos ? "▲" : "▼"} ₹${Math.abs(quote.change).toFixed(2)} (${Math.abs(quote.percentChange).toFixed(2)}%)`;
  changeEl.className    = `price-change ${isPos ? "positive" : "negative"}`;
  setText("pricePrevClose", `Prev close: ₹${quote.previousClose?.toFixed(2)}`);

  // Halal badge in header
  const hBadge = document.getElementById("halalHeaderBadge");
  const v      = ai.halalVerdict;
  hBadge.textContent = v === "HALAL" ? "✅ Halal" : v === "HARAM" ? "❌ Haram" : "⚠️ Doubtful";
  hBadge.className   = `badge badge-${v.toLowerCase()}`;
}

// ─────────────────────────────────────────
// 2. Metrics Strip
// ─────────────────────────────────────────
function renderMetricsStrip(quote, fundamentals) {
  setText("high52w",   `₹${quote.fiftyTwoWeekHigh?.toFixed(2) || "N/A"}`);
  setText("low52w",    `₹${quote.fiftyTwoWeekLow?.toFixed(2)  || "N/A"}`);
  setText("volume",    formatVolume(quote.volume));
  setText("avgVolume", formatVolume(quote.avgVolume));
  setText("marketCap", formatMarketCap(fundamentals.marketCap));
}

// ─────────────────────────────────────────
// 3. Technical Analysis Section
// ─────────────────────────────────────────
function renderTechnical(tech, quote) {
  const cp = quote.close;

  // Overall signal badge
  const sigEl = document.getElementById("techOverallSignal");
  const sig   = tech.signals.overall;
  sigEl.textContent = sig;
  sigEl.className   = `signal-badge ${signalClass(sig)}`;

  // RSI
  if (tech.rsi !== null) {
    setText("rsiValue", tech.rsi.toFixed(1));
    const rsiEl = document.getElementById("rsiSignal");
    rsiEl.textContent = tech.signals.rsiSignal;
    rsiEl.className   = `ind-signal ${signalClass(tech.signals.rsiSignal)}`;
    // Move marker
    const pct = Math.min(Math.max(tech.rsi, 0), 100);
    document.getElementById("rsiMarker").style.left = `${pct}%`;
  }

  // MACD
  if (tech.macd) {
    setText("macdValue",      tech.macd.macd.toFixed(2));
    setText("macdSignalLine", tech.macd.signal.toFixed(2));
    setText("macdHistogram",  tech.macd.histogram.toFixed(2));
    const mEl = document.getElementById("macdSignal");
    mEl.textContent = tech.signals.macdSignal;
    mEl.className   = `ind-signal ${signalClass(tech.signals.macdSignal)}`;
  }

  // Moving Averages
  const mas = [
    { id: "ema20",  val: tech.ema20  },
    { id: "ema50",  val: tech.ema50  },
    { id: "ema200", val: tech.ema200 },
  ];
  mas.forEach(({ id, val }) => {
    setText(id,         val ? `₹${val.toFixed(2)}` : "N/A");
    const posEl = document.getElementById(`${id}pos`);
    if (val && cp) {
      const above = cp > val;
      posEl.textContent = above ? "Above" : "Below";
      posEl.className   = `ma-pos ${above ? "above" : "below"}`;
    } else {
      posEl.textContent = "N/A";
      posEl.className   = "ma-pos";
    }
  });
  const maEl = document.getElementById("maSignal");
  maEl.textContent = tech.signals.maSignal;
  maEl.className   = `ind-signal ${signalClass(tech.signals.maSignal)}`;

  // Bollinger Bands
  if (tech.bb) {
    setText("bbUpper",  `₹${tech.bb.upper.toFixed(2)}`);
    setText("bbMiddle", `₹${tech.bb.middle.toFixed(2)}`);
    setText("bbLower",  `₹${tech.bb.lower.toFixed(2)}`);
    setText("bbWidth",  `${tech.bb.bandwidth.toFixed(1)}%`);
    const bbEl = document.getElementById("bbSignal");
    bbEl.textContent = tech.signals.bbSignal;
    bbEl.className   = `ind-signal ${signalClass(tech.signals.bbSignal)}`;
  }

  // Support & Resistance
  const resDiv = document.getElementById("resistanceLevels");
  const supDiv = document.getElementById("supportLevels");
  resDiv.innerHTML = "";
  supDiv.innerHTML = "";

  if (tech.sr?.resistance?.length) {
    tech.sr.resistance.forEach(l => {
      const d = document.createElement("div");
      d.className   = "sr-level";
      d.textContent = `₹${l.toFixed(2)}`;
      resDiv.appendChild(d);
    });
  } else {
    resDiv.textContent = "Calculating…";
  }

  if (tech.sr?.support?.length) {
    tech.sr.support.forEach(l => {
      const d = document.createElement("div");
      d.className   = "sr-level";
      d.textContent = `₹${l.toFixed(2)}`;
      supDiv.appendChild(d);
    });
  } else {
    supDiv.textContent = "Calculating…";
  }

  // Volume
  setText("volumeSignal", tech.vol?.signal || "Volume data N/A");
}

// ─────────────────────────────────────────
// 4. Fundamentals
// ─────────────────────────────────────────
function renderFundamentals(f, ai) {
  // Grade badge
  const gradeEl = document.getElementById("fundamentalGrade");
  const g       = ai.fundamentalGrade;
  gradeEl.textContent = g;
  gradeEl.className   = `signal-badge ${g === "STRONG" || g === "GOOD" ? "sig-buy" : g === "WEAK" ? "sig-sell" : "sig-neutral"}`;

  // P/E
  setFund("peRatio", f.peRatio ? f.peRatio.toFixed(1) : "N/A",
    f.peRatio
      ? f.peRatio < 15 ? "Sasta (Under-valued)" : f.peRatio < 25 ? "Fair value" : "Mehenga (Over-valued)"
      : "Data N/A",
    f.peRatio
      ? f.peRatio < 15 ? "good" : f.peRatio < 25 ? "" : "bad"
      : "");

  // ROE
  setFund("roe", f.roe ? `${f.roe.toFixed(1)}%` : "N/A",
    f.roe
      ? f.roe >= 20 ? "Excellent (20%+)" : f.roe >= 15 ? "Achha (15%+)" : f.roe >= 10 ? "Average" : "Weak"
      : "Data N/A",
    f.roe ? (f.roe >= 15 ? "good" : f.roe >= 10 ? "" : "bad") : "");

  // Debt/Equity
  setFund("debtEquity", f.debtEquity ? f.debtEquity.toFixed(2) : "N/A",
    f.debtEquity !== null
      ? f.debtEquity < 0.5 ? "Debt-free practically" : f.debtEquity < 1 ? "Manageable debt" : f.debtEquity < 2 ? "Moderate debt" : "High debt ⚠️"
      : "Data N/A",
    f.debtEquity !== null
      ? f.debtEquity < 1 ? "good" : f.debtEquity < 2 ? "warn" : "bad"
      : "");

  // Revenue Growth
  setFund("revGrowth", f.revenueGrowth ? `${f.revenueGrowth.toFixed(1)}%` : "N/A",
    f.revenueGrowth
      ? f.revenueGrowth >= 20 ? "Strong growth 🚀" : f.revenueGrowth >= 10 ? "Good growth" : f.revenueGrowth >= 0 ? "Slow growth" : "Revenue gir rahi hai ⚠️"
      : "Data N/A",
    f.revenueGrowth
      ? f.revenueGrowth >= 15 ? "good" : f.revenueGrowth >= 0 ? "" : "bad"
      : "");

  // Profit Margin
  setFund("profitMargin", f.profitMargin ? `${f.profitMargin.toFixed(1)}%` : "N/A",
    f.profitMargin
      ? f.profitMargin >= 20 ? "Excellent margin" : f.profitMargin >= 10 ? "Good margin" : f.profitMargin >= 5 ? "Average" : "Thin margin ⚠️"
      : "Data N/A",
    f.profitMargin
      ? f.profitMargin >= 15 ? "good" : f.profitMargin >= 5 ? "" : "bad"
      : "");

  // EPS
  setFund("eps", f.eps ? `₹${f.eps.toFixed(2)}` : "N/A",
    f.eps
      ? f.eps > 0 ? "Positive EPS — profitable company" : "Negative EPS — loss mein hai"
      : "Data N/A",
    f.eps ? (f.eps > 0 ? "good" : "bad") : "");

  // Book Value
  setFund("bookValue", f.bookValue ? `₹${f.bookValue.toFixed(2)}` : "N/A", "", "");

  // Dividend Yield
  setFund("divYield", f.dividendYield ? `${f.dividendYield.toFixed(2)}%` : "0%",
    f.dividendYield && f.dividendYield > 0 ? "Dividend milta hai ✅" : "No dividend",
    f.dividendYield && f.dividendYield >= 1 ? "good" : "");
}

// ─────────────────────────────────────────
// 5. Halal Section
// ─────────────────────────────────────────
function renderHalal(halal, ai) {
  const verdict = ai.halalVerdict;

  // Main verdict badge
  const vBadge = document.getElementById("halalVerdictBadge");
  vBadge.textContent = verdict === "HALAL" ? "✅ HALAL" : verdict === "HARAM" ? "❌ HARAM" : "⚠️ DOUBTFUL";
  vBadge.className   = `halal-verdict-badge ${verdict.toLowerCase()}`;

  // Sector check
  updateHalalCheck("hcheck-sector", halal.checks.sector.icon, halal.checks.sector.text);
  // Debt check
  const debtIcon = halal.debtCheck.pass === true ? "✅" : halal.debtCheck.pass === false ? "❌" : "⚠️";
  updateHalalCheck("hcheck-debt", debtIcon, halal.debtCheck.text);
  // Income check
  const incIcon = halal.incomeCheck.pass === true ? "✅" : halal.incomeCheck.pass === false ? "❌" : "⚠️";
  updateHalalCheck("hcheck-income", incIcon, halal.incomeCheck.text);

  // Gemini halal text
  setText("halalAiText", ai.halalReason || "—");

  // Purification box
  if (ai.halalPurificationNeeded && ai.halalPurificationNote) {
    const pBox = document.getElementById("purificationBox");
    pBox.classList.remove("hidden");
    setText("purificationText", ai.halalPurificationNote);
  }
}

// ─────────────────────────────────────────
// 6. News Section
// ─────────────────────────────────────────
function renderNews(news, ai) {
  // Sentiment badge
  const sentEl = document.getElementById("newsSentimentBadge");
  const sent   = ai.newsSentiment;
  sentEl.textContent = `${sent === "POSITIVE" ? "📈" : sent === "NEGATIVE" ? "📉" : "➡️"} ${sent}`;
  sentEl.className   = `signal-badge ${sent === "POSITIVE" ? "sig-buy" : sent === "NEGATIVE" ? "sig-sell" : "sig-neutral"}`;

  const list = document.getElementById("newsList");
  list.innerHTML = "";

  if (!news || news.length === 0) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Is stock ke baare mein abhi news nahi mili.</div>`;
    return;
  }

  news.forEach(n => {
    // Simple sentiment: check title keywords
    const titleL = n.title.toLowerCase();
    const posBig = ["growth", "profit", "surge", "record", "rises", "gain", "bull", "upgrade", "strong", "beats"];
    const negBig = ["loss", "fall", "drop", "crash", "down", "weak", "cut", "miss", "concern", "fraud", "probe"];
    const isPos  = posBig.some(w => titleL.includes(w));
    const isNeg  = negBig.some(w => titleL.includes(w));
    const dotCls = isPos ? "positive" : isNeg ? "negative" : "neutral";

    const item = document.createElement("a");
    item.href            = n.url;
    item.target          = "_blank";
    item.rel             = "noopener noreferrer";
    item.className       = "news-item";
    item.innerHTML = `
      <div class="news-sentiment-dot ${dotCls}"></div>
      <div class="news-content">
        <div class="news-title">${escHtml(n.title)}</div>
        <div class="news-meta">
          <span class="news-source">${escHtml(n.source)}</span>
          <span>${timeAgo(n.publishedAt)}</span>
        </div>
      </div>
      <i class="ti ti-external-link" style="font-size:14px;color:var(--text-muted);flex-shrink:0;margin-top:2px" aria-hidden="true"></i>
    `;
    list.appendChild(item);
  });
}

// ─────────────────────────────────────────
// 7. Gemini AI Full Report
// ─────────────────────────────────────────
function renderAIReport(ai, quote) {
  // Final verdict badge (header)
  const fvBadge = document.getElementById("aiFinalVerdict");
  fvBadge.textContent = ai.finalVerdict;
  fvBadge.className   = `verdict-badge verdict-${ai.finalVerdict.toLowerCase()}`;

  // Long term outlook
  setText("aiLongTerm", ai.longTermOutlook || "—");

  // Swing trade setup
  const s = ai.swingTradeSetup;
  setText("aiEntryPrice",  s.entryZone   || "N/A");
  setText("aiTargetPrice", s.target1 && s.target2 ? `${s.target1} / ${s.target2}` : s.target1 || "N/A");
  setText("aiStopLoss",    s.stopLoss    || "N/A");
  setText("aiRiskReward",  s.riskReward  || "N/A");
  setText("aiSwingText",   s.setup       || "—");

  // Risk factors
  setText("aiRiskFactors", ai.riskFactors || "—");

  // Final verdict box
  const fvVal    = document.getElementById("fvValue");
  const fvReason = document.getElementById("fvReason");
  fvVal.textContent    = ai.finalVerdict;
  fvVal.className      = `fv-value ${ai.finalVerdict}`;
  fvReason.textContent = ai.finalReason || "—";

  // Color the verdict box
  const fvBox = document.getElementById("finalVerdictBox");
  fvBox.style.borderColor =
    ai.finalVerdict === "BUY"  ? "rgba(63,185,80,0.4)"  :
    ai.finalVerdict === "SELL" || ai.finalVerdict === "AVOID" ? "rgba(248,81,73,0.4)"  :
    "rgba(210,153,34,0.4)";
}

// ═══════════════════════════════════════════════════════
//  UI STATE HELPERS
// ═══════════════════════════════════════════════════════

function showLoading() {
  document.getElementById("loadingState").classList.remove("hidden");
  document.getElementById("errorState").classList.add("hidden");
  document.getElementById("resultsContainer").classList.add("hidden");
  // Reset steps
  document.querySelectorAll(".lstep").forEach(el => {
    el.className = "lstep";
    el.querySelector(".ti").className = "ti ti-circle";
  });
}

function hideLoading() {
  document.getElementById("loadingState").classList.add("hidden");
}

function showError(msg) {
  hideLoading();
  document.getElementById("errorState").classList.remove("hidden");
  setText("errorMsg", msg);
}

function clearError() {
  document.getElementById("errorState").classList.add("hidden");
}

function setStep(id, state) {
  const el  = document.getElementById(id);
  const ico = el.querySelector(".ti");
  el.className = `lstep ${state}`;
  if (state === "active") ico.className = "ti ti-loader-2";
  if (state === "done")   ico.className = "ti ti-circle-check";
}

// ═══════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "—";
}

function setFund(id, value, note, noteClass) {
  const valEl  = document.getElementById(id);
  const noteEl = document.getElementById(`${id.replace("Ratio","").replace("Growth","").replace("Margin","").replace("Yield","")}Note`);

  if (valEl) valEl.textContent = value;

  // Find the note element correctly
  const allNoteEls = document.querySelectorAll(".fund-note");
  const parent = valEl?.closest(".fund-item");
  if (parent) {
    const nEl = parent.querySelector(".fund-note");
    if (nEl) {
      nEl.textContent = note;
      nEl.className   = `fund-note ${noteClass || ""}`;
    }
  }
}

function updateHalalCheck(id, icon, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector(".hcheck-icon").textContent = icon;
  el.querySelector(".hcheck-detail").textContent = text;
}

function signalClass(signal) {
  if (!signal) return "sig-neutral";
  const s = signal.toUpperCase();
  if (s.includes("STRONG BUY") || s.includes("BUY"))   return "sig-buy";
  if (s.includes("STRONG SELL") || s.includes("SELL"))  return "sig-sell";
  if (s.includes("HOLD"))                               return "sig-hold";
  return "sig-neutral";
}

function escHtml(str) {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

// ═══════════════════════════════════════════════════════
//  PWA Helper Functions (added for mobile)
// ═══════════════════════════════════════════════════════

function goHome() {
  document.getElementById("resultsContainer").classList.add("hidden");
  document.getElementById("errorState").classList.add("hidden");
  document.getElementById("loadingState").classList.add("hidden");
  document.getElementById("searchInput").value = "";
  scrollToTop();
  setActiveBnav("bnav-home");
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  // Expand if collapsed
  if (el.classList.contains("collapsed")) {
    toggleCard(sectionId);
  }
  setTimeout(() => {
    const parent = el.closest(".card");
    if (parent) parent.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function setActiveBnav(id) {
  document.querySelectorAll(".bnav-btn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(id);
  if (btn) btn.classList.add("active");
}

function toggleCard(bodyId) {
  const body    = document.getElementById(bodyId);
  const icon    = document.getElementById(bodyId + "Icon");
  if (!body) return;
  const isOpen  = !body.classList.contains("collapsed");
  if (isOpen) {
    body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => {
      body.style.transition  = "max-height 0.3s ease, opacity 0.3s ease";
      body.style.maxHeight   = "0";
      body.style.opacity     = "0";
      body.style.overflow    = "hidden";
      body.classList.add("collapsed");
      if (icon) icon.classList.remove("open");
    });
  } else {
    body.style.transition  = "max-height 0.4s ease, opacity 0.3s ease";
    body.style.maxHeight   = body.scrollHeight + 1000 + "px";
    body.style.opacity     = "1";
    body.style.overflow    = "visible";
    body.classList.remove("collapsed");
    if (icon) icon.classList.add("open");
  }
}

// Update loading stock name display
const _origShowLoading = showLoading;
function showLoading() {
  _origShowLoading();
  const raw = document.getElementById("searchInput").value.trim().toUpperCase();
  const nameEl = document.getElementById("loadingStock");
  if (nameEl) nameEl.textContent = `Analyzing ${raw}…`;
  // Request wake lock while analyzing
  if (typeof requestWakeLock !== "undefined") requestWakeLock();
}

const _origHideLoading = hideLoading;
function hideLoading() {
  _origHideLoading();
  if (typeof releaseWakeLock !== "undefined") releaseWakeLock();
}

// Populate verdict bar after results
function updateVerdictBar(technical, ai) {
  const techSig = technical?.signals?.overall || "—";
  const fundGrade = ai?.fundamentalGrade || "—";
  const halalV = ai?.halalVerdict || "—";
  const finalV = ai?.finalVerdict || "—";

  setVbarItem("vbarTech",  techSig,   colorForSignal(techSig));
  setVbarItem("vbarFund",  fundGrade, colorForGrade(fundGrade));
  setVbarItem("vbarHalal", halalV,    colorForHalal(halalV));
  setVbarItem("vbarAI",    finalV,    colorForVerdict(finalV));
}

function setVbarItem(id, text, color) {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.style.color = color; }
}

function colorForSignal(s) {
  if (!s) return "var(--text-muted)";
  s = s.toUpperCase();
  if (s.includes("BUY"))  return "var(--green-text)";
  if (s.includes("SELL")) return "var(--red-text)";
  return "var(--amber-text)";
}
function colorForGrade(g) {
  if (!g) return "var(--text-muted)";
  if (g === "STRONG" || g === "GOOD") return "var(--green-text)";
  if (g === "WEAK") return "var(--red-text)";
  return "var(--amber-text)";
}
function colorForHalal(h) {
  if (h === "HALAL")    return "var(--green-text)";
  if (h === "HARAM")    return "var(--red-text)";
  if (h === "DOUBTFUL") return "var(--amber-text)";
  return "var(--text-muted)";
}
function colorForVerdict(v) {
  if (v === "BUY")   return "var(--green-text)";
  if (v === "SELL" || v === "AVOID") return "var(--red-text)";
  if (v === "HOLD")  return "var(--amber-text)";
  return "var(--text-muted)";
}

// Patch renderResults to also update verdict bar + open icons
const _origRenderResults = renderResults;
function renderResults(data) {
  _origRenderResults(data);
  updateVerdictBar(data.technical, data.ai);
  // Open collapse icons by default
  ["techBodyIcon","fundBodyIcon","halalBodyIcon","aiBodyIcon","newsBodyIcon"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
  });
}

// ═══════════════════════════════════════════════════════
//  SETUP / SETTINGS — API Keys Management
// ═══════════════════════════════════════════════════════

// Check on app load — show setup if keys missing
window.addEventListener("DOMContentLoaded", () => {
  if (!CONFIG.allSet()) {
    document.getElementById("setupOverlay").classList.remove("hidden");
  }
});

function saveSetup() {
  const twelve = document.getElementById("s_twelve").value.trim();
  const alpha  = document.getElementById("s_alpha").value.trim();
  const gnews  = document.getElementById("s_gnews").value.trim();
  const gemini = document.getElementById("s_gemini").value.trim();
  const errEl  = document.getElementById("setupError");

  if (!twelve || !alpha || !gnews || !gemini) {
    errEl.classList.remove("hidden");
    return;
  }
  errEl.classList.add("hidden");

  CONFIG.save({
    TWELVE_DATA_KEY:   twelve,
    ALPHA_VANTAGE_KEY: alpha,
    GNEWS_KEY:         gnews,
    GEMINI_KEY:        gemini,
  });

  document.getElementById("setupOverlay").classList.add("hidden");
  if (typeof showToast !== "undefined") showToast("✅ Keys save ho gayi! Ab search karo.");
}

function openSettings() {
  // Pre-fill current keys (masked)
  const fill = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };
  fill("u_twelve", CONFIG.TWELVE_DATA_KEY);
  fill("u_alpha",  CONFIG.ALPHA_VANTAGE_KEY);
  fill("u_gnews",  CONFIG.GNEWS_KEY);
  fill("u_gemini", CONFIG.GEMINI_KEY);
  document.getElementById("settingsOverlay").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsOverlay").classList.add("hidden");
}

function updateKeys() {
  CONFIG.save({
    TWELVE_DATA_KEY:   document.getElementById("u_twelve").value.trim(),
    ALPHA_VANTAGE_KEY: document.getElementById("u_alpha").value.trim(),
    GNEWS_KEY:         document.getElementById("u_gnews").value.trim(),
    GEMINI_KEY:        document.getElementById("u_gemini").value.trim(),
  });
  closeSettings();
  if (typeof showToast !== "undefined") showToast("✅ Keys update ho gayi!");
}

function clearAllKeys() {
  if (confirm("Saari API keys delete karni hain? App restart hoga.")) {
    CONFIG.clear();
    closeSettings();
    document.getElementById("setupOverlay").classList.remove("hidden");
  }
}

// Close overlays on background tap
document.getElementById("settingsOverlay")?.addEventListener("click", function(e) {
  if (e.target === this) closeSettings();
});
