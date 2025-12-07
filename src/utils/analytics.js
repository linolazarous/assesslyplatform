// src/utils/analytics.js
/**
 * Analytics service for Assessly Platform
 * Handles event tracking, user analytics, and performance monitoring
 * GDPR compliant with user consent management
 * Production-ready with enhanced resilience
 */

// Configuration - Use environment variables with fallbacks
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '';
const ENABLE_CONSOLE_LOG = import.meta.env.MODE === 'development';
const BATCH_SIZE = parseInt(import.meta.env.VITE_ANALYTICS_BATCH_SIZE || '10', 10);
const BATCH_INTERVAL = parseInt(import.meta.env.VITE_ANALYTICS_BATCH_INTERVAL || '5000', 10);
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_OFFLINE_STORAGE = 100; // Maximum events to store offline

/**
 * Check if analytics endpoint is configured and valid
 */
export const isAnalyticsConfigured = () => {
  if (!ANALYTICS_ENDPOINT || ANALYTICS_ENDPOINT.trim() === '') {
    return false;
  }
  
  try {
    // Validate URL format
    new URL(ANALYTICS_ENDPOINT);
    return true;
  } catch (error) {
    console.warn('Invalid analytics endpoint URL:', error.message);
    return false;
  }
};

// Event types - add more business-specific events
export const EVENT_TYPES = Object.freeze({
  // Page & Navigation
  PAGE_VIEW: 'page_view',
  PAGE_EXIT: 'page_exit',
  
  // User Actions
  BUTTON_CLICK: 'button_click',
  LINK_CLICK: 'link_click',
  FORM_SUBMIT: 'form_submit',
  FORM_START: 'form_start',
  FORM_ABANDON: 'form_abandon',
  
  // Assessments
  ASSESSMENT_START: 'assessment_start',
  ASSESSMENT_COMPLETE: 'assessment_complete',
  ASSESSMENT_SCORE: 'assessment_score',
  ASSESSMENT_ABANDON: 'assessment_abandon',
  ASSESSMENT_PAUSE: 'assessment_pause',
  ASSESSMENT_RESUME: 'assessment_resume',
  
  // Authentication
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  
  // Subscriptions
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_RENEWAL: 'subscription_renewal',
  
  // Business Actions
  ORGANIZATION_CREATE: 'organization_create',
  ORGANIZATION_INVITE: 'organization_invite',
  TEAM_MEMBER_ADD: 'team_member_add',
  ASSESSMENT_CREATE: 'assessment_create',
  ASSESSMENT_SHARE: 'assessment_share',
  ASSESSMENT_EXPORT: 'assessment_export',
  RESPONSE_SUBMIT: 'response_submit',
  REPORT_GENERATE: 'report_generate',
  
  // System Events
  ERROR: 'error',
  PERFORMANCE: 'performance',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Search & Filter
  SEARCH: 'search',
  FILTER: 'filter',
  SORT: 'sort',
  
  // Downloads & Exports
  DOWNLOAD: 'download',
  EXPORT: 'export',
  IMPORT: 'import',
  
  // Custom Events
  CUSTOM: 'custom_event'
});

// Add severity levels for errors
export const ERROR_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

// State management
let state = {
  sessionId: null,
  sessionStartTime: null,
  lastActivityTime: null,
  queuedEvents: [],
  batchTimer: null,
  userId: null,
  userProperties: {},
  organizationId: null,
  isInitialized: false,
  isFlushing: false,
  eventListeners: [],
  activityInterval: null,
  sessionInterval: null,
  userConsent: false,
  deviceId: null,
  isOnline: true,
  failedEvents: [],
  metrics: {
    totalEvents: 0,
    sentEvents: 0,
    failedEvents: 0,
    droppedEvents: 0
  }
};

/**
 * Get safe state access
 */
function getState() {
  return { ...state };
}

function updateState(updates) {
  state = { ...state, ...updates };
}

/**
 * Initialize analytics service with enhanced error handling
 */
export const initAnalytics = async (config = {}) => {
  if (state.isInitialized) {
    logDebug('Analytics already initialized');
    return true;
  }

  // Safety check for browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('Analytics requires browser environment');
    return false;
  }

  // Check if analytics endpoint is configured
  if (!isAnalyticsConfigured()) {
    console.warn('Analytics not configured - VITE_ANALYTICS_ENDPOINT is not set or empty');
    return false;
  }

  const {
    userId: initialUserId = null,
    organizationId: initialOrgId = null,
    userProperties: initialUserProps = {},
    enableBatch = true,
    requireConsent = true,
    autoTrackPageViews = true,
    autoTrackErrors = true,
    autoTrackPerformance = true
  } = config;

  // Check user consent
  let userConsent = !requireConsent || hasUserConsent();
  if (!userConsent && requireConsent) {
    logDebug('Analytics disabled - user consent required');
    return false;
  }

  updateState({
    userId: initialUserId,
    organizationId: initialOrgId,
    userProperties: { ...initialUserProps },
    userConsent
  });

  try {
    // Generate device ID (anonymous, GDPR compliant)
    const deviceId = generateDeviceIdentifier();
    
    // Load saved session data
    loadSessionData();
    
    // Initialize session
    if (!state.sessionId) {
      startNewSession();
    }

    // Start session heartbeat
    startSessionHeartbeat();

    // Start batch processing if enabled
    if (enableBatch) {
      startBatchProcessing();
    }

    // Set up automatic tracking
    if (autoTrackPageViews) {
      setupPageViewTracking();
    }
    
    if (autoTrackErrors) {
      setupErrorTracking();
    }
    
    if (autoTrackPerformance) {
      setupPerformanceTracking();
    }

    // Network status monitoring
    setupNetworkMonitoring();

    // Process any offline events
    await processOfflineEvents();

    // Track initialization
    trackEventInternal('analytics_initialized', {
      sessionId: state.sessionId,
      deviceId,
      timestamp: new Date().toISOString(),
      config: {
        enableBatch,
        requireConsent,
        autoTrackPageViews,
        autoTrackErrors,
        autoTrackPerformance
      }
    });

    updateState({
      deviceId,
      isInitialized: true
    });
    
    logDebug('Analytics initialized', {
      sessionId: state.sessionId,
      userId: state.userId,
      deviceId,
      organizationId: state.organizationId,
      endpoint: ANALYTICS_ENDPOINT
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    trackErrorSilently(error, { context: 'initAnalytics' });
    return false;
  }
};

/**
 * Enhanced device identifier with browser fingerprinting (anonymous)
 */
function generateDeviceIdentifier() {
  try {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown'
    };

    // Create a stable hash (not for security, just for identification)
    const jsonString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `device_${Math.abs(hash).toString(36)}_${fingerprint.platform.toLowerCase().replace(/\s+/g, '_')}`;
  } catch (error) {
    console.error('Failed to generate device identifier:', error);
    return 'unknown_device';
  }
}

/**
 * Setup automatic page view tracking
 */
function setupPageViewTracking() {
  let lastPath = window.location.pathname;
  
  const trackPageChange = () => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      trackPageView(currentPath, document.title);
      lastPath = currentPath;
    }
  };
  
  // Use MutationObserver to track SPA page changes
  const observer = new MutationObserver(() => {
    trackPageChange();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also track popstate for browser navigation
  window.addEventListener('popstate', trackPageChange);
  
  // Track initial page view
  setTimeout(() => {
    trackPageView(window.location.pathname, document.title);
  }, 100);
}

/**
 * Setup automatic error tracking
 */
function setupErrorTracking() {
  // Global error handler
  window.addEventListener('error', (event) => {
    trackError({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    }, {
      severity: ERROR_SEVERITY.HIGH,
      component: 'global',
      context: 'unhandled_error'
    });
  });
  
  // Promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason, {
      severity: ERROR_SEVERITY.MEDIUM,
      component: 'promise',
      context: 'unhandled_rejection'
    });
  });
}

/**
 * Setup performance tracking
 */
function setupPerformanceTracking() {
  if (window.performance && window.performance.timing) {
    const perf = window.performance.timing;
    
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = {
          pageLoadTime: perf.loadEventEnd - perf.navigationStart,
          domReadyTime: perf.domContentLoadedEventEnd - perf.navigationStart,
          requestTime: perf.responseEnd - perf.requestStart,
          dnsTime: perf.domainLookupEnd - perf.domainLookupStart,
          tcpTime: perf.connectEnd - perf.connectStart,
          whiteScreenTime: perf.responseStart - perf.navigationStart
        };
        
        trackEvent(EVENT_TYPES.PERFORMANCE, metrics, {
          pageUrl: window.location.href,
          pageType: 'initial_load'
        });
      }, 0);
    });
  }
}

/**
 * Setup network monitoring
 */
function setupNetworkMonitoring() {
  const updateOnlineStatus = () => {
    const wasOnline = state.isOnline;
    const isNowOnline = navigator.onLine;
    
    updateState({ isOnline: isNowOnline });
    
    if (wasOnline && !isNowOnline) {
      trackEvent('network_offline', {
        duration: Date.now()
      });
    } else if (!wasOnline && isNowOnline) {
      trackEvent('network_online', {
        offlineDuration: Date.now() - (state.lastActivityTime || Date.now())
      });
      
      // Retry failed events when back online
      retryFailedEvents();
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  updateOnlineStatus(); // Initial check
}

/**
 * Process offline events from storage
 */
async function processOfflineEvents() {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    if (offlineEvents.length === 0) return;

    logDebug('Processing offline events', { count: offlineEvents.length });
    
    // Add offline events to queue with priority
    offlineEvents.forEach(event => {
      event.metadata = event.metadata || {};
      event.metadata.priority = 'high'; // Mark as priority
      event.metadata.offline = true;
      queueEvent(event);
    });
    
    // Clear offline storage
    localStorage.removeItem('analytics_offline_events');
    
    logDebug('Offline events queued for sending');
  } catch (error) {
    console.error('Failed to process offline events:', error);
  }
}

/**
 * Retry failed events
 */
async function retryFailedEvents() {
  if (state.failedEvents.length === 0) return;
  
  logDebug('Retrying failed events', { count: state.failedEvents.length });
  
  const eventsToRetry = [...state.failedEvents];
  updateState({ failedEvents: [] });
  
  eventsToRetry.forEach(event => {
    event.metadata = event.metadata || {};
    event.metadata.retry = (event.metadata.retry || 0) + 1;
    queueEvent(event);
  });
}

/**
 * Enhanced queue management with priority
 */
function queueEvent(event) {
  if (!state.userConsent) {
    logDebug('Event skipped - no user consent');
    return;
  }

  // Enrich event with common properties
  const enrichedEvent = {
    ...event,
    metadata: {
      sessionId: state.sessionId,
      userId: state.userId,
      organizationId: state.organizationId,
      deviceId: state.deviceId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      pageTitle: document.title,
      ...event.metadata
    },
    userProperties: state.userProperties,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
    retryCount: 0
  };

  // Add to queue based on priority
  const priority = enrichedEvent.metadata.priority || 'normal';
  if (priority === 'high') {
    state.queuedEvents.unshift(enrichedEvent); // Add to beginning
  } else {
    state.queuedEvents.push(enrichedEvent); // Add to end
  }

  // Update metrics
  updateState({
    metrics: {
      ...state.metrics,
      totalEvents: state.metrics.totalEvents + 1
    }
  });

  // Log to console in development
  if (ENABLE_CONSOLE_LOG) {
    logDebug('Event queued', { 
      name: enrichedEvent.name,
      priority,
      queueSize: state.queuedEvents.length 
    });
  }

  // Trigger immediate flush if batch size reached or high priority event
  if ((state.queuedEvents.length >= BATCH_SIZE || priority === 'high') && !state.isFlushing) {
    flushEvents().catch(error => {
      console.error('Immediate flush error:', error);
    });
  }
}

/**
 * Enhanced flush with better error recovery
 */
async function flushEvents() {
  if (state.queuedEvents.length === 0 || state.isFlushing) {
    return;
  }

  updateState({ isFlushing: true });
  
  const eventsToSend = [...state.queuedEvents];
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  try {
    logDebug('Flushing events', { 
      count: eventsToSend.length, 
      batchId,
      isOnline: state.isOnline 
    });

    if (!state.isOnline) {
      throw new Error('Offline - cannot send events');
    }

    // Get authentication token safely
    let token = null;
    try {
      token = localStorage.getItem('assessly_token');
    } catch (storageError) {
      console.warn('Failed to access localStorage:', storageError);
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': state.sessionId || '',
      'X-Device-ID': state.deviceId || '',
      'X-Batch-ID': batchId,
      ...(token && { Authorization: `Bearer ${token}` })
    };

    const payload = {
      events: eventsToSend,
      batchId,
      sentAt: new Date().toISOString(),
      environment: import.meta.env.MODE
    };

    const response = await fetchWithRetry(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      mode: 'cors',
      credentials: 'same-origin'
    });

    if (response.ok) {
      // Remove sent events from queue
      const sentEventIds = new Set(eventsToSend.map(e => e.metadata?.eventId));
      const remainingEvents = state.queuedEvents.filter(event => 
        !sentEventIds.has(event.metadata?.eventId)
      );
      
      updateState({ 
        queuedEvents: remainingEvents,
        metrics: {
          ...state.metrics,
          sentEvents: state.metrics.sentEvents + eventsToSend.length
        }
      });
      
      logDebug('Events sent successfully', {
        count: eventsToSend.length,
        batchId,
        queueRemaining: remainingEvents.length
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send events:', error);
    
    // Update failed metrics
    updateState({
      metrics: {
        ...state.metrics,
        failedEvents: state.metrics.failedEvents + eventsToSend.length
      }
    });

    // Increment retry count for failed events
    eventsToSend.forEach(event => {
      event.retryCount = (event.retryCount || 0) + 1;
    });

    // Separate events that can be retried vs dropped
    const eventsToRetry = eventsToSend.filter(event => event.retryCount <= MAX_RETRIES);
    const eventsToDrop = eventsToSend.filter(event => event.retryCount > MAX_RETRIES);

    // Store retryable events in failed queue
    if (eventsToRetry.length > 0) {
      updateState({
        failedEvents: [...state.failedEvents, ...eventsToRetry]
      });
      
      // Store in offline storage for persistence
      storeOfflineEvents(eventsToRetry);
    }

    // Update dropped metrics
    if (eventsToDrop.length > 0) {
      updateState({
        metrics: {
          ...state.metrics,
          droppedEvents: state.metrics.droppedEvents + eventsToDrop.length
        }
      });
      
      console.warn('Events dropped after max retries:', eventsToDrop.length);
      
      // Log dropped events in development
      if (ENABLE_CONSOLE_LOG) {
        eventsToDrop.forEach(event => {
          logDebug('Event dropped', { 
            name: event.name, 
            retryCount: event.retryCount 
          });
        });
      }
    }

    // If we're offline, keep events in main queue
    if (!state.isOnline) {
      updateState({ queuedEvents: [...state.queuedEvents, ...eventsToRetry] });
    }
  } finally {
    updateState({ isFlushing: false });
  }
}

/**
 * Enhanced fetch with timeout and better error handling
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry 4xx errors (except 429 - rate limiting)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`Client error ${response.status}: ${response.statusText}`);
      }
      
      if (attempt < retries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (attempt === retries || error.name === 'AbortError') {
        throw error;
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Enhanced error tracking with classification
 */
export const trackError = (error, context = {}, metadata = {}) => {
  const errorData = {
    message: typeof error === 'string' ? error : error.message,
    name: typeof error === 'object' ? error.name : 'UnknownError',
    stack: typeof error === 'object' ? error.stack : null,
    code: error.code || error.status || null,
    ...context
  };

  // Classify error severity
  const severity = context.severity || classifyErrorSeverity(errorData);
  
  trackEvent(EVENT_TYPES.ERROR, errorData, {
    ...metadata,
    severity,
    component: metadata.component || 'unknown',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userId: state.userId,
    sessionId: state.sessionId
  });

  // Log critical errors to console
  if (severity === ERROR_SEVERITY.CRITICAL) {
    console.error('🔴 Critical Error:', errorData);
  }
};

/**
 * Classify error severity
 */
function classifyErrorSeverity(error) {
  // Network errors
  if (error.message?.includes('Network') || error.code === 'NETWORK_ERROR') {
    return ERROR_SEVERITY.MEDIUM;
  }
  
  // Authentication errors
  if (error.code === 401 || error.code === 403) {
    return ERROR_SEVERITY.HIGH;
  }
  
  // Server errors
  if (error.code >= 500) {
    return ERROR_SEVERITY.HIGH;
  }
  
  // Client errors
  if (error.code >= 400 && error.code < 500) {
    return ERROR_SEVERITY.LOW;
  }
  
  // JavaScript errors
  if (error.name === 'TypeError' || error.name === 'ReferenceError') {
    return ERROR_SEVERITY.MEDIUM;
  }
  
  // Default
  return ERROR_SEVERITY.LOW;
}

/**
 * Track error without triggering errors in analytics itself
 */
function trackErrorSilently(error, context = {}) {
  try {
    trackError(error, context);
  } catch (analyticsError) {
    // Avoid infinite loop - just log to console
    console.error('Analytics error tracking failed:', analyticsError);
  }
}

/**
 * Get analytics status with metrics
 */
export const getAnalyticsStatus = () => ({
  sessionId: state.sessionId,
  sessionStartTime: state.sessionStartTime ? new Date(state.sessionStartTime).toISOString() : null,
  lastActivityTime: state.lastActivityTime ? new Date(state.lastActivityTime).toISOString() : null,
  sessionDuration: state.sessionStartTime ? Date.now() - state.sessionStartTime : 0,
  userId: state.userId,
  deviceId: state.deviceId,
  organizationId: state.organizationId,
  queuedEventsCount: state.queuedEvents.length,
  failedEventsCount: state.failedEvents.length,
  isInitialized: state.isInitialized,
  userConsent: state.userConsent,
  isOnline: state.isOnline,
  isConfigured: isAnalyticsConfigured(),
  metrics: { ...state.metrics },
  config: {
    endpoint: ANALYTICS_ENDPOINT ? 'Configured' : 'Not configured',
    batchSize: BATCH_SIZE,
    batchInterval: BATCH_INTERVAL,
    maxRetries: MAX_RETRIES
  }
});

// Keep all your existing functions but update them to use the state management

// Export the enhanced API
export default {
  // Initialization
  initAnalytics,
  cleanupAnalytics,
  setAnalyticsConsent,
  isAnalyticsReady: () => state.isInitialized && state.userConsent,
  isAnalyticsConfigured,
  getAnalyticsStatus,
  
  // User management
  setUser,
  setOrganization,
  
  // Tracking methods
  trackEvent,
  trackPageView,
  trackButtonClick,
  trackFormSubmit,
  trackAssessmentStart,
  trackAssessmentComplete,
  trackError,
  trackSearch,
  
  // Utilities
  getAnalyticsMetrics,
  
  // Constants
  EVENT_TYPES,
  ERROR_SEVERITY
};
