const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Track only when ID exists + in browser + production build
const isEnabled =
  typeof window !== "undefined" &&
  import.meta.env.PROD &&
  GA_MEASUREMENT_ID;

// Add the missing export
export const isAnalyticsConfigured = () => {
  return !!GA_MEASUREMENT_ID;
};

function loadGA() {
  if (!isEnabled) return;

  // Create Google Analytics gtag script
  (function installGTAG() {
    // Check if script is already loaded
    if (document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
      return;
    }
    
    const script = document.createElement("script");
    script.setAttribute("async", "");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  })();

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
  
  // Add additional configuration for better tracking
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll handle page views manually
    cookie_flags: "SameSite=None;Secure",
    allow_google_signals: true,
    allow_ad_personalization_signals: true
  });
}

export function trackPageView(path) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("event", "page_view", { 
      page_path: path,
      page_location: window.location.href,
      page_title: document.title
    });
  }
}

export function trackEvent(eventName, eventParams = {}) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
}

export function trackUserInteraction(action, category, label = '', value = 0) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
}

export function trackError(error, errorSource = 'app') {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("event", "exception", {
      description: error.message || error.toString(),
      fatal: false,
      source: errorSource
    });
  }
}

export function trackPerformanceTiming(timingData) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("event", "performance_timing", timingData);
  }
}

export function setUserId(userId) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: userId
    });
  }
}

export function clearUserId() {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      user_id: null
    });
  }
}

export function setUserProperties(properties) {
  if (!isEnabled) return;
  
  if (window.gtag) {
    window.gtag("set", "user_properties", properties);
  }
}

export function initAnalytics() {
  loadGA();
  
  // Only log in development for debugging
  if (import.meta.env.DEV) {
    console.log("%cAnalytics Initialized (GA4)", "color:#4caf50;font-weight:bold");
    console.log(`%cMeasurement ID: ${GA_MEASUREMENT_ID || 'Not set'}`, "color:#2196f3");
    console.log(`%cMode: ${import.meta.env.MODE}`, "color:#9c27b0");
    console.log(`%cEnabled: ${isEnabled}`, isEnabled ? "color:#4caf50" : "color:#ff9800");
  }
}

// Helper function to check if GA script is loaded
export function isGALoaded() {
  return typeof window.gtag !== 'undefined';
}

// Get current analytics configuration
export function getAnalyticsConfig() {
  return {
    measurementId: GA_MEASUREMENT_ID,
    enabled: isEnabled,
    mode: import.meta.env.MODE,
    isProduction: import.meta.env.PROD
  };
}

// Enhanced error tracking with more context
export function trackEnhancedError(error, context = {}) {
  if (!isEnabled) return;
  
  const errorDetails = {
    message: error?.message || 'Unknown error',
    name: error?.name,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Analytics Error:', errorDetails);
  }

  // Track to GA
  if (window.gtag) {
    window.gtag("event", "exception", {
      description: errorDetails.message,
      fatal: false,
      error_name: errorDetails.name,
      error_context: JSON.stringify(context)
    });
  }
}

export default {
  initAnalytics,
  trackPageView,
  trackEvent,
  trackUserInteraction,
  trackError,
  trackEnhancedError,
  trackPerformanceTiming,
  setUserId,
  clearUserId,
  setUserProperties,
  isAnalyticsConfigured,
  isGALoaded,
  getAnalyticsConfig
};
