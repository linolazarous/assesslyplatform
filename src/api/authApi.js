// src/api/authApi.js
import api, { API_ENDPOINTS, TokenManager } from './index';

/**
 * Authentication API Service for Assessly Platform
 * Multi-tenant aware with organization support
 * Returns consistent response format matching API: { success: boolean, data: any, message?: string }
 */

// ===================== API METHOD FACTORY =====================

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
      } else {
        // Try to get organization context from token
        const orgId = TokenManager.getTenantId();
        if (orgId) {
          config.headers = {
            ...config.headers,
            'X-Tenant-ID': orgId,
          };
        }
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

      // API already returns { success, data, message } format
      return response.data;
      
    } catch (error) {
      console.error(`[AuthAPI] ${method.toUpperCase()} ${endpoint} error:`, error);
      
      // Extract error information according to API Error schema
      const apiError = error.response?.data;
      const message = apiError?.message || 
                     apiError?.error?.message || 
                     error.message || 
                     'An unexpected error occurred';
      
      const status = error.response?.status;
      const code = apiError?.code || error.code;
      
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
        errors: apiError?.errors,
        ...(import.meta.env.DEV && { stack: error.stack }),
      };
    }
  };
};

// ===================== CORE AUTHENTICATION =====================

/**
 * Register new organization and user
 * @param {Object} registrationData - { email, password, name, organizationName, organizationSlug, acceptTerms }
 * @returns {Promise<AuthResponse>}
 */
export const register = async (registrationData) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, registrationData);
    
    // Auto-login after successful registration
    if (response.data.token) {
      TokenManager.setTokens(
        response.data.token,
        response.data.refreshToken
      );
      
      if (response.data.user) {
        TokenManager.setUserInfo(response.data.user);
      }
      
      // Set organization context
      if (response.data.user?.organization) {
        TokenManager.setTenantContext(response.data.user.organization);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Register error:', error);
    
    const apiError = error.response?.data;
    return {
      success: false,
      message: apiError?.message || 'Registration failed. Please try again.',
      status: error.response?.status,
      code: apiError?.code,
    };
  }
};

/**
 * Login with email and password
 * @param {Object} credentials - { email, password, organizationSlug?, rememberMe? }
 * @returns {Promise<AuthResponse>}
 */
export const login = async (credentials) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    
    if (response.data.token) {
      TokenManager.setTokens(
        response.data.token,
        response.data.refreshToken
      );
      
      if (response.data.user) {
        TokenManager.setUserInfo(response.data.user);
      }
      
      // Set tenant context if organization is available
      if (response.data.user?.organization) {
        TokenManager.setTenantContext(response.data.user.organization);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Login error:', error);
    
    // Clear tokens on login failure
    TokenManager.clearTokens();
    
    const apiError = error.response?.data;
    return {
      success: false,
      message: apiError?.message || 'Login failed. Please check your credentials.',
      status: error.response?.status,
      code: apiError?.code,
    };
  }
};

/**
 * Logout user (invalidate tokens)
 * @returns {Promise<SuccessResponse>}
 */
export const logout = async () => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  } catch (error) {
    console.warn('[AuthAPI] Logout API call failed:', error);
  } finally {
    // Always clear tokens even if API call fails
    TokenManager.clearAll();
  }
  
  return { 
    success: true, 
    message: 'Logged out successfully' 
  };
};

// ===================== PASSWORD MANAGEMENT =====================

/**
 * Forgot password request
 * @param {Object} data - { email, redirectUrl? }
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
  createApiMethod('get', `${API_ENDPOINTS.AUTH.VERIFY_RESET_TOKEN}/${token}`)();

/**
 * Change password (authenticated)
 * @param {Object} data - { currentPassword, newPassword }
 */
export const changePassword = createApiMethod('post', API_ENDPOINTS.AUTH.CHANGE_PASSWORD);

// ===================== GOOGLE OAUTH =====================

/**
 * Initiate Google OAuth flow
 * @returns {string} OAuth URL
 */
export const getGoogleOAuthUrl = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
  return `${apiUrl}/api/v1/auth/google`;
};

/**
 * Handle Google OAuth callback
 * @param {string} code - Authorization code
 * @returns {Promise<AuthResponse>}
 */
export const handleGoogleCallback = async (code) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.AUTH.GOOGLE_CALLBACK}?code=${code}`);
    
    if (response.data.token) {
      TokenManager.setTokens(
        response.data.token,
        response.data.refreshToken
      );
      
      if (response.data.user) {
        TokenManager.setUserInfo(response.data.user);
      }
      
      if (response.data.user?.organization) {
        TokenManager.setTenantContext(response.data.user.organization);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Google OAuth callback error:', error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Google authentication failed',
      status: error.response?.status,
    };
  }
};

// ===================== SESSION & TOKEN MANAGEMENT =====================

/**
 * Get current user profile
 * @returns {Promise<{success: boolean, data: User}>}
 */
export const getProfile = createApiMethod('get', API_ENDPOINTS.AUTH.ME);

/**
 * Verify JWT token validity
 * @returns {Promise<SuccessResponse>}
 */
export const verifyToken = createApiMethod('get', API_ENDPOINTS.AUTH.VERIFY_TOKEN);

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<AuthResponse>}
 */
export const refreshToken = async (refreshToken) => {
  try {
    const response = await api.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
    
    if (response.data.token) {
      TokenManager.setToken(response.data.token);
      
      // Update refresh token if provided
      if (response.data.refreshToken) {
        TokenManager.setRefreshToken(response.data.refreshToken);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Refresh token error:', error);
    
    // Clear tokens if refresh fails
    TokenManager.clearTokens();
    
    return {
      success: false,
      message: error.response?.data?.message || 'Session expired. Please login again.',
      status: error.response?.status,
    };
  }
};

// ===================== EMAIL VERIFICATION =====================

/**
 * Verify email with token
 * @param {string} token - Email verification token
 * @returns {Promise<SuccessResponse>}
 */
export const verifyEmail = (token) => 
  createApiMethod('post', API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token })();

/**
 * Resend verification email
 * @param {Object} data - { email }
 * @returns {Promise<SuccessResponse>}
 */
export const resendVerification = createApiMethod('post', API_ENDPOINTS.AUTH.RESEND_VERIFICATION);

// ===================== ORGANIZATION MANAGEMENT =====================

/**
 * Verify organization invitation token
 * @param {string} inviteToken - Invitation token
 * @returns {Promise<{success: boolean, data: {organization: Organization, inviter: User}}>}
 */
export const verifyInvite = createApiMethod('get', `${API_ENDPOINTS.AUTH.VERIFY_INVITE}/${inviteToken}`);

/**
 * Accept organization invitation
 * @param {Object} data - { token, password, firstName?, lastName? }
 * @returns {Promise<AuthResponse>}
 */
export const acceptInvite = createApiMethod('post', API_ENDPOINTS.AUTH.ACCEPT_INVITE);

/**
 * Get user's organizations
 * @returns {Promise<{success: boolean, data: Organization[], pagination?: Pagination}>}
 */
export const getUserOrganizations = createApiMethod('get', API_ENDPOINTS.ORGANIZATIONS.BASE);

/**
 * Switch organization (tenant context)
 * @param {string} organizationId - Organization ID to switch to
 * @returns {Promise<{success: boolean, data: {organizationId: string, user: User}}>}
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
      message: 'Failed to switch organization context',
    };
  }
};

// ===================== USER MANAGEMENT =====================

/**
 * Update user profile
 * @param {Object} userData - Partial User data
 * @returns {Promise<{success: boolean, data: User}>}
 */
export const updateProfile = createApiMethod('put', API_ENDPOINTS.USERS.PROFILE);

/**
 * Update user preferences
 * @param {Object} preferences - User preferences
 * @returns {Promise<{success: boolean, data: User}>}
 */
export const updatePreferences = createApiMethod('patch', API_ENDPOINTS.USERS.PREFERENCES);

// ===================== AUTH STATUS & UTILITIES =====================

/**
 * Check authentication status
 * @returns {Promise<{success: boolean, data: {authenticated: boolean, user: User|null}, message?: string}>}
 */
export const checkAuthStatus = async () => {
  try {
    const token = TokenManager.getToken();
    
    if (!token) {
      return {
        success: false,
        data: { authenticated: false, user: null },
        message: 'No authentication token found',
      };
    }
    
    // Verify token is still valid
    const verifyResult = await verifyToken();
    
    if (!verifyResult.success) {
      TokenManager.clearTokens();
      return {
        success: false,
        data: { authenticated: false, user: null },
        message: 'Token expired or invalid',
      };
    }
    
    // Get current user profile
    const profileResult = await getProfile();
    
    return {
      success: profileResult.success,
      data: {
        authenticated: profileResult.success,
        user: profileResult.success ? profileResult.data : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: { authenticated: false, user: null },
      message: 'Authentication check failed',
    };
  }
};

/**
 * Get current tenant/organization ID
 * @returns {string|null}
 */
export const getCurrentTenantId = () => {
  return TokenManager.getTenantId();
};

// ===================== DEVELOPMENT UTILITIES =====================

/**
 * Get mock profile data for development
 * @returns {User}
 */
const getMockProfile = () => ({
  id: 'user_123',
  name: 'Demo User',
  email: 'demo@example.com',
  role: 'owner',
  isActive: true,
  emailVerified: true,
  organization: 'org_123',
  profile: {
    firstName: 'Demo',
    lastName: 'User',
    avatar: null,
    phone: null,
  },
  preferences: {
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
    },
  },
  lastLogin: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * Get mock organization data for development
 * @returns {Organization}
 */
const getMockOrganization = () => ({
  id: 'org_123',
  name: 'Demo Organization',
  slug: 'demo-org',
  description: 'A demo organization',
  industry: 'Technology',
  size: '10-50',
  contact: {
    email: 'contact@demo.org',
    phone: null,
    website: null,
  },
  settings: {
    branding: {
      logo: null,
      primaryColor: '#4f46e5',
    },
    security: {
      requireMfa: false,
      sessionTimeout: 24,
    },
  },
  subscription: {
    plan: 'professional',
    status: 'active',
    billingCycle: 'monthly',
    price: {
      amount: 49,
      currency: 'USD',
    },
    features: {
      maxAssessments: 100,
      maxUsers: 10,
      advancedAnalytics: true,
      customBranding: true,
    },
  },
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ===================== DEFAULT EXPORT =====================

const authApi = {
  // Core authentication
  register,
  login,
  logout,
  
  // Password management
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword,
  
  // OAuth
  getGoogleOAuthUrl,
  handleGoogleCallback,
  
  // Session & token management
  getProfile,
  verifyToken,
  refreshToken,
  checkAuthStatus,
  getCurrentTenantId,
  
  // Email verification
  verifyEmail,
  resendVerification,
  
  // Organization management
  verifyInvite,
  acceptInvite,
  getUserOrganizations,
  switchOrganization,
  
  // User management
  updateProfile,
  updatePreferences,
  
  // Development utilities
  ...(import.meta.env.DEV && {
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
  }),
};

export default authApi;
