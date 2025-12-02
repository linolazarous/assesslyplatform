// src/api.jsx
/**
 * Enterprise-grade API client for Assessly Platform
 * Axios configuration compliant with Assessly Platform API documentation
 * Multi-tenant aware with advanced error handling and token management
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import { trackError } from './utils/analytics';
import { debounce } from './utils/performance';

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

// Request Queue for rate limiting
const requestQueue = [];
let requestCount = 0;
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
    Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key}:`, error);
      }
    });
  }
};

// ----------------------
// Rate Limiting Middleware
// ----------------------
const rateLimitMiddleware = async (config) => {
  const now = Date.now();
  
  // Clean old requests from queue
  requestQueue = requestQueue.filter(time => now - time < REQUEST_WINDOW);
  
  const isAuthEndpoint = config.url?.includes('/auth/');
  const limit = isAuthEndpoint ? RATE_LIMITS.AUTH : RATE_LIMITS.GENERAL;
  
  if (requestQueue.length >= limit) {
    const oldestRequest = requestQueue[0];
    const waitTime = REQUEST_WINDOW - (now - oldestRequest);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  requestQueue.push(now);
  requestCount++;
  
  return config;
};

// ----------------------
// Request Queue Manager
// ----------------------
const RequestQueue = {
  queue: [],
  processing: false,

  add: (requestFn, config) => {
    return new Promise((resolve, reject) => {
      RequestQueue.queue.push({ requestFn, config, resolve, reject });
      if (!RequestQueue.processing) {
        RequestQueue.process();
      }
    });
  },

  process: async () => {
    if (RequestQueue.processing || RequestQueue.queue.length === 0) return;
    
    RequestQueue.processing = true;
    
    while (RequestQueue.queue.length > 0) {
      const { requestFn, config, resolve, reject } = RequestQueue.queue.shift();
      
      try {
        await rateLimitMiddleware(config);
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    RequestQueue.processing = false;
  }
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
    
    // Apply rate limiting for non-critical requests
    if (!config.url?.includes('/health') && !config.url?.includes('/status')) {
      return RequestQueue.add(() => config, config);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    trackError(error, { context: 'request_interceptor' });
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

    const response = await axios.post(
      `${API_V1_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        withCredentials: true,
        timeout: 10000,
        headers: {
          'X-Client-Platform': 'web'
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
    TokenManager.clearTokens();
    onTokenRefreshed(null);
    
    // Emit logout event
    apiEvents.emit('auth:logout', { reason: 'token_refresh_failed' });
    
    throw error;
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
    
    // Track error in analytics
    trackError(error, {
      context: 'api_response',
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status
    });
    
    // Handle 401 Unauthorized - Token Refresh
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth?session=expired';
        }
        return Promise.reject({
          message: 'Session expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          status: 401,
          originalError: error
        });
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
    
    return Promise.reject(apiError);
  }
);

// ----------------------
// API Endpoints
// ----------------------
export const API_ENDPOINTS = {
  // Authentication
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
  
  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
    AVATAR: '/users/avatar',
    BY_ID: (id) => `/users/${id}`,
    ACTIVITY: (id) => `/users/${id}/activity`,
  },
  
  // Organizations
  ORGANIZATIONS: {
    BASE: '/organizations',
    BY_ID: (id) => `/organizations/${id}`,
    MEMBERS: (id) => `/organizations/${id}/members`,
    INVITES: (id) => `/organizations/${id}/invites`,
    SETTINGS: (id) => `/organizations/${id}/settings`,
    STATS: (id) => `/organizations/${id}/stats`,
  },
  
  // Assessments
  ASSESSMENTS: {
    BASE: '/assessments',
    BY_ID: (id) => `/assessments/${id}`,
    QUESTIONS: (id) => `/assessments/${id}/questions`,
    RESPONSES: (id) => `/assessments/${id}/responses`,
    RESULTS: (id) => `/assessments/${id}/results`,
    ANALYTICS: (id) => `/assessments/${id}/analytics`,
    PUBLISH: (id) => `/assessments/${id}/publish`,
    DUPLICATE: (id) => `/assessments/${id}/duplicate`,
    ARCHIVE: (id) => `/assessments/${id}/archive`,
  },
  
  // Questions
  QUESTIONS: {
    BASE: '/questions',
    BY_ID: (id) => `/questions/${id}`,
    BULK: '/questions/bulk',
    TYPES: '/questions/types',
  },
  
  // Responses
  RESPONSES: {
    BASE: '/responses',
    BY_ID: (id) => `/responses/${id}`,
    SUBMIT: (id) => `/responses/${id}/submit`,
    REVIEW: (id) => `/responses/${id}/review`,
    AI_SCORE: (id) => `/responses/${id}/ai-score`,
  },
  
  // Subscriptions & Billing
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    CURRENT: '/subscriptions/current',
    PLANS: '/subscriptions/plans',
    UPGRADE: '/subscriptions/upgrade',
    CANCEL: '/subscriptions/cancel',
    INVOICES: '/subscriptions/invoices',
    USAGE: '/subscriptions/usage',
  },
  
  // Analytics
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    USER_ACTIVITY: '/analytics/user-activity',
    ASSESSMENT_PERFORMANCE: '/analytics/assessment-performance',
  },
  
  // Search
  SEARCH: {
    BASE: '/search',
    ASSESSMENTS: '/search/assessments',
    QUESTIONS: '/search/questions',
    USERS: '/search/users',
    GLOBAL: '/search/global',
  },
  
  // Files & Media
  FILES: {
    UPLOAD: '/files/upload',
    BY_ID: (id) => `/files/${id}`,
    PRESIGNED_URL: (id) => `/files/${id}/presigned-url`,
  },
  
  // Health & Status
  HEALTH: '/health',
  STATUS: '/status',
  METRICS: '/metrics',
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
      const response = await api.get(API_ENDPOINTS.HEALTH, { timeout: 5000 });
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

/**
 * Service status with detailed information
 */
export const checkServiceStatus = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.STATUS);
    return {
      ...response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Service status check failed:', error);
    throw error;
  }
};

/**
 * Make API request with enhanced options
 */
export const apiRequest = async (method, endpoint, data = null, options = {}) => {
  const config = {
    method: method.toLowerCase(),
    url: endpoint,
    ...options,
  };

  if (data) {
    if (method.toLowerCase() === 'get') {
      config.params = data;
    } else {
      config.data = data;
    }
  }

  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    // Re-throw with additional context
    error.endpoint = endpoint;
    error.method = method;
    throw error;
  }
};

/**
 * Upload file with progress tracking
 */
export const uploadFile = async (file, endpoint = API_ENDPOINTS.FILES.UPLOAD, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

/**
 * Batch requests with concurrency control
 */
export const batchRequests = async (requests, maxConcurrent = 5) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < requests.length; i += maxConcurrent) {
    const batch = requests.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(request => request().catch(error => ({ error })));
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      if (result.error) {
        errors.push(result.error);
      } else {
        results.push(result);
      }
    });
  }
  
  return { results, errors };
};

// ----------------------
// Authentication Service Functions
// ----------------------

/**
 * Register user with email/password
 */
export const registerUser = async (userData) => {
  const response = await apiRequest('post', API_ENDPOINTS.AUTH.REGISTER, userData);
  
  if (response.token) {
    TokenManager.setTokens(response.token, response.refreshToken);
    if (response.user) {
      TokenManager.setUserInfo(response.user);
    }
  }
  
  return response;
};

/**
 * Login user
 */
export const loginUser = async (credentials) => {
  const response = await apiRequest('post', API_ENDPOINTS.AUTH.LOGIN, credentials);
  
  if (response.token) {
    TokenManager.setTokens(response.token, response.refreshToken);
    if (response.user) {
      TokenManager.setUserInfo(response.user);
    }
    
    // Set tenant context if organization is available
    if (response.organization) {
      TokenManager.setTenantContext(response.organization.id);
    }
  }
  
  return response;
};

/**
 * Get current user with organization context
 */
export const getCurrentUser = async () => {
  const response = await apiRequest('get', API_ENDPOINTS.AUTH.ME);
  
  if (response.user) {
    TokenManager.setUserInfo(response.user);
  }
  
  return response;
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    await apiRequest('post', API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    TokenManager.clearAll();
    apiEvents.emit('auth:logout', { manual: true });
  }
};

/**
 * Initiate Google OAuth
 */
export const initiateGoogleOAuth = () => {
  window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
};

// ----------------------
// Subscription & Billing Functions
// ----------------------

/**
 * Get current subscription
 */
export const getCurrentSubscription = async () => {
  return apiRequest('get', API_ENDPOINTS.SUBSCRIPTIONS.CURRENT);
};

/**
 * Get available plans
 */
export const getSubscriptionPlans = async () => {
  return apiRequest('get', API_ENDPOINTS.SUBSCRIPTIONS.PLANS);
};

/**
 * Change subscription plan
 */
export const changeSubscription = async (planData) => {
  return apiRequest('post', API_ENDPOINTS.SUBSCRIPTIONS.UPGRADE, planData);
};

// ----------------------
// Export API Instance & Utilities
// ----------------------

// Debounced health check for background monitoring
export const debouncedHealthCheck = debounce(() => {
  checkServerHealth().then(health => {
    if (!health.healthy) {
      apiEvents.emit('server:unhealthy', health);
    }
  });
}, 60000); // Check every minute

// Start background monitoring
if (typeof window !== 'undefined') {
  // Initial health check
  setTimeout(() => debouncedHealthCheck(), 5000);
  
  // Periodic health checks
  setInterval(() => debouncedHealthCheck(), 300000); // Every 5 minutes
}

export default api;
