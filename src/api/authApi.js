// src/api/authApi.js
import api from './api';

/**
 * Authentication API Service
 * Handles email/password authentication, Google OAuth, and user management
 */

// ===================== EMAIL/PASSWORD AUTHENTICATION =====================

/**
 * Login with email and password
 * @param {Object} credentials - Login credentials
 * @returns {Promise} Authentication response
 */
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Register new user account
 * @param {Object} userData - User registration data
 * @returns {Promise} Registration response
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Forgot password request
 * @param {Object} data - Forgot password data
 * @returns {Promise} Response
 */
export const forgotPassword = async (data) => {
  try {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  } catch (error) {
    console.error('Forgot password error:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {Object} data - Reset password data
 * @returns {Promise} Response
 */
export const resetPassword = async (data) => {
  try {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  } catch (error) {
    console.error('Reset password error:', error);
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
    const response = await api.get(`/auth/verify-reset-token/${token}`);
    return response.data;
  } catch (error) {
    console.error('Verify reset token error:', error);
    throw error;
  }
};

// ===================== GOOGLE OAUTH AUTHENTICATION =====================

/**
 * Initiate Google OAuth flow
 * @param {Object} params - OAuth parameters
 * @returns {Promise} OAuth initiation response
 */
export const initiateGoogleOAuth = async (params = {}) => {
  try {
    const response = await api.get('/auth/google', { params });
    return response.data;
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    throw error;
  }
};

/**
 * Handle Google OAuth callback
 * @param {Object} oauthData - OAuth callback data
 * @returns {Promise} Authentication response
 */
export const googleOAuthCallback = async (oauthData) => {
  try {
    const response = await api.post('/auth/google/callback', oauthData);
    return response.data;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
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
    const response = await api.get('/auth/verify-token', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Verify token error:', error);
    throw error;
  }
};

/**
 * Refresh access token
 * @param {Object} data - Refresh token data
 * @returns {Promise} New tokens
 */
export const refreshToken = async (data) => {
  try {
    const response = await api.post('/auth/refresh-token', data);
    return response.data;
  } catch (error) {
    console.error('Refresh token error:', error);
    throw error;
  }
};

/**
 * Logout user (invalidate token)
 * @returns {Promise} Logout response
 */
export const logout = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error('Logout error:', error);
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
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error);
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
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// ===================== EMAIL VERIFICATION =====================

/**
 * Verify email with token
 * @param {Object} data - Verification data
 * @returns {Promise} Verification response
 */
export const verifyEmail = async (data) => {
  try {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  } catch (error) {
    console.error('Verify email error:', error);
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
    const response = await api.get(`/auth/verify-invite/${inviteToken}`);
    return response.data;
  } catch (error) {
    console.error('Verify invite error:', error);
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
    const response = await api.get('/auth/providers');
    return response.data;
  } catch (error) {
    console.error('Get auth providers error:', error);
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
    const response = await api.get('/auth/organizations');
    return response.data;
  } catch (error) {
    console.error('Get user organizations error:', error);
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
};

export default authApi;
