// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";

/**
 * 🚀 Application Monitoring & Startup Tracking
 */
const initMonitoring = () => {
  const appStartTime = performance.now();
  const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
  const environment = import.meta.env.MODE || "development";
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";
  
  // Store minimal metrics for debugging
  window.appMetrics = {
    startTime: appStartTime,
    version: appVersion,
    environment,
    apiUrl,
  };

  console.group("🚀 Assessly Platform");
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 API: ${apiUrl}`);
  console.groupEnd();
};

/**
 * 🔐 Global Error Handling & Resilience
 */
const registerErrorHandlers = () => {
  let isHandlingError = false;

  // Unhandled Promise Rejections
  window.addEventListener("unhandledrejection", (event) => {
    if (isHandlingError) return;
    isHandlingError = true;

    console.error("🔴 Unhandled Promise Rejection:", {
      reason: event.reason,
      stack: event.reason?.stack,
    });

    event.preventDefault();
    setTimeout(() => { isHandlingError = false; }, 100);
  });

  // Global JavaScript Errors
  window.addEventListener("error", (event) => {
    if (isHandlingError) return;
    isHandlingError = true;

    console.error("🔴 Global Error:", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });

    setTimeout(() => { isHandlingError = false; }, 100);
    return false; // Allow default browser handling for critical errors
  });

  // Network Status Monitoring
  window.addEventListener("offline", () => {
    console.warn("🌐 Network: Offline");
  });

  window.addEventListener("online", () => {
    console.info("🌐 Network: Online");
  });
};

/**
 * 📊 Analytics & Telemetry (Safe Fallbacks)
 */
const initAnalytics = () => {
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  // Safe Google Analytics initialization
  if (gaMeasurementId && import.meta.env.PROD) {
    try {
      if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag("js", new Date());
        gtag("config", gaMeasurementId);
      }
      console.log("✅ Google Analytics initialized");
    } catch (error) {
      console.warn("⚠️ Google Analytics initialization failed:", error);
    }
  }

  // Safe global tracking functions with fallbacks
  window.trackEvent = (...args) => {
    if (import.meta.env.DEV) {
      console.debug("📊 Analytics Event:", ...args);
    }
    if (window.gtag && import.meta.env.PROD) {
      try {
        window.gtag("event", ...args);
      } catch (err) {
        console.debug("Analytics event failed:", err);
      }
    }
  };

  window.trackError = (error, context = {}) => {
    console.error("⚠️ Tracked Error:", error, context);
    
    if (window.gtag && import.meta.env.PROD) {
      try {
        window.gtag("event", "exception", {
          description: error?.message || "Unknown error",
          fatal: false,
          ...context,
        });
      } catch (err) {
        // Silently fail for analytics errors
      }
    }
  };
};

/**
 * 🔧 Progressive Web App Features
 */
const registerServiceWorker = () => {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    // Wait for page load
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registration) => {
          console.log("✅ Service Worker registered:", registration.scope);

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("🔄 Service Worker update found");
            
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("🔄 New content available; refresh recommended");
              }
            });
          });
        })
        .catch((error) => {
          console.warn("⚠️ Service Worker registration failed:", error.message);
        });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", register);
    } else {
      register();
    }
  }
};

/**
 * 🚦 Application Initialization & Mount
 */
const initializeApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element (#root) not found in DOM");
    // Minimal, accessible fallback
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        padding: 2rem;
      ">
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Application Error</h1>
          <p style="font-size: 1rem; margin-bottom: 2rem; max-width: 400px;">
            Critical setup issue detected. Please contact support.
          </p>
          <button onclick="window.location.reload()" style="
            padding: 0.8rem 1.5rem;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
          ">
            Reload Application
          </button>
        </div>
      </div>
    `;
    return;
  }

  try {
    // Show immediate loading state
    rootElement.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      ">
        <div style="text-align: center;">
          <div style="
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          "></div>
          <div style="
            color: #2d3748;
            font-size: 1rem;
            font-weight: 500;
          ">
            Loading Assessly Platform...
          </div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Create React root and mount app
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

    console.log("✅ React application mounted successfully");

    // Initialize analytics after mount
    setTimeout(initAnalytics, 100);

    // Register service worker (non-blocking)
    setTimeout(registerServiceWorker, 500);

  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    
    // Enhanced error fallback UI
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        padding: 1rem;
        background: #f8f9fa;
        color: #495057;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          max-width: 500px;
          width: 100%;
        ">
          <h1 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Application Failed to Load</h1>
          
          <p style="line-height: 1.5; margin-bottom: 1.5rem;">
            We're sorry, but the application encountered a critical error.
          </p>
          
          <div style="
            background: #f8f9fa;
            padding: 0.8rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
            font-family: monospace;
            font-size: 0.85rem;
            overflow: auto;
            max-height: 150px;
          ">
            ${error.toString().replace(/[<>]/g, '')}
          </div>
          
          <div style="display: flex; gap: 1rem;">
            <button onclick="window.location.reload()" style="
              flex: 1;
              padding: 0.7rem;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              font-weight: 600;
              cursor: pointer;
            ">
              Reload
            </button>
            
            <button onclick="window.location.href='/'" style="
              flex: 1;
              padding: 0.7rem;
              background: #2ecc71;
              color: white;
              border: none;
              border-radius: 4px;
              font-weight: 600;
              cursor: pointer;
            ">
              Home
            </button>
          </div>
          
          <p style="margin-top: 1.5rem; font-size: 0.85rem; color: #95a5a6;">
            If this persists, contact 
            <a href="mailto:assesslyinc@gmail.com" style="color: #3498db;">
              assesslyinc@gmail.com
            </a>
          </p>
        </div>
      </div>
    `;
  }
};

/**
 * 🚦 Application Startup Sequence
 */
const startApplication = () => {
  // Initialize monitoring and error handlers
  initMonitoring();
  registerErrorHandlers();

  // Start app initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
  } else {
    // Small delay to ensure other initialization completes
    setTimeout(initializeApp, 0);
  }
};

// Start the application
startApplication();

/**
 * 🛠️ Development Utilities
 */
if (import.meta.env.DEV) {
  // Expose app info for debugging
  window.APP_INFO = {
    version: import.meta.env.VITE_APP_VERSION || "development",
    environment: import.meta.env.MODE,
    apiUrl: import.meta.env.VITE_API_BASE_URL,
  };

  // Development console styling
  console.log(
    "%c🔧 Assessly Development Mode",
    "font-size: 14px; font-weight: bold; color: white; background: linear-gradient(90deg, #667eea, #764ba2); padding: 6px 12px; border-radius: 4px;"
  );

  // Hot Module Replacement
  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      console.log("🔄 HMR - Cleaning up");
      window.appMetrics = null;
    });
  }

  // Development utilities
  window.devUtils = {
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log("🗑️ Storage cleared");
      window.location.reload();
    },
    getAppMetrics: () => window.appMetrics,
    testAnalytics: () => {
      console.group("🔍 Analytics Test");
      console.log("GA ID:", import.meta.env.VITE_GA_MEASUREMENT_ID || "Not set");
      console.log("GA Available:", !!window.gtag);
      console.groupEnd();
    },
  };
}
