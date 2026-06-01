// ═══════════════════════════════════════════════════════
//  api.js  —  All external API calls
//  Twelve Data  |  Alpha Vantage  |  GNews
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────
// Helper: NSE symbol format
// "reliance" → "RELIANCE:NSE"
// ─────────────────────────────────────────
function toNSESymbol(input) {
  const clean = input.trim().toUpperCase()
    .replace(/\s+/g, "")
    .replace(/:NSE$/, "")
    .replace(/:BSE$/, "");

  // Common name aliases → NSE ticker
  const aliases = {
    "RELIANCE INDUSTRIES": "RELIANCE",
    "TATA CONSULTANCY":    "TCS",
    "TATA MOTORS":         "TATAMOTORS",
    "INFOSYS":             "INFY",
    "HDFC BANK":           "HDFCBANK",
    "SUN PHARMA":          "SUNPHARMA",
    "DR REDDYS":           "DRREDDY",
    "DRREDDY'S":           "DRREDDY",
    "BHARTI AIRTEL":       "BHARTIARTL",
    "AIRTEL":              "BHARTIARTL",
    "STATE BANK":          "SBIN",
    "ASIAN PAINTS":        "ASIANPAINT",
    "HINDUSTAN UNILEVER":  "HINDUNILVR",
    "HUL":                 "HINDUNILVR",
    "L&T":                 "LT",
    "MAHINDRA":            "M&M",
    "BAJAJ FINANCE":       "BAJFINANCE",
    "BAJAJ FINSERV":       "BAJAJFINSV",
    "ULTRATECH":           "ULTRACEMCO",
    "ADANI ENTERPRISES":   "ADANIENT",
    "ADANI PORTS":         "ADANIPORTS",
    "ADANI GREEN":         "ADANIGREEN",
    "ZOMATO":              "ZOMATO",
    "DMART":               "DMART",
    "AVENUE SUPERMARTS":   "DMART",
    "WIPRO":               "WIPRO",
    "COAL INDIA":          "COALINDIA",
    "OIL AND NATURAL GAS": "ONGC",
    "NTPC":                "NTPC",
    "POWER GRID":          "POWERGRID",
    "TITAN":               "TITAN",
    "NESTLE":              "NESTLEIND",
    "BRITANNIA":           "BRITANNIA",
    "DABUR":               "DABUR",
    "MARICO":              "MARICO",
    "COLGATE":             "COLPAL",
    "CIPLA":               "CIPLA",
    "LUPIN":               "LUPIN",
    "BIOCON":              "BIOCON",
    "HAVELLS":             "HAVELLS",
    "VOLTAS":              "VOLTAS",
    "DIXON":               "DIXON",
    "PIGEON":              "TTKHLTCARE",
    "APOLLO HOSPITALS":    "APOLLOHOSP",
    "FORTIS":              "FORTIS",
    "MAX HEALTHCARE":      "MAXHEALTH",
    "PIDILITE":            "PIDILITIND",
  };

  if (aliases[clean]) return aliases[clean] + ":NSE";
  return clean + ":NSE";
}

// ─────────────────────────────────────────
// 1. TWELVE DATA — Real-time price quote
// ─────────────────────────────────────────
async function fetchQuote(nseSymbol) {
  const url = `${APP.TWELVE_BASE}/quote?symbol=${encodeURIComponent(nseSymbol)}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();

  if (data.status === "error" || !data.close) {
    throw new Error(data.message || "Quote fetch failed — symbol check karo");
  }

  return {
    symbol:        data.symbol,
    name:          data.name,
    exchange:      data.exchange,
    currency:      data.currency,
    close:         parseFloat(data.close),
    open:          parseFloat(data.open),
    high:          parseFloat(data.high),
    low:           parseFloat(data.low),
    previousClose: parseFloat(data.previous_close),
    change:        parseFloat(data.change),
    percentChange: parseFloat(data.percent_change),
    volume:        parseInt(data.volume),
    fiftyTwoWeekHigh: parseFloat(data["fifty_two_week"]?.high || 0),
    fiftyTwoWeekLow:  parseFloat(data["fifty_two_week"]?.low  || 0),
    avgVolume:     parseInt(data.average_volume || 0),
  };
}

// ─────────────────────────────────────────
// 2. TWELVE DATA — Historical OHLCV
//    Returns candle array sorted oldest→newest
// ─────────────────────────────────────────
async function fetchHistory(nseSymbol, outputSize = 365) {
  const url = `${APP.TWELVE_BASE}/time_series?symbol=${encodeURIComponent(nseSymbol)}&interval=1day&outputsize=${outputSize}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
  const res  = await fetch(url);
  const data = await res.json();

  if (data.status === "error" || !data.values) {
    throw new Error(data.message || "History fetch failed");
  }

  // API returns newest first — reverse it
  const candles = data.values.reverse().map(v => ({
    time:   v.datetime,        // "YYYY-MM-DD"
    open:   parseFloat(v.open),
    high:   parseFloat(v.high),
    low:    parseFloat(v.low),
    close:  parseFloat(v.close),
    volume: parseInt(v.volume),
  }));

  return candles;
}

// ─────────────────────────────────────────
// 3. ALPHA VANTAGE — Company Overview
//    P/E, ROE, EPS, Debt, Revenue, Profit etc.
// ─────────────────────────────────────────
async function fetchFundamentals(symbol) {
  // Alpha Vantage uses plain symbol without exchange suffix
  const cleanSymbol = symbol.replace(":NSE", "").replace(":BSE", "");
  // For Indian stocks, Alpha Vantage often needs BSE/NSE prefix
  const avSymbol = cleanSymbol;

  const url = `${APP.ALPHA_BASE}?function=OVERVIEW&symbol=${avSymbol}&apikey=${CONFIG.ALPHA_VANTAGE_KEY}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    // Empty or error response
    if (!data || !data.Symbol || Object.keys(data).length < 5) {
      return getFundamentalFallback(cleanSymbol);
    }

    const marketCap = parseFloat(data.MarketCapitalization) || null;
    const totalDebt = parseFloat(data.TotalDebt) || null;

    return {
      name:          data.Name          || cleanSymbol,
      sector:        data.Sector        || "Unknown",
      industry:      data.Industry      || "Unknown",
      description:   data.Description  || "",
      peRatio:       parseFloat(data.PERatio)             || null,
      pegRatio:      parseFloat(data.PEGRatio)            || null,
      eps:           parseFloat(data.EPS)                 || null,
      roe:           parseFloat(data.ReturnOnEquityTTM) * 100 || null,
      roa:           parseFloat(data.ReturnOnAssetsTTM) * 100 || null,
      debtEquity:    parseFloat(data.DebtToEquityRatio)   || null,
      profitMargin:  parseFloat(data.ProfitMargin) * 100  || null,
      revenueGrowth: parseFloat(data.RevenueGrowthYOY) * 100 || null,
      bookValue:     parseFloat(data.BookValue)           || null,
      priceToBook:   parseFloat(data.PriceToBookRatio)    || null,
      dividendYield: parseFloat(data.DividendYield) * 100 || null,
      marketCap,
      totalDebt,
      sharesOutstanding: parseFloat(data.SharesOutstanding) || null,
      quarterlyEarningsGrowth: parseFloat(data.QuarterlyEarningsGrowthYOY) * 100 || null,
      analystTargetPrice: parseFloat(data.AnalystTargetPrice) || null,
      beta:          parseFloat(data.Beta) || null,
      fiftyTwoWeekHigh: parseFloat(data["52WeekHigh"]) || null,
      fiftyTwoWeekLow:  parseFloat(data["52WeekLow"])  || null,
    };
  } catch (e) {
    console.warn("Alpha Vantage error:", e);
    return getFundamentalFallback(cleanSymbol);
  }
}

// Fallback if Alpha Vantage doesn't have data (common for Indian stocks)
function getFundamentalFallback(symbol) {
  const known = KNOWN_STOCKS[symbol.toUpperCase()];
  return {
    name:    symbol,
    sector:  known ? known.sector : "Unknown",
    industry: known ? known.sector : "Unknown",
    peRatio: null, eps: null, roe: null,
    debtEquity: null, profitMargin: null,
    revenueGrowth: null, bookValue: null,
    dividendYield: null, marketCap: null,
    totalDebt: null, beta: null,
    _fallback: true,
  };
}

// ─────────────────────────────────────────
// 4. GNEWS — Latest news about the stock
// ─────────────────────────────────────────
async function fetchNews(companyName, symbol) {
  const query   = encodeURIComponent(`${companyName} stock NSE`);
  const url = `${APP.GNEWS_BASE}/search?q=${query}&lang=en&country=in&max=8&apikey=${CONFIG.GNEWS_KEY}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.articles || data.articles.length === 0) {
      return [];
    }

    return data.articles.map(a => ({
      title:       a.title,
      description: a.description || "",
      url:         a.url,
      source:      a.source?.name || "Unknown",
      publishedAt: a.publishedAt,
      image:       a.image || null,
    }));
  } catch (e) {
    console.warn("GNews error:", e);
    return [];
  }
}

// ─────────────────────────────────────────
// 5. TWELVE DATA — Company logo (bonus)
// ─────────────────────────────────────────
async function fetchLogo(symbol) {
  try {
    const cleanSymbol = symbol.replace(":NSE", "");
    const url = `${APP.TWELVE_BASE}/logo?symbol=${cleanSymbol}&apikey=${CONFIG.TWELVE_DATA_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// 6. Format helpers
// ─────────────────────────────────────────
function formatMarketCap(val) {
  if (!val) return "N/A";
  if (val >= 1e12) return `₹${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `₹${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e7)  return `₹${(val / 1e7).toFixed(2)}Cr`;
  return `₹${val.toFixed(0)}`;
}

function formatVolume(val) {
  if (!val) return "N/A";
  if (val >= 1e7) return `${(val / 1e7).toFixed(2)}Cr`;
  if (val >= 1e5) return `${(val / 1e5).toFixed(2)}L`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toString();
}

function formatPrice(val) {
  if (val === null || val === undefined) return "N/A";
  return `₹${parseFloat(val).toFixed(2)}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1)  return "Just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
