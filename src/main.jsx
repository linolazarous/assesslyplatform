// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";

/**
 * 🚀 Production Configuration
 */

// Performance monitoring (optional - add your preferred service)
const initMonitoring = () => {
  if (import.meta.env.PROD) {
    // Example: Initialize your analytics/monitoring service
    console.log('🚀 Assessly Frontend - Production Mode');
    
    // Remove console.log in production (optional)
    if (import.meta.env.VITE_ENABLE_CONSOLE === 'false') {
      console.log = () => {};
      console.warn = () => {};
      console.info = () => {};
    }
  }
};

// Error handler for uncaught errors
const registerErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error);
  });
};

// Performance optimizations
const enablePerformanceOptimizations = () => {
  // Preload critical resources
  if ('connection' in navigator && navigator.connection.saveData === true) {
    console.log('Data saver mode detected - skipping non-critical preloads');
    return;
  }

  // Preload critical fonts or assets if needed
  const preloadLinks = [
    // Add critical preloads here
    // { href: '/critical-font.woff2', as: 'font', type: 'font/woff2' }
  ];

  preloadLinks.forEach(link => {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.href = link.href;
    preloadLink.as = link.as;
    if (link.type) preloadLink.type = link.type;
    preloadLink.crossOrigin = 'anonymous';
    document.head.appendChild(preloadLink);
  });
};

/**
 * 🎯 Main Application Bootstrap
 */
const initializeApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Critical: Root element not found");
    
    // Create fallback UI
    const fallbackElement = document.createElement('div');
    fallbackElement.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    `;
    fallbackElement.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h1 style="margin-bottom: 1rem;">Assessly</h1>
        <p>Application failed to load. Please refresh the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #667eea; border: none; border-radius: 4px; cursor: pointer;"
        >
          Refresh Page
        </button>
      </div>
    `;
    document.body.appendChild(fallbackElement);
    return;
  }

  try {
    const root = createRoot(rootElement);

    // Render the app with production enhancements
    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HelmetProvider>
      </React.StrictMode>
    );

    // Log successful initialization
    console.log('✅ Assessly application mounted successfully');

  } catch (error) {
    console.error('❌ Failed to render application:', error);
    
    // Fallback error UI
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
        <h1 style="color: #d32f2f;">Application Error</h1>
        <p>We're sorry, but something went wrong. Our team has been notified.</p>
        <button 
          onclick="window.location.reload()" 
          style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;"
        >
          Try Again
        </button>
        <p style="margin-top: 2rem; font-size: 0.875rem; color: #666;">
          If the problem persists, please contact support.
        </p>
      </div>
    `;
  }
};

/**
 * 🚦 Application Startup Sequence
 */
const startApplication = () => {
  // Initialize monitoring and error handling first
  initMonitoring();
  registerErrorHandlers();

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enablePerformanceOptimizations();
      initializeApp();
    });
  } else {
    enablePerformanceOptimizations();
    initializeApp();
  }
};

// Start the application
startApplication();

/**
 * 🛠️ Development Utilities (Development only)
 */
if (import.meta.env.DEV) {
  // Expose app version for debugging
  window.APP_VERSION = import.meta.env.VITE_APP_VERSION || 'development';
  
  // Hot Module Replacement for development
  if (import.meta.hot) {
    import.meta.hot.accept();
  }
}

/**
 * 📊 Performance Observers (Optional)
 */
const observePerformance = () => {
  if ('PerformanceObserver' in window) {
    // Observe largest contentful paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });
    
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Observe first input delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    });
    
    fidObserver.observe({ type: 'first-input', buffered: true });
  }
};

// Start performance observation after app loads
setTimeout(observePerformance, 3000);
