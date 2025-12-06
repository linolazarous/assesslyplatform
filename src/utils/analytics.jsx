// src/utils/analytics.js
/**
 * Analytics service for Assessly Platform
 * Handles event tracking, user analytics, and performance monitoring
 * GDPR compliant with user consent management
 */

// Configuration
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/v1/analytics';
const ENABLE_CONSOLE_LOG = import.meta.env.MODE === 'development';
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Event types
export const EVENT_TYPES = Object.freeze({
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  ASSESSMENT_START: 'assessment_start',
  ASSESSMENT_COMPLETE: 'assessment_complete',
  ASSESSMENT_SCORE: 'assessment_score',
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',
  ERROR: 'error',
  SEARCH: 'search',
  DOWNLOAD: 'download',
  EXPORT: 'export',
  IMPORT: 'import',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end'
});

// Session management
let sessionId = null;
let sessionStartTime = null;
let lastActivityTime = null;
let queuedEvents = [];
let batchTimer = null;
let userId = null;
let userProperties = {};
let organizationId = null;
let isInitialized = false;
let isFlushing = false;
let eventListeners = [];
let activityInterval = null;
let sessionInterval = null;
let userConsent = false;

/**
 * Initialize analytics service with user consent
 */
export const initAnalytics = async (config = {}) => {
  if (isInitialized) {
    logDebug('Analytics already initialized');
    return;
  }

  const {
    userId: initialUserId = null,
    organizationId: initialOrgId = null,
    userProperties: initialUserProps = {},
    enableBatch = true,
    endpoint = ANALYTICS_ENDPOINT,
    requireConsent = true
  } = config;

  // Check user consent
  userConsent = !requireConsent || hasUserConsent();
  if (!userConsent) {
    logDebug('Analytics disabled - user consent required');
    return;
  }

  userId = initialUserId;
  organizationId = initialOrgId;
  userProperties = { ...initialUserProps };

  try {
    // Load saved session data
    loadSessionData();
    
    // Initialize session
    if (!sessionId) {
      startNewSession();
    }

    // Start session heartbeat
    startSessionHeartbeat();

    // Start batch processing if enabled
    if (enableBatch) {
      startBatchProcessing();
    }

    // Track initialization
    trackEventInternal('analytics_initialized', {
      sessionId,
      timestamp: new Date().toISOString()
    });

    isInitialized = true;
    
    logDebug('Analytics initialized', {
      sessionId,
      userId,
      organizationId,
      endpoint
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    return false;
  }
};

/**
 * Check if user has given consent for analytics
 */
function hasUserConsent() {
  try {
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'true';
  } catch {
    return false;
  }
}

/**
 * Set user consent for analytics
 */
export const setAnalyticsConsent = (consent) => {
  try {
    localStorage.setItem('analytics_consent', consent ? 'true' : 'false');
    userConsent = consent;
    
    if (consent && !isInitialized) {
      initAnalytics({ requireConsent: false });
    } else if (!consent) {
      cleanupAnalytics();
    }
    
    logDebug('Analytics consent updated', { consent });
  } catch (error) {
    console.error('Failed to set analytics consent:', error);
  }
};

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate anonymous device identifier (GDPR compliant)
 */
function generateDeviceIdentifier() {
  try {
    const identifierData = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    };

    // Create a hash of the identifier data
    const jsonString = JSON.stringify(identifierData);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `device_${Math.abs(hash).toString(36)}`;
  } catch (error) {
    console.error('Failed to generate device identifier:', error);
    return 'unknown_device';
  }
}

/**
 * Load saved session data from localStorage
 */
function loadSessionData() {
  try {
    const savedSession = localStorage.getItem('analytics_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      const sessionAge = Date.now() - (sessionData.lastActivityTime || 0);
      
      // Reuse session if less than timeout
      if (sessionAge < SESSION_TIMEOUT) {
        sessionId = sessionData.sessionId;
        sessionStartTime = sessionData.sessionStartTime;
        lastActivityTime = sessionData.lastActivityTime;
        logDebug('Existing session loaded', { sessionId });
      } else {
        logDebug('Session expired, starting new one');
      }
    }
  } catch (error) {
    console.error('Failed to load session data:', error);
  }
}

/**
 * Save session data to localStorage
 */
function saveSessionData() {
  if (!sessionId) return;
  
  try {
    const sessionData = {
      sessionId,
      sessionStartTime,
      lastActivityTime,
      deviceIdentifier: generateDeviceIdentifier()
    };
    localStorage.setItem('analytics_session', JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save session data:', error);
  }
}

/**
 * Start session heartbeat to track activity
 */
function startSessionHeartbeat() {
  // Update activity on user interaction
  const updateActivity = () => {
    lastActivityTime = Date.now();
    saveSessionData();
  };

  // Listen for user activity
  const events = ['click', 'keypress', 'scroll', 'mousemove'];
  events.forEach(event => {
    const handler = updateActivity;
    document.addEventListener(event, handler, { passive: true });
    eventListeners.push({ event, handler });
  });

  // Check session timeout every minute
  sessionInterval = setInterval(() => {
    if (!lastActivityTime) return;
    
    const inactiveTime = Date.now() - lastActivityTime;
    if (inactiveTime > SESSION_TIMEOUT) {
      logDebug('Session timeout reached', { inactiveTime });
      endSession();
      startNewSession();
    }
  }, 60000);
}

/**
 * Start new session
 */
function startNewSession() {
  const oldSessionId = sessionId;
  const oldSessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;
  
  sessionId = generateSessionId();
  sessionStartTime = Date.now();
  lastActivityTime = Date.now();
  
  saveSessionData();

  if (oldSessionId) {
    trackEventInternal(EVENT_TYPES.SESSION_START, {
      previousSessionId: oldSessionId,
      previousSessionDuration: oldSessionDuration
    });
  }

  logDebug('New session started', { sessionId });
}

/**
 * End current session
 */
function endSession() {
  if (!sessionId) return;
  
  const sessionDuration = Date.now() - sessionStartTime;
  
  trackEventInternal(EVENT_TYPES.SESSION_END, {
    sessionId,
    sessionDuration,
    pageCount: queuedEvents.filter(e => e.name === EVENT_TYPES.PAGE_VIEW).length
  });

  // Flush remaining events
  flushEvents().catch(error => {
    console.error('Failed to flush events on session end:', error);
  });
}

/**
 * Start batch processing for events
 */
function startBatchProcessing() {
  if (batchTimer) {
    clearInterval(batchTimer);
  }
  
  batchTimer = setInterval(() => {
    if (queuedEvents.length > 0 && !isFlushing) {
      flushEvents().catch(error => {
        console.error('Batch processing error:', error);
      });
    }
  }, BATCH_INTERVAL);
}

/**
 * Stop batch processing
 */
function stopBatchProcessing() {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
}

/**
 * Queue an event for batch processing
 */
function queueEvent(event) {
  if (!userConsent) {
    logDebug('Event skipped - no user consent');
    return;
  }

  // Enrich event with common properties
  const enrichedEvent = {
    ...event,
    metadata: {
      sessionId,
      userId,
      organizationId,
      deviceIdentifier: generateDeviceIdentifier(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      ...event.metadata
    },
    userProperties,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
    retryCount: 0
  };

  queuedEvents.push(enrichedEvent);

  // Log to console in development
  if (ENABLE_CONSOLE_LOG) {
    logDebug('Event queued', enrichedEvent);
  }

  // Trigger immediate flush if batch size reached
  if (queuedEvents.length >= BATCH_SIZE && !isFlushing) {
    flushEvents().catch(error => {
      console.error('Immediate flush error:', error);
    });
  }
}

/**
 * Flush queued events to server with retry logic
 */
async function flushEvents() {
  if (queuedEvents.length === 0 || isFlushing) {
    return;
  }

  isFlushing = true;
  const eventsToSend = [...queuedEvents];
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logDebug('Flushing events', { count: eventsToSend.length, batchId });

    // Get authentication token safely
    let token = null;
    try {
      token = localStorage.getItem('assessly_token');
    } catch (storageError) {
      console.warn('Failed to access localStorage:', storageError);
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId || '',
      'X-Batch-ID': batchId,
      ...(token && { Authorization: `Bearer ${token}` })
    };

    const payload = {
      events: eventsToSend,
      batchId,
      sentAt: new Date().toISOString()
    };

    const response = await fetchWithRetry(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Remove sent events from queue
      queuedEvents = queuedEvents.filter(event => 
        !eventsToSend.some(sentEvent => 
          sentEvent.metadata?.eventId === event.metadata?.eventId
        )
      );
      
      logDebug('Events sent successfully', {
        count: eventsToSend.length,
        batchId
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send events:', error);
    
    // Increment retry count for failed events
    eventsToSend.forEach(event => {
      event.retryCount = (event.retryCount || 0) + 1;
    });

    // Requeue events that haven't exceeded max retries
    const eventsToRequeue = eventsToSend.filter(event => event.retryCount <= MAX_RETRIES);
    queuedEvents = [...queuedEvents, ...eventsToRequeue];

    // Drop events that exceeded max retries
    const droppedEvents = eventsToSend.filter(event => event.retryCount > MAX_RETRIES);
    if (droppedEvents.length > 0) {
      console.warn('Events dropped after max retries:', droppedEvents.length);
    }

    // Store failed events in offline storage for later retry
    if (eventsToRequeue.length > 0) {
      storeOfflineEvents(eventsToRequeue);
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || i === retries) {
        return response;
      }
      
      if (i < retries) {
        const delay = RETRY_DELAY * Math.pow(2, i); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (i === retries) throw error;
      const delay = RETRY_DELAY * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Store events offline for later retry
 */
function storeOfflineEvents(events) {
  try {
    const storedEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    const updatedEvents = [...storedEvents, ...events].slice(-100); // Keep last 100 events
    localStorage.setItem('analytics_offline_events', JSON.stringify(updatedEvents));
    logDebug('Events stored offline', { count: events.length });
  } catch (error) {
    console.error('Failed to store offline events:', error);
  }
}

/**
 * Retry offline events when back online
 */
export const retryOfflineEvents = async () => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    if (offlineEvents.length === 0) return;

    logDebug('Retrying offline events', { count: offlineEvents.length });
    
    // Add offline events to queue
    offlineEvents.forEach(event => {
      queueEvent(event);
    });
    
    // Clear offline storage
    localStorage.removeItem('analytics_offline_events');
    
    // Trigger flush
    await flushEvents();
  } catch (error) {
    console.error('Failed to retry offline events:', error);
  }
};

/**
 * Internal event tracking (doesn't check consent)
 */
function trackEventInternal(name, params = {}, metadata = {}) {
  const event = {
    name,
    params,
    metadata: {
      ...metadata,
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  };

  queueEvent(event);
  lastActivityTime = Date.now();
}

/**
 * Track custom event (public API)
 */
export const trackEvent = (name, params = {}, metadata = {}) => {
  if (!isInitialized) {
    console.warn('Analytics not initialized. Call initAnalytics first.');
    return;
  }

  if (!userConsent) {
    logDebug('Event tracking skipped - no user consent', { name });
    return;
  }

  trackEventInternal(name, params, metadata);
};

/**
 * Track page view with enhanced metadata
 */
export const trackPageView = (path, title = null, metadata = {}) => {
  const pageTitle = title || document.title;
  const perf = window.performance;
  
  trackEvent(EVENT_TYPES.PAGE_VIEW, {
    page_path: path,
    page_title: pageTitle,
    page_hash: window.location.hash,
    page_search: window.location.search
  }, {
    ...metadata,
    loadTime: perf.timing ? perf.timing.loadEventEnd - perf.timing.navigationStart : null,
    domReadyTime: perf.timing ? perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart : null
  });
};

/**
 * Track button click with hierarchy
 */
export const trackButtonClick = (buttonText, buttonId, category = null, metadata = {}) => {
  trackEvent(EVENT_TYPES.BUTTON_CLICK, {
    button_text: buttonText,
    button_id: buttonId,
    category,
    element_type: 'button'
  }, metadata);
};

/**
 * Track form submission
 */
export const trackFormSubmit = (formId, formName, fieldCount, metadata = {}) => {
  trackEvent(EVENT_TYPES.FORM_SUBMIT, {
    form_id: formId,
    form_name: formName,
    field_count: fieldCount,
    success: metadata.success !== false
  }, metadata);
};

/**
 * Track assessment start
 */
export const trackAssessmentStart = (assessmentId, assessmentName, questionCount, metadata = {}) => {
  trackEvent(EVENT_TYPES.ASSESSMENT_START, {
    assessment_id: assessmentId,
    assessment_name: assessmentName,
    question_count: questionCount,
    assessment_type: metadata.type || 'standard'
  }, metadata);
};

/**
 * Track assessment completion
 */
export const trackAssessmentComplete = (assessmentId, score, duration, metadata = {}) => {
  trackEvent(EVENT_TYPES.ASSESSMENT_COMPLETE, {
    assessment_id: assessmentId,
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    duration: Math.round(duration),
    passed: metadata.passed || score >= (metadata.passingScore || 70)
  }, metadata);
};

/**
 * Track error with stack trace and context
 */
export const trackError = (error, context = {}, metadata = {}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stackTrace = typeof error === 'object' ? error.stack : null;

  trackEvent(EVENT_TYPES.ERROR, {
    error_message: errorMessage,
    stack_trace: stackTrace,
    error_type: typeof error === 'object' ? error.name : 'Unknown',
    ...context
  }, {
    ...metadata,
    fatal: context.fatal || false,
    component: metadata.component || 'unknown'
  });
};

/**
 * Track search query
 */
export const trackSearch = (query, resultCount, searchType = 'general', metadata = {}) => {
  // Sanitize query for privacy
  const sanitizedQuery = query.length > 100 ? query.substring(0, 100) + '...' : query;
  
  trackEvent(EVENT_TYPES.SEARCH, {
    query: sanitizedQuery,
    result_count: resultCount,
    search_type: searchType,
    query_length: query.length
  }, metadata);
};

/**
 * Set user ID and properties
 */
export const setUser = (newUserId, properties = {}) => {
  const oldUserId = userId;
  userId = newUserId;
  userProperties = { ...userProperties, ...properties };

  // Track user identification
  if (oldUserId !== newUserId) {
    trackEvent('user_identified', {
      old_user_id: oldUserId,
      new_user_id: newUserId
    });
  }

  logDebug('User set', { userId, hasProperties: Object.keys(properties).length > 0 });
};

/**
 * Set organization context
 */
export const setOrganization = (orgId, orgProperties = {}) => {
  organizationId = orgId;
  
  trackEvent('organization_set', {
    organization_id: orgId,
    ...orgProperties
  });

  logDebug('Organization set', { organizationId });
};

/**
 * Get analytics metrics
 */
export const getAnalyticsMetrics = async (timeRange = '7d', metrics = []) => {
  try {
    const token = localStorage.getItem('assessly_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${ANALYTICS_ENDPOINT}/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get analytics metrics:', error);
    return null;
  }
};

/**
 * Debug logging helper
 */
function logDebug(message, data = {}) {
  if (ENABLE_CONSOLE_LOG) {
    console.log(`%c[Analytics] ${message}`, 'color: #4CAF50; font-weight: bold', data);
  }
}

/**
 * Cleanup and shutdown
 */
export const cleanupAnalytics = () => {
  // End current session
  if (sessionId) {
    endSession();
  }
  
  // Stop timers
  stopBatchProcessing();
  
  if (sessionInterval) {
    clearInterval(sessionInterval);
    sessionInterval = null;
  }
  
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
  
  // Remove event listeners
  eventListeners.forEach(({ event, handler }) => {
    document.removeEventListener(event, handler);
  });
  eventListeners = [];
  
  // Clear queued events
  queuedEvents = [];
  
  // Reset state
  isInitialized = false;
  isFlushing = false;
  
  logDebug('Analytics cleaned up');
};

/**
 * Get current session info
 */
export const getSessionInfo = () => ({
  sessionId,
  sessionStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null,
  lastActivityTime: lastActivityTime ? new Date(lastActivityTime).toISOString() : null,
  sessionDuration: sessionStartTime ? Date.now() - sessionStartTime : 0,
  userId,
  organizationId,
  queuedEventsCount: queuedEvents.length,
  isInitialized,
  userConsent
});

/**
 * Check if analytics is ready
 */
export const isAnalyticsReady = () => isInitialized && userConsent;

// Export the API
export default {
  // Initialization
  initAnalytics,
  cleanupAnalytics,
  setAnalyticsConsent,
  retryOfflineEvents,
  isAnalyticsReady,
  getSessionInfo,
  
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
  EVENT_TYPES
};
