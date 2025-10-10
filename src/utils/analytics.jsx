import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnalytics, logEvent } from 'firebase/analytics';
// Assuming this path is correct for your Firebase initialization
import { app } from '../firebase/firebase.js'; 

// Initialize analytics conditionally only once in the browser environment
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

/**
 * Tracks a custom event in Google Analytics.
 * @param {string} name - Event name.
 * @param {Object} [params={}] - Event parameters.
 */
export const trackEvent = (name, params = {}) => {
  if (!analytics) return;
  
  try {
    logEvent(analytics, name, {
      ...params,
      // Ensure environment variables are correctly accessed (Vite uses import.meta.env)
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0', 
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

/**
 * Tracks a page view event.
 * @param {string} path - The current page path.
 */
export const trackPageView = (path) => {
  trackEvent('page_view', {
    page_path: path,
    page_title: document.title
  });
};

/**
 * Tracks an error event.
 * @param {Error} error - The error object.
 * @param {Object} [context={}] - Additional context for the error.
 */
export const trackError = (error, context = {}) => {
  trackEvent('exception', {
    description: error.message,
    fatal: false,
    ...context
  });
};

/**
 * Hook to automatically track page views on route changes.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Debounce or throttle this in a real app to prevent excessive events on fast navigation
    trackPageView(location.pathname); 
  }, [location.pathname]); // Dependency on location.pathname is correct
};

/**
 * Initializes user properties in Google Analytics.
 * @param {string} userId - The unique user ID.
 */
export const initAnalytics = (userId) => {
  if (analytics && userId) {
    // Set user ID for analytics
    analytics.setUserId(userId);
    
    // Set user properties
    analytics.setUserProperties({
      // Use dynamic values from your auth/claims if possible
      sign_up_method: 'email', 
      account_type: 'free_trial'
    });
  }
};
