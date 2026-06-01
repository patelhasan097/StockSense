// ═══════════════════════════════════════════════════════
//  halal.js  —  Halal Screening Engine
//  Sector database + debt ratio check + preliminary verdict
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────
// 1. SECTOR DATABASE
// ─────────────────────────────────────────
const HALAL_SECTORS = {
  // ✅ HALAL sectors
  halal: [
    "technology", "information technology", "software", "it services",
    "pharmaceuticals", "healthcare", "hospital", "medical",
    "consumer staples", "fmcg", "food", "beverages non-alcoholic",
    "textile", "apparel", "garments",
    "infrastructure", "construction", "cement", "steel", "metals",
    "chemicals", "specialty chemicals",
    "telecom", "telecommunications",
    "real estate", "reits",
    "renewable energy", "solar", "wind",
    "automobiles", "auto components",
    "logistics", "shipping", "transportation",
    "retail", "e-commerce",
    "media", "entertainment",
    "agriculture", "agro", "fertilizers",
    "power", "utilities",
    "oil", "gas", "energy",
    "mining", "coal",
    "paper", "packaging",
    "electrical", "electronics",
  ],

  // ❌ HARAM sectors
  haram: [
    "banking", "bank", "financial services", "nbfc",
    "insurance", "life insurance", "general insurance",
    "alcohol", "liquor", "breweries", "distilleries",
    "tobacco", "cigarettes",
    "gambling", "casino", "betting", "lottery",
    "pork", "pig", "swine",
    "adult entertainment",
    "weapons", "defence conventional",
  ],

  // ⚠️ DOUBTFUL — needs deeper check
  doubtful: [
    "diversified financial", "asset management", "mutual fund",
    "hotel", "hospitality", "tourism",   // may serve alcohol
    "food processing",                    // check for pork / alcohol
    "defence", "aerospace",              // check for weapons
    "media entertainment",               // check for adult content
  ],
};

// ─────────────────────────────────────────
// 2. Known Indian stock sector mapping
//    (fallback when API doesn't return sector)
// ─────────────────────────────────────────
const KNOWN_STOCKS = {
  // IT
  "TCS":       { sector: "Information Technology", verdict: "halal" },
  "INFY":      { sector: "Information Technology", verdict: "halal" },
  "WIPRO":     { sector: "Information Technology", verdict: "halal" },
  "HCLTECH":   { sector: "Information Technology", verdict: "halal" },
  "TECHM":     { sector: "Information Technology", verdict: "halal" },
  "LTIM":      { sector: "Information Technology", verdict: "halal" },
  "MPHASIS":   { sector: "Information Technology", verdict: "halal" },
  "PERSISTENT":{ sector: "Information Technology", verdict: "halal" },
  "COFORGE":   { sector: "Information Technology", verdict: "halal" },

  // Pharma
  "SUNPHARMA": { sector: "Pharmaceuticals", verdict: "halal" },
  "DRREDDY":   { sector: "Pharmaceuticals", verdict: "halal" },
  "CIPLA":     { sector: "Pharmaceuticals", verdict: "halal" },
  "DIVISLAB":  { sector: "Pharmaceuticals", verdict: "halal" },
  "BIOCON":    { sector: "Pharmaceuticals", verdict: "halal" },
  "LUPIN":     { sector: "Pharmaceuticals", verdict: "halal" },
  "ALKEM":     { sector: "Pharmaceuticals", verdict: "halal" },
  "AUROPHARMA":{ sector: "Pharmaceuticals", verdict: "halal" },
  "IPCALAB":   { sector: "Pharmaceuticals", verdict: "halal" },

  // FMCG
  "HINDUNILVR":{ sector: "FMCG", verdict: "halal" },
  "DABUR":     { sector: "FMCG", verdict: "halal" },
  "MARICO":    { sector: "FMCG", verdict: "halal" },
  "GODREJCP":  { sector: "FMCG", verdict: "halal" },
  "EMAMILTD":  { sector: "FMCG", verdict: "halal" },
  "COLPAL":    { sector: "FMCG", verdict: "halal" },
  "TATACONSUM":{ sector: "FMCG", verdict: "halal" },
  "NESTLEIND": { sector: "FMCG", verdict: "halal" },
  "BRITANNIA": { sector: "FMCG", verdict: "halal" },

  // Banks — HARAM
  "HDFCBANK":  { sector: "Banking", verdict: "haram" },
  "ICICIBANK": { sector: "Banking", verdict: "haram" },
  "KOTAKBANK": { sector: "Banking", verdict: "haram" },
  "AXISBANK":  { sector: "Banking", verdict: "haram" },
  "SBIN":      { sector: "Banking", verdict: "haram" },
  "BANDHANBNK":{ sector: "Banking", verdict: "haram" },
  "FEDERALBNK":{ sector: "Banking", verdict: "haram" },
  "INDUSINDBK":{ sector: "Banking", verdict: "haram" },
  "AUBANK":    { sector: "Banking", verdict: "haram" },

  // Telecom
  "BHARTIARTL":{ sector: "Telecom", verdict: "halal" },
  "IDEA":      { sector: "Telecom", verdict: "halal" },

  // Auto
  "MARUTI":    { sector: "Automobile", verdict: "halal" },
  "TATAMOTORS":{ sector: "Automobile", verdict: "halal" },
  "M&M":       { sector: "Automobile", verdict: "halal" },
  "BAJAJ-AUTO":{ sector: "Automobile", verdict: "halal" },
  "HEROMOTOCO":{ sector: "Automobile", verdict: "halal" },
  "EICHERMOT": { sector: "Automobile", verdict: "halal" },
  "TVSMOTOR":  { sector: "Automobile", verdict: "halal" },

  // Energy / Oil
  "RELIANCE":  { sector: "Conglomerate / Oil & Retail", verdict: "halal" },
  "ONGC":      { sector: "Oil & Gas", verdict: "halal" },
  "IOC":       { sector: "Oil & Gas", verdict: "halal" },
  "BPCL":      { sector: "Oil & Gas", verdict: "halal" },
  "GAIL":      { sector: "Oil & Gas", verdict: "halal" },
  "NTPC":      { sector: "Power", verdict: "halal" },
  "POWERGRID": { sector: "Power", verdict: "halal" },
  "ADANIGREEN":{ sector: "Renewable Energy", verdict: "halal" },
  "ADANIPORTS":{ sector: "Logistics", verdict: "halal" },
  "ADANIENT":  { sector: "Diversified", verdict: "doubtful" },

  // Infra / Metals
  "TATASTEEL": { sector: "Steel", verdict: "halal" },
  "JSWSTEEL":  { sector: "Steel", verdict: "halal" },
  "HINDALCO":  { sector: "Metals", verdict: "halal" },
  "VEDL":      { sector: "Mining", verdict: "halal" },
  "COALINDIA": { sector: "Mining", verdict: "halal" },
  "ULTRACEMCO":{ sector: "Cement", verdict: "halal" },
  "SHREECEM":  { sector: "Cement", verdict: "halal" },
  "AMBUJACEMENT":{ sector:"Cement", verdict:"halal" },
  "ACC":       { sector: "Cement", verdict: "halal" },
  "LARSENTOUBRO":{ sector: "Infrastructure", verdict: "halal" },
  "LT":        { sector: "Infrastructure", verdict: "halal" },

  // Alcohol — HARAM
  "UBL":       { sector: "Alcohol / Breweries", verdict: "haram" },
  "MCDOWELL-N":{ sector: "Alcohol / Spirits", verdict: "haram" },
  "RADICO":    { sector: "Alcohol / Spirits", verdict: "haram" },

  // Tobacco — HARAM
  "ITC":       { sector: "Tobacco / FMCG", verdict: "haram",
                  note: "ITC ka major business tobacco hai — HARAM. FMCG segment bhi hai lekin mixed company hai." },

  // Paints / Consumer
  "ASIANPAINT":{ sector: "Paints", verdict: "halal" },
  "BERGEPAINT":{ sector: "Paints", verdict: "halal" },

  // Retail / E-com
  "DMART":     { sector: "Retail", verdict: "halal" },
  "NYKAA":     { sector: "E-commerce / Retail", verdict: "halal" },
  "ZOMATO":    { sector: "Food Delivery", verdict: "doubtful",
                  note: "Zomato pe halal aur non-halal dono restaurants hain. Gemini AI se detail check karo." },

  // Financial / Insurance — HARAM/DOUBTFUL
  "BAJFINANCE":{ sector: "NBFC", verdict: "haram" },
  "BAJAJFINSV":{ sector: "Financial Services", verdict: "haram" },
  "HDFC":      { sector: "Housing Finance", verdict: "haram" },
  "LICHSGFIN": { sector: "Housing Finance", verdict: "haram" },
  "MUTHOOTFIN":{ sector: "NBFC / Gold Finance", verdict: "haram" },
  "HDFCLIFE":  { sector: "Life Insurance", verdict: "haram" },
  "SBILIFE":   { sector: "Life Insurance", verdict: "haram" },
  "ICICIGI":   { sector: "General Insurance", verdict: "haram" },

  // Chemicals
  "PIDILITIND":{ sector: "Specialty Chemicals", verdict: "halal" },
  "SRF":       { sector: "Specialty Chemicals", verdict: "halal" },
  "ATUL":      { sector: "Chemicals", verdict: "halal" },
  "NAVINFLUOR":{ sector: "Specialty Chemicals", verdict: "halal" },

  // Consumer Durables
  "HAVELLS":   { sector: "Electrical Goods", verdict: "halal" },
  "VOLTAS":    { sector: "Consumer Durables", verdict: "halal" },
  "WHIRLPOOL": { sector: "Consumer Durables", verdict: "halal" },
  "DIXON":     { sector: "Electronics", verdict: "halal" },

  // Healthcare
  "APOLLOHOSP":{ sector: "Healthcare", verdict: "halal" },
  "FORTIS":    { sector: "Healthcare", verdict: "halal" },
  "MAXHEALTH": { sector: "Healthcare", verdict: "halal" },
};

// ─────────────────────────────────────────
// 3. SECTOR VERDICT — check sector string
// ─────────────────────────────────────────
function getSectorVerdict(sectorStr) {
  if (!sectorStr) return "doubtful";
  const s = sectorStr.toLowerCase();
  for (const keyword of HALAL_SECTORS.haram) {
    if (s.includes(keyword)) return "haram";
  }
  for (const keyword of HALAL_SECTORS.halal) {
    if (s.includes(keyword)) return "halal";
  }
  for (const keyword of HALAL_SECTORS.doubtful) {
    if (s.includes(keyword)) return "doubtful";
  }
  return "doubtful";
}

// ─────────────────────────────────────────
// 4. DEBT RATIO CHECK
// ─────────────────────────────────────────
function checkDebtRatio(totalDebt, marketCap) {
  if (!totalDebt || !marketCap || marketCap === 0) {
    return {
      pass: null,
      ratio: null,
      text: "Debt data available nahi — Gemini AI se check karao",
    };
  }
  const ratio = (totalDebt / marketCap) * 100;
  return {
    pass:  ratio < 33,
    ratio: ratio.toFixed(1),
    text:  ratio < 33
      ? `✅ Debt ratio ${ratio.toFixed(1)}% — 33% se kam — PASS`
      : `❌ Debt ratio ${ratio.toFixed(1)}% — 33% se zyada — FAIL (riba-based debt zyada hai)`,
  };
}

// ─────────────────────────────────────────
// 5. INCOME CHECK (haram income < 5%)
// ─────────────────────────────────────────
function checkHaramIncome(sectorVerdict) {
  // For known halal sectors, income is assumed clean
  // For haram sectors, the main income itself is haram
  // This is a preliminary check — Gemini gives detailed verdict
  if (sectorVerdict === "halal") {
    return {
      pass: true,
      text: "✅ Main business halal hai — haram income expected negligible hai",
    };
  }
  if (sectorVerdict === "haram") {
    return {
      pass: false,
      text: "❌ Company ka main income haram source se hai — invest mat karo",
    };
  }
  return {
    pass: null,
    text: "⚠️ Doubtful sector — Gemini AI se detailed check karao",
  };
}

// ─────────────────────────────────────────
// 6. PURIFICATION CALCULATOR
// ─────────────────────────────────────────
function calcPurification(annualProfit, investmentValue, haramIncomePercent = 0) {
  // If halal company earns some interest income (e.g. bank deposits)
  // Investor must donate that proportion
  if (!annualProfit || !investmentValue || haramIncomePercent <= 0) return null;
  const purifyAmount = (investmentValue * haramIncomePercent) / 100;
  return {
    amount: purifyAmount.toFixed(2),
    text: `Aapki investment ₹${investmentValue} pe ₹${purifyAmount.toFixed(2)} charity mein dena hoga (${haramIncomePercent}% haram income purification)`,
  };
}

// ─────────────────────────────────────────
// 7. MASTER HALAL CHECK
// ─────────────────────────────────────────
function runHalalScreening(symbol, sectorFromAPI, totalDebt, marketCap) {
  const cleanSymbol = symbol.toUpperCase().replace(":NSE", "").replace(":BSE", "");

  // Check known stocks first
  const known = KNOWN_STOCKS[cleanSymbol];
  const sectorVerdict = known
    ? known.verdict
    : getSectorVerdict(sectorFromAPI);

  const sectorName = known
    ? known.sector
    : (sectorFromAPI || "Unknown Sector");

  const knownNote = known?.note || null;

  const debtCheck   = checkDebtRatio(totalDebt, marketCap);
  const incomeCheck = checkHaramIncome(sectorVerdict);

  // Preliminary verdict (before Gemini)
  let prelimVerdict = "doubtful";
  if (sectorVerdict === "haram") {
    prelimVerdict = "haram";
  } else if (sectorVerdict === "halal" && debtCheck.pass !== false) {
    prelimVerdict = "halal";
  } else if (debtCheck.pass === false) {
    prelimVerdict = "doubtful"; // even if sector is halal, debt is high
  }

  return {
    symbol: cleanSymbol,
    sectorName,
    sectorVerdict,
    prelimVerdict,
    knownNote,
    debtCheck,
    incomeCheck,
    checks: {
      sector: {
        pass: sectorVerdict === "halal",
        icon: sectorVerdict === "halal" ? "✅" : sectorVerdict === "haram" ? "❌" : "⚠️",
        text: sectorVerdict === "halal"
          ? `✅ ${sectorName} — Halal sector hai`
          : sectorVerdict === "haram"
          ? `❌ ${sectorName} — Haram sector. Invest NAHI karna chahiye.`
          : `⚠️ ${sectorName} — Doubtful sector, deeper analysis zaroori hai`,
      },
      debt: debtCheck,
      income: incomeCheck,
    },
  };
}
