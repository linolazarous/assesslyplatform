// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import './styles/global.css';

// Import analytics utilities
import { initAnalytics as initCustomAnalytics, isAnalyticsConfigured } from './utils/analytics';

/**
 * 🚀 Production Monitoring & Performance Tracking
 */
const initMonitoring = () => {
  // Log application startup
  const appStartTime = performance.now();
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const environment = import.meta.env.MODE || 'development';
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
  const customAnalyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  console.group('🚀 Assessly Platform - Startup');
  console.log(`📦 Version: ${appVersion}`);
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 API: ${apiUrl}`);
  console.log(`📊 Custom Analytics: ${customAnalyticsEndpoint ? 'Configured' : 'Not configured'}`);
  console.log(`📈 Google Analytics: ${gaMeasurementId ? 'Configured' : 'Not configured'}`);
  console.log(`🕒 Start Time: ${new Date().toISOString()}`);
  console.groupEnd();

  // Store metrics for debugging
  window.appMetrics = {
    startTime: appStartTime,
    version: appVersion,
    environment,
    apiUrl,
    customAnalyticsConfigured: !!customAnalyticsEndpoint,
    googleAnalyticsConfigured: !!gaMeasurementId,
  };
};

/**
 * 🔐 Global Error Handling & Resilience
 */
const registerErrorHandlers = () => {
  // Track if we've already handled an error to prevent duplicates
  let isHandlingError = false;

  // Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isHandlingError) return;
    isHandlingError = true;
    
    console.error('🔴 Unhandled Promise Rejection:', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
    
    // Prevent default browser error handling
    event.preventDefault();
    
    // Reset handling flag after a delay
    setTimeout(() => { isHandlingError = false; }, 100);
  });

  // Global JavaScript Errors
  window.addEventListener('error', (event) => {
    if (isHandlingError) return;
    isHandlingError = true;
    
    console.error('🔴 Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
    
    // Reset handling flag after a delay
    setTimeout(() => { isHandlingError = false; }, 100);
    
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
        await new Promise(resolve => {
          if (document.readyState !== 'loading') {
            resolve();
          } else {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
          }
        });
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('✅ Service Worker registered:', {
        scope: registration.scope,
        state: registration.active?.state,
      });

      // Handle service worker updates
      let updateInterval;
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Service Worker update found:', newWorker?.state);
        
        // Clear any existing update interval
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        
        newWorker?.addEventListener('statechange', () => {
          console.log(`🔄 Service Worker state: ${newWorker.state}`);
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New content is available; please refresh.');
          }
        });
      });

      // Check for updates periodically (only if active)
      if (registration.active) {
        updateInterval = setInterval(() => {
          registration.update().catch(err => {
            console.debug('Service worker update check:', err.message);
          });
        }, 60 * 60 * 1000); // Check for updates every hour
      }

      // Cleanup interval on page unload
      window.addEventListener('beforeunload', () => {
        if (updateInterval) {
          clearInterval(updateInterval);
        }
      });

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
 * 📈 Google Analytics Initialization
 */
const initGoogleAnalytics = () => {
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  // Only initialize if GA measurement ID is provided and valid
  const isValidGAMeasurementId = gaMeasurementId && (
    gaMeasurementId.startsWith('G-') || // Google Analytics 4
    gaMeasurementId.startsWith('UA-')   // Universal Analytics
  );
  
  if (isValidGAMeasurementId && import.meta.env.PROD) {
    try {
      // Initialize Google Analytics
      if (!window.gtag) {
        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', gaMeasurementId, {
          page_title: document.title,
          page_location: window.location.href,
          transport_type: 'beacon',
        });
      }

      console.log('✅ Google Analytics initialized with ID:', gaMeasurementId);
      return true;
    } catch (error) {
      console.warn('⚠️ Google Analytics initialization failed:', error);
      return false;
    }
  } else if (gaMeasurementId && !isValidGAMeasurementId) {
    console.warn('⚠️ Invalid Google Analytics Measurement ID format:', gaMeasurementId);
  } else {
    console.log('ℹ️ Google Analytics not configured or disabled in development');
  }
  return false;
};

/**
 * 📊 Custom Analytics Initialization
 */
const initCustomAnalyticsService = async () => {
  const customAnalyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  
  if (!customAnalyticsEndpoint) {
    console.log('ℹ️ Custom analytics not configured - VITE_ANALYTICS_ENDPOINT is not set');
    return false;
  }

  try {
    // Initialize custom analytics service
    const initialized = await initCustomAnalytics({
      endpoint: customAnalyticsEndpoint,
      enableBatch: true,
      requireConsent: true,
    });
    
    if (initialized) {
      console.log('✅ Custom analytics service initialized:', customAnalyticsEndpoint);
      return true;
    } else {
      console.log('ℹ️ Custom analytics service not initialized (user consent required)');
      return false;
    }
  } catch (error) {
    console.error('⚠️ Custom analytics service initialization failed:', error);
    return false;
  }
};

/**
 * 📈 Combined Analytics & Telemetry Initialization
 */
const initAllAnalytics = async () => {
  console.group('📊 Analytics Initialization');
  
  // Initialize Google Analytics (non-blocking)
  const gaInitialized = initGoogleAnalytics();
  
  // Initialize custom analytics service
  const customAnalyticsInitialized = await initCustomAnalyticsService();
  
  // Set up global error tracking function
  window.trackError = (error, context = {}) => {
    // Send to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error?.message || 'Unknown error',
        fatal: error?.fatal !== false,
        ...context,
      });
    }
    
    // Send to custom analytics if available
    const customAnalytics = window.trackEvent;
    if (customAnalytics && typeof customAnalytics === 'function') {
      customAnalytics('error', {
        error_message: error?.message,
        error_type: error?.name,
        ...context,
      });
    }
    
    // Send to backend error tracking endpoint if not a network error
    const isNetworkError = error?.message?.includes('Network') || 
                          error?.code === 'NETWORK_ERROR';
    
    if (!isNetworkError) {
      const errorData = {
        error: error?.message,
        stack: error?.stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...context,
      };
      
      // Use sendBeacon for better performance
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/telemetry/error', JSON.stringify(errorData));
      }
    }
  };

  console.log('✅ Analytics initialization complete', {
    googleAnalytics: gaInitialized,
    customAnalytics: customAnalyticsInitialized,
  });
  console.groupEnd();
};

/**
 * 🎯 Application Initialization & Bootstrap
 */
const initializeApp = async () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Root element (#root) not found in DOM');
    // Minimal fallback without inline event handlers
    const fallbackHTML = `
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
          <button id="reload-btn" style="
            padding: 1rem 2rem;
            font-size: 1.1rem;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
          ">
            Reload Application
          </button>
        </div>
      </div>
    `;
    
    document.body.innerHTML = fallbackHTML;
    
    // Add event listener properly
    document.getElementById('reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
    
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
            width: 60px;
            height: 60px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          <div style="
            color: #2d3748;
            font-size: 1.1rem;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

    // Register service worker (non-blocking)
    registerServiceWorker().catch(err => {
      console.debug('Service worker failed silently:', err.message);
    });

    // Create React root
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

    // Initialize all analytics services after a delay (non-blocking)
    setTimeout(() => {
      initAllAnalytics().catch(error => {
        console.error('Failed to initialize analytics:', error);
      });
    }, 1500);

    // Dispatch app ready event
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('app:ready'));
      console.log('✅ Application ready');
    }, 500);

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Enhanced fallback UI with proper event handling
    const errorHTML = `
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
            ${error.toString().replace(/[<>]/g, '')}
          </div>
          
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="reload-btn" style="
              padding: 0.8rem 2rem;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            ">
              Reload Application
            </button>
            
            <button id="home-btn" style="
              padding: 0.8rem 2rem;
              background: #2ecc71;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            ">
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
    
    rootElement.innerHTML = errorHTML;
    
    // Add event listeners properly
    document.getElementById('reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('home-btn')?.addEventListener('click', () => {
      window.location.href = '/';
    });
    
    // Add hover effects via JavaScript
    const reloadBtn = document.getElementById('reload-btn');
    const homeBtn = document.getElementById('home-btn');
    
    if (reloadBtn) {
      reloadBtn.addEventListener('mouseover', () => {
        reloadBtn.style.background = '#2980b9';
      });
      reloadBtn.addEventListener('mouseout', () => {
        reloadBtn.style.background = '#3498db';
      });
    }
    
    if (homeBtn) {
      homeBtn.addEventListener('mouseover', () => {
        homeBtn.style.background = '#27ae60';
      });
      homeBtn.addEventListener('mouseout', () => {
        homeBtn.style.background = '#2ecc71';
      });
    }
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
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
  } else {
    // Use setTimeout to ensure other initialization completes
    setTimeout(initializeApp, 0);
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
    customAnalyticsEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || 'Not configured',
    gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || 'Not configured',
    isProduction: import.meta.env.PROD,
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
      // Cleanup any global listeners
      window.appMetrics = null;
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
    getPerformanceMetrics: () => {
      const metrics = {};
      if (performance.getEntriesByType) {
        metrics.navigation = performance.getEntriesByType('navigation')[0];
        metrics.paint = performance.getEntriesByType('paint');
        metrics.resource = performance.getEntriesByType('resource');
      }
      return metrics;
    },
    testAnalytics: () => {
      console.group('🔍 Analytics System Test');
      console.log('Custom Analytics Endpoint:', import.meta.env.VITE_ANALYTICS_ENDPOINT || 'Not set');
      console.log('Google Analytics ID:', import.meta.env.VITE_GA_MEASUREMENT_ID || 'Not set');
      console.log('Is Production:', import.meta.env.PROD);
      
      // Test Google Analytics
      if (window.gtag) {
        console.log('✅ Google Analytics is available');
        console.log('Testing GA page view...');
        gtag('event', 'page_view', {
          page_title: 'Test Page',
          page_location: window.location.href,
        });
      } else {
        console.log('❌ Google Analytics not initialized');
      }
      
      // Test custom analytics
      if (window.trackEvent && typeof window.trackEvent === 'function') {
        console.log('✅ Custom analytics is available');
        console.log('Testing custom analytics event...');
        window.trackEvent('test_event', { test: true, timestamp: new Date().toISOString() });
      } else {
        console.log('❌ Custom analytics not initialized');
      }
      
      // Test error tracking
      if (window.trackError && typeof window.trackError === 'function') {
        console.log('✅ Error tracking is available');
      }
      
      console.groupEnd();
    },
    getAnalyticsStatus: () => {
      return {
        googleAnalytics: {
          configured: !!import.meta.env.VITE_GA_MEASUREMENT_ID,
          initialized: !!window.gtag,
        },
        customAnalytics: {
          configured: !!import.meta.env.VITE_ANALYTICS_ENDPOINT,
          initialized: !!(window.trackEvent && typeof window.trackEvent === 'function'),
        },
      };
    },
  };
}
