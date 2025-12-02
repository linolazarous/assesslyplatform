// src/utils/analytics.jsx
import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configuration
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/v1/analytics';
const ENABLE_CONSOLE_LOG = import.meta.env.VITE_ENV === 'development';
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Event types
const EVENT_TYPES = {
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
  IMPORT: 'import'
};

// Session management
let sessionId = generateSessionId();
let sessionStartTime = Date.now();
let lastActivityTime = Date.now();
let queuedEvents = [];
let batchTimer = null;
let userId = null;
let userProperties = {};
let organizationId = null;
let isInitialized = false;

/**
 * Initialize analytics service
 */
export const initAnalytics = async (config = {}) => {
  if (isInitialized) {
    console.warn('[Analytics] Already initialized');
    return;
  }

  const {
    userId: initialUserId = null,
    organizationId: initialOrgId = null,
    userProperties: initialUserProps = {},
    enableBatch = true,
    endpoint = ANALYTICS_ENDPOINT
  } = config;

  userId = initialUserId;
  organizationId = initialOrgId;
  userProperties = { ...initialUserProps };

  // Load saved session data
  loadSessionData();

  // Start session heartbeat
  startSessionHeartbeat();

  // Start batch processing if enabled
  if (enableBatch) {
    startBatchProcessing();
  }

  // Track initialization
  trackEvent('analytics_initialized', {
    sessionId,
    timestamp: new Date().toISOString()
  });

  isInitialized = true;
  
  logDebug('[Analytics] Initialized', {
    sessionId,
    userId,
    organizationId
  });
};

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate device fingerprint
 */
function generateDeviceFingerprint() {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupport: 'ontouchstart' in window,
    cookieEnabled: navigator.cookieEnabled
  };

  return btoa(JSON.stringify(fingerprint)).slice(0, 32);
}

/**
 * Load saved session data from localStorage
 */
function loadSessionData() {
  try {
    const savedSession = localStorage.getItem('analytics_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      sessionId = sessionData.sessionId || generateSessionId();
      sessionStartTime = sessionData.sessionStartTime || Date.now();
    }
  } catch (error) {
    console.error('[Analytics] Failed to load session data:', error);
  }
}

/**
 * Save session data to localStorage
 */
function saveSessionData() {
  try {
    const sessionData = {
      sessionId,
      sessionStartTime,
      lastActivityTime,
      deviceFingerprint: generateDeviceFingerprint()
    };
    localStorage.setItem('analytics_session', JSON.stringify(sessionData));
  } catch (error) {
    console.error('[Analytics] Failed to save session data:', error);
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
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  // Check session timeout every minute
  setInterval(() => {
    const inactiveTime = Date.now() - lastActivityTime;
    if (inactiveTime > SESSION_TIMEOUT) {
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
  sessionId = generateSessionId();
  sessionStartTime = Date.now();
  lastActivityTime = Date.now();

  trackEvent('session_start', {
    previousSessionId: oldSessionId,
    sessionDuration: Date.now() - sessionStartTime
  });

  logDebug('[Analytics] New session started', { sessionId });
}

/**
 * End current session
 */
function endSession() {
  const sessionDuration = Date.now() - sessionStartTime;
  
  trackEvent('session_end', {
    sessionId,
    sessionDuration,
    pageCount: queuedEvents.filter(e => e.name === EVENT_TYPES.PAGE_VIEW).length
  });

  // Flush remaining events
  flushEvents();
}

/**
 * Start batch processing for events
 */
function startBatchProcessing() {
  if (batchTimer) clearInterval(batchTimer);
  
  batchTimer = setInterval(() => {
    if (queuedEvents.length > 0) {
      flushEvents();
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
  // Enrich event with common properties
  const enrichedEvent = {
    ...event,
    metadata: {
      sessionId,
      userId,
      organizationId,
      deviceFingerprint: generateDeviceFingerprint(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
      ...event.metadata
    },
    userProperties,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_ENV || 'development'
  };

  queuedEvents.push(enrichedEvent);

  // Log to console in development
  if (ENABLE_CONSOLE_LOG) {
    logDebug('[Analytics Event Queued]', enrichedEvent);
  }

  // Trigger immediate flush if batch size reached
  if (queuedEvents.length >= BATCH_SIZE) {
    flushEvents();
  }
}

/**
 * Flush queued events to server
 */
async function flushEvents() {
  if (queuedEvents.length === 0) return;

  const eventsToSend = [...queuedEvents];
  queuedEvents = [];

  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
      ...(token && { Authorization: `Bearer ${token}` })
    };

    await axios.post(ANALYTICS_ENDPOINT, {
      events: eventsToSend,
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString()
    }, { headers });

    logDebug('[Analytics] Events sent successfully', {
      count: eventsToSend.length,
      batchId: eventsToSend[0]?.metadata?.batchId
    });
  } catch (error) {
    console.error('[Analytics] Failed to send events:', error);
    
    // Requeue failed events (with exponential backoff)
    eventsToSend.forEach(event => {
      event.retryCount = (event.retryCount || 0) + 1;
      if (event.retryCount <= 3) {
        queuedEvents.push(event);
      } else {
        console.warn('[Analytics] Event dropped after max retries:', event);
      }
    });
  }
}

/**
 * Track custom event
 */
export const trackEvent = (name, params = {}, metadata = {}) => {
  if (!isInitialized) {
    console.warn('[Analytics] Not initialized. Call initAnalytics first.');
    return;
  }

  const event = {
    name,
    params,
    metadata: {
      ...metadata,
      eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  };

  queueEvent(event);

  // Update last activity
  lastActivityTime = Date.now();
};

/**
 * Track page view with enhanced metadata
 */
export const trackPageView = (path, title = null, metadata = {}) => {
  const pageTitle = title || document.title;
  
  trackEvent(EVENT_TYPES.PAGE_VIEW, {
    page_path: path,
    page_title: pageTitle,
    page_hash: window.location.hash,
    page_search: window.location.search
  }, {
    ...metadata,
    loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
    domReadyTime: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart
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
    position: getElementPosition(buttonId)
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
    score,
    duration,
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
  trackEvent(EVENT_TYPES.SEARCH, {
    query,
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

  // Update user properties on server
  if (userId && Object.keys(properties).length > 0) {
    updateUserProperties(userId, properties);
  }

  logDebug('[Analytics] User set', { userId, properties });
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

  logDebug('[Analytics] Organization set', { organizationId });
};

/**
 * Update user properties on server
 */
async function updateUserProperties(userId, properties) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    await axios.put(`${ANALYTICS_ENDPOINT}/users/${userId}/properties`, {
      properties,
      updatedAt: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    logDebug('[Analytics] User properties updated', { userId });
  } catch (error) {
    console.error('[Analytics] Failed to update user properties:', error);
  }
}

/**
 * Get element position for tracking
 */
function getElementPosition(elementId) {
  try {
    const element = document.getElementById(elementId);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      inViewport: (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      )
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get analytics metrics
 */
export const getAnalyticsMetrics = async (timeRange = '7d', metrics = []) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    const response = await axios.get(`${ANALYTICS_ENDPOINT}/metrics`, {
      params: {
        timeRange,
        metrics: metrics.join(','),
        organizationId,
        userId
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    return response.data.data;
  } catch (error) {
    console.error('[Analytics] Failed to get metrics:', error);
    return null;
  }
};

/**
 * Hook for automatic page view tracking
 */
export const usePageTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Track initial page view
    trackPageView(location.pathname);

    // Listen for navigation events
    const originalPush = navigate;
    
    // You could override navigate here, but it's complex
    // Instead, rely on location changes
  }, [location.pathname]);

  return null;
};

/**
 * Hook for tracking form interactions
 */
export const useFormTracking = (formId, formName) => {
  const trackFieldInteraction = useCallback((fieldName, action, value = null) => {
    trackEvent('form_field_interaction', {
      form_id: formId,
      form_name: formName,
      field_name: fieldName,
      action,
      value_length: value ? value.length : 0,
      has_value: !!value
    });
  }, [formId, formName]);

  const trackFormError = useCallback((fieldName, errorMessage) => {
    trackError(errorMessage, {
      form_id: formId,
      form_name: formName,
      field_name: fieldName,
      error_type: 'form_validation'
    });
  }, [formId, formName]);

  return {
    trackFieldInteraction,
    trackFormError
  };
};

/**
 * Hook for tracking assessment progress
 */
export const useAssessmentTracking = (assessmentId, assessmentName) => {
  const trackQuestionView = useCallback((questionId, questionIndex, timeSpent) => {
    trackEvent('question_view', {
      assessment_id: assessmentId,
      assessment_name: assessmentName,
      question_id: questionId,
      question_index: questionIndex,
      time_spent: timeSpent
    });
  }, [assessmentId, assessmentName]);

  const trackQuestionAnswer = useCallback((questionId, isCorrect, answerTime) => {
    trackEvent('question_answer', {
      assessment_id: assessmentId,
      assessment_name: assessmentName,
      question_id: questionId,
      is_correct: isCorrect,
      answer_time: answerTime
    });
  }, [assessmentId, assessmentName]);

  return {
    trackQuestionView,
    trackQuestionAnswer,
    startAssessment: (questionCount) => trackAssessmentStart(assessmentId, assessmentName, questionCount),
    completeAssessment: (score, duration) => trackAssessmentComplete(assessmentId, score, duration)
  };
};

/**
 * Debug logging helper
 */
function logDebug(message, data = {}) {
  if (ENABLE_CONSOLE_LOG) {
    console.log(`%c${message}`, 'color: #4CAF50; font-weight: bold', data);
  }
}

/**
 * Cleanup and shutdown
 */
export const cleanupAnalytics = () => {
  // End current session
  endSession();
  
  // Stop batch processing
  stopBatchProcessing();
  
  // Clear queued events
  queuedEvents = [];
  
  // Reset state
  isInitialized = false;
  
  logDebug('[Analytics] Cleaned up');
};

/**
 * Get current session info
 */
export const getSessionInfo = () => ({
  sessionId,
  sessionStartTime: new Date(sessionStartTime).toISOString(),
  lastActivityTime: new Date(lastActivityTime).toISOString(),
  sessionDuration: Date.now() - sessionStartTime,
  userId,
  organizationId,
  queuedEventsCount: queuedEvents.length
});

export default {
  // Initialization
  initAnalytics,
  cleanupAnalytics,
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
  
  // Hooks
  usePageTracking,
  useFormTracking,
  useAssessmentTracking,
  
  // Utilities
  getAnalyticsMetrics,
  EVENT_TYPES
};
