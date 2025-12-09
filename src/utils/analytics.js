// src/lib/analytics.js
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Track only when ID exists + in browser + production build
const isEnabled =
  typeof window !== "undefined" &&
  import.meta.env.PROD &&
  GA_MEASUREMENT_ID;

function loadGA() {
  if (!isEnabled) return;

  // Create Google Analytics gtag script
  (function installGTAG() {
    const script = document.createElement("script");
    script.setAttribute("async", "");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  })();

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
}

export function trackPageView(path) {
  if (!isEnabled) return;
  window.gtag("event", "page_view", { page_path: path });
}

export function initAnalytics() {
  loadGA();
  console.log("%cAnalytics Enabled (GA4)", "color:#4caf50");
}
