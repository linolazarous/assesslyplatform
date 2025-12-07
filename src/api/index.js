// src/api/index.js
// Production-ready API client for Assessly Frontend
// Fully aligned with Assessly Platform API documentation v1.0.0

import axios from 'axios';

/* -----------------------
   Base URL Configuration
   ----------------------- */
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Production defaults
  if (import.meta.env.PROD) {
    return envUrl || 'https://assesslyplatform-t49h.onrender.com/api/v1';
  }
  
  // Development defaults
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  
  // Local development
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api/v1';
  }
  
  return 'https://assesslyplatform-t49h.onrender.com/api/v1';
};

/* -----------------------
   Axios Instance
   ----------------------- */
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  },
  timeout: import.meta.env.PROD ? 15000 : 30000,
  withCredentials: true,
  maxRedirects: 5,
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Default
  },
});

/* -----------------------
   Lightweight Event Emitter
   ----------------------- */
const createEventEmitter = () => {
  const map = new Map();
  return {
    on(event, cb) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(cb);
      return () => this.off(event, cb);
    },
    off(event, cb) {
      if (!map.has(event)) return;
      map.get(event).delete(cb);
    },
    emit(event, payload) {
      if (!map.has(event)) return;
      for (const cb of Array.from(map.get(event))) {
        try { cb(payload); } catch (e) { console.error('Event listener error', e); }
      }
    },
    removeAll(event) {
      if (event) map.delete(event);
      else map.clear();
    }
  };
};

/* -----------------------
   Token Management (Updated for App.jsx compatibility)
   ----------------------- */
const TOKEN_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  REFRESH_TOKEN: 'assessly_refresh_token',
  USER: 'assessly_user',
  ORGANIZATION: 'assessly_organization',
  TENANT_ID: 'assessly_tenant_id',
  TOKEN_EXPIRY: 'assessly_token_expiry',
  SESSION_ID: 'assessly_session_id'
};

// JWT decoding helper
const decodeJwt = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return false;
  
  // Check expiration with 5-minute buffer
  const buffer = 5 * 60 * 1000;
  return Date.now() + buffer < decoded.exp * 1000;
};

const TokenManager = {
  getToken() {
    try { 
      return localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN); 
    } catch { 
      return null; 
    }
  },
  
  getRefreshToken() {
    try { 
      return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN); 
    } catch { 
      return null; 
    }
  },
  
  setTokens(token, refreshToken = null, expiry = null) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN, token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        
        // Set expiry if provided
        if (expiry) {
          localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, expiry);
        } else {
          // Try to extract expiry from JWT
          const decoded = decodeJwt(token);
          if (decoded?.exp) {
            const expiryDate = new Date(decoded.exp * 1000).toISOString();
            localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, expiryDate);
          }
        }
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN);
        localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
        delete api.defaults.headers.common.Authorization;
      }
      
      if (refreshToken) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      
      return true;
    } catch (e) { 
      console.warn('TokenManager.setTokens error', e); 
      return false; 
    }
  },
  
  setToken(token) {
    return this.setTokens(token);
  },
  
  setRefreshToken(token) {
    try { 
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
      }
      return true;
    } catch (e) { 
      console.warn('TokenManager.setRefreshToken error', e); 
      return false; 
    }
  },
  
  getUserInfo() {
    try {
      const v = localStorage.getItem(TOKEN_STORAGE_KEYS.USER);
      return v ? JSON.parse(v) : null;
    } catch { 
      return null; 
    }
  },
  
  getUser() {
    return this.getUserInfo();
  },
  
  setUser(user) {
    try { 
      if (user) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.USER);
      }
      return true;
    } catch (e) { 
      console.warn('TokenManager.setUser error', e); 
      return false; 
    }
  },
  
  getOrganization() {
    try {
      const v = localStorage.getItem(TOKEN_STORAGE_KEYS.ORGANIZATION);
      return v ? JSON.parse(v) : null;
    } catch { 
      return null; 
    }
  },
  
  setOrganization(organization) {
    try { 
      if (organization) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.ORGANIZATION, JSON.stringify(organization));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.ORGANIZATION);
      }
      return true;
    } catch (e) { 
      console.warn('TokenManager.setOrganization error', e); 
      return false; 
    }
  },
  
  getTenantId() {
    try {
      const org = this.getOrganization();
      if (org && org.id) {
        return org.id;
      }
      return localStorage.getItem(TOKEN_STORAGE_KEYS.TENANT_ID);
    } catch (error) {
      console.warn('Failed to get tenant ID:', error);
      return null;
    }
  },
  
  setTenantContext(organizationId) {
    try {
      if (organizationId) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.TENANT_ID, organizationId);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEYS.TENANT_ID);
      }
      return true;
    } catch (error) {
      console.warn('Failed to set tenant context:', error);
      return false;
    }
  },
  
  isTokenExpired() {
    try {
      const token = this.getToken();
      if (!token) return true;
      
      // Check JWT expiry
      return !isTokenValid(token);
    } catch (error) {
      console.warn('Failed to check token expiry:', error);
      return true; // Assume expired if we can't check
    }
  },
  
  clearAll() {
    try {
      Object.values(TOKEN_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      delete api.defaults.headers.common.Authorization;
      return true;
    } catch (e) { 
      console.warn('TokenManager.clearAll error', e); 
      return false; 
    }
  },
  
  // Backward compatibility methods
  clearTokens() {
    return this.clearAll();
  }
};

/* -----------------------
   Request Interceptor
   ----------------------- */
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
    const token = TokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add organization context if available
    const tenantId = TokenManager.getTenantId();
    if (tenantId) {
      config.headers['X-Organization-ID'] = tenantId;
    }
    
    // Add session ID for tracking
    const sessionId = localStorage.getItem(TOKEN_STORAGE_KEYS.SESSION_ID);
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    // Add request metadata
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    config.headers['X-Request-Timestamp'] = new Date().toISOString();
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/* -----------------------
   Response Interceptor
   ----------------------- */
api.interceptors.response.use(
  (response) => {
    // Check for token in response and update
    if (response.data?.token) {
      TokenManager.setToken(response.data.token, response.data.refreshToken);
    }
    
    // Check for user in response and update
    if (response.data?.user) {
      TokenManager.setUser(response.data.user);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized - Token Refresh
    if (error.response?.status === 401 && 
        originalRequest && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          
          if (response.data?.token) {
            TokenManager.setToken(response.data.token, response.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        TokenManager.clearAll();
        apiEvents.emit('auth:logout', { reason: 'token_refresh_failed' });
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
        
        return Promise.reject({
          message: 'Session expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          originalError: refreshError
        });
      }
    }
    
    // Handle Network Errors
    if (!error.response) {
      const networkError = {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
        originalError: error
      };
      
      apiEvents.emit('network:error', networkError);
      return Promise.reject(networkError);
    }
    
    // Standardize error response
    const apiError = {
      message: error.response?.data?.message || 
               error.response?.data?.error || 
               error.message || 
               'An unexpected error occurred',
      status: error.response?.status,
      code: error.response?.data?.code || error.code || 'UNKNOWN_ERROR',
      details: error.response?.data || {},
      url: originalRequest?.url,
      timestamp: new Date().toISOString(),
    };
    
    apiEvents.emit('request:error', apiError);
    
    return Promise.reject(apiError);
  }
);

/* -----------------------
   API Endpoints (Aligned with Documentation)
   ----------------------- */
const API_ENDPOINTS = {
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
  },
  USERS: {
    BASE: '/users',
    LIST: '/users',
    GET: (id) => `/users/${id}`,
    UPDATE: (id) => `/users/${id}`,
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
  },
  ORGANIZATIONS: {
    BASE: '/organizations',
    CREATE: '/organizations',
    LIST: '/organizations',
    GET: (id) => `/organizations/${id}`,
    UPDATE: (id) => `/organizations/${id}`,
    MEMBERS: (id) => `/organizations/${id}/members`,
    INVITE: (id) => `/organizations/${id}/invite`,
  },
  ASSESSMENTS: {
    BASE: '/assessments',
    CREATE: '/assessments',
    LIST: '/assessments',
    GET: (id) => `/assessments/${id}`,
    UPDATE: (id) => `/assessments/${id}`,
    DELETE: (id) => `/assessments/${id}`,
    PUBLISH: (id) => `/assessments/${id}/publish`,
    UNPUBLISH: (id) => `/assessments/${id}/unpublish`,
    TEMPLATES: '/assessments/templates',
    CATEGORIES: '/assessments/categories',
  },
  QUESTIONS: {
    BASE: (assessmentId) => `/assessments/${assessmentId}/questions`,
    CREATE: (assessmentId) => `/assessments/${assessmentId}/questions`,
    LIST: (assessmentId) => `/assessments/${assessmentId}/questions`,
    GET: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
    UPDATE: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
    DELETE: (assessmentId, questionId) => `/assessments/${assessmentId}/questions/${questionId}`,
  },
  RESPONSES: {
    BASE: '/responses',
    CREATE: '/responses',
    LIST: '/responses',
    GET: (id) => `/responses/${id}`,
    UPDATE: (id) => `/responses/${id}`,
    DELETE: (id) => `/responses/${id}`,
    SUBMIT: (id) => `/responses/${id}/submit`,
    SCORE: (id) => `/responses/${id}/score`,
    ANALYZE: (id) => `/responses/${id}/analyze`,
    BY_ASSESSMENT: (assessmentId) => `/responses/assessment/${assessmentId}`,
  },
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    PLANS: '/subscriptions/plans',
    CURRENT: '/subscriptions/current',
    UPGRADE: '/subscriptions/upgrade',
    CANCEL: '/subscriptions/cancel',
    INVOICES: '/subscriptions/invoices',
  },
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    ASSESSMENT_STATS: (assessmentId) => `/analytics/assessment/${assessmentId}`,
    QUESTION_ANALYSIS: (assessmentId) => `/analytics/assessment/${assessmentId}/questions`,
    TRENDS: (assessmentId) => `/analytics/assessment/${assessmentId}/trends`,
  },
  HEALTH: {
    CHECK: '/health',
    METRICS: '/health/metrics',
    STATUS: '/health/status',
  },
  UTILS: {
    COUNTRIES: '/utils/countries',
    TIMEZONES: '/utils/timezones',
    CURRENCIES: '/utils/currencies',
  }
};

/* -----------------------
   API Service Functions
   ----------------------- */
const AuthAPI = {
  register: (payload) => api.post(API_ENDPOINTS.AUTH.REGISTER, payload),
  login: (payload) => api.post(API_ENDPOINTS.AUTH.LOGIN, payload),
  me: () => api.get(API_ENDPOINTS.AUTH.ME),
  logout: async () => {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      // Silently fail if logout endpoint is not available
    }
    TokenManager.clearAll();
    return Promise.resolve();
  },
  forgotPassword: (email) => api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),
  resetPassword: (token, newPassword) => api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password: newPassword }),
  refreshToken: (refreshToken) => api.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken }),
};

const UsersAPI = {
  list: () => api.get(API_ENDPOINTS.USERS.LIST),
  get: (id) => api.get(API_ENDPOINTS.USERS.GET(id)),
  update: (id, payload) => api.put(API_ENDPOINTS.USERS.UPDATE(id), payload),
  getProfile: () => api.get(API_ENDPOINTS.USERS.PROFILE),
  updatePreferences: (payload) => api.put(API_ENDPOINTS.USERS.PREFERENCES, payload),
};

const OrganizationsAPI = {
  create: (payload) => api.post(API_ENDPOINTS.ORGANIZATIONS.CREATE, payload),
  list: () => api.get(API_ENDPOINTS.ORGANIZATIONS.LIST),
  get: (id) => api.get(API_ENDPOINTS.ORGANIZATIONS.GET(id)),
  update: (id, payload) => api.put(API_ENDPOINTS.ORGANIZATIONS.UPDATE(id), payload),
  getMembers: (id) => api.get(API_ENDPOINTS.ORGANIZATIONS.MEMBERS(id)),
  inviteMember: (id, payload) => api.post(API_ENDPOINTS.ORGANIZATIONS.INVITE(id), payload),
};

const AssessmentsAPI = {
  create: (payload) => api.post(API_ENDPOINTS.ASSESSMENTS.CREATE, payload),
  list: (params = {}) => api.get(API_ENDPOINTS.ASSESSMENTS.LIST, { params }),
  get: (id) => api.get(API_ENDPOINTS.ASSESSMENTS.GET(id)),
  update: (id, payload) => api.put(API_ENDPOINTS.ASSESSMENTS.UPDATE(id), payload),
  delete: (id) => api.delete(API_ENDPOINTS.ASSESSMENTS.DELETE(id)),
  publish: (id) => api.post(API_ENDPOINTS.ASSESSMENTS.PUBLISH(id)),
  unpublish: (id) => api.post(API_ENDPOINTS.ASSESSMENTS.UNPUBLISH(id)),
  getTemplates: () => api.get(API_ENDPOINTS.ASSESSMENTS.TEMPLATES),
  getCategories: () => api.get(API_ENDPOINTS.ASSESSMENTS.CATEGORIES),
};

const QuestionsAPI = {
  create: (assessmentId, payload) => api.post(API_ENDPOINTS.QUESTIONS.CREATE(assessmentId), payload),
  list: (assessmentId, params = {}) => api.get(API_ENDPOINTS.QUESTIONS.LIST(assessmentId), { params }),
  get: (assessmentId, questionId) => api.get(API_ENDPOINTS.QUESTIONS.GET(assessmentId, questionId)),
  update: (assessmentId, questionId, payload) => api.put(API_ENDPOINTS.QUESTIONS.UPDATE(assessmentId, questionId), payload),
  delete: (assessmentId, questionId) => api.delete(API_ENDPOINTS.QUESTIONS.DELETE(assessmentId, questionId)),
};

const ResponsesAPI = {
  create: (payload) => api.post(API_ENDPOINTS.RESPONSES.CREATE, payload),
  list: (params = {}) => api.get(API_ENDPOINTS.RESPONSES.LIST, { params }),
  get: (id) => api.get(API_ENDPOINTS.RESPONSES.GET(id)),
  update: (id, payload) => api.put(API_ENDPOINTS.RESPONSES.UPDATE(id), payload),
  delete: (id) => api.delete(API_ENDPOINTS.RESPONSES.DELETE(id)),
  submit: (id) => api.post(API_ENDPOINTS.RESPONSES.SUBMIT(id)),
  getScore: (id) => api.get(API_ENDPOINTS.RESPONSES.SCORE(id)),
  analyze: (id) => api.get(API_ENDPOINTS.RESPONSES.ANALYZE(id)),
  getByAssessment: (assessmentId, params = {}) => api.get(API_ENDPOINTS.RESPONSES.BY_ASSESSMENT(assessmentId), { params }),
};

const SubscriptionsAPI = {
  getPlans: () => api.get(API_ENDPOINTS.SUBSCRIPTIONS.PLANS),
  getCurrent: () => api.get(API_ENDPOINTS.SUBSCRIPTIONS.CURRENT),
  upgrade: (planId) => api.post(API_ENDPOINTS.SUBSCRIPTIONS.UPGRADE, { planId }),
  cancel: () => api.post(API_ENDPOINTS.SUBSCRIPTIONS.CANCEL),
  getInvoices: () => api.get(API_ENDPOINTS.SUBSCRIPTIONS.INVOICES),
};

const AnalyticsAPI = {
  getDashboard: () => api.get(API_ENDPOINTS.ANALYTICS.DASHBOARD),
  getAssessmentStats: (assessmentId) => api.get(API_ENDPOINTS.ANALYTICS.ASSESSMENT_STATS(assessmentId)),
  getQuestionAnalysis: (assessmentId) => api.get(API_ENDPOINTS.ANALYTICS.QUESTION_ANALYSIS(assessmentId)),
  getTrends: (assessmentId) => api.get(API_ENDPOINTS.ANALYTICS.TRENDS(assessmentId)),
};

const HealthAPI = {
  check: () => api.get(API_ENDPOINTS.HEALTH.CHECK),
  getMetrics: () => api.get(API_ENDPOINTS.HEALTH.METRICS),
  getStatus: () => api.get(API_ENDPOINTS.HEALTH.STATUS),
};

const UtilsAPI = {
  getCountries: () => api.get(API_ENDPOINTS.UTILS.COUNTRIES),
  getTimezones: () => api.get(API_ENDPOINTS.UTILS.TIMEZONES),
  getCurrencies: () => api.get(API_ENDPOINTS.UTILS.CURRENCIES),
};

/* -----------------------
   Helper Functions
   ----------------------- */
const trackError = (error, context = {}) => {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      message: typeof error === 'string' ? error : (error?.message || 'Unknown error'),
      stack: error?.stack || null,
      status: error?.status || null,
      code: error?.code || null,
      url: (typeof window !== 'undefined' && window.location?.href) || null,
      user: TokenManager.getUser()?.id || null,
      ...context,
    };

    console.error('Tracked Error:', payload);
    apiEvents.emit('error:tracked', payload);

    // Optional: Send to backend error tracking
    if (typeof fetch !== 'undefined') {
      fetch(`${getApiBaseUrl()}/errors/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    console.error('trackError failure', e);
  }
};

const setAuthToken = (token) => TokenManager.setToken(token);

// Create event emitter instance
const apiEvents = createEventEmitter();

// Initialize auth header from storage
if (typeof window !== 'undefined') {
  const existingToken = TokenManager.getToken();
  if (existingToken) {
    api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
  }
}

/* -----------------------
   Export everything - SINGLE EXPORT BLOCK
   ----------------------- */
export {
  api as default,
  getApiBaseUrl as API_BASE_URL,
  TokenManager,
  apiEvents,
  createEventEmitter,
  setAuthToken,
  trackError,
  API_ENDPOINTS,
  AuthAPI,
  UsersAPI,
  OrganizationsAPI,
  AssessmentsAPI,
  QuestionsAPI,
  ResponsesAPI,
  SubscriptionsAPI,
  AnalyticsAPI,
  HealthAPI,
  UtilsAPI,
};
