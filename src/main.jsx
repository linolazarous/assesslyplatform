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
    document.body.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:center; height:100vh;
        font-family: sans-serif; text-align:center; background:#f8f9fa; color:#333;
      ">
        <div>
          <h1>⚠️ App Failed to Load</h1>
          <p>Critical error detected. Please contact support.</p>
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
    // Show temporary loading
    rootElement.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:center; height:100vh;
        font-family: sans-serif; text-align:center; background:#f0f4f8; color:#333;
      ">
        <div>
          <div style="
            width:50px; height:50px; border:4px solid #f3f3f3; border-top:4px solid #667eea;
            border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 15px;
          "></div>
          <p>Loading Assessly Platform...</p>
        </div>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;

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
  }
};

/**
 * -----------------------------
 * 🚦 Application Startup
 * -----------------------------
 */
const startApplication = () => {
  initMonitoring();
  registerErrorHandlers();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
  } else {
    setTimeout(initializeApp, 0);
  }
};

// Start the app
startApplication();

/**
 * -----------------------------
 * 🛠️ Development Helpers
 * -----------------------------
 */
if (import.meta.env.DEV) {
  window.devUtils = {
    clearStorage: () => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); },
    getAppMetrics: () => window.appMetrics,
  };

  console.log("%c🔧 Development Mode Active", "color:white; background:#667eea; padding:4px 8px; border-radius:4px;");
}
