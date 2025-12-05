// src/api/authApi.js
import api from './axiosConfig';  // Changed from './api' to match assessmentApi.js

/**
 * Authentication API Service
 * Handles email/password authentication, Google OAuth, and user management
 */

// ===================== EMAIL/PASSWORD AUTHENTICATION =====================

/**
 * Login with email and password
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @param {string} [credentials.organizationId] - Optional organization ID
 * @param {boolean} [credentials.rememberMe] - Remember login session
 * @returns {Promise} Authentication response
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/api/v1/auth/login', credentials);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Login error:', error);
    throw error;
  }
};

/**
 * Register new user account
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @param {string} [userData.organizationId] - Optional organization ID
 * @param {string} [userData.organizationName] - Organization name (for new org)
 * @param {string} [userData.inviteToken] - Invitation token
 * @param {boolean} userData.acceptTerms - Terms acceptance
 * @returns {Promise} Registration response
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/api/v1/auth/register', userData);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Registration error:', error);
    throw error;
  }
};

/**
 * Forgot password request
 * @param {Object} data - Forgot password data
 * @param {string} data.email - User email
 * @param {string} data.redirectUrl - Password reset redirect URL
 * @returns {Promise} Response
 */
export const forgotPassword = async (data) => {
  try {
    const response = await api.post('/api/v1/auth/forgot-password', data);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Forgot password error:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {Object} data - Reset password data
 * @param {string} data.token - Reset token
 * @param {string} data.password - New password
 * @returns {Promise} Response
 */
export const resetPassword = async (data) => {
  try {
    const response = await api.post('/api/v1/auth/reset-password', data);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Reset password error:', error);
    throw error;
  }
};

/**
 * Verify password reset token
 * @param {string} token - Reset token to verify
 * @returns {Promise} Token verification response
 */
export const verifyResetToken = async (token) => {
  try {
    const response = await api.get(`/api/v1/auth/verify-reset-token/${token}`);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Verify reset token error:', error);
    throw error;
  }
};

// ===================== GOOGLE OAUTH AUTHENTICATION =====================

/**
 * Initiate Google OAuth flow
 * @param {Object} params - OAuth parameters
 * @param {string} params.state - OAuth state parameter
 * @param {string} params.redirectUri - Redirect URI after OAuth
 * @returns {Promise} OAuth initiation response
 */
export const initiateGoogleOAuth = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/auth/google', { params });  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Google OAuth initiation error:', error);
    throw error;
  }
};

/**
 * Handle Google OAuth callback
 * @param {Object} oauthData - OAuth callback data
 * @param {string} oauthData.code - Authorization code
 * @param {string} oauthData.state - OAuth state
 * @param {string} oauthData.redirectUri - Redirect URI
 * @returns {Promise} Authentication response
 */
export const googleOAuthCallback = async (oauthData) => {
  try {
    const response = await api.post('/api/v1/auth/google/callback', oauthData);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Google OAuth callback error:', error);
    throw error;
  }
};

// ===================== SESSION & TOKEN MANAGEMENT =====================

/**
 * Verify JWT token validity
 * @param {string} token - JWT token to verify
 * @returns {Promise} Token verification response
 */
export const verifyToken = async (token) => {
  try {
    const response = await api.get('/api/v1/auth/verify-token', {  // Added /api/v1 prefix
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Verify token error:', error);
    throw error;
  }
};

/**
 * Refresh access token
 * @param {Object} data - Refresh token data
 * @param {string} data.refreshToken - Refresh token
 * @returns {Promise} New tokens
 */
export const refreshToken = async (data) => {
  try {
    const response = await api.post('/api/v1/auth/refresh-token', data);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Refresh token error:', error);
    throw error;
  }
};

/**
 * Logout user (invalidate token)
 * @returns {Promise} Logout response
 */
export const logout = async () => {
  try {
    const response = await api.post('/api/v1/auth/logout');  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Logout error:', error);
    throw error;
  }
};

// ===================== USER PROFILE MANAGEMENT =====================

/**
 * Get current user profile
 * @returns {Promise} User profile
 */
export const getProfile = async () => {
  try {
    const response = await api.get('/api/v1/auth/profile');  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Get profile error:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} profileData - Profile updates
 * @returns {Promise} Updated profile
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/v1/auth/profile', profileData);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Update profile error:', error);
    throw error;
  }
};

// ===================== EMAIL VERIFICATION =====================

/**
 * Verify email with token
 * @param {Object} data - Verification data
 * @param {string} data.token - Verification token
 * @returns {Promise} Verification response
 */
export const verifyEmail = async (data) => {
  try {
    const response = await api.post('/api/v1/auth/verify-email', data);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Verify email error:', error);
    throw error;
  }
};

// ===================== ORGANIZATION INVITATIONS =====================

/**
 * Verify organization invitation token
 * @param {string} inviteToken - Invitation token
 * @returns {Promise} Invitation details
 */
export const verifyInvite = async (inviteToken) => {
  try {
    const response = await api.get(`/api/v1/auth/verify-invite/${inviteToken}`);  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Verify invite error:', error);
    throw error;
  }
};

// ===================== AUTHENTICATION PROVIDERS =====================

/**
 * Get available authentication providers
 * @returns {Promise} Authentication providers
 */
export const getAuthProviders = async () => {
  try {
    const response = await api.get('/api/v1/auth/providers');  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Get auth providers error:', error);
    throw error;
  }
};

// ===================== ORGANIZATION AUTH =====================

/**
 * Get user's organizations
 * @returns {Promise} User organizations
 */
export const getUserOrganizations = async () => {
  try {
    const response = await api.get('/api/v1/auth/organizations');  // Added /api/v1 prefix
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Get user organizations error:', error);
    throw error;
  }
};

// ===================== ADDITIONAL USEFUL ENDPOINTS =====================

/**
 * Get current user (me endpoint)
 * @returns {Promise} Current user data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/v1/auth/me');  // Added common endpoint
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Get current user error:', error);
    throw error;
  }
};

/**
 * Check authentication status
 * @returns {Promise} Auth status
 */
export const checkAuthStatus = async () => {
  try {
    const response = await api.get('/api/v1/auth/status');
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Check auth status error:', error);
    throw error;
  }
};

/**
 * Change password (authenticated)
 * @param {Object} data - Password change data
 * @param {string} data.currentPassword - Current password
 * @param {string} data.newPassword - New password
 * @returns {Promise} Response
 */
export const changePassword = async (data) => {
  try {
    const response = await api.post('/api/v1/auth/change-password', data);
    return response.data;
  } catch (error) {
    console.error('[AuthAPI] Change password error:', error);
    throw error;
  }
};

// ===================== DEFAULT EXPORT (for backward compatibility) =====================

const authApi = {
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  initiateGoogleOAuth,
  googleOAuthCallback,
  verifyToken,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  verifyInvite,
  getAuthProviders,
  getUserOrganizations,
  getCurrentUser,      // Added
  checkAuthStatus,     // Added
  changePassword,      // Added
};

export default authApi;
