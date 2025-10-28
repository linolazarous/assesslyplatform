// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
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
  }
};

// Error handler for uncaught errors
const registerErrorHandlers = () => {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error);
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

    // Render the app
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

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
  // Expose app version for debugging
  window.APP_VERSION = import.meta.env.VITE_APP_VERSION || 'development';
  
  // Hot Module Replacement for development
  if (import.meta.hot) {
    import.meta.hot.accept();
  }
}
