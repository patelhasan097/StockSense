// ═══════════════════════════════════════════════════════
//  config.js  —  API Keys (Phone mein save hoti hain)
//  Ye file GitHub pe nahi jaati (.gitignore mein hai)
//  Pehli baar app open karo → Setup screen aayegi
// ═══════════════════════════════════════════════════════

const CONFIG = (function () {
  const KEYS = {
    TWELVE_DATA_KEY:   "ss_twelve",
    ALPHA_VANTAGE_KEY: "ss_alpha",
    GNEWS_KEY:         "ss_gnews",
    GEMINI_KEY:        "ss_gemini",
  };

  // Load from localStorage
  function get(k) { return localStorage.getItem(KEYS[k]) || ""; }

  // Save to localStorage
  function save(obj) {
    Object.keys(KEYS).forEach(k => {
      if (obj[k]) localStorage.setItem(KEYS[k], obj[k].trim());
    });
  }

  // Check if all keys are set
  function allSet() {
    return Object.keys(KEYS).every(k => {
      const v = get(k);
      return v && v.length > 8;
    });
  }

  // Clear all keys
  function clear() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    get TWELVE_DATA_KEY()   { return get("TWELVE_DATA_KEY"); },
    get ALPHA_VANTAGE_KEY() { return get("ALPHA_VANTAGE_KEY"); },
    get GNEWS_KEY()         { return get("GNEWS_KEY"); },
    get GEMINI_KEY()        { return get("GEMINI_KEY"); },
    save,
    allSet,
    clear,
  };
})();

const APP = {
  TWELVE_BASE:  "https://api.twelvedata.com",
  ALPHA_BASE:   "https://www.alphavantage.co/query",
  GNEWS_BASE:   "https://gnews.io/api/v4",
  GEMINI_BASE:  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  DEFAULT_TF:   "3M",
  EXCHANGE:     "NSE",
};
