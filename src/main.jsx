// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './styles/global.css';

/**
 * 🚀 Production Monitoring & Performance Tracking
 */
const initMonitoring = () => {
  // Log application startup
  const appStartTime = performance.now();
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const environment = import.meta.env.MODE || 'development';
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
  
  console.group('🚀 Assessly Platform - Startup');
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 API: ${apiUrl}`);
  console.log(`🕒 Start Time: ${new Date().toISOString()}`);
  console.groupEnd();

  // Performance monitoring
  if (import.meta.env.PROD) {
    window.appMetrics = {
      startTime: appStartTime,
      version: appVersion,
      environment,
    };

    // Track page load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now() - appStartTime;
      const timeToInteractive = performance.now() - performance.timing.domInteractive;
      
      console.log(`📊 Page loaded in ${Math.round(loadTime)}ms`);
      console.log(`⚡ Time to interactive: ${Math.round(timeToInteractive)}ms`);
      
      // Send performance metrics to analytics (if configured)
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'page_load',
          value: Math.round(loadTime),
          event_category: 'Performance',
        });
      }
    });

    // Track First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log(`🎨 First Contentful Paint: ${Math.round(entry.startTime)}ms`);
        }
      }
    });
    observer.observe({ entryTypes: ['paint'] });
  }
};

/**
 * 🔐 Global Error Handling & Resilience
 */
const registerErrorHandlers = () => {
  // Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 Unhandled Promise Rejection:', {
      reason: event.reason,
      promise: event.promise,
      stack: event.reason?.stack,
    });
    
    // Prevent default browser error handling
    event.preventDefault();
    
    // Send to error tracking service in production
    if (import.meta.env.PROD && window.trackError) {
      window.trackError(event.reason, {
        type: 'unhandled_rejection',
        url: window.location.href,
      });
    }
  });

  // Global JavaScript Errors
  window.addEventListener('error', (event) => {
    console.error('🔴 Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
    
    // Send to error tracking service in production
    if (import.meta.env.PROD && window.trackError) {
      window.trackError(event.error, {
        type: 'global_error',
        url: window.location.href,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    }
    
    // Allow default handling for critical errors
    return false;
  });

  // Network Error Monitoring
  window.addEventListener('offline', () => {
    console.warn('🌐 Network: Offline');
    document.dispatchEvent(new CustomEvent('network:offline'));
  });

  window.addEventListener('online', () => {
    console.info('🌐 Network: Online');
    document.dispatchEvent(new CustomEvent('network:online'));
  });
};

/**
 * 🔧 Progressive Web App Features
 */
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      // Wait for page to be fully loaded
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('✅ Service Worker registered:', {
        scope: registration.scope,
        state: registration.active?.state,
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found:', newWorker?.state);
        
        newWorker?.addEventListener('statechange', () => {
          console.log(`🔄 Service Worker state: ${newWorker.state}`);
        });
      });

      // Check for updates periodically
      if (registration.active) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check for updates every hour
      }

      return registration;
    } catch (error) {
      console.warn('⚠️ Service Worker registration failed:', {
        error: error.message,
        name: error.name,
      });
      return null;
    }
  }
  return null;
};

/**
 * 📈 Analytics & Telemetry Initialization
 */
const initAnalytics = () => {
  // Only initialize in production if analytics key is provided
  const analyticsKey = import.meta.env.VITE_ANALYTICS_KEY;
  if (analyticsKey && import.meta.env.PROD) {
    try {
      // Google Analytics
      if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', analyticsKey, {
          page_title: document.title,
          page_location: window.location.href,
        });
      }

      // Custom error tracking
      window.trackError = (error, context = {}) => {
        if (window.gtag) {
          gtag('event', 'exception', {
            description: error?.message || 'Unknown error',
            fatal: true,
            ...context,
          });
        }
        
        // Send to your error tracking service
        fetch('/api/v1/telemetry/error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error?.message,
            stack: error?.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...context,
          }),
        }).catch(() => {
          // Silently fail if telemetry endpoint is not available
        });
      };

      console.log('📈 Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error);
    }
  }
};

/**
 * 🎯 Application Initialization & Bootstrap
 */
const initializeApp = async () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Root element (#root) not found in DOM');
    document.body.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        text-align: center;
        padding: 2rem;
      ">
        <div>
          <h1 style="font-size: 3rem; margin-bottom: 1rem;">⚠️ Application Error</h1>
          <p style="font-size: 1.2rem; margin-bottom: 2rem; max-width: 600px;">
            Root container element not found. This is a critical setup issue.
          </p>
          <button onclick="window.location.reload()" style="
            padding: 1rem 2rem;
            font-size: 1.1rem;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            Reload Application
          </button>
        </div>
      </div>
    `;
    return;
  }

  try {
    // Register service worker early (non-blocking)
    const swRegistration = registerServiceWorker();

    // Create React root and render
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

    console.log('✅ React application mounted successfully');

    // Wait for service worker registration
    if (swRegistration) {
      await swRegistration;
    }

    // Initialize analytics
    initAnalytics();

    // Dispatch app ready event
    document.dispatchEvent(new CustomEvent('app:ready'));

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Fallback UI for catastrophic failures
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        padding: 2rem;
        text-align: center;
        background: #f8f9fa;
        color: #495057;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 3rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 600px;
          width: 100%;
        ">
          <h1 style="
            font-size: 2.5rem;
            color: #e74c3c;
            margin-bottom: 1rem;
          ">⚠️ Application Failed to Load</h1>
          
          <p style="
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
            color: #6c757d;
          ">
            We're sorry, but the application encountered a critical error during startup.
            Our team has been notified of this issue.
          </p>
          
          <div style="
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            text-align: left;
            overflow: auto;
            max-height: 200px;
          ">
            ${error.toString()}
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button onclick="window.location.reload()" style="
              padding: 0.8rem 2rem;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
              Reload Application
            </button>
            
            <button onclick="window.location.href='/'" style="
              padding: 0.8rem 2rem;
              background: #2ecc71;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            " onmouseover="this.style.background='#27ae60'" onmouseout="this.style.background='#2ecc71'">
              Go to Homepage
            </button>
          </div>
          
          <p style="margin-top: 2rem; font-size: 0.9rem; color: #95a5a6;">
            If this issue persists, please contact 
            <a href="mailto:assesslyinc@gmail.com" style="color: #3498db; text-decoration: none;">
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
  // Initialize monitoring and error handlers first
  initMonitoring();
  registerErrorHandlers();

  // Start application initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
};

// Start the application
startApplication();

/**
 * 🛠️ Development Utilities & Global Helpers
 */
if (import.meta.env.DEV) {
  // Expose app version and environment globally for debugging
  window.APP_INFO = {
    version: import.meta.env.VITE_APP_VERSION || 'development',
    environment: import.meta.env.MODE,
    buildTime: new Date().toISOString(),
    apiUrl: import.meta.env.VITE_API_BASE_URL,
  };

  // Development console styling
  console.log('%c🔧 Assessly Development Mode', `
    font-size: 16px;
    font-weight: bold;
    color: white;
    background: linear-gradient(90deg, #667eea, #764ba2);
    padding: 8px 16px;
    border-radius: 4px;
  `);
  
  console.table(window.APP_INFO);

  // Hot Module Replacement for development
  if (import.meta.hot) {
    import.meta.hot.accept();
    
    // Cleanup on HMR
    import.meta.hot.dispose(() => {
      console.log('🔄 Hot Module Replacement - Cleaning up');
    });
  }

  // Development-only utilities
  window.devUtils = {
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🗑️ Storage cleared');
      window.location.reload();
    },
    simulateNetworkError: () => {
      console.warn('🌐 Simulating network error');
      document.dispatchEvent(new CustomEvent('network:offline'));
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('network:online'));
      }, 5000);
    },
    getAppMetrics: () => window.appMetrics,
  };
}
