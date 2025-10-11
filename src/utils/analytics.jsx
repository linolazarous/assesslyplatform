import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// NOTE: All Firebase/Google Analytics imports and configuration removed.
// The service now relies on internal console logging or a generic tracking function.

// ----------------------------------------------------------------------
// Mock/Generic Tracker Function
// In production, this function would send data to a service like Amplitude,
// PostHog, or a custom backend endpoint.
// ----------------------------------------------------------------------
const genericTracker = {
    // Mock initialization: checks if tracking is allowed (e.g., based on user consent)
    isInitialized: typeof window !== 'undefined', 

    sendEvent: (name, params) => {
        if (!genericTracker.isInitialized) {
            console.warn(`[Analytics] Attempted to track event '${name}' before initialization.`);
            return;
        }
        
        // Log the event payload to the console for monitoring in development/production
        const payload = {
            eventName: name,
            ...params,
            timestamp: new Date().toISOString(),
            app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        };
        console.log('[Analytics Event Fired]', payload);
    },
    
    setUserId: (userId) => {
        if (!genericTracker.isInitialized) return;
        console.log(`[Analytics] User ID set: ${userId}`);
        // Here you would call trackingService.identify(userId)
    },

    setUserProperties: (properties) => {
        if (!genericTracker.isInitialized) return;
        console.log('[Analytics] User properties set:', properties);
    }
};
// ----------------------------------------------------------------------

/**
 * Tracks a custom event using the generic tracking mechanism.
 * @param {string} name - Event name (e.g., 'button_click', 'assessment_submit').
 * @param {Object} [params={}] - Event parameters.
 */
export const trackEvent = (name, params = {}) => {
  // Use the generic tracker instead of logEvent
  genericTracker.sendEvent(name, params);
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
 * Tracks an error or exception event.
 * @param {Error | string} error - The error or error message.
 * @param {Object} [context={}] - Additional context for the error.
 */
export const trackError = (error, context = {}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  trackEvent('exception', {
    description: errorMessage,
    fatal: false, // Assume non-fatal unless explicitly marked
    ...context
  });
};

/**
 * Hook to automatically track page views on route changes.
 * Recommended use: Import and call this hook in your main App component.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Note: In production apps, you might want to debounce or throttle 
    // this call if navigation is extremely rapid.
    trackPageView(location.pathname); 
  }, [location.pathname]);
};

/**
 * Initializes user properties for tracking.
 * @param {string} userId - The unique user ID.
 */
export const initAnalytics = (userId) => {
  if (userId) {
    genericTracker.setUserId(userId);
    
    // Set default user properties based on app logic
    genericTracker.setUserProperties({
      sign_up_method: 'email', 
      account_type: 'authenticated',
      role: 'unknown' // Role should be updated using claims from AuthContext
    });
  }
};
