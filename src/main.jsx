// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";

/**
 * 🚀 Production Monitoring & Error Handling
 */
const initMonitoring = () => {
  if (import.meta.env.PROD) {
    console.log("🚀 Assessly Frontend - Production Mode");
    const startTime = performance.now();
    window.addEventListener("load", () => {
      const loadTime = performance.now() - startTime;
      console.log(`📊 App loaded in ${Math.round(loadTime)}ms`);
    });
  }
};

const registerErrorHandlers = () => {
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();
  });

  window.addEventListener("error", (event) => {
    console.error("Runtime error:", event.error);
  });
};

const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker registered:", registration);
    } catch (error) {
      console.warn("⚠️ Service Worker registration failed:", error);
    }
  }
};

/**
 * 🎯 Main Application Bootstrap
 */
const initializeApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found");
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

    console.log("✅ Assessly application mounted successfully");
    registerServiceWorker();

    const analyticsKey = import.meta.env.VITE_ANALYTICS_KEY;
    if (analyticsKey && window.initAnalytics) {
      window.initAnalytics({ key: analyticsKey });
      console.log("📈 Analytics initialized");
    }
  } catch (error) {
    console.error("❌ Failed to render application:", error);
    rootElement.innerHTML = `
      <div style="padding: 3rem; text-align: center; font-family: sans-serif;">
        <h1 style="color: #e65100;">Application Error</h1>
        <p>Something went wrong while loading the app. Please refresh.</p>
        <button onclick="window.location.reload()">Refresh</button>
      </div>
    `;
  }
};

/**
 * 🚦 App Startup Sequence
 */
const startApplication = () => {
  initMonitoring();
  registerErrorHandlers();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }
};

startApplication();

/**
 * 🛠️ Development Utilities
 */
if (import.meta.env.DEV) {
  window.APP_VERSION = import.meta.env.VITE_APP_VERSION || "development";
  window.APP_ENV = import.meta.env.MODE || "development";

  if (import.meta.hot) import.meta.hot.accept();

  console.log(`🔧 Assessly Frontend - Development Mode`);
  console.log(`📦 Version: ${window.APP_VERSION}`);
  console.log(`🌍 Environment: ${window.APP_ENV}`);
}
