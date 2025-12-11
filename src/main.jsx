// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";

/**
 * -----------------------------
 * 🚀 Application Monitoring
 * -----------------------------
 */
const initMonitoring = () => {
  const appStartTime = performance.now();
  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
  const environment = import.meta.env.MODE || "development";
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

  window.appMetrics = { startTime: appStartTime, version: appVersion, environment, apiUrl };

  console.group("🚀 Assessly Platform");
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 API URL: ${apiUrl}`);
  console.groupEnd();
};

/**
 * -----------------------------
 * 🔐 Global Error Handling
 * -----------------------------
 */
const registerErrorHandlers = () => {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("🔴 Unhandled Promise Rejection:", event.reason);
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    console.error("🔴 Global Error:", event.message, event);
  });
};

/**
 * -----------------------------
 * ⚡ Service Worker (PWA)
 * -----------------------------
 */
const registerServiceWorker = () => {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => console.log("✅ Service Worker registered:", reg.scope))
      .catch((err) => console.warn("⚠️ SW registration failed:", err));
  }
};

/**
 * -----------------------------
 * 🔧 Initialize React App
 * -----------------------------
 */
const initializeApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:center; height:100vh;
        font-family: sans-serif; text-align:center; background:#f8f9fa; color:#333;
      ">
        <div>
          <h1>⚠️ Root Element Missing</h1>
          <p>The &lt;div id="root"&gt; element was not found in the HTML.</p>
          <p>Please check your index.html file.</p>
          <button onclick="window.location.reload()" style="
            padding:0.8rem 1.5rem; margin-top:1rem; background:#3498db; color:white;
            border:none; border-radius:6px; cursor:pointer;
          ">Reload</button>
        </div>
      </div>
    `;
    return;
  }

  try {
    // Clear any loading state
    rootElement.innerHTML = "";
    
    // Mount React App
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <ErrorBoundary enableRecovery={true} alwaysShowDetails={import.meta.env.DEV}>
            <App />
          </ErrorBoundary>
        </HelmetProvider>
      </React.StrictMode>
    );

    console.log("✅ React app mounted successfully");

    // Register service worker after mount
    setTimeout(registerServiceWorker, 500);
  } catch (err) {
    console.error("❌ Failed to initialize app:", err);
    
    // Fallback error display
    rootElement.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center; 
        height:100vh; font-family: sans-serif; text-align:center; padding:2rem;
      ">
        <h2 style="color:#c62828;">Application Failed to Load</h2>
        <p style="margin:1rem 0;">A critical error occurred during initialization.</p>
        <pre style="
          background:#f5f5f5; padding:1rem; border-radius:4px; 
          text-align:left; max-width:600px; overflow:auto;
        ">${err.message}</pre>
        <button onclick="window.location.reload()" style="
          padding:0.8rem 1.5rem; margin-top:1rem; background:#3498db; color:white;
          border:none; border-radius:6px; cursor:pointer;
        ">Reload Application</button>
      </div>
    `;
  }
};

/**
 * -----------------------------
 * 🚦 Application Startup
 * -----------------------------
 */
// **FIXED**: Direct execution without complex DOM ready checks
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM is ready, starting app initialization...");
  initMonitoring();
  registerErrorHandlers();
  initializeApp();
});

// Fallback for already loaded DOM
if (document.readyState === "interactive" || document.readyState === "complete") {
  console.log("⚡ DOM already loaded, initializing immediately...");
  setTimeout(() => {
    initMonitoring();
    registerErrorHandlers();
    initializeApp();
  }, 0);
}

/**
 * -----------------------------
 * 🛠️ Development Helpers
 * -----------------------------
 */
if (import.meta.env.DEV) {
  window.devUtils = {
    clearStorage: () => { 
      localStorage.clear(); 
      sessionStorage.clear(); 
      console.log("🧹 Storage cleared");
      window.location.reload(); 
    },
    getAppMetrics: () => window.appMetrics,
    forceError: () => { throw new Error("Test error from devUtils"); }
  };

  console.log("%c🔧 Development Mode Active", "color:white; background:#667eea; padding:4px 8px; border-radius:4px;");
}
