// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";

/**
 * 🟣 Global Safe Logging Helpers
 * Never break UI if analytics is not configured
 */
window.trackEvent = (...args) =>
  console.debug("📊 Analytics disabled - trackEvent skipped:", ...args);

window.trackError = (...args) =>
  console.debug("⚠️ Analytics disabled - trackError skipped:", ...args);

/**
 * 🔐 Global Error Handling
 */
const registerErrorHandlers = () => {
  window.addEventListener("error", (event) => {
    console.error("Global Error:", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled Promise:", event.reason);
  });
};

/**
 * 🚦 Application Bootstrap
 */
const initializeApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Root element #root not found.");
    document.body.innerHTML =
      "<h1 style='color:red;text-align:center;'>Critical App Error</h1>";
    return;
  }

  try {
    const root = createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HelmetProvider>
      </React.StrictMode>
    );

    console.log("✅ App mounted successfully");

    // Service Worker only in production
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW Registered"))
        .catch(() => console.warn("SW Failed"));
    }
  } catch (error) {
    console.error("❌ App initialization failed:", error);
    rootElement.innerHTML = `
      <div style="padding:2rem;text-align:center;">
        <h1>⚠️ Application Failed</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }
};

/**
 * 🚀 Start the App
 */
registerErrorHandlers();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}
