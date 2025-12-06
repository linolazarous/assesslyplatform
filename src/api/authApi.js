// src/api/authApi.js
import api, { API_ENDPOINTS, TokenManager } from './index';

/**
 * Authentication API Service for Assessly Platform
 * Multi-tenant aware with organization support
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 */

const createApiMethod = (method, endpoint, options = {}) => {
  return async (data, params, tenantId = null) => {
    try {
      const config = {
        ...options,
        params: params || options.params,
      };

      // Add tenant context if provided
      if (tenantId) {
        config.headers = {
          ...config.headers,
          'X-Tenant-ID': tenantId,
        };
      }

      // Add organization context from localStorage if available
      const orgId = TokenManager.getTenantId();
      if (orgId && !config.headers?.['X-Tenant-ID']) {
        config.headers = {
          ...config.headers,
          'X-Tenant-ID': orgId,
        };
      }

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
        case 'patch':
          response = await api.patch(endpoint, data, config);
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
                     error.response?.data?.error?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     'An unexpected error occurred';
      
      const status = error.response?.status;
      const code = error.response?.data?.code || error.code;
      
      // Handle specific error cases
      if (status === 401) {
        // Token expired or invalid
        TokenManager.clearTokens();
      }
      
      return {
        success: false,
        message,
        status,
        code,
        error: import.meta.env.DEV ? error : undefined,
      };
    }
  };
};

// ===================== CORE AUTHENTICATION =====================

/**
 * Login with email and password (supports multi-tenant)
 * @param {Object} credentials - { email, password, organizationId, rememberMe }
 */
export const login = async (credentials) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    
    if (response.data.token) {
      TokenManager.setTokens(
        response.data.token,
        response.data.refreshToken,
        response.data.expiresIn ? new Date(Date.now() + response.data.expiresIn * 1000).toISOString() : null
      );
      
      if (response.data.user) {
        TokenManager.setUserInfo(response.data.user);
      }
      
      // Set tenant context if organization is available
      if (response.data.organization) {
        TokenManager.setTenantContext(response.data.organization.id);
      }
    }
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[AuthAPI] Login error:', error);
    
    // Clear tokens on login failure
    TokenManager.clearTokens();
    
    return {
      success: false,
      message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      status: error.response?.status,
    };
  }
};

/**
 * Register new user account with organization support
 * @param {Object} userData - { email, password, firstName, lastName, organizationName, inviteToken, acceptTerms }
 */
export const register = async (userData) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    
    // Auto-login after successful registration if token provided
    if (response.data.token) {
      TokenManager.setTokens(response.data.token, response.data.refreshToken);
      
      if (response.data.user) {
        TokenManager.setUserInfo(response.data.user);
      }
      
      if (response.data.organization) {
        TokenManager.setTenantContext(response.data.organization.id);
      }
    }
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[AuthAPI] Register error:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Registration failed. Please try again.',
      status: error.response?.status,
    };
  }
};

/**
 * Forgot password request
 * @param {Object} data - { email, redirectUrl }
 */
export const forgotPassword = createApiMethod('post', API_ENDPOINTS.AUTH.FORGOT_PASSWORD);

/**
 * Reset password with token
 * @param {Object} data - { token, password }
 */
export const resetPassword = createApiMethod('post', API_ENDPOINTS.AUTH.RESET_PASSWORD);

/**
 * Verify password reset token
 * @param {string} token - Reset token
 */
export const verifyResetToken = (token) => 
  createApiMethod('get', `/api/v1/auth/verify-reset-token/${token}`)();

// ===================== GOOGLE OAUTH =====================

/**
 * Initiate Google OAuth flow
 */
export const initiateGoogleOAuth = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
  window.location.href = `${apiUrl}/api/v1/auth/google`;
};

// ===================== SESSION MANAGEMENT =====================

/**
 * Get current user profile (multi-tenant aware)
 */
export const getProfile = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    
    // Update user info in storage
    if (response.data) {
      TokenManager.setUserInfo(response.data);
    }
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[AuthAPI] Get profile error:', error);
    
    // Provide mock data in development
    if (import.meta.env.DEV) {
      console.warn('[AuthAPI] Using mock profile data for development');
      return {
        success: true,
        data: getMockProfile(),
        fromMock: true,
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to load profile',
      status: error.response?.status,
    };
  }
};

/**
 * Logout user (invalidate tokens)
 */
export const logout = async () => {
  try {
    await api.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    console.warn('[AuthAPI] Logout API call failed:', error);
  } finally {
    // Always clear tokens even if API call fails
    TokenManager.clearAll();
  }
  
  return { success: true };
};

/**
 * Verify JWT token validity
 */
export const verifyToken = createApiMethod('get', '/api/v1/auth/verify-token');

/**
 * Refresh access token
 */
export const refreshToken = createApiMethod('post', API_ENDPOINTS.AUTH.REFRESH);

// ===================== ORGANIZATION & TENANT MANAGEMENT =====================

/**
 * Verify organization invitation token
 * @param {string} inviteToken - Invitation token
 */
export const verifyInvite = async (inviteToken) => {
  try {
    const response = await api.get(`/api/v1/auth/verify-invite/${inviteToken}`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[AuthAPI] Verify invite error:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Invalid or expired invitation',
      status: error.response?.status,
    };
  }
};

/**
 * Get user's organizations (multi-tenant context)
 */
export const getUserOrganizations = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.ORGANIZATIONS.BASE);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[AuthAPI] Get organizations error:', error);
    
    // Provide mock data in development
    if (import.meta.env.DEV) {
      console.warn('[AuthAPI] Using mock organizations data for development');
      return {
        success: true,
        data: {
          organizations: [getMockOrganization()],
        },
        fromMock: true,
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to load organizations',
      status: error.response?.status,
    };
  }
};

/**
 * Switch organization (tenant context)
 * @param {string} organizationId - Organization ID to switch to
 */
export const switchOrganization = async (organizationId) => {
  try {
    TokenManager.setTenantContext(organizationId);
    
    // Refresh user data with new organization context
    const profileResponse = await getProfile();
    
    return {
      success: true,
      data: {
        organizationId,
        user: profileResponse.data,
      },
    };
  } catch (error) {
    console.error('[AuthAPI] Switch organization error:', error);
    
    return {
      success: false,
      message: 'Failed to switch organization',
    };
  }
};

// ===================== EMAIL VERIFICATION =====================

/**
 * Verify email with token
 * @param {string} token - Email verification token
 */
export const verifyEmail = (token) => 
  createApiMethod('post', API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token })();

/**
 * Resend verification email
 */
export const resendVerification = createApiMethod('post', API_ENDPOINTS.AUTH.RESEND_VERIFICATION);

// ===================== USER MANAGEMENT =====================

/**
 * Update user profile
 */
export const updateProfile = createApiMethod('put', API_ENDPOINTS.USERS.PROFILE);

/**
 * Change password (authenticated)
 */
export const changePassword = createApiMethod('post', '/api/v1/auth/change-password');

/**
 * Check authentication status
 */
export const checkAuthStatus = async () => {
  try {
    const token = TokenManager.getToken();
    
    if (!token) {
      return {
        success: false,
        data: { authenticated: false, user: null },
        message: 'No token found',
      };
    }
    
    // Try to get profile to verify token
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
    };
  }
};

// ===================== MOCK DATA FOR DEVELOPMENT =====================

const getMockProfile = () => ({
  id: 'user_123',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  organizationId: 'org_123',
  organizationName: 'Demo Organization',
  role: 'owner', // Super Admin, Organization Admin, Assessor, Candidate
  avatar: null,
  createdAt: new Date().toISOString(),
  subscription: {
    planId: 'professional', // basic, professional, enterprise
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  permissions: {
    canCreateAssessments: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageBilling: true,
  }
});

const getMockOrganization = () => ({
  id: 'org_123',
  name: 'Demo Organization',
  slug: 'demo-org',
  plan: 'professional',
  members: 5,
  assessmentsCount: 12,
  createdAt: new Date().toISOString(),
  settings: {
    branding: {
      logo: null,
      primaryColor: '#4f46e5',
      secondaryColor: '#7c3aed',
    },
    security: {
      requireMfa: false,
      sessionTimeout: 24,
    },
  },
});

// ===================== DEFAULT EXPORT =====================

const authApi = {
  // Core authentication
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  
  // Profile & user management
  getProfile,
  updateProfile,
  changePassword,
  checkAuthStatus,
  
  // Google OAuth
  initiateGoogleOAuth,
  
  // Token management
  verifyToken,
  refreshToken,
  
  // Email verification
  verifyEmail,
  resendVerification,
  
  // Organization & tenant management
  verifyInvite,
  getUserOrganizations,
  switchOrganization,
  
  // Development utilities
  getMockProfile: () => ({
    success: true,
    data: getMockProfile(),
    fromMock: true,
  }),
  getMockOrganization: () => ({
    success: true,
    data: getMockOrganization(),
    fromMock: true,
  }),
};

export default authApi;
