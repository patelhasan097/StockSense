// ═══════════════════════════════════════════════════════
//  pwa.js  —  PWA Registration + Install Prompt + Offline
// ═══════════════════════════════════════════════════════

// ── 1. Register Service Worker ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(reg => {
        console.log("✅ SW registered:", reg.scope);
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showToast("App update available! Refresh karo.", 5000);
            }
          });
        });
      })
      .catch(err => console.warn("SW registration failed:", err));
  });
}

// ── 2. Install Prompt (Android Chrome) ──
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install banner after 3 seconds
  setTimeout(() => {
    document.getElementById("installBanner").classList.remove("hidden");
  }, 3000);
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    showToast("🎉 StockSense install ho gaya!");
    document.getElementById("installBanner").classList.add("hidden");
  }
  deferredPrompt = null;
});

document.getElementById("installDismiss")?.addEventListener("click", () => {
  document.getElementById("installBanner").classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  showToast("✅ App successfully install hua!");
  document.getElementById("installBanner").classList.add("hidden");
  deferredPrompt = null;
});

// ── 3. Online / Offline Detection ──
const offlineBtn = document.getElementById("offlineIndicator");

function updateNetworkStatus() {
  const online = navigator.onLine;
  offlineBtn.innerHTML = online
    ? '<i class="ti ti-wifi"></i>'
    : '<i class="ti ti-wifi-off" style="color:#f85149"></i>';
  offlineBtn.title = online ? "Online" : "Offline — network nahi hai";
  if (!online) showToast("📵 Offline ho gaye — Internet check karo", 4000);
}

window.addEventListener("online",  updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
updateNetworkStatus();

// ── 4. Toast Notification ──
function showToast(msg, duration = 3000) {
  let toast = document.getElementById("pwaToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "pwaToast";
    toast.className = "pwa-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// ── 5. iOS "Add to Home Screen" hint ──
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

if (isIOS && !isStandalone) {
  setTimeout(() => {
    showToast("📲 Install karo: Safari → Share → Add to Home Screen", 6000);
  }, 4000);
}

// ── 6. Keep Screen Awake (Wake Lock API) while analyzing ──
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (e) { /* silently fail */ }
}
async function releaseWakeLock() {
  try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } }
  catch (e) { /* silently fail */ }
}

// Re-acquire wake lock if page becomes visible again
document.addEventListener("visibilitychange", () => {
  if (wakeLock !== null && document.visibilityState === "visible") {
    requestWakeLock();
  }
});
