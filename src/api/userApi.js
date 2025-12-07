// src/api/userApi.js
/**
 * User Management API for Assessly Platform
 * Multi-tenant aware user operations with advanced error handling
 * Aligned with Assessly API v1.0.0 documentation
 */

import api, { TokenManager, apiEvents, trackError } from './index';

// ----------------------
// API Endpoints (Aligned with Assessly API)
// ----------------------
export const USER_ENDPOINTS = {
  // Base endpoints
  BASE: '/users',
  PROFILE: '/users/profile',
  PREFERENCES: '/users/preferences',
  
  // Organization-related
  ORGANIZATIONS: '/users/organizations',
  SWITCH_ORGANIZATION: '/users/switch-organization',
  
  // Security
  CHANGE_PASSWORD: '/users/change-password',
  SESSIONS: '/users/sessions',
  
  // Media
  AVATAR: '/users/avatar',
  
  // Activity & Notifications
  ACTIVITY: '/users/activity',
  NOTIFICATIONS: '/users/notifications',
};

// ----------------------
// Helper Functions
// ----------------------

/**
 * Create consistent API response
 */
const createResponse = (success, data = null, message = '', meta = {}) => ({
  success,
  data,
  message,
  ...meta,
  timestamp: new Date().toISOString(),
});

/**
 * Handle API errors consistently
 */
const handleApiError = (error, context, meta = {}) => {
  trackError(error, { context, ...meta });
  
  const apiError = error.response?.data;
  return createResponse(
    false,
    null,
    apiError?.message || error.message || 'An unexpected error occurred',
    {
      status: error.response?.status,
      code: apiError?.code,
      errors: apiError?.errors,
      ...meta,
    }
  );
};

// ----------------------
// User Profile Service
// ----------------------

/**
 * Fetch user profile
 * GET /api/v1/users/profile
 * @returns {Promise<{success: boolean, data: User}>}
 */
export async function fetchUserProfile(options = {}) {
  const { refresh = false, timeout = 15000 } = options;
  
  try {
    const config = {
      timeout,
      headers: {
        'Cache-Control': refresh ? 'no-cache' : 'max-age=60',
        'X-Tenant-ID': TokenManager.getTenantId(),
      },
    };

    const response = await api.get(USER_ENDPOINTS.PROFILE, config);
    
    // Cache user info
    if (response.data) {
      TokenManager.setUserInfo(response.data);
      
      // Cache organization if available in user object
      if (response.data.organization) {
        TokenManager.setTenantContext(response.data.organization);
      }
    }
    
    // Emit profile loaded event
    apiEvents.emit('user:profile:loaded', response.data);
    
    return createResponse(
      true,
      response.data,
      'Profile loaded successfully',
      { fromCache: !refresh }
    );
  } catch (error) {
    return handleApiError(error, 'fetchUserProfile', {
      endpoint: USER_ENDPOINTS.PROFILE,
    });
  }
}

/**
 * Update user profile
 * PATCH /api/v1/users/profile
 * @param {Object} profileData - Partial User object
 * @returns {Promise<{success: boolean, data: User}>}
 */
export async function updateUserProfile(profileData, options = {}) {
  const { optimistic = true, timeout = 15000 } = options;
  
  if (!profileData || typeof profileData !== 'object') {
    return createResponse(false, null, 'Invalid profile data', {
      code: 'INVALID_PROFILE_DATA',
    });
  }
  
  try {
    // Store current user data for rollback
    const currentUser = TokenManager.getUserInfo();
    
    // Optimistic update
    if (optimistic && currentUser) {
      const updatedUser = { ...currentUser, ...profileData };
      TokenManager.setUserInfo(updatedUser);
      apiEvents.emit('user:profile:optimistic-update', updatedUser);
    }
    
    const response = await api.patch(
      USER_ENDPOINTS.UPDATE_PROFILE, 
      profileData, 
      { 
        timeout,
        headers: {
          'X-Tenant-ID': TokenManager.getTenantId(),
        },
      }
    );
    
    // Update cached user info
    if (response.data) {
      TokenManager.setUserInfo(response.data);
      apiEvents.emit('user:profile:updated', response.data);
    }
    
    return createResponse(
      true,
      response.data,
      response.data?.message || 'Profile updated successfully'
    );
  } catch (error) {
    // Rollback optimistic update on error
    if (optimistic && currentUser) {
      TokenManager.setUserInfo(currentUser);
      apiEvents.emit('user:profile:rollback', currentUser);
    }
    
    return handleApiError(error, 'updateUserProfile', {
      endpoint: USER_ENDPOINTS.UPDATE_PROFILE,
      profileData,
    });
  }
}

/**
 * Upload user avatar
 * POST /api/v1/users/avatar
 * @param {File} file - Image file
 * @returns {Promise<{success: boolean, data: {avatarUrl: string}}>}
 */
export async function uploadAvatar(file, options = {}) {
  const { onProgress, timeout = 30000 } = options;
  
  if (!file || !(file instanceof File)) {
    return createResponse(false, null, 'Invalid file provided', {
      code: 'INVALID_FILE',
    });
  }
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return createResponse(
      false, 
      null, 
      'Only JPEG, PNG, GIF, and WebP images are allowed',
      { code: 'INVALID_FILE_TYPE' }
    );
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return createResponse(
      false,
      null,
      'File size must be less than 5MB',
      { code: 'FILE_TOO_LARGE' }
    );
  }
  
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const config = {
      timeout,
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Tenant-ID': TokenManager.getTenantId(),
      },
    };
    
    // Add progress tracking
    if (typeof onProgress === 'function') {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        onProgress(percentCompleted);
      };
    }
    
    const response = await api.post(USER_ENDPOINTS.AVATAR, formData, config);
    
    // Update cached user info
    if (response.data?.avatarUrl) {
      const user = TokenManager.getUserInfo();
      if (user) {
        user.avatar = response.data.avatarUrl;
        TokenManager.setUserInfo(user);
        apiEvents.emit('user:avatar:updated', response.data.avatarUrl);
      }
    }
    
    return createResponse(
      true,
      response.data,
      'Avatar uploaded successfully'
    );
  } catch (error) {
    return handleApiError(error, 'uploadAvatar', {
      endpoint: USER_ENDPOINTS.AVATAR,
      fileInfo: { name: file.name, type: file.type, size: file.size },
    });
  }
}

// ----------------------
// Organization Management
// ----------------------

/**
 * Get user's organizations
 * GET /api/v1/users/organizations
 * @returns {Promise<{success: boolean, data: Organization[], pagination: Pagination}>}
 */
export async function fetchOrganizations(options = {}) {
  const { includeMembers = false, includeStats = false, timeout = 10000 } = options;
  
  try {
    const params = {};
    if (includeMembers) params.includeMembers = true;
    if (includeStats) params.includeStats = true;
    
    const response = await api.get(USER_ENDPOINTS.ORGANIZATIONS, {
      params,
      timeout,
      headers: {
        'Cache-Control': 'max-age=300',
      },
    });
    
    // Cache current organization if available
    const currentOrgId = TokenManager.getTenantId();
    if (currentOrgId && response.data?.organizations) {
      const currentOrg = response.data.organizations.find(org => org.id === currentOrgId);
      if (currentOrg) {
        TokenManager.setTenantContext(currentOrg.id);
      }
    }
    
    apiEvents.emit('user:organizations:loaded', response.data);
    
    return createResponse(
      true,
      response.data,
      'Organizations loaded successfully',
      {
        organizations: response.data?.organizations || [],
        count: response.data?.organizations?.length || 0,
        pagination: response.data?.pagination,
      }
    );
  } catch (error) {
    return handleApiError(error, 'fetchOrganizations', {
      endpoint: USER_ENDPOINTS.ORGANIZATIONS,
    });
  }
}

/**
 * Switch organization context
 * POST /api/v1/users/switch-organization
 * @param {string} organizationId
 * @returns {Promise<{success: boolean, data: {organizationId: string, token?: string}}>}
 */
export async function switchOrganization(organizationId, options = {}) {
  const { validate = true, timeout = 10000 } = options;
  
  if (!organizationId) {
    return createResponse(false, null, 'Organization ID is required', {
      code: 'INVALID_ORGANIZATION_ID',
    });
  }
  
  try {
    const payload = { organizationId };
    if (validate) payload.validate = true;
    
    const response = await api.post(
      USER_ENDPOINTS.SWITCH_ORGANIZATION, 
      payload, 
      { timeout }
    );
    
    // Update token if provided
    if (response.data?.token) {
      TokenManager.setTokens(response.data.token);
    }
    
    // Update tenant context
    TokenManager.setTenantContext(organizationId);
    
    // Clear user cache since organization context changed
    TokenManager.setUserInfo(null);
    
    // Emit organization switched event
    apiEvents.emit('user:organization:switched', {
      organizationId,
      organization: response.data?.organization,
    });
    
    return createResponse(
      true,
      response.data,
      response.data?.message || 'Organization switched successfully'
    );
  } catch (error) {
    return handleApiError(error, 'switchOrganization', {
      endpoint: USER_ENDPOINTS.SWITCH_ORGANIZATION,
      organizationId,
    });
  }
}

// ----------------------
// Security & Preferences
// ----------------------

/**
 * Change user password
 * POST /api/v1/users/change-password
 * @param {Object} passwordData - { currentPassword, newPassword }
 * @returns {Promise<{success: boolean}>}
 */
export async function changePassword(passwordData, options = {}) {
  const { timeout = 10000 } = options;
  
  if (!passwordData?.currentPassword || !passwordData?.newPassword) {
    return createResponse(false, null, 'Current and new password are required', {
      code: 'INVALID_PASSWORD_DATA',
    });
  }
  
  if (passwordData.newPassword.length < 8) {
    return createResponse(
      false,
      null,
      'Password must be at least 8 characters',
      { code: 'PASSWORD_TOO_SHORT' }
    );
  }
  
  try {
    const response = await api.post(
      USER_ENDPOINTS.CHANGE_PASSWORD, 
      passwordData, 
      { 
        timeout,
        headers: {
          'X-Tenant-ID': TokenManager.getTenantId(),
        },
      }
    );
    
    apiEvents.emit('user:password:changed');
    
    return createResponse(
      true,
      response.data,
      response.data?.message || 'Password changed successfully'
    );
  } catch (error) {
    return handleApiError(error, 'changePassword', {
      endpoint: USER_ENDPOINTS.CHANGE_PASSWORD,
    });
  }
}

/**
 * Update user preferences
 * PATCH /api/v1/users/preferences
 * @param {Object} preferences - User preferences object
 * @returns {Promise<{success: boolean, data: User}>}
 */
export async function updateUserPreferences(preferences, options = {}) {
  const { timeout = 10000 } = options;
  
  if (!preferences || typeof preferences !== 'object') {
    return createResponse(false, null, 'Invalid preferences data', {
      code: 'INVALID_PREFERENCES',
    });
  }
  
  try {
    const response = await api.patch(
      USER_ENDPOINTS.PREFERENCES, 
      { preferences }, 
      { 
        timeout,
        headers: {
          'X-Tenant-ID': TokenManager.getTenantId(),
        },
      }
    );
    
    // Update cached user info
    const user = TokenManager.getUserInfo();
    if (user && response.data?.preferences) {
      user.preferences = response.data.preferences;
      TokenManager.setUserInfo(user);
    }
    
    apiEvents.emit('user:preferences:updated', response.data?.preferences);
    
    return createResponse(
      true,
      response.data,
      response.data?.message || 'Preferences updated successfully'
    );
  } catch (error) {
    return handleApiError(error, 'updateUserPreferences', {
      endpoint: USER_ENDPOINTS.PREFERENCES,
      preferences,
    });
  }
}

/**
 * Get user activity logs
 * GET /api/v1/users/activity
 * @param {Object} options - Pagination and filtering options
 * @returns {Promise<{success: boolean, data: {activities: Array, pagination: Pagination}}>}
 */
export async function getUserActivity(options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    type, 
    startDate, 
    endDate, 
    timeout = 10000 
  } = options;
  
  try {
    const params = { page, limit };
    if (type) params.type = type;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get(USER_ENDPOINTS.ACTIVITY, {
      params,
      timeout,
      headers: {
        'X-Tenant-ID': TokenManager.getTenantId(),
      },
    });
    
    return createResponse(
      true,
      response.data,
      'Activity logs loaded successfully',
      {
        activities: response.data?.activities || [],
        pagination: response.data?.pagination || { page, limit, total: 0, pages: 1 },
      }
    );
  } catch (error) {
    return handleApiError(error, 'getUserActivity', {
      endpoint: USER_ENDPOINTS.ACTIVITY,
      params: options,
    });
  }
}

/**
 * Get active user sessions
 * GET /api/v1/users/sessions
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function getUserSessions(options = {}) {
  const { timeout = 10000 } = options;
  
  try {
    const response = await api.get(USER_ENDPOINTS.SESSIONS, {
      timeout,
      headers: {
        'X-Tenant-ID': TokenManager.getTenantId(),
      },
    });
    
    return createResponse(
      true,
      response.data,
      'Sessions loaded successfully',
      {
        sessions: response.data?.sessions || [],
        count: response.data?.sessions?.length || 0,
      }
    );
  } catch (error) {
    return handleApiError(error, 'getUserSessions', {
      endpoint: USER_ENDPOINTS.SESSIONS,
    });
  }
}

/**
 * Revoke user session
 * DELETE /api/v1/users/sessions/:sessionId
 * @param {string} sessionId
 * @returns {Promise<{success: boolean}>}
 */
export async function revokeSession(sessionId, options = {}) {
  const { timeout = 10000 } = options;
  
  if (!sessionId) {
    return createResponse(false, null, 'Session ID is required', {
      code: 'INVALID_SESSION_ID',
    });
  }
  
  try {
    const response = await api.delete(`${USER_ENDPOINTS.SESSIONS}/${sessionId}`, {
      timeout,
      headers: {
        'X-Tenant-ID': TokenManager.getTenantId(),
      },
    });
    
    apiEvents.emit('user:session:revoked', { sessionId });
    
    return createResponse(
      true,
      response.data,
      response.data?.message || 'Session revoked successfully'
    );
  } catch (error) {
    return handleApiError(error, 'revokeSession', {
      endpoint: USER_ENDPOINTS.SESSIONS,
      sessionId,
    });
  }
}

// ----------------------
// Utility Functions
// ----------------------

/**
 * Get current user info from cache or API
 * @param {Object} options
 * @returns {Promise<{success: boolean, data: User, cached: boolean}>}
 */
export async function getCurrentUser(options = {}) {
  const { refresh = false } = options;
  
  // Return cached user if available and not refreshing
  const cachedUser = TokenManager.getUserInfo();
  if (cachedUser && !refresh) {
    return createResponse(
      true,
      { user: cachedUser },
      'User loaded from cache',
      { cached: true, user: cachedUser }
    );
  }
  
  // Fetch fresh data
  return await fetchUserProfile({ refresh: true });
}

/**
 * Clear user cache
 */
export function clearUserCache() {
  TokenManager.setUserInfo(null);
  apiEvents.emit('user:cache:cleared');
}

/**
 * Check if user has specific role or permission
 * @param {string|Array} requiredRole - Role or permission to check
 * @returns {boolean}
 */
export function hasRole(requiredRole) {
  const user = TokenManager.getUserInfo();
  if (!user || !user.role) return false;
  
  // Accept string or array of roles
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return requiredRoles.includes(user.role);
}

/**
 * Check if user has specific permission
 * Based on Assessly role-based permissions
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export function hasPermission(permission) {
  const user = TokenManager.getUserInfo();
  if (!user) return false;
  
  // Super Admin has all permissions
  if (user.role === 'super-admin') return true;
  
  // Define role-based permissions (simplified - adjust based on your actual permission structure)
  const rolePermissions = {
    'organization-admin': [
      'manage-users', 'manage-assessments', 'view-analytics', 'manage-subscription'
    ],
    'assessor': [
      'create-assessments', 'grade-responses', 'view-analytics'
    ],
    'candidate': [
      'take-assessments', 'view-results'
    ],
  };
  
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

// ----------------------
// Event Listeners
// ----------------------

// Auto-refresh profile on organization switch
apiEvents.on('user:organization:switched', () => {
  fetchUserProfile({ refresh: true }).catch(console.warn);
});

// Clear cache on logout
apiEvents.on('auth:logout', clearUserCache);

// Listen for token refresh to update user info
apiEvents.on('token:refreshed', () => {
  fetchUserProfile({ refresh: true }).catch(console.warn);
});

// ----------------------
// Default Export
// ----------------------

export default {
  // Profile management
  fetchUserProfile,
  updateUserProfile,
  uploadAvatar,
  getCurrentUser,
  
  // Organization management
  fetchOrganizations,
  switchOrganization,
  
  // Security
  changePassword,
  getUserSessions,
  revokeSession,
  
  // Preferences & Activity
  updateUserPreferences,
  getUserActivity,
  
  // Utilities
  clearUserCache,
  hasRole,
  hasPermission,
  
  // Constants
  USER_ENDPOINTS,
};
