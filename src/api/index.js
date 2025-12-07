// src/api/index.js
/**
 * Enterprise-grade API client for Assessly Platform
 * Axios configuration compliant with Assessly Platform API documentation
 * Multi-tenant aware with advanced error handling and token management
 */

import axios from 'axios';

// ----------------------
// Configuration & Constants
// ----------------------
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Production defaults
  if (import.meta.env.PROD) {
    // Use environment variable or default production URL
    return envUrl || 'https://api.assesslyplatform.com';
  }
  
  // Development defaults
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  
  // Local development
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  
  return 'https://assesslyplatform-t49h.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

// Rate Limiting Configuration - stricter in production
export const RATE_LIMITS = {
  AUTH: import.meta.env.PROD ? 5 : 10,     // 5 requests per minute for auth in production
  GENERAL: import.meta.env.PROD ? 60 : 100 // 60 requests per minute in production
};

// Request tracking for rate limiting
let requestTimestamps = [];
const REQUEST_WINDOW = 60000; // 1 minute in ms

// ----------------------
// Custom Event System (Replaces EventEmitter)
// ----------------------
export const createEventEmitter = () => {
  const listeners = new Map();
  const maxListeners = 50;

  return {
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);
      return () => this.off(event, callback);
    },

    off(event, callback) {
      if (listeners.has(event)) {
        listeners.get(event).delete(callback);
      }
    },

    emit(event, data) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in event listener for "${event}":`, error);
          }
        });
      }
    },

    once(event, callback) {
      const onceWrapper = (data) => {
        this.off(event, onceWrapper);
        callback(data);
      };
      this.on(event, onceWrapper);
    },

    setMaxListeners() {
      // No-op for compatibility
    },

    removeAllListeners(event) {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    }
  };
};

// API Event Emitter for real-time updates
export const apiEvents = createEventEmitter();

// ----------------------
// API Endpoints Configuration
// ----------------------
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    GOOGLE: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
  },
  ORGANIZATIONS: {
    BASE: '/organizations',
    CREATE: '/organizations',
    LIST: '/organizations',
    DETAIL: (id) => `/organizations/${id}`,
    UPDATE: (id) => `/organizations/${id}`,
    DELETE: (id) => `/organizations/${id}`,
    MEMBERS: (id) => `/organizations/${id}/members`,
    INVITE: (id) => `/organizations/${id}/invite`,
    ACCEPT_INVITE: '/organizations/accept-invite',
    LEAVE: (id) => `/organizations/${id}/leave`,
  },
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/users/avatar',
    PREFERENCES: '/users/preferences',
  },
  ASSESSMENTS: {
    BASE: '/assessments',
    CREATE: '/assessments',
    LIST: '/assessments',
    DETAIL: (id) => `/assessments/${id}`,
    UPDATE: (id) => `/assessments/${id}`,
    DELETE: (id) => `/assessments/${id}`,
    PUBLISH: (id) => `/assessments/${id}/publish`,
    UNPUBLISH: (id) => `/assessments/${id}/unpublish`,
    DUPLICATE: (id) => `/assessments/${id}/duplicate`,
    SHARE: (id) => `/assessments/${id}/share`,
    COLLABORATORS: (id) => `/assessments/${id}/collaborators`,
    STATS: (id) => `/assessments/${id}/stats`,
    TEMPLATES: '/assessments/templates',
    CATEGORIES: '/assessments/categories',
  },
  QUESTIONS: {
    BASE: (assessmentId) => `/assessments/${assessmentId}/questions`,
    CREATE: (assessmentId) => `/assessments/${assessmentId}/questions`,
    LIST: (assessmentId) => `/assessments/${assessmentId}/questions`,
    DETAIL: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
    UPDATE: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
    DELETE: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
    REORDER: (assessmentId) => `/assessments/${assessmentId}/questions/reorder`,
    BULK_CREATE: (assessmentId) => `/assessments/${assessmentId}/questions/bulk`,
    BULK_UPDATE: (assessmentId) => `/assessments/${assessmentId}/questions/bulk`,
  },
  RESPONSES: {
    BASE: '/responses',
    CREATE: '/responses',
    LIST: '/responses',
    DETAIL: (id) => `/responses/${id}`,
    UPDATE: (id) => `/responses/${id}`,
    DELETE: (id) => `/responses/${id}`,
    SUBMIT: (id) => `/responses/${id}/submit`,
    SCORE: (id) => `/responses/${id}/score`,
    ANALYZE: (id) => `/responses/${id}/analyze`,
    BY_ASSESSMENT: (assessmentId) => `/responses/assessment/${assessmentId}`,
    EXPORT: (assessmentId) => `/responses/export/${assessmentId}`,
    STATS: (assessmentId) => `/responses/stats/${assessmentId}`,
  },
  INVITATIONS: {
    BASE: '/invitations',
    CREATE: '/invitations',
    LIST: '/invitations',
    DETAIL: (id) => `/invitations/${id}`,
    UPDATE: (id) => `/invitations/${id}`,
    DELETE: (id) => `/invitations/${id}`,
    ACCEPT: (id) => `/invitations/${id}/accept`,
    REJECT: (id) => `/invitations/${id}/reject`,
    RESEND: (id) => `/invitations/${id}/resend`,
    BY_ORGANIZATION: (orgId) => `/invitations/organization/${orgId}`,
  },
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    ASSESSMENT_STATS: (assessmentId) => `/analytics/assessment/${assessmentId}`,
    RESPONSE_TRENDS: (assessmentId) => `/analytics/assessment/${assessmentId}/trends`,
    QUESTION_ANALYSIS: (assessmentId) => `/analytics/assessment/${assessmentId}/questions`,
    EXPORT: (assessmentId) => `/analytics/assessment/${assessmentId}/export`,
  },
  FILES: {
    BASE: '/files',
    UPLOAD: '/files/upload',
    DELETE: (id) => `/files/${id}`,
    DOWNLOAD: (id) => `/files/${id}/download`,
    PRESIGNED_URL: (id) => `/files/${id}/presigned-url`,
    LIST: '/files',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    UNREAD_COUNT: '/notifications/unread-count',
    SETTINGS: '/notifications/settings',
  },
  REPORTS: {
    BASE: '/reports',
    GENERATE: '/reports/generate',
    LIST: '/reports',
    DETAIL: (id) => `/reports/${id}`,
    DELETE: (id) => `/reports/${id}`,
    DOWNLOAD: (id) => `/reports/${id}/download`,
    SHARE: (id) => `/reports/${id}/share`,
  },
  INTEGRATIONS: {
    BASE: '/integrations',
    LIST: '/integrations',
    CONNECT: (type) => `/integrations/${type}/connect`,
    DISCONNECT: (type) => `/integrations/${type}/disconnect`,
    STATUS: (type) => `/integrations/${type}/status`,
    SYNC: (type) => `/integrations/${type}/sync`,
  },
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    PLANS: '/subscriptions/plans',
    SUBSCRIBE: '/subscriptions/subscribe',
    CANCEL: '/subscriptions/cancel',
    UPGRADE: '/subscriptions/upgrade',
    INVOICES: '/subscriptions/invoices',
    CURRENT: '/subscriptions/current',
  },
  SUPPORT: {
    BASE: '/support',
    TICKETS: '/support/tickets',
    CREATE_TICKET: '/support/tickets',
    TICKET_DETAIL: (id) => `/support/tickets/${id}`,
    MESSAGES: (ticketId) => `/support/tickets/${ticketId}/messages`,
    SEND_MESSAGE: (ticketId) => `/support/tickets/${ticketId}/messages`,
    CLOSE: (ticketId) => `/support/tickets/${ticketId}/close`,
    CATEGORIES: '/support/categories',
    PRIORITIES: '/support/priorities',
  },
  HEALTH: {
    CHECK: '/health',
    METRICS: '/health/metrics',
    STATUS: '/health/status',
  },
  UTILS: {
    VALIDATE_EMAIL: '/utils/validate-email',
    GENERATE_SLUG: '/utils/generate-slug',
    COUNTRIES: '/utils/countries',
    TIMEZONES: '/utils/timezones',
    LANGUAGES: '/utils/languages',
    CURRENCIES: '/utils/currencies',
  }
};

// ----------------------
// Secure Storage with Fallback
// ----------------------
const StorageManager = {
  isAvailable(type = 'localStorage') {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  getItem(key) {
    try {
      if (this.isAvailable()) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('Storage access failed:', error);
    }
    return null;
  },

  setItem(key, value) {
    try {
      if (this.isAvailable()) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.warn('Storage set failed:', error);
    }
    return false;
  },

  removeItem(key) {
    try {
      if (this.isAvailable()) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Storage remove failed:', error);
    }
  },

  clear() {
    try {
      if (this.isAvailable()) {
        localStorage.clear();
      }
    } catch (error) {
      console.warn('Storage clear failed:', error);
    }
  }
};

// ----------------------
// Token Management with Multi-Tenant Support
// ----------------------
const TOKEN_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH_TOKEN: 'assessly_refresh_token',
  USER: 'assessly_user',
  ORGANIZATION: 'assessly_organization',
  TENANT_ID: 'assessly_tenant_id',
  TOKEN_EXPIRY: 'assessly_token_expiry',
  SESSION_ID: 'assessly_session_id'
};

// Generate session ID for tracking
const generateSessionId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const TokenManager = {
  getToken() {
    try {
      return StorageManager.getItem(TOKEN_STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.warn('Failed to access token storage:', error);
      return null;
    }
  },

  getRefreshToken() {
    try {
      return StorageManager.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.warn('Failed to access refresh token storage:', error);
      return null;
    }
  },

  setTokens(token, refreshToken = null, expiry = null) {
    try {
      if (token) {
        StorageManager.setItem(TOKEN_STORAGE_KEYS.TOKEN, token);
        if (expiry) {
          StorageManager.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, expiry);
        }
        // Generate new session ID on token set
        StorageManager.setItem(TOKEN_STORAGE_KEYS.SESSION_ID, generateSessionId());
      }
      if (refreshToken) {
        StorageManager.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      return true;
    } catch (error) {
      console.warn('Failed to set tokens:', error);
      return false;
    }
  },

  clearTokens() {
    try {
      Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
        StorageManager.removeItem(key);
      });
      
      // Clear any legacy keys
      ['accessToken', 'user', 'organization'].forEach(key => {
        StorageManager.removeItem(key);
      });
      
      return true;
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
      return false;
    }
  },

  getTenantId() {
    try {
      const org = this.getOrganization();
      if (org && org.id) {
        return org.id;
      }
      return StorageManager.getItem(TOKEN_STORAGE_KEYS.TENANT_ID);
    } catch (error) {
      console.warn('Failed to get tenant ID:', error);
      return null;
    }
  },

  setTenantContext(organizationId) {
    try {
      return StorageManager.setItem(TOKEN_STORAGE_KEYS.TENANT_ID, organizationId);
    } catch (error) {
      console.warn('Failed to set tenant context:', error);
      return false;
    }
  },

  isTokenExpired() {
    try {
      const expiry = StorageManager.getItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) return false;
      // Add 5 minute buffer for network latency
      return new Date(expiry) < new Date(Date.now() - 300000);
    } catch (error) {
      console.warn('Failed to check token expiry:', error);
      return true; // Assume expired if we can't check
    }
  },

  getUserInfo() {
    try {
      const user = StorageManager.getItem(TOKEN_STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.warn('Failed to get user info:', error);
      return null;
    }
  },

  setUserInfo(user) {
    try {
      return StorageManager.setItem(TOKEN_STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to set user info:', error);
      return false;
    }
  },

  clearAll() {
    return this.clearTokens();
  },

  setOrganization(organization) {
    try {
      return StorageManager.setItem(TOKEN_STORAGE_KEYS.ORGANIZATION, JSON.stringify(organization));
    } catch (error) {
      console.warn('Failed to set organization:', error);
      return false;
    }
  },

  getOrganization() {
    try {
      const org = StorageManager.getItem(TOKEN_STORAGE_KEYS.ORGANIZATION);
      return org ? JSON.parse(org) : null;
    } catch (error) {
      console.warn('Failed to get organization:', error);
      return null;
    }
  },

  getSessionId() {
    try {
      return StorageManager.getItem(TOKEN_STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.warn('Failed to get session ID:', error);
      return null;
    }
  }
};

// ----------------------
// Rate Limiting Middleware
// ----------------------
const checkRateLimit = (config) => {
  if (config.headers['X-Bypass-Rate-Limit'] === 'true') {
    return config;
  }

  const now = Date.now();
  
  // Clean old requests
  requestTimestamps = requestTimestamps.filter(time => now - time < REQUEST_WINDOW);
  
  const isAuthEndpoint = config.url?.includes('/auth/');
  const limit = isAuthEndpoint ? RATE_LIMITS.AUTH : RATE_LIMITS.GENERAL;
  
  if (requestTimestamps.length >= limit) {
    const oldestRequest = requestTimestamps[0];
    const waitTime = REQUEST_WINDOW - (now - oldestRequest);
    
    if (waitTime > 0) {
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime/1000)} seconds.`);
    }
  }
  
  requestTimestamps.push(now);
  return config;
};

// ----------------------
// Axios Instance with Production Configuration
// ----------------------
const api = axios.create({
  baseURL: API_V1_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    'X-Client-Platform': 'web',
    'X-Client-Environment': import.meta.env.PROD ? 'production' : 'development',
  },
  timeout: import.meta.env.PROD ? 15000 : 30000, // Shorter timeout in production
  timeoutErrorMessage: 'Request timeout. Please check your connection.',
  withCredentials: true,
  maxRedirects: 5,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Default
  },
});

// ----------------------
// Request Interceptor with Multi-Tenant Support
// ----------------------
api.interceptors.request.use(
  async (config) => {
    try {
      // Check rate limit (except for bypassed requests)
      if (config.headers['X-Bypass-Rate-Limit'] !== 'true') {
        checkRateLimit(config);
      }

      // Add Authorization header
      const token = TokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add tenant context
      const tenantId = TokenManager.getTenantId();
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }
      
      // Add session ID for tracking
      const sessionId = TokenManager.getSessionId();
      if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
      }
      
      // Add request metadata
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      config.headers['X-Request-Timestamp'] = new Date().toISOString();
      
      // Add user agent info
      if (typeof navigator !== 'undefined') {
        config.headers['X-User-Agent'] = navigator.userAgent;
      }
      
      // Track request start time for performance monitoring
      config.metadata = { startTime: performance.now() };
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject({
        message: error.message,
        code: 'REQUEST_INTERCEPTOR_ERROR',
        config
      });
    }
  },
  (error) => {
    console.error('Request interceptor setup error:', error);
    return Promise.reject(error);
  }
);

// ----------------------
// Token Refresh Logic with Exponential Backoff
// ----------------------
let isRefreshing = false;
let refreshSubscribers = [];

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

const refreshAccessToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber(resolve);
    });
  }

  isRefreshing = true;
  
  try {
    console.log('🔄 Refreshing access token...');
    
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post(
      '/auth/refresh',
      { refreshToken },
      {
        timeout: 10000,
        headers: {
          'X-Client-Platform': 'web',
          'X-Bypass-Rate-Limit': 'true'
        }
      }
    );

    const { token, refreshToken: newRefreshToken, expiresIn } = response.data;
    
    if (!token) {
      throw new Error('No token received from refresh endpoint');
    }

    // Calculate expiry
    const expiry = new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString();
    
    // Update tokens
    TokenManager.setTokens(token, newRefreshToken, expiry);
    
    // Update default header
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    
    console.log('✅ Token refreshed successfully');
    
    // Notify subscribers
    onTokenRefreshed(token);
    
    return token;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    
    // Clear tokens and notify subscribers of failure
    TokenManager.clearAll();
    onTokenRefreshed(null);
    
    // Emit logout event
    apiEvents.emit('auth:logout', { 
      reason: 'token_refresh_failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw {
      message: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED',
      originalError: error,
      timestamp: new Date().toISOString()
    };
  } finally {
    isRefreshing = false;
  }
};

// ----------------------
// Response Interceptor with Enhanced Error Handling
// ----------------------
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = performance.now() - (response.config.metadata?.startTime || 0);
    
    // Log successful API calls in development
    if (import.meta.env.DEV) {
      console.log(`✅ API ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        duration: `${duration.toFixed(2)}ms`,
        data: response.data
      });
    }
    
    // Emit success event
    apiEvents.emit('request:success', {
      url: response.config.url,
      method: response.config.method,
      duration,
      status: response.status,
      requestId: response.config.headers['X-Request-ID'],
      timestamp: new Date().toISOString()
    });
    
    // Check for token in response and update
    if (response.data?.token) {
      TokenManager.setTokens(response.data.token);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Calculate request duration
    const duration = originalRequest?.metadata?.startTime 
      ? performance.now() - originalRequest.metadata.startTime 
      : 0;
    
    // Enhanced error logging
    const errorLog = {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      duration: `${duration.toFixed(2)}ms`,
      message: error.message,
      code: error.code,
      requestId: originalRequest?.headers?.['X-Request-ID'],
      timestamp: new Date().toISOString()
    };
    
    console.error('🔴 API Error:', errorLog);
    
    // Handle 401 Unauthorized - Token Refresh
    if (error.response?.status === 401 && 
        originalRequest && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Only redirect if we're not already on auth pages
        if (typeof window !== 'undefined') {
          const authPages = ['/auth', '/login', '/register', '/forgot-password'];
          const isAuthPage = authPages.some(page => window.location.pathname.includes(page));
          
          if (!isAuthPage) {
            // Store current location for post-login redirect
            const returnTo = window.location.pathname + window.location.search;
            window.location.href = `/login?session=expired&returnTo=${encodeURIComponent(returnTo)}`;
          }
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 429 Rate Limit with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api(originalRequest));
        }, retryAfter * 1000);
      });
    }
    
    // Handle Network Errors
    if (!error.response) {
      const networkError = {
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        status: 0,
        originalError: error,
        timestamp: new Date().toISOString()
      };
      
      apiEvents.emit('network:error', networkError);
      return Promise.reject(networkError);
    }
    
    // Handle 500 Server Errors
    if (error.response?.status >= 500) {
      const serverError = {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: error.response.status,
        originalError: error,
        timestamp: new Date().toISOString()
      };
      
      apiEvents.emit('server:error', serverError);
      return Promise.reject(serverError);
    }
    
    // Standardize error response format
    const apiError = {
      message: error.response?.data?.message || 
               error.response?.data?.error?.message || 
               error.response?.data?.error || 
               error.message || 
               'An unexpected error occurred',
      status: error.response?.status,
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      details: error.response?.data || {},
      url: originalRequest?.url,
      requestId: originalRequest?.headers?.['X-Request-ID'],
      timestamp: new Date().toISOString(),
      errorId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    };
    
    // Emit error event
    apiEvents.emit('request:error', apiError);
    
    // Track error in production
    if (import.meta.env.PROD) {
      trackError(apiError, {
        context: 'api_response',
        url: originalRequest?.url,
        method: originalRequest?.method,
        userId: TokenManager.getUserInfo()?.id,
        sessionId: TokenManager.getSessionId()
      });
    }
    
    return Promise.reject(apiError);
  }
);

// ----------------------
// API Service Functions with Retry Logic
// ----------------------

/**
 * Execute request with retry logic
 */
export const executeWithRetry = async (requestFn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if ([400, 401, 403, 404, 422].includes(error.status) || error.code === 'SESSION_EXPIRED') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay.toFixed(0)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Health check with retry logic
 */
export const checkServerHealth = async (maxRetries = 2) => {
  return executeWithRetry(async () => {
    const response = await api.get('/health', { 
      timeout: 5000,
      headers: { 'X-Bypass-Rate-Limit': 'true' }
    });
    
    return {
      healthy: true,
      status: response.data?.status,
      timestamp: response.data?.timestamp,
      version: response.data?.version,
      uptime: response.data?.uptime,
      latency: response.headers?.['x-response-time'],
    };
  }, maxRetries);
};

// ----------------------
// Error Tracking & Analytics
// ----------------------

/**
 * Error tracking utility
 */
export const trackError = (error, context = {}) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: error?.message || error,
    stack: error?.stack,
    code: error?.code,
    status: error?.status,
    url: window.location?.href,
    userAgent: navigator?.userAgent,
    ...context
  };
  
  console.error('🔴 Tracked Error:', errorData);
  
  // Send to backend error tracking (if available)
  if (typeof fetch !== 'undefined') {
    fetch('/api/v1/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // Silently fail if error tracking is unavailable
    });
  }
  
  // Google Analytics (if available)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: error?.message?.substring(0, 100) || 'Unknown error',
      fatal: error?.fatal !== false,
    });
  }
};

/**
 * Performance tracking
 */
export const trackPerformance = (metric, value, tags = {}) => {
  const perfData = {
    metric,
    value,
    timestamp: new Date().toISOString(),
    url: window.location?.pathname,
    ...tags
  };
  
  if (import.meta.env.PROD && typeof fetch !== 'undefined') {
    // Send to backend metrics endpoint
    fetch('/api/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfData),
      keepalive: true // Use keepalive for performance metrics
    }).catch(() => {
      // Ignore errors for performance tracking
    });
  }
};

/**
 * Debounce function for rate limiting
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

// Debounced health check for background monitoring
export const debouncedHealthCheck = debounce(() => {
  if (TokenManager.getToken()) {
    checkServerHealth(1).then(health => {
      if (!health.healthy) {
        apiEvents.emit('server:unhealthy', health);
      } else {
        trackPerformance('health_check', health.latency || 0);
      }
    }).catch(() => {
      // Silent fail for background health checks
    });
  }
}, 300000); // Check every 5 minutes

// ----------------------
// Initialize in Browser Environment
// ----------------------
if (typeof window !== 'undefined') {
  // Clean up old rate limit timestamps periodically
  setInterval(() => {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(time => now - time < REQUEST_WINDOW * 2);
  }, 60000);
  
  // Initial health check after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (TokenManager.getToken()) {
        debouncedHealthCheck();
      }
    }, 10000);
  });
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && TokenManager.getToken()) {
      debouncedHealthCheck();
    }
  });
}

// ----------------------
// Export everything
// ----------------------
export {
  API_BASE_URL,
  API_V1_BASE_URL,
  RATE_LIMITS,
  apiEvents,
  createEventEmitter,
  executeWithRetry,
  checkServerHealth,
  trackError,
  trackPerformance,
  debounce,
  debouncedHealthCheck,
  TokenManager
};

// Export the API instance as default
export default api;
