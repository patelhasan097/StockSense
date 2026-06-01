# 📊 StockSense — Personal Halal Stock Analyzer

Aapka personal AI-powered Indian stock analyzer. Sirf stock ka naam daalo — poori analysis milegi.

---

## ✅ Features

- 📈 **Real-time price** + candlestick chart (1W / 1M / 3M / 6M / 1Y)
- 🔢 **Technical Analysis** — RSI, MACD, Bollinger Bands, EMA 20/50/200, Support/Resistance
- 📋 **Fundamental Analysis** — P/E, ROE, Debt/Equity, Revenue Growth, Profit Margin
- 🕌 **Halal Screening** — Sector check + debt ratio + Gemini AI halal verdict
- 📰 **Latest News** — Real-time news with sentiment analysis
- 🧠 **Gemini AI Report** — Long-term outlook, swing trade setup, final BUY/HOLD/SELL/AVOID verdict

---

## 🚀 GitHub Pages pe Setup (Step by Step)

### Step 1 — GitHub Account

1. [github.com](https://github.com) pe jaao
2. "Sign up" karo (free hai)

### Step 2 — Repository Banao

1. GitHub pe login karo
2. Top-right mein **"+"** icon → **"New repository"**
3. Repository name: `stock-analyzer`
4. **Public** select karo
5. **"Create repository"** click karo

### Step 3 — Files Upload Karo

1. Repository page pe **"uploading an existing file"** click karo
2. Ye saari 10 files drag & drop karo:
   - `index.html`
   - `style.css`
   - `config.js`
   - `app.js`
   - `api.js`
   - `gemini.js`
   - `technical.js`
   - `halal.js`
   - `charts.js`
   - `README.md`
3. **"Commit changes"** click karo

### Step 4 — API Keys Daalo

**`config.js` file kholo aur apni keys replace karo:**

```javascript
const CONFIG = {
  TWELVE_DATA_KEY:   "apni_twelve_data_key_yahan",
  ALPHA_VANTAGE_KEY: "apni_alpha_vantage_key_yahan",
  GNEWS_KEY:         "apni_gnews_key_yahan",
  GEMINI_KEY:        "apni_gemini_key_yahan",
};
```

### Step 5 — GitHub Pages Enable Karo

1. Repository page pe **"Settings"** tab click karo
2. Left sidebar mein **"Pages"** click karo
3. "Source" ke neeche **"Deploy from a branch"** select karo
4. Branch: **"main"** select karo, folder: **"/ (root)"**
5. **"Save"** click karo

### Step 6 — Live URL

2 minute baad aapka tool live hoga:
```
https://YOUR_GITHUB_USERNAME.github.io/stock-analyzer
```

---

## 🔑 Free API Keys Kahan Se Milenge

### 1. Twelve Data (Price + History)
- [twelvedata.com](https://twelvedata.com) pe jaao
- "Get your free API key" click karo
- Email se signup karo
- Dashboard mein API key milegi
- **Free limit:** 800 calls/day

### 2. Alpha Vantage (Fundamentals)
- [alphavantage.co](https://alphavantage.co) pe jaao
- "Get your free API key" click karo
- Simple form fill karo
- Email mein key milegi
- **Free limit:** 25 calls/day

### 3. GNews (News)
- [gnews.io](https://gnews.io) pe jaao
- "Register" karo
- Dashboard mein API key milegi
- **Free limit:** 100 calls/day

### 4. Google Gemini (AI Analysis)
- [aistudio.google.com](https://aistudio.google.com) pe jaao
- Google account se login karo
- "Get API key" click karo
- **Free limit:** 15 req/min, 1M tokens/day

---

## 📱 Supported Indian Stocks

NSE ke sabhi major stocks support karte hain. Example searches:

| Jo likho | NSE ticker |
|----------|------------|
| Reliance | RELIANCE |
| TCS | TCS |
| Infosys | INFY |
| Wipro | WIPRO |
| Sun Pharma | SUNPHARMA |
| Dr Reddy | DRREDDY |
| HDFC Bank | HDFCBANK |
| Airtel | BHARTIARTL |
| Asian Paints | ASIANPAINT |
| Dabur | DABUR |

---

## ⚠️ Important Notes

1. **Ye financial advice nahi hai** — sirf educational tool hai
2. **Price 15 min delay** hoga free plan pe
3. **Alpha Vantage** 25 calls/day — Indian stocks ka data kabhi kabhi nahi milta (Gemini tab bhi achha analysis deta hai)
4. **Hamesha stop-loss lagao** — koi bhi tool 100% accurate nahi hota
5. **Halal screening** preliminary hai — final decision apne scholar se lena

---

## 🔧 Local Computer Pe Chalana (Optional)

Agar GitHub nahi use karna:
1. Ye sara folder download karo
2. `index.html` browser mein directly open karo
3. **CORS error aa sakta hai** — is case mein GitHub Pages use karo

---

## 📞 Problems?

Common issues:
- **"Quote fetch failed"** → Symbol format check karo (e.g. "RELIANCE" not "Reliance Industries")
- **"Gemini API error"** → API key check karo config.js mein
- **Blank chart** → Twelve Data key check karo
- **N/A in fundamentals** → Alpha Vantage 25 calls limit ho gayi — kal try karo

---

*StockSense — Sirf aapke liye. Bilkul free. Hamesha.*
