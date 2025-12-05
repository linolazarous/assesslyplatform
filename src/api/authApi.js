// src/api/authApi.js
import api from './axiosConfig';

/**
 * Authentication API Service
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 * Catches network errors and returns them in consistent format
 */

const createApiMethod = (method, endpoint, options = {}) => {
  return async (data, params) => {
    try {
      const config = {
        ...options,
        params: params || options.params,
      };

      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint, config);
          break;
        case 'post':
          response = await api.post(endpoint, data, config);
          break;
        case 'put':
          response = await api.put(endpoint, data, config);
          break;
        case 'delete':
          response = await api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Normalize response: if backend returns { success, data, message } use it directly
      // Otherwise wrap the response data
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`[AuthAPI] ${method} ${endpoint} error:`, error);
      
      // Extract error message from response
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     'An unexpected error occurred';
      
      const status = error.response?.status;
      
      return {
        success: false,
        message,
        status,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
    }
  };
};

// ===================== EMAIL/PASSWORD AUTHENTICATION =====================

/**
 * Login with email and password
 */
export const login = createApiMethod('post', '/api/v1/auth/login');

/**
 * Register new user account
 */
export const register = createApiMethod('post', '/api/v1/auth/register');

/**
 * Forgot password request
 */
export const forgotPassword = createApiMethod('post', '/api/v1/auth/forgot-password');

/**
 * Reset password with token
 */
export const resetPassword = createApiMethod('post', '/api/v1/auth/reset-password');

/**
 * Verify password reset token
 */
export const verifyResetToken = createApiMethod('get', '/api/v1/auth/verify-reset-token/:token');

// ===================== GOOGLE OAUTH AUTHENTICATION =====================

/**
 * Initiate Google OAuth flow
 */
export const initiateGoogleOAuth = createApiMethod('get', '/api/v1/auth/google');

/**
 * Handle Google OAuth callback
 */
export const googleOAuthCallback = createApiMethod('post', '/api/v1/auth/google/callback');

// ===================== SESSION & TOKEN MANAGEMENT =====================

/**
 * Verify JWT token validity
 */
export const verifyToken = createApiMethod('get', '/api/v1/auth/verify-token');

/**
 * Refresh access token
 */
export const refreshToken = createApiMethod('post', '/api/v1/auth/refresh-token');

/**
 * Logout user (invalidate token)
 */
export const logout = createApiMethod('post', '/api/v1/auth/logout');

// ===================== USER PROFILE MANAGEMENT =====================

/**
 * Get current user profile
 */
export const getProfile = async () => {
  try {
    const result = await createApiMethod('get', '/api/v1/auth/profile')();
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock profile data for development');
      return {
        success: true,
        data: {
          id: 'user_123',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User',
          organizationId: 'org_123',
          organizationName: 'Demo Organization',
          role: 'owner',
          avatar: null,
          createdAt: new Date().toISOString(),
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock profile data for development due to error:', error);
      return {
        success: true,
        data: {
          id: 'user_123',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User',
          organizationId: 'org_123',
          organizationName: 'Demo Organization',
          role: 'owner',
          avatar: null,
          createdAt: new Date().toISOString(),
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to load profile',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Update user profile
 */
export const updateProfile = createApiMethod('put', '/api/v1/auth/profile');

// ===================== EMAIL VERIFICATION =====================

/**
 * Verify email with token
 */
export const verifyEmail = createApiMethod('post', '/api/v1/auth/verify-email');

// ===================== ORGANIZATION INVITATIONS =====================

/**
 * Verify organization invitation token
 */
export const verifyInvite = createApiMethod('get', '/api/v1/auth/verify-invite/:inviteToken');

// ===================== AUTHENTICATION PROVIDERS =====================

/**
 * Get available authentication providers
 */
export const getAuthProviders = createApiMethod('get', '/api/v1/auth/providers');

// ===================== ORGANIZATION AUTH =====================

/**
 * Get user's organizations
 */
export const getUserOrganizations = async () => {
  try {
    const result = await createApiMethod('get', '/api/v1/auth/organizations')();
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock organizations data for development');
      return {
        success: true,
        data: {
          organizations: [
            {
              id: 'org_123',
              name: 'Demo Organization',
              role: 'owner',
              plan: 'professional',
              members: 5,
              createdAt: new Date().toISOString(),
            }
          ]
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock organizations data for development due to error:', error);
      return {
        success: true,
        data: {
          organizations: [
            {
              id: 'org_123',
              name: 'Demo Organization',
              role: 'owner',
              plan: 'professional',
              members: 5,
              createdAt: new Date().toISOString(),
            }
          ]
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to load organizations',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== ADDITIONAL USEFUL ENDPOINTS =====================

/**
 * Get current user (me endpoint)
 */
export const getCurrentUser = createApiMethod('get', '/api/v1/auth/me');

/**
 * Check authentication status
 */
export const checkAuthStatus = async () => {
  try {
    // Try to get profile to check auth status
    const profileResult = await getProfile();
    return {
      success: profileResult.success,
      data: {
        authenticated: profileResult.success,
        user: profileResult.success ? profileResult.data : null,
      },
      message: profileResult.success ? 'Authenticated' : 'Not authenticated',
    };
  } catch (error) {
    return {
      success: false,
      data: { authenticated: false, user: null },
      message: 'Not authenticated',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Change password (authenticated)
 */
export const changePassword = createApiMethod('post', '/api/v1/auth/change-password');

// ===================== MOCK DATA FOR DEVELOPMENT =====================

const mockProfile = {
  id: 'user_123',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  organizationId: 'org_123',
  organizationName: 'Demo Organization',
  role: 'owner',
  avatar: null,
  createdAt: new Date().toISOString(),
  subscription: {
    planId: 'professional',
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
};

// ===================== DEVELOPMENT FALLBACKS =====================
// If API is not available, use mock data for development

const loginWithFallback = async (credentials) => {
  try {
    const result = await login(credentials);
    
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock login for development');
      return {
        success: true,
        data: {
          user: mockProfile,
          token: 'mock_jwt_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          expiresIn: 3600,
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthAPI] Using mock login for development due to error:', error);
      return {
        success: true,
        data: {
          user: mockProfile,
          token: 'mock_jwt_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          expiresIn: 3600,
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== DEFAULT EXPORT =====================

const authApi = {
  // Core methods with fallbacks
  login: loginWithFallback,
  getProfile,
  getUserOrganizations,
  checkAuthStatus,
  
  // Other methods (without fallbacks)
  register,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  initiateGoogleOAuth,
  googleOAuthCallback,
  verifyToken,
  refreshToken,
  logout,
  updateProfile,
  verifyEmail,
  verifyInvite,
  getAuthProviders,
  getCurrentUser,
  changePassword,
  
  // Utility method for testing
  getMockProfile: () => ({
    success: true,
    data: mockProfile,
    fromMock: true,
  }),
};

export default authApi;
