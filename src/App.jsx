import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './styles/global.css';

/**
 * 🚀 Production Application Bootstrap
 * Optimized for performance, error handling, and user experience
 */

// Performance monitoring and error tracking
const initializeProductionFeatures = () => {
  if (import.meta.env.PROD) {
    // Production logging (minimal)
    console.log('🚀 Assessly - Production Mode Active');
    
    // Optional: Initialize analytics/monitoring service
    // Example: Google Analytics, Sentry, etc.
  }
};

// Global error handlers
const registerGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default browser error reporting in production
    if (import.meta.env.PROD) {
      event.preventDefault();
    }
  });

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error);
    
    // In production, you might want to send this to an error tracking service
    if (import.meta.env.PROD && window.sentry) {
      window.sentry.captureException(event.error);
    }
  });

  // Handle network errors
  window.addEventListener('offline', () => {
    console.warn('Application is offline');
  });

  window.addEventListener('online', () => {
    console.info('Application is back online');
  });
};

// Performance optimizations
const enablePerformanceOptimizations = () => {
  // Preload critical resources only if not in data saver mode
  if ('connection' in navigator && navigator.connection.saveData) {
    return;
  }

  // Critical preloads for better LCP (Largest Contentful Paint)
  const criticalResources = [
    // Add paths to critical fonts, images, etc.
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) link.type = resource.type;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Application initialization with error recovery
const initializeApplication = () => {
  const rootElement = document.getElementById('root');

  // Critical error: Root element not found
  if (!rootElement) {
    console.error('❌ Critical: Root element (#root) not found in DOM');
    
    // Create emergency fallback UI
    const emergencyUI = document.createElement('div');
    emergencyUI.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
    `;
    emergencyUI.innerHTML = `
      <div style="padding: 2rem; max-width: 400px;">
        <h1 style="margin-bottom: 1rem; font-size: 2rem;">Assessly</h1>
        <p style="margin-bottom: 1.5rem; opacity: 0.9;">
          We're experiencing technical difficulties. Please refresh the page.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 0.75rem 1.5rem;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          "
          onmouseover="this.style.transform='translateY(-1px)'"
          onmouseout="this.style.transform='translateY(0)'"
        >
          Refresh Application
        </button>
      </div>
    `;
    
    document.body.appendChild(emergencyUI);
    return;
  }

  try {
    // Initialize React root with error boundary
    const root = createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ Assessly application successfully mounted');

  } catch (error) {
    console.error('❌ Failed to render React application:', error);
    
    // Fallback rendering attempt
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
        <h1 style="color: #d32f2f; margin-bottom: 1rem;">Application Error</h1>
        <p style="margin-bottom: 1.5rem; color: #666;">
          We're sorry, but something went wrong. Our team has been notified.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 0.75rem 1.5rem;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
          "
        >
          Try Again
        </button>
        <p style="margin-top: 1.5rem; font-size: 0.875rem; color: #999;">
          If the problem persists, please contact support.
        </p>
      </div>
    `;
  }
};

// Progressive enhancement: Wait for DOM readiness
const startApplication = () => {
  // Initialize production features first
  initializeProductionFeatures();
  registerGlobalErrorHandlers();

  // Start application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enablePerformanceOptimizations();
      initializeApplication();
    });
  } else {
    enablePerformanceOptimizations();
    initializeApplication();
  }
};

// Development utilities (tree-shaken in production)
if (import.meta.env.DEV) {
  // Expose app version and environment for debugging
  window.APP_DEBUG = {
    version: import.meta.env.VITE_APP_VERSION || 'development',
    environment: 'development',
    buildTime: new Date().toISOString(),
  };

  // Hot Module Replacement support
  if (import.meta.hot) {
    import.meta.hot.accept();
  }
}

// Start the application
startApplication();

/**
 * 📊 Optional: Performance Observers for monitoring
 */
if ('PerformanceObserver' in window) {
  // Monitor Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    
    if (import.meta.env.DEV) {
      console.log('LCP:', lastEntry.startTime.toFixed(2), 'ms');
    }
  });
  
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  // Monitor First Input Delay
  const fidObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      const delay = entry.processingStart - entry.startTime;
      
      if (import.meta.env.DEV) {
        console.log('FID:', delay.toFixed(2), 'ms');
      }
    });
  });
  
  fidObserver.observe({ type: 'first-input', buffered: true });
  }
