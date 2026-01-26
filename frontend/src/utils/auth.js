// frontend/src/utils/auth.js
import axios from 'axios';
import { authAPI, apiUtils } from '../services/api';
import config, { 
  getAuthToken, setAuthToken, getRefreshToken, setRefreshToken, 
  setUser, getUser, clearAuthData, isAuthenticated, 
  decodeToken, isTokenExpired, getTokenLifetime, setSessionId, getSessionId, clearSessionId
} from '../config.js';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add token and session ID
api.interceptors.request.use(
  (requestConfig) => {
    const token = getAuthToken();
    const sessionId = getSessionId();
    
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    
    if (sessionId) {
      requestConfig.headers['X-Session-ID'] = sessionId;
    }
    
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    // Store session ID from response if present
    if (response.data?.session_id) {
      setSessionId(response.data.session_id);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token using the authAPI
        const result = await authAPI.refreshToken();

        if (result?.access_token) {
          // Update tokens
          setAuthToken(result.access_token);

          if (result.refresh_token) {
            setRefreshToken(result.refresh_token);
          }

          // Retry original request
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${result.access_token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Clear local auth state ONLY
        clearAuthData();
        clearSessionId();

        // ❌ DO NOT hard redirect in interceptor (causes white screen)
        // ✅ Let React auth guards / routing handle it
        return Promise.reject({
          ...refreshError,
          isAuthExpired: true
        });
      }
    }

    // Default error handling
    return Promise.reject(error);
  }
);

    // Handle other common errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      switch (status) {
        case 400:
          console.error('Bad request:', errorData);
          break;
        case 403:
          console.error('Forbidden:', errorData);
          // Handle 2FA required specifically
          if (errorData?.detail?.includes('Two-factor authentication required')) {
            return Promise.reject({
              ...error,
              requires2FA: true,
              message: 'Two-factor authentication required'
            });
          }
          break;
        case 404:
          console.error('Resource not found:', error.response.config.url);
          break;
        case 422:
          console.warn('Validation error:', errorData);
          break;
        case 429:
          console.error('Rate limit exceeded:', errorData);
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          console.error('Server error:', errorData);
          break;
        default:
          console.error('API Error:', errorData);
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
 * Enhanced login with 2FA support
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - Login result with 2FA info if required
 */
export const login = async (email, password) => {
  try {
    // Use the enhanced 2FA login handler
    const result = await apiUtils.handle2FALogin({ email, password });
    
    // Store session ID if present
    if (result.session_id) {
      setSessionId(result.session_id);
    }
    
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
 * Login with 2FA verification
 * @param {string} token - 2FA token
 * @param {string} tempToken - Temporary token from initial login
 * @returns {Promise<object>} - Final login result
 */
export const loginWith2FA = async (token, tempToken) => {
  try {
    // Set temporary token for the request
    const originalToken = getAuthToken();
    setAuthToken(tempToken);
    
    // Verify 2FA token
    const result = await authAPI.verify2FALogin(token);
    
    // Restore original token if verification failed
    if (!result.access_token) {
      setAuthToken(originalToken);
    }
    
    // Store session ID if present
    if (result.session_id) {
      setSessionId(result.session_id);
    }
    
    return result;
  } catch (error) {
    let errorMessage = 'Two-factor authentication failed';
    
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    
    const authError = new Error(errorMessage);
    authError.isAuthError = true;
    authError.status = error.response?.status;
    authError.is2FAError = true;
    
    throw authError;
  }
};

/**
 * Setup two-factor authentication
 * @returns {Promise<object>} - 2FA setup data (secret, QR code, backup codes)
 */
export const setup2FA = async () => {
  try {
    return await authAPI.setup2FA();
  } catch (error) {
    let errorMessage = 'Failed to setup two-factor authentication';
    
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
 * Verify and enable 2FA setup
 * @param {string} token - 2FA verification token
 * @param {string} method - 2FA method (default: 'totp')
 * @returns {Promise<object>} - Success response
 */
export const verify2FASetup = async (token, method = 'totp') => {
  try {
    return await authAPI.verify2FASetup(token, method);
  } catch (error) {
    let errorMessage = 'Failed to verify two-factor authentication';
    
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
 * Disable two-factor authentication
 * @param {string} token - 2FA token or backup code
 * @returns {Promise<object>} - Success response
 */
export const disable2FA = async (token) => {
  try {
    return await authAPI.disable2FA(token);
  } catch (error) {
    let errorMessage = 'Failed to disable two-factor authentication';
    
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
 * Get active user sessions
 * @returns {Promise<Array>} - List of active sessions
 */
export const getSessions = async () => {
  try {
    return await authAPI.getSessions();
  } catch (error) {
    console.error('Error fetching sessions:', error);
    
    let errorMessage = 'Failed to fetch sessions';
    if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Terminate a specific session
 * @param {string} sessionId - Session ID to terminate
 * @returns {Promise<object>} - Success response
 */
export const terminateSession = async (sessionId) => {
  try {
    return await authAPI.terminateSession(sessionId);
  } catch (error) {
    let errorMessage = 'Failed to terminate session';
    
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
 * Terminate all other sessions (except current)
 * @returns {Promise<object>} - Success response
 */
export const terminateAllOtherSessions = async () => {
  try {
    const currentSessionId = getSessionId();
    return await authAPI.terminateAllSessions(currentSessionId);
  } catch (error) {
    let errorMessage = 'Failed to terminate sessions';
    
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
 * Register a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} - User data and tokens
 */
export const register = async (userData) => {
  try {
    const result = await authAPI.register(userData);
    
    // Store session ID if present
    if (result.session_id) {
      setSessionId(result.session_id);
    }
    
    return result;
  } catch (error) {
    let errorMessage = 'Registration failed';
    let errorDetails = {};
    let fieldErrors = {};
    
    if (error.response) {
      const errorData = error.response.data;
      
      if (errorData?.detail && typeof errorData.detail === 'object') {
        Object.entries(errorData.detail).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            const frontendField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            fieldErrors[frontendField] = messages[0];
          }
        });
        errorDetails = fieldErrors;
        errorMessage = 'Please fix the errors in the form';
      } 
      else if (errorData?.detail) {
        errorMessage = errorData.detail;
        
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
 * @returns {Promise<object>}
 */
export const logout = async () => {
  try {
    const sessionId = getSessionId();
    await authAPI.logout(sessionId);
  } catch (error) {
    console.log('Logout endpoint error:', error.message);
  } finally {
    clearAuthData();
    clearSessionId();
  }
  
  return { success: true, message: "Logged out successfully" };
};

/**
 * Get current authenticated user
 * @returns {Promise<object|null>} - User data or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    const result = await authAPI.getCurrentUser();
    return result;
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    if (error.response?.status === 401) {
      return null;
    }
    
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
 * Resend email verification
 * @param {string} email - User email
 * @returns {Promise<object>}
 */
export const resendVerification = async (email) => {
  try {
    return await authAPI.resendVerification(email);
  } catch (error) {
    let errorMessage = 'Failed to resend verification email';
    
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
    clearSessionId();
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
 * Check if user has 2FA enabled
 * @returns {Promise<boolean>}
 */
export const check2FAEnabled = async () => {
  try {
    const user = await getCurrentUser();
    return user?.two_factor_enabled || false;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
};

/**
 * Get authentication headers for API requests
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} - Headers object
 */
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getAuthToken();
  const sessionId = getSessionId();
  
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }
  
  return headers;
};

/**
 * Set up automatic token refresh
 * @param {number} refreshThreshold - Refresh token when remaining lifetime is below this (in seconds)
 */
export const setupTokenRefresh = (refreshThreshold = 300) => {
  const token = getAuthToken();
  if (!token) return;
  
  const lifetime = getTokenLifetime(token);
  
  if (lifetime < refreshThreshold) {
    refreshToken().catch(error => {
      console.error('Automatic token refresh failed:', error);
    });
  } else {
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

/**
 * Direct API call utility
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request data
 * @param {object} headers - Additional headers
 * @returns {Promise<object>}
 */
export const apiCall = async (method, endpoint, data = null, headers = {}) => {
  try {
    const response = await api({
      method,
      url: endpoint,
      data,
      headers: {
        ...getAuthHeaders(),
        ...headers
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Upload file with progress tracking
 * @param {string} endpoint - API endpoint
 * @param {File} file - File to upload
 * @param {function} onProgress - Progress callback
 * @param {object} additionalData - Additional form data
 * @returns {Promise<object>}
 */
export const uploadFile = async (endpoint, file, onProgress = null, additionalData = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  try {
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      } : undefined
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Validate session and refresh token if needed
 * @returns {Promise<boolean>} - True if session is valid
 */
export const validateSession = async () => {
  try {
    if (!isAuthenticated()) {
      return false;
    }
    
    const token = getAuthToken();
    if (isTokenExpired(token)) {
      await refreshToken();
    }
    
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};

/**
 * Get current session ID
 * @returns {string|null}
 */
export const getCurrentSessionId = () => {
  return getSessionId();
};

/**
 * Get user permissions and capabilities
 * @returns {Promise<object>} - User permissions
 */
export const getUserPermissions = async () => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { authenticated: false, permissions: {} };
    }
    
    // Get subscription info
    const subscriptionResponse = await apiCall('GET', '/api/subscriptions/me');
    const subscription = subscriptionResponse?.data || { plan: 'free' };
    
    // Define permissions based on subscription plan
    const permissions = {
      authenticated: true,
      user: user,
      subscription: subscription,
      capabilities: {
        // Assessment limits
        maxAssessments: subscription.plan === 'free' ? 5 : 
                        subscription.plan === 'basic' ? 50 : 
                        Infinity,
        maxCandidates: subscription.plan === 'free' ? 50 : 
                       subscription.plan === 'basic' ? 500 : 
                       Infinity,
        // Features
        canPublishAssessments: subscription.plan !== 'free',
        canCustomizeBranding: subscription.plan === 'professional' || subscription.plan === 'enterprise',
        canExportResults: subscription.plan !== 'free',
        hasAdvancedAnalytics: subscription.plan === 'professional' || subscription.plan === 'enterprise',
        hasAPIAccess: subscription.plan !== 'free',
        // Security
        twoFactorEnabled: user.two_factor_enabled || false,
        emailVerified: user.is_verified || false
      }
    };
    
    return permissions;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return { authenticated: false, permissions: {} };
  }
};

// Export all utilities
export { 
  isAuthenticated, 
  clearAuthData, 
  getAuthToken, 
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser,
  decodeToken,
  isTokenExpired,
  getTokenLifetime,
  getSessionId,
  setSessionId,
  clearSessionId
};

// Default export for direct API usage
export default api;
