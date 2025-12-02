// src/api/authApi.js
import api from './api';

/**
 * Authentication API Service
 * Handles email/password authentication, Google OAuth, and user management
 */
const authApi = {
  // ===================== EMAIL/PASSWORD AUTHENTICATION =====================
  
  /**
   * Login with email and password
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @param {string} credentials.organizationId - Optional organization ID
   * @param {boolean} credentials.rememberMe - Remember login
   * @returns {Promise} Authentication response
   */
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Register new user account
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.firstName - User first name
   * @param {string} userData.lastName - User last name
   * @param {string} userData.organizationId - Optional organization ID
   * @param {string} userData.organizationName - Organization name (for new org)
   * @param {string} userData.inviteToken - Invitation token
   * @param {boolean} userData.acceptTerms - Terms acceptance
   * @returns {Promise} Registration response
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Forgot password request
   * @param {Object} data - Forgot password data
   * @param {string} data.email - User email
   * @param {string} data.redirectUrl - Password reset redirect URL
   * @returns {Promise} Response
   */
  forgotPassword: async (data) => {
    try {
      const response = await api.post('/auth/forgot-password', data);
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Reset password with token
   * @param {Object} data - Reset password data
   * @param {string} data.token - Reset token
   * @param {string} data.password - New password
   * @returns {Promise} Response
   */
  resetPassword: async (data) => {
    try {
      const response = await api.post('/auth/reset-password', data);
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  /**
   * Verify password reset token
   * @param {string} token - Reset token to verify
   * @returns {Promise} Token verification response
   */
  verifyResetToken: async (token) => {
    try {
      const response = await api.get(`/auth/verify-reset-token/${token}`);
      return response.data;
    } catch (error) {
      console.error('Verify reset token error:', error);
      throw error;
    }
  },

  // ===================== GOOGLE OAUTH AUTHENTICATION =====================

  /**
   * Initiate Google OAuth flow
   * @param {Object} params - OAuth parameters
   * @param {string} params.state - OAuth state for security
   * @param {string} params.redirectUri - Redirect URI after OAuth
   * @returns {Promise} OAuth initiation response
   */
  initiateGoogleOAuth: async (params = {}) => {
    try {
      const response = await api.get('/auth/google', { params });
      return response.data;
    } catch (error) {
      console.error('Google OAuth initiation error:', error);
      throw error;
    }
  },

  /**
   * Handle Google OAuth callback
   * @param {Object} oauthData - OAuth callback data
   * @param {string} oauthData.code - Authorization code
   * @param {string} oauthData.state - OAuth state
   * @param {string} oauthData.redirectUri - Redirect URI
   * @returns {Promise} Authentication response
   */
  googleOAuthCallback: async (oauthData) => {
    try {
      const response = await api.post('/auth/google/callback', oauthData);
      return response.data;
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw error;
    }
  },

  /**
   * Link Google account to existing user
   * @param {Object} data - Link data
   * @param {string} data.code - Google auth code
   * @param {string} data.redirectUri - Redirect URI
   * @returns {Promise} Link response
   */
  linkGoogleAccount: async (data) => {
    try {
      const response = await api.post('/auth/google/link', data);
      return response.data;
    } catch (error) {
      console.error('Link Google account error:', error);
      throw error;
    }
  },

  /**
   * Unlink Google account from user
   * @returns {Promise} Unlink response
   */
  unlinkGoogleAccount: async () => {
    try {
      const response = await api.delete('/auth/google/unlink');
      return response.data;
    } catch (error) {
      console.error('Unlink Google account error:', error);
      throw error;
    }
  },

  // ===================== SESSION & TOKEN MANAGEMENT =====================

  /**
   * Verify JWT token validity
   * @param {string} token - JWT token to verify
   * @returns {Promise} Token verification response
   */
  verifyToken: async (token) => {
    try {
      const response = await api.get('/auth/verify-token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Verify token error:', error);
      throw error;
    }
  },

  /**
   * Refresh access token
   * @param {Object} data - Refresh token data
   * @param {string} data.refreshToken - Refresh token
   * @returns {Promise} New tokens
   */
  refreshToken: async (data) => {
    try {
      const response = await api.post('/auth/refresh-token', data);
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  /**
   * Logout user (invalidate token)
   * @returns {Promise} Logout response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Get active user sessions
   * @returns {Promise} User sessions
   */
  getSessions: async () => {
    try {
      const response = await api.get('/auth/sessions');
      return response.data;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },

  /**
   * Revoke specific session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise} Revocation response
   */
  revokeSession: async (sessionId) => {
    try {
      const response = await api.delete(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  },

  /**
   * Logout from all devices
   * @returns {Promise} Response
   */
  logoutAll: async () => {
    try {
      const response = await api.post('/auth/logout-all');
      return response.data;
    } catch (error) {
      console.error('Logout all error:', error);
      throw error;
    }
  },

  // ===================== USER PROFILE MANAGEMENT =====================

  /**
   * Get current user profile
   * @returns {Promise} User profile
   */
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile updates
   * @returns {Promise} Updated profile
   */
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Change password
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise} Response
   */
  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  /**
   * Delete user account
   * @param {Object} data - Account deletion data
   * @param {string} data.password - User password for confirmation
   * @param {string} data.reason - Optional reason for deletion
   * @returns {Promise} Deletion response
   */
  deleteAccount: async (data) => {
    try {
      const response = await api.delete('/auth/account', { data });
      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  // ===================== EMAIL VERIFICATION =====================

  /**
   * Request email verification
   * @param {Object} data - Verification request data
   * @param {string} data.email - User email
   * @param {string} data.redirectUrl - Verification redirect URL
   * @returns {Promise} Response
   */
  requestVerification: async (data) => {
    try {
      const response = await api.post('/auth/request-verification', data);
      return response.data;
    } catch (error) {
      console.error('Request verification error:', error);
      throw error;
    }
  },

  /**
   * Verify email with token
   * @param {Object} data - Verification data
   * @param {string} data.token - Verification token
   * @returns {Promise} Verification response
   */
  verifyEmail: async (data) => {
    try {
      const response = await api.post('/auth/verify-email', data);
      return response.data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  },

  /**
   * Check if email is verified
   * @returns {Promise} Verification status
   */
  checkEmailVerification: async () => {
    try {
      const response = await api.get('/auth/email-verification-status');
      return response.data;
    } catch (error) {
      console.error('Check email verification error:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION INVITATIONS =====================

  /**
   * Verify organization invitation token
   * @param {string} inviteToken - Invitation token
   * @returns {Promise} Invitation details
   */
  verifyInvite: async (inviteToken) => {
    try {
      const response = await api.get(`/auth/verify-invite/${inviteToken}`);
      return response.data;
    } catch (error) {
      console.error('Verify invite error:', error);
      throw error;
    }
  },

  /**
   * Accept organization invitation
   * @param {Object} data - Invitation acceptance data
   * @param {string} data.token - Invitation token
   * @param {Object} data.user - User data (if new user)
   * @returns {Promise} Acceptance response
   */
  acceptInvitation: async (data) => {
    try {
      const response = await api.post('/auth/accept-invitation', data);
      return response.data;
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  },

  // ===================== MFA / 2-FACTOR AUTHENTICATION =====================

  /**
   * Setup MFA for user
   * @returns {Promise} MFA setup data
   */
  setupMFA: async () => {
    try {
      const response = await api.post('/auth/mfa/setup');
      return response.data;
    } catch (error) {
      console.error('Setup MFA error:', error);
      throw error;
    }
  },

  /**
   * Verify MFA setup
   * @param {Object} data - MFA verification data
   * @param {string} data.token - MFA token
   * @returns {Promise} Verification response
   */
  verifyMFASetup: async (data) => {
    try {
      const response = await api.post('/auth/mfa/verify', data);
      return response.data;
    } catch (error) {
      console.error('Verify MFA setup error:', error);
      throw error;
    }
  },

  /**
   * Disable MFA for user
   * @param {Object} data - MFA disable data
   * @param {string} data.token - MFA token for verification
   * @returns {Promise} Disable response
   */
  disableMFA: async (data) => {
    try {
      const response = await api.delete('/auth/mfa', { data });
      return response.data;
    } catch (error) {
      console.error('Disable MFA error:', error);
      throw error;
    }
  },

  /**
   * Verify MFA token for login
   * @param {Object} data - MFA verification data
   * @param {string} data.token - MFA token
   * @param {string} data.sessionId - Login session ID
   * @returns {Promise} Verification response
   */
  verifyMFAToken: async (data) => {
    try {
      const response = await api.post('/auth/mfa/verify-token', data);
      return response.data;
    } catch (error) {
      console.error('Verify MFA token error:', error);
      throw error;
    }
  },

  // ===================== SECURITY & AUDIT =====================

  /**
   * Get login history
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of records
   * @param {number} params.page - Page number
   * @returns {Promise} Login history
   */
  getLoginHistory: async (params = {}) => {
    try {
      const response = await api.get('/auth/login-history', { params });
      return response.data;
    } catch (error) {
      console.error('Get login history error:', error);
      throw error;
    }
  },

  /**
   * Get security events
   * @param {Object} params - Query parameters
   * @returns {Promise} Security events
   */
  getSecurityEvents: async (params = {}) => {
    try {
      const response = await api.get('/auth/security-events', { params });
      return response.data;
    } catch (error) {
      console.error('Get security events error:', error);
      throw error;
    }
  },

  // ===================== AUTHENTICATION PROVIDERS =====================

  /**
   * Get available authentication providers
   * @returns {Promise} Authentication providers
   */
  getAuthProviders: async () => {
    try {
      const response = await api.get('/auth/providers');
      return response.data;
    } catch (error) {
      console.error('Get auth providers error:', error);
      throw error;
    }
  },

  /**
   * Check if user has linked social accounts
   * @returns {Promise} Linked accounts
   */
  getLinkedAccounts: async () => {
    try {
      const response = await api.get('/auth/linked-accounts');
      return response.data;
    } catch (error) {
      console.error('Get linked accounts error:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION AUTH =====================

  /**
   * Switch organization context
   * @param {Object} data - Organization switch data
   * @param {string} data.organizationId - Organization ID to switch to
   * @returns {Promise} Switch response
   */
  switchOrganization: async (data) => {
    try {
      const response = await api.post('/auth/switch-organization', data);
      return response.data;
    } catch (error) {
      console.error('Switch organization error:', error);
      throw error;
    }
  },

  /**
   * Get user's organizations
   * @returns {Promise} User organizations
   */
  getUserOrganizations: async () => {
    try {
      const response = await api.get('/auth/organizations');
      return response.data;
    } catch (error) {
      console.error('Get user organizations error:', error);
      throw error;
    }
  },

  // ===================== HEALTH & STATUS =====================

  /**
   * Check authentication service health
   * @returns {Promise} Health status
   */
  checkHealth: async () => {
    try {
      const response = await api.get('/auth/health');
      return response.data;
    } catch (error) {
      console.error('Check auth health error:', error);
      throw error;
    }
  },

  /**
   * Get authentication statistics
   * @returns {Promise} Authentication stats
   */
  getAuthStats: async () => {
    try {
      const response = await api.get('/auth/stats');
      return response.data;
    } catch (error) {
      console.error('Get auth stats error:', error);
      throw error;
    }
  },

  // ===================== BULK OPERATIONS =====================

  /**
   * Export authentication data
   * @param {Object} params - Export parameters
   * @returns {Promise} Export data
   */
  exportAuthData: async (params = {}) => {
    try {
      const response = await api.get('/auth/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export auth data error:', error);
      throw error;
    }
  },
};

export default authApi;
