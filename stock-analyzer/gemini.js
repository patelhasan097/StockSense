// ═══════════════════════════════════════════════════════
//  gemini.js  —  Google Gemini AI Analysis Engine
//  Saara data bhejta hai → Complete report leta hai
// ═══════════════════════════════════════════════════════

async function runGeminiAnalysis({ quote, fundamentals, technical, halal, news }) {

  // ── Build a rich structured prompt ──
  const prompt = buildPrompt({ quote, fundamentals, technical, halal, news });

  const url = `${APP.GEMINI_BASE}?key=${CONFIG.GEMINI_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,      // Lower = more factual, less creative
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Gemini API error");
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse the structured response
  return parseGeminiResponse(rawText);
}

// ─────────────────────────────────────────
// Build the master prompt
// ─────────────────────────────────────────
function buildPrompt({ quote, fundamentals, technical, halal, news }) {
  const newsText = news.length > 0
    ? news.slice(0, 6).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${timeAgo(n.publishedAt)})`).join("\n")
    : "No recent news available.";

  const techSummary = `
RSI: ${technical.rsi ?? "N/A"} — ${technical.signals.rsiSignal}
MACD: ${technical.macd ? `${technical.macd.macd.toFixed(2)} / Signal: ${technical.macd.signal.toFixed(2)} / Hist: ${technical.macd.histogram.toFixed(2)}` : "N/A"} — ${technical.signals.macdSignal}
EMA20: ${technical.ema20 ? technical.ema20.toFixed(2) : "N/A"} | EMA50: ${technical.ema50 ? technical.ema50.toFixed(2) : "N/A"} | EMA200: ${technical.ema200 ? technical.ema200.toFixed(2) : "N/A"} — ${technical.signals.maSignal}
Bollinger Bands: Upper ${technical.bb ? technical.bb.upper.toFixed(2) : "N/A"} | Middle ${technical.bb ? technical.bb.middle.toFixed(2) : "N/A"} | Lower ${technical.bb ? technical.bb.lower.toFixed(2) : "N/A"} — ${technical.signals.bbSignal}
Volume Signal: ${technical.vol?.signal ?? "N/A"}
Cross Signal: ${technical.cross?.label ?? "N/A"}
Overall Technical Signal: ${technical.signals.overall}
Support Levels: ${technical.sr?.support?.map(s => s.toFixed(2)).join(", ") || "N/A"}
Resistance Levels: ${technical.sr?.resistance?.map(r => r.toFixed(2)).join(", ") || "N/A"}
`.trim();

  const fundSummary = `
P/E Ratio: ${fundamentals.peRatio ?? "N/A"}
EPS: ${fundamentals.eps ?? "N/A"}
ROE: ${fundamentals.roe ? fundamentals.roe.toFixed(2) + "%" : "N/A"}
Debt/Equity: ${fundamentals.debtEquity ?? "N/A"}
Profit Margin: ${fundamentals.profitMargin ? fundamentals.profitMargin.toFixed(2) + "%" : "N/A"}
Revenue Growth YoY: ${fundamentals.revenueGrowth ? fundamentals.revenueGrowth.toFixed(2) + "%" : "N/A"}
Book Value: ${fundamentals.bookValue ?? "N/A"}
Dividend Yield: ${fundamentals.dividendYield ? fundamentals.dividendYield.toFixed(2) + "%" : "N/A"}
Beta: ${fundamentals.beta ?? "N/A"}
Market Cap: ${formatMarketCap(fundamentals.marketCap)}
Sector: ${fundamentals.sector || halal.sectorName}
Industry: ${fundamentals.industry || "N/A"}
`.trim();

  return `
You are an expert Islamic finance-aware stock market analyst specializing in Indian markets (NSE/BSE).
Analyze the following data for ${quote.name || quote.symbol} (${quote.symbol}) and respond ONLY in the JSON format specified below.

=== CURRENT PRICE DATA ===
Symbol: ${quote.symbol}
Current Price: ₹${quote.close}
Day Change: ${quote.change > 0 ? "+" : ""}${quote.change?.toFixed(2)} (${quote.percentChange?.toFixed(2)}%)
52-Week High: ₹${quote.fiftyTwoWeekHigh}
52-Week Low: ₹${quote.fiftyTwoWeekLow}
Today's Volume: ${formatVolume(quote.volume)}

=== TECHNICAL ANALYSIS ===
${techSummary}

=== FUNDAMENTAL ANALYSIS ===
${fundSummary}

=== HALAL PRELIMINARY SCREENING ===
Sector: ${halal.sectorName}
Sector Verdict: ${halal.sectorVerdict}
Debt Check: ${halal.debtCheck.text}
Income Check: ${halal.incomeCheck.text}
Preliminary Verdict: ${halal.prelimVerdict}
${halal.knownNote ? "Special Note: " + halal.knownNote : ""}

=== LATEST NEWS ===
${newsText}

=== YOUR TASK ===
Based on ALL the above data, respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) in exactly this format:

{
  "halalVerdict": "HALAL" | "HARAM" | "DOUBTFUL",
  "halalReason": "2-3 sentences in simple Hindi/English explaining why this stock is halal/haram/doubtful. Mention sector, debt ratio, and any specific concerns.",
  "halalPurificationNeeded": true | false,
  "halalPurificationNote": "If purification needed, explain what % to donate. Otherwise empty string.",
  
  "longTermOutlook": "3-4 sentences in simple Hinglish about 1-3 year outlook. Mention: business fundamentals, sector tailwinds/headwinds, management quality if known, growth potential. Be specific with reasons.",
  
  "swingTradeSetup": {
    "entryZone": "₹XXX - ₹XXX",
    "target1": "₹XXX",
    "target2": "₹XXX",
    "stopLoss": "₹XXX",
    "riskReward": "1:X",
    "timeframe": "X-Y weeks",
    "setup": "2-3 sentences explaining the swing trade setup based on technical levels"
  },
  
  "riskFactors": "3-5 risk factors as bullet points (use • symbol). Each on new line. Be specific to this stock/sector.",
  
  "newsSentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED",
  "newsSummary": "1-2 sentences summarizing what the news means for this stock",
  
  "fundamentalGrade": "STRONG" | "GOOD" | "AVERAGE" | "WEAK",
  "fundamentalNote": "1 sentence on fundamental strength",
  
  "finalVerdict": "BUY" | "HOLD" | "SELL" | "AVOID",
  "finalReason": "2-3 sentences explaining the final verdict. Consider halal status, technicals, fundamentals, and news together. If haram, verdict should be AVOID regardless of technicals.",
  
  "keyInsight": "1 most important thing an investor must know about this stock right now. Max 2 sentences."
}

Rules:
- If stock is HARAM, finalVerdict must be "AVOID" 
- If stock is DOUBTFUL, mention it clearly in finalReason
- All prices should be realistic based on current price ₹${quote.close}
- Entry zone should be near current support or current price if at support
- Stop loss should be 4-7% below entry
- Target should give minimum 1:2 risk:reward ratio
- Be realistic — don't always say BUY. Say SELL or HOLD when warranted by data.
- Write in a mix of simple English and Hindi words (Hinglish) that a non-expert Indian investor can understand
`.trim();
}

// ─────────────────────────────────────────
// Parse Gemini's JSON response safely
// ─────────────────────────────────────────
function parseGeminiResponse(rawText) {
  try {
    // Remove markdown code fences if any
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Find the JSON object
    const start = cleaned.indexOf("{");
    const end   = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found in response");

    const jsonStr = cleaned.slice(start, end + 1);
    const parsed  = JSON.parse(jsonStr);

    // Validate required fields & fill defaults
    return {
      halalVerdict:             parsed.halalVerdict            || "DOUBTFUL",
      halalReason:              parsed.halalReason             || "Gemini analysis mein error aya.",
      halalPurificationNeeded:  parsed.halalPurificationNeeded || false,
      halalPurificationNote:    parsed.halalPurificationNote   || "",
      longTermOutlook:          parsed.longTermOutlook         || "Data insufficient for long-term analysis.",
      swingTradeSetup:          parsed.swingTradeSetup         || {},
      riskFactors:              parsed.riskFactors             || "• Data insufficient",
      newsSentiment:            parsed.newsSentiment           || "NEUTRAL",
      newsSummary:              parsed.newsSummary             || "",
      fundamentalGrade:         parsed.fundamentalGrade        || "AVERAGE",
      fundamentalNote:          parsed.fundamentalNote         || "",
      finalVerdict:             parsed.finalVerdict            || "HOLD",
      finalReason:              parsed.finalReason             || "",
      keyInsight:               parsed.keyInsight              || "",
    };
  } catch (e) {
    console.error("Gemini parse error:", e, "\nRaw:", rawText);
    // Return a safe fallback
    return {
      halalVerdict:            "DOUBTFUL",
      halalReason:             "AI analysis parse karne mein error aya. Manually check karo.",
      halalPurificationNeeded: false,
      halalPurificationNote:   "",
      longTermOutlook:         rawText.length > 100 ? rawText.slice(0, 500) : "Analysis unavailable.",
      swingTradeSetup:         { entryZone: "N/A", target1: "N/A", target2: "N/A", stopLoss: "N/A", riskReward: "N/A", timeframe: "N/A", setup: "" },
      riskFactors:             "• Manual analysis karo",
      newsSentiment:           "NEUTRAL",
      newsSummary:             "",
      fundamentalGrade:        "AVERAGE",
      fundamentalNote:         "",
      finalVerdict:            "HOLD",
      finalReason:             "Insufficient AI data. Manual analysis required.",
      keyInsight:              "",
    };
  }
}
