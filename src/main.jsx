// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles/global.css";
import "./styles/theme.jsx";

/**
 * 🚀 Production Configuration
 */

// Performance monitoring
const initMonitoring = () => {
  if (import.meta.env.PROD) {
    console.log('🚀 Assessly Frontend - Production Mode');
    
    // Performance metrics
    const startTime = performance.now();
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      console.log(`📊 App loaded in ${Math.round(loadTime)}ms`);
    });
  }
};

// Error handler for uncaught errors
const registerErrorHandlers = () => {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You can send this to your error reporting service
    if (import.meta.env.PROD) {
      // Example: sendToErrorReporting(event.reason);
    }
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error);
    if (import.meta.env.PROD) {
      // Example: sendToErrorReporting(event.error);
    }
  });
};

// Service Worker Registration (for PWA)
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', error);
    }
  }
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
        <h1 style="margin-bottom: 1rem; font-size: 2.5rem;">Assessly</h1>
        <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">Application failed to load. Please refresh the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: white; color: #667eea; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 500;"
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

    // Render the app with HelmetProvider for SEO management
    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HelmetProvider>
      </React.StrictMode>
    );

    console.log('✅ Assessly application mounted successfully');

    // Register service worker after app mounts
    registerServiceWorker();

  } catch (error) {
    console.error('❌ Failed to render application:', error);
    
    // Enhanced fallback error UI
    rootElement.innerHTML = `
      <div style="padding: 3rem; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #fff3e0; border: 1px solid #ffb74d; border-radius: 12px; padding: 2rem;">
          <h1 style="color: #e65100; margin-bottom: 1rem; font-size: 1.75rem;">Application Error</h1>
          <p style="color: #5d4037; margin-bottom: 1.5rem; line-height: 1.5;">
            We're sorry, but something went wrong while loading the application. Our team has been notified.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button 
              onclick="window.location.reload()" 
              style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;"
            >
              Try Again
            </button>
            <button 
              onclick="window.location.href = '/'" 
              style="padding: 0.75rem 1.5rem; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 500;"
            >
              Go Home
            </button>
          </div>
          <p style="margin-top: 2rem; font-size: 0.875rem; color: #666;">
            If the problem persists, please contact our support team.
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
  // Initialize monitoring and error handling first
  initMonitoring();
  registerErrorHandlers();

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
};

// Start the application
startApplication();

/**
 * 🛠️ Development Utilities (Development only)
 */
if (import.meta.env.DEV) {
  // Expose app version and utilities for debugging
  window.APP_VERSION = import.meta.env.VITE_APP_VERSION || 'development';
  window.APP_ENV = import.meta.env.MODE || 'development';
  
  // Development performance markers
  const devPerfMark = (name) => {
    if (performance.mark) {
      performance.mark(`dev-${name}`);
    }
  };
  
  devPerfMark('app-start');
  
  // Hot Module Replacement for development
  if (import.meta.hot) {
    import.meta.hot.accept();
    
    // Development error overlay helper
    window.showErrorOverlay = (err) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #d32f2f;
        color: white;
        padding: 1rem;
        z-index: 9999;
        font-family: monospace;
        font-size: 14px;
      `;
      overlay.innerHTML = `
        <strong>Development Error:</strong> ${err.message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: 1px solid white; color: white; padding: 0.25rem 0.5rem; cursor: pointer;">
          Dismiss
        </button>
      `;
      document.body.appendChild(overlay);
    };
  }

  // Log build information
  console.log(`🔧 Assessly Frontend - Development Mode`);
  console.log(`📦 Version: ${window.APP_VERSION}`);
  console.log(`🌍 Environment: ${window.APP_ENV}`);
}
