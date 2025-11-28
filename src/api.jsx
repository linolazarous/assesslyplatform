/**
 * src/api.jsx
 * Axios configuration compliant with Assessly Platform API documentation
 * Supports: Email authentication + Google OAuth only
 * Base URL: https://assesslyplatform-t49h.onrender.com/api/v1
 * Authentication: Bearer token required for most endpoints
 */

import axios from 'axios';

// ----------------------
// API Configuration from Documentation
// ----------------------
const getApiBaseUrl = () => {
  // Use environment variable if provided, otherwise use documented production URL
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, ''); // Remove trailing slashes

  // Default to documented production server
  return 'https://assesslyplatform-t49h.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

console.log('🔧 API Configuration:', { API_BASE_URL, API_V1_BASE_URL });

// ----------------------
// Axios Instance with API Documentation Compliance
// ----------------------
const api = axios.create({
  baseURL: API_V1_BASE_URL, // Matches documented base URL structure
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // Required for refresh token cookies
});

// ----------------------
// Authentication Helpers
// ----------------------
export const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.warn('Failed to access localStorage:', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.warn('Failed to modify token in localStorage:', error);
  }
};

// ----------------------
// Request Interceptor - Adds JWT Token
// ----------------------
api.interceptors.request.use(
  (config) => {
    // Add Authorization header as per documentation
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for debugging
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ----------------------
// Response Interceptor - Handles Token Refresh & Errors
// ----------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Log successful API calls in development
    if (import.meta.env.DEV) {
      console.log(`✅ API ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error details
    console.error('🔴 API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.message
    });

    // Handle 401 Unauthorized - Attempt token refresh
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/')) {
      
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Attempting token refresh...');
        
        // Use the documented refresh endpoint
        const refreshResponse = await axios.get(`${API_V1_BASE_URL}/auth/refresh`, {
          withCredentials: true,
          timeout: 10000,
        });

        const newToken = refreshResponse.data?.token;
        
        if (!newToken) {
          throw new Error('No token received from refresh endpoint');
        }

        // Update token in storage and headers
        setAuthToken(newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        console.log('✅ Token refreshed successfully');
        
        // Process queued requests
        processQueue(null, newToken);
        
        // Retry original request
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Clear auth state and redirect to login
        setAuthToken(null);
        processQueue(refreshError, null);
        
        // Redirect to login page with expired session message
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth?session=expired';
        }
        
        return Promise.reject({
          message: 'Your session has expired. Please log in again.',
          code: 'SESSION_EXPIRED',
          status: 401
        });
      } finally {
        isRefreshing = false;
      }
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
    };

    return Promise.reject(apiError);
  }
);

// ----------------------
// Rate Limiting Awareness
// ----------------------
export const RATE_LIMITS = {
  AUTH: 10,    // 10 requests per minute for auth endpoints
  GENERAL: 100 // 100 requests per minute for other endpoints
};

// ----------------------
// API Endpoints from Documentation (Email + Google OAuth only)
// ----------------------
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    GOOGLE: '/auth/google', // Only Google OAuth
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User management endpoints
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    BY_ID: (id) => `/users/${id}`,
  },
  
  // Assessment endpoints
  ASSESSMENTS: {
    BASE: '/assessments',
    BY_ID: (id) => `/assessments/${id}`,
    QUESTIONS: (id) => `/assessments/${id}/questions`,
    RESPONSES: (id) => `/assessments/${id}/responses`,
    RESULTS: (id) => `/assessments/${id}/results`,
  },
  
  // Assessment responses endpoints
  ASSESSMENT_RESPONSES: {
    BASE: '/assessment-responses',
    BY_ID: (id) => `/assessment-responses/${id}`,
  },
  
  // Organization endpoints
  ORGANIZATIONS: {
    BASE: '/organizations',
    BY_ID: (id) => `/organizations/${id}`,
    MEMBERS: (id) => `/organizations/${id}/members`,
  },
  
  // Contact endpoints
  CONTACT: {
    BASE: '/contact',
  },
  
  // User activities endpoints
  USER_ACTIVITIES: {
    BASE: '/user-activities',
  },
  
  // Health and status endpoints
  HEALTH: '/health',
  STATUS: '/status',
};

// ----------------------
// API Service Functions
// ----------------------

/**
 * Make an API request with retry logic
 */
export const apiRequest = async (method, endpoint, data = null, options = {}) => {
  try {
    const config = {
      method,
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

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error(`API ${method} ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Health check - verifies API connectivity
 */
export const checkServerHealth = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.HEALTH);
    return {
      healthy: true,
      status: response.data?.status,
      timestamp: response.data?.timestamp,
    };
  } catch (error) {
    console.error('Server health check failed:', error);
    return {
      healthy: false,
      error: error.message,
    };
  }
};

/**
 * Service status check
 */
export const checkServiceStatus = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.STATUS);
    return response.data;
  } catch (error) {
    console.error('Service status check failed:', error);
    throw error;
  }
};

// ----------------------
// Authentication Service Functions (Email + Google only)
// ----------------------

/**
 * Register a new user with email/password
 */
export const registerUser = async (userData) => {
  return apiRequest('post', API_ENDPOINTS.AUTH.REGISTER, userData);
};

/**
 * Login user with email/password
 */
export const loginUser = async (credentials) => {
  return apiRequest('post', API_ENDPOINTS.AUTH.LOGIN, credentials);
};

/**
 * Get current user profile
 */
export const getCurrentUser = async () => {
  return apiRequest('get', API_ENDPOINTS.AUTH.ME);
};

/**
 * Logout user
 */
export const logoutUser = async () => {
  try {
    await apiRequest('post', API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    console.warn('Logout API call failed, clearing local state anyway:', error);
  } finally {
    // Always clear local storage
    setAuthToken(null);
    localStorage.removeItem('user');
  }
};

/**
 * Initiate Google OAuth flow
 */
export const initiateGoogleOAuth = () => {
  // Redirect to Google OAuth endpoint - server will handle the flow
  window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email) => {
  return apiRequest('post', API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
};

/**
 * Reset password with token
 */
export const resetPassword = async (token, newPassword) => {
  return apiRequest('post', API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    token,
    password: newPassword
  });
};

// ----------------------
// Assessment Service Functions
// ----------------------

/**
 * Get all assessments
 */
export const getAssessments = async (params = {}) => {
  return apiRequest('get', API_ENDPOINTS.ASSESSMENTS.BASE, params);
};

/**
 * Get assessment by ID
 */
export const getAssessmentById = async (id) => {
  return apiRequest('get', API_ENDPOINTS.ASSESSMENTS.BY_ID(id));
};

/**
 * Create new assessment
 */
export const createAssessment = async (assessmentData) => {
  return apiRequest('post', API_ENDPOINTS.ASSESSMENTS.BASE, assessmentData);
};

/**
 * Update assessment
 */
export const updateAssessment = async (id, assessmentData) => {
  return apiRequest('put', API_ENDPOINTS.ASSESSMENTS.BY_ID(id), assessmentData);
};

/**
 * Delete assessment
 */
export const deleteAssessment = async (id) => {
  return apiRequest('delete', API_ENDPOINTS.ASSESSMENTS.BY_ID(id));
};

// ----------------------
// User Service Functions
// ----------------------

/**
 * Get user profile
 */
export const getUserProfile = async () => {
  return apiRequest('get', API_ENDPOINTS.USERS.PROFILE);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (profileData) => {
  return apiRequest('put', API_ENDPOINTS.USERS.PROFILE, profileData);
};

// ----------------------
// Export Default Instance
// ----------------------
export default api;
