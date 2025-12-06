// src/api/index.js
/**
 * Enterprise-grade API client for Assessly Platform
 * Axios configuration compliant with Assessly Platform API documentation
 * Multi-tenant aware with advanced error handling and token management
 */

import axios from 'axios';
import { EventEmitter } from 'events';

// ----------------------
// Configuration & Constants
// ----------------------
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  return 'https://assesslyplatform-t49h.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

// API Event Emitter for real-time updates
export const apiEvents = new EventEmitter();
apiEvents.setMaxListeners(50);

// Rate Limiting Configuration
export const RATE_LIMITS = {
  AUTH: 10,    // 10 requests per minute for auth endpoints
  GENERAL: 100 // 100 requests per minute for other endpoints
};

// Request tracking for rate limiting
let requestTimestamps = [];
const REQUEST_WINDOW = 60000; // 1 minute in ms

// ----------------------
// Token Management with Multi-Tenant Support
// ----------------------
const TOKEN_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH_TOKEN: 'assessly_refresh_token',
  USER: 'assessly_user',
  ORGANIZATION: 'assessly_organization',
  TENANT_ID: 'assessly_tenant_id',
  TOKEN_EXPIRY: 'assessly_token_expiry'
};

export const TokenManager = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.warn('Failed to access token storage:', error);
      return null;
    }
  },

  getRefreshToken: () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.warn('Failed to access refresh token storage:', error);
      return null;
    }
  },

  setTokens: (token, refreshToken = null, expiry = null) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN, token);
        if (expiry) {
          localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, expiry);
        }
      }
      if (refreshToken) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.warn('Failed to set tokens:', error);
    }
  },

  clearTokens: () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  },

  getTenantId: () => {
    try {
      const org = localStorage.getItem(TOKEN_STORAGE_KEYS.ORGANIZATION);
      if (org) {
        const orgData = JSON.parse(org);
        return orgData.id || null;
      }
      return localStorage.getItem(TOKEN_STORAGE_KEYS.TENANT_ID);
    } catch (error) {
      console.warn('Failed to get tenant ID:', error);
      return null;
    }
  },

  setTenantContext: (organizationId) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEYS.TENANT_ID, organizationId);
    } catch (error) {
      console.warn('Failed to set tenant context:', error);
    }
  },

  isTokenExpired: () => {
    try {
      const expiry = localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
      if (!expiry) return false;
      return new Date(expiry) < new Date();
    } catch (error) {
      console.warn('Failed to check token expiry:', error);
      return false;
    }
  },

  getUserInfo: () => {
    try {
      const user = localStorage.getItem(TOKEN_STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.warn('Failed to get user info:', error);
      return null;
    }
  },

  setUserInfo: (user) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to set user info:', error);
    }
  },

  clearAll: () => {
    try {
      Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear all storage:', error);
    }
    
    // Clear any legacy keys
    ['accessToken', 'user', 'organization'].forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors for legacy keys
      }
    });
  },

  setOrganization: (organization) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEYS.ORGANIZATION, JSON.stringify(organization));
    } catch (error) {
      console.warn('Failed to set organization:', error);
    }
  },

  getOrganization: () => {
    try {
      const org = localStorage.getItem(TOKEN_STORAGE_KEYS.ORGANIZATION);
      return org ? JSON.parse(org) : null;
    } catch (error) {
      console.warn('Failed to get organization:', error);
      return null;
    }
  }
};

// ----------------------
// Rate Limiting Middleware
// ----------------------
const checkRateLimit = (config) => {
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
// Axios Instance with Advanced Configuration
// ----------------------
const api = axios.create({
  baseURL: API_V1_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
    'X-Client-Platform': 'web',
  },
  timeout: 30000,
  timeoutErrorMessage: 'Request timeout. Please check your connection.',
  withCredentials: true,
  maxRedirects: 5,
  maxContentLength: 50 * 1024 * 1024, // 50MB
});

// ----------------------
// Request Interceptor with Multi-Tenant Support
// ----------------------
api.interceptors.request.use(
  async (config) => {
    try {
      // Check rate limit
      checkRateLimit(config);
      
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
      
      // Add request metadata
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      config.headers['X-Request-Timestamp'] = new Date().toISOString();
      
      // Add user agent info
      config.headers['X-User-Agent'] = navigator.userAgent;
      
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
// Token Refresh Logic
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
    apiEvents.emit('auth:logout', { reason: 'token_refresh_failed', error: error.message });
    
    throw {
      message: 'Session expired. Please log in again.',
      code: 'SESSION_EXPIRED',
      originalError: error
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
        duration: `${duration.toFixed(2)}ms`
      });
    }
    
    // Emit success event
    apiEvents.emit('request:success', {
      url: response.config.url,
      method: response.config.method,
      duration,
      status: response.status
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
    const duration = performance.now() - (originalRequest?.metadata?.startTime || 0);
    
    // Enhanced error logging
    const errorLog = {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      duration: `${duration.toFixed(2)}ms`,
      message: error.message,
      code: error.code,
      response: error.response?.data
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
        if (!window.location.pathname.includes('/auth') && 
            !window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 429 Rate Limit
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
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
        originalError: error
      });
    }
    
    // Handle 500 Server Errors
    if (error.response?.status >= 500) {
      return Promise.reject({
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: error.response.status,
        originalError: error
      });
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
      });
    }
    
    return Promise.reject(apiError);
  }
);

// ----------------------
// API Endpoints
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
// API Service Functions
// ----------------------

/**
 * Health check with retry logic
 */
export const checkServerHealth = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
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
      };
    } catch (error) {
      if (i === maxRetries - 1) {
        return {
          healthy: false,
          error: error.message,
          attempts: maxRetries,
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// ----------------------
// Utility Functions
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
    ...context
  };
  
  console.error('🔴 Tracked Error:', errorData);
  
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Send to backend error tracking
    fetch('/api/v1/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // Silently fail if error tracking is unavailable
    });
    
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error?.message || 'Unknown error',
        fatal: true,
      });
    }
  }
};

/**
 * Debounce function for rate limiting
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Debounced health check for background monitoring
export const debouncedHealthCheck = debounce(() => {
  checkServerHealth().then(health => {
    if (!health.healthy) {
      apiEvents.emit('server:unhealthy', health);
    }
  });
}, 60000); // Check every minute

// Start background monitoring only in browser
if (typeof window !== 'undefined') {
  // Clean up old rate limit timestamps periodically
  setInterval(() => {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(time => now - time < REQUEST_WINDOW * 2);
  }, 60000);
  
  // Initial health check
  setTimeout(() => {
    if (TokenManager.getToken()) {
      debouncedHealthCheck();
    }
  }, 10000);
}

// Export the API instance as default
export default api;
