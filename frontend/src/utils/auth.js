// frontend/src/utils/auth.js
import axios from 'axios';
import { authAPI } from '../services/api';
import config, { 
  getAuthToken, setAuthToken, getRefreshToken, setRefreshToken, 
  setUser, getUser, clearAuthData, isAuthenticated 
} from '../config.js';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token using the authAPI
        const result = await authAPI.refreshToken();
        
        if (result.access_token) {
          // Update tokens
          setAuthToken(result.access_token);
          if (result.refresh_token) {
            setRefreshToken(result.refresh_token);
          }
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${result.access_token}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Refresh failed, logout user
        clearAuthData();
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle other common errors
    if (error.response) {
      switch (error.response.status) {
        case 400:
          console.error('Bad request:', error.response.data);
          break;
        case 403:
          console.error('Forbidden:', error.response.data);
          // Optionally redirect to unauthorized page
          // window.location.href = '/unauthorized';
          break;
        case 404:
          console.error('Resource not found:', error.response.config.url);
          break;
        case 422:
          console.warn('Validation error:', error.response.data);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      console.error('Network error:', error.message);
    } else {
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Auth utilities

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - User data and tokens
 */
export const login = async (email, password) => {
  try {
    // Use the authAPI service
    const result = await authAPI.login({ email, password });
    
    // authAPI already handles token storage, but we can return the result
    return result;
  } catch (error) {
    // Format error for consistent error handling
    let errorMessage = 'Login failed';
    let errorDetails = {};
    
    if (error.response) {
      const errorData = error.response.data;
      
      // Handle backend validation errors
      if (errorData?.detail && typeof errorData.detail === 'object') {
        errorDetails = errorData.detail;
        errorMessage = 'Please check your information';
      } 
      else if (errorData?.detail) {
        errorMessage = errorData.detail;
      } 
      else if (error.response.status === 401) {
        errorMessage = 'Invalid email or password';
      }
      else if (error.response.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    // Create a consistent error object
    const authError = new Error(errorMessage);
    authError.details = errorDetails;
    authError.isAuthError = true;
    authError.status = error.response?.status;
    
    throw authError;
  }
};

/**
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} - User data and tokens
 */
export const register = async (userData) => {
  try {
    // Use the authAPI service
    const result = await authAPI.register(userData);
    return result;
  } catch (error) {
    // Format error for consistent error handling
    let errorMessage = 'Registration failed';
    let errorDetails = {};
    let fieldErrors = {};
    
    if (error.response) {
      const errorData = error.response.data;
      
      // Handle backend validation errors
      if (errorData?.detail && typeof errorData.detail === 'object') {
        // Map backend field names to frontend field names
        Object.entries(errorData.detail).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            // Convert snake_case to camelCase for frontend
            const frontendField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            fieldErrors[frontendField] = messages[0];
          }
        });
        errorDetails = fieldErrors;
        errorMessage = 'Please fix the errors in the form';
      } 
      else if (errorData?.detail) {
        errorMessage = errorData.detail;
        
        // Check for duplicate email
        if (errorData.detail.includes('already registered') || 
            errorData.detail.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
          fieldErrors.email = errorMessage;
        }
      } 
      else if (error.response.status === 400) {
        errorMessage = 'Invalid registration data';
      }
      else if (error.response.status === 429) {
        errorMessage = 'Too many registration attempts. Please try again later.';
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    // Create a consistent error object
    const authError = new Error(errorMessage);
    authError.details = errorDetails;
    authError.fieldErrors = fieldErrors;
    authError.isAuthError = true;
    authError.status = error.response?.status;
    
    throw authError;
  }
};

/**
 * Logout the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    // Use the authAPI service
    await authAPI.logout();
  } catch (error) {
    // Silently fail if logout endpoint has issues
    console.log('Logout endpoint error:', error.message);
  } finally {
    // Always clear local auth data
    clearAuthData();
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<object|null>} - User data or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    // Use the authAPI service
    const result = await authAPI.getCurrentUser();
    return result;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    // Return null if unauthorized (user is not logged in)
    if (error.response?.status === 401) {
      return null;
    }
    
    // For other errors, check if we have cached user data
    const cachedUser = getUser();
    if (cachedUser) {
      return cachedUser;
    }
    
    throw error;
  }
};

/**
 * Verify email with token
 * @param {string} token - Email verification token
 * @returns {Promise<object>}
 */
export const verifyEmail = async (token) => {
  try {
    return await authAPI.verifyEmail(token);
  } catch (error) {
    let errorMessage = 'Email verification failed';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    
    const authError = new Error(errorMessage);
    authError.isAuthError = true;
    authError.status = error.response?.status;
    
    throw authError;
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<object>}
 */
export const forgotPassword = async (email) => {
  try {
    return await authAPI.forgotPassword(email);
  } catch (error) {
    let errorMessage = 'Password reset request failed';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    
    const authError = new Error(errorMessage);
    authError.isAuthError = true;
    authError.status = error.response?.status;
    
    throw authError;
  }
};

/**
 * Reset password with token
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password
 * @returns {Promise<object>}
 */
export const resetPassword = async (token, newPassword) => {
  try {
    return await authAPI.resetPassword(token, newPassword);
  } catch (error) {
    let errorMessage = 'Password reset failed';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    
    const authError = new Error(errorMessage);
    authError.isAuthError = true;
    authError.status = error.response?.status;
    
    throw authError;
  }
};

/**
 * Refresh authentication token
 * @returns {Promise<object>} - New tokens
 */
export const refreshToken = async () => {
  try {
    return await authAPI.refreshToken();
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuthData();
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const checkAuth = () => {
  return isAuthenticated();
};

/**
 * Get authentication headers for API requests
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} - Headers object
 */
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Extract user from JWT token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token payload or null
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;
    
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  return decoded.exp * 1000 < Date.now();
};

/**
 * Get remaining token lifetime in seconds
 * @param {string} token - JWT token
 * @returns {number} - Seconds until expiration
 */
export const getTokenLifetime = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
};

/**
 * Set up automatic token refresh
 * @param {number} refreshThreshold - Refresh token when remaining lifetime is below this (in seconds)
 */
export const setupTokenRefresh = (refreshThreshold = 300) => { // 5 minutes
  const token = getAuthToken();
  if (!token) return;
  
  const lifetime = getTokenLifetime(token);
  
  if (lifetime < refreshThreshold) {
    // Token will expire soon, refresh it
    refreshToken().catch(error => {
      console.error('Automatic token refresh failed:', error);
    });
  } else {
    // Schedule refresh when token is about to expire
    const refreshTime = (lifetime - refreshThreshold) * 1000;
    setTimeout(() => {
      refreshToken().catch(error => {
        console.error('Scheduled token refresh failed:', error);
      });
    }, refreshTime);
  }
};

/**
 * Initialize authentication
 * @returns {Promise<object|null>} - Current user or null
 */
export const initAuth = async () => {
  if (!isAuthenticated()) {
    return null;
  }
  
  try {
    const user = await getCurrentUser();
    setupTokenRefresh();
    return user;
  } catch (error) {
    console.error('Auth initialization error:', error);
    return null;
  }
};

export { 
  isAuthenticated, 
  clearAuthData, 
  getAuthToken, 
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser 
};

export default api;
