// src/api/userApi.js
/**
 * User Management API for Assessly Platform
 * Multi-tenant aware user operations with advanced error handling
 */

import api, { TokenManager, apiEvents, trackError } from './index';

// ----------------------
// API Endpoints
// ----------------------
export const USER_ENDPOINTS = {
  PROFILE: '/users/profile',
  ORGANIZATIONS: '/users/organizations',
  SWITCH_ORGANIZATION: '/users/switch-organization',
  UPDATE_PROFILE: '/users/profile',
  CHANGE_PASSWORD: '/users/change-password',
  UPLOAD_AVATAR: '/users/avatar',
  PREFERENCES: '/users/preferences',
  NOTIFICATIONS: '/users/notifications',
  SESSIONS: '/users/sessions',
  ACTIVITY: '/users/activity',
};

// ----------------------
// User Profile Service
// ----------------------

/**
 * Fetch user profile with caching and retry logic
 * GET /api/v1/users/profile
 */
export async function fetchUserProfile(options = {}) {
  const { refresh = false, timeout = 15000 } = options;
  
  try {
    const config = {
      timeout,
      headers: {
        'Cache-Control': refresh ? 'no-cache' : 'max-age=60',
      },
    };

    const response = await api.get(USER_ENDPOINTS.PROFILE, config);
    
    // Cache user info in TokenManager
    if (response.data?.user) {
      TokenManager.setUserInfo(response.data.user);
    }
    
    // Cache organization if available
    if (response.data?.organization) {
      TokenManager.setOrganization(response.data.organization);
    }
    
    // Emit profile loaded event
    apiEvents.emit('user:profile:loaded', response.data);
    
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    trackError(error, {
      context: 'fetchUserProfile',
      endpoint: USER_ENDPOINTS.PROFILE,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to fetch user profile',
      code: error.code || 'PROFILE_FETCH_ERROR',
      details: error.details,
    };
  }
}

/**
 * Fetch user's organizations with caching
 * GET /api/v1/users/organizations
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
        'Cache-Control': 'max-age=300', // Cache for 5 minutes
      },
    });
    
    // Cache current organization if not already cached
    const currentOrgId = TokenManager.getTenantId();
    if (currentOrgId && response.data?.organizations) {
      const currentOrg = response.data.organizations.find(org => org.id === currentOrgId);
      if (currentOrg && !TokenManager.getOrganization()) {
        TokenManager.setOrganization(currentOrg);
      }
    }
    
    apiEvents.emit('user:organizations:loaded', response.data);
    
    return {
      success: true,
      data: response.data,
      organizations: response.data?.organizations || [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    trackError(error, {
      context: 'fetchOrganizations',
      endpoint: USER_ENDPOINTS.ORGANIZATIONS,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to fetch organizations',
      code: error.code || 'ORGANIZATIONS_FETCH_ERROR',
      details: error.details,
    };
  }
}

/**
 * Switch organization context with validation
 * POST /api/v1/users/switch-organization
 */
export async function switchOrganization(organizationId, options = {}) {
  const { validate = true, timeout = 10000 } = options;
  
  if (!organizationId) {
    return {
      success: false,
      error: 'Organization ID is required',
      code: 'INVALID_ORGANIZATION_ID',
    };
  }
  
  try {
    const payload = { organizationId };
    if (validate) {
      payload.validate = true;
    }
    
    const response = await api.post(USER_ENDPOINTS.SWITCH_ORGANIZATION, payload, { timeout });
    
    // Update token if provided
    if (response.data?.token) {
      TokenManager.setTokens(response.data.token);
    }
    
    // Update tenant context
    TokenManager.setTenantContext(organizationId);
    
    // Update cached organization if provided
    if (response.data?.organization) {
      TokenManager.setOrganization(response.data.organization);
    }
    
    // Emit organization switched event
    apiEvents.emit('user:organization:switched', {
      organizationId,
      organization: response.data?.organization,
      timestamp: new Date().toISOString(),
    });
    
    // Refresh user profile after organization switch
    setTimeout(() => {
      fetchUserProfile({ refresh: true }).catch(() => {
        // Silently fail if profile refresh fails
      });
    }, 500);
    
    return {
      success: true,
      data: response.data,
      organization: response.data?.organization,
      message: response.data?.message || 'Organization switched successfully',
    };
  } catch (error) {
    trackError(error, {
      context: 'switchOrganization',
      endpoint: USER_ENDPOINTS.SWITCH_ORGANIZATION,
      organizationId,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to switch organization',
      code: error.code || 'ORGANIZATION_SWITCH_ERROR',
      details: error.details,
      organizationId,
    };
  }
}

/**
 * Update user profile with validation and optimistic updates
 * PATCH /api/v1/users/profile
 */
export async function updateUserProfile(profileData, options = {}) {
  const { optimistic = true, timeout = 15000 } = options;
  
  if (!profileData || typeof profileData !== 'object') {
    return {
      success: false,
      error: 'Invalid profile data',
      code: 'INVALID_PROFILE_DATA',
    };
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
    
    const response = await api.patch(USER_ENDPOINTS.UPDATE_PROFILE, profileData, { timeout });
    
    // Update cached user info with server response
    if (response.data?.user) {
      TokenManager.setUserInfo(response.data.user);
      apiEvents.emit('user:profile:updated', response.data.user);
    }
    
    return {
      success: true,
      data: response.data,
      user: response.data?.user,
      message: response.data?.message || 'Profile updated successfully',
    };
  } catch (error) {
    // Rollback optimistic update on error
    if (optimistic && currentUser) {
      TokenManager.setUserInfo(currentUser);
      apiEvents.emit('user:profile:rollback', currentUser);
    }
    
    trackError(error, {
      context: 'updateUserProfile',
      endpoint: USER_ENDPOINTS.UPDATE_PROFILE,
      profileData,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to update profile',
      code: error.code || 'PROFILE_UPDATE_ERROR',
      details: error.details,
    };
  }
}

// ----------------------
// Additional User Operations
// ----------------------

/**
 * Change user password with security validation
 * POST /api/v1/users/change-password
 */
export async function changePassword(passwordData, options = {}) {
  const { timeout = 10000 } = options;
  
  if (!passwordData?.currentPassword || !passwordData?.newPassword) {
    return {
      success: false,
      error: 'Current and new password are required',
      code: 'INVALID_PASSWORD_DATA',
    };
  }
  
  if (passwordData.newPassword.length < 8) {
    return {
      success: false,
      error: 'New password must be at least 8 characters',
      code: 'PASSWORD_TOO_SHORT',
    };
  }
  
  try {
    const response = await api.post(USER_ENDPOINTS.CHANGE_PASSWORD, passwordData, { timeout });
    
    apiEvents.emit('user:password:changed');
    
    return {
      success: true,
      data: response.data,
      message: response.data?.message || 'Password changed successfully',
    };
  } catch (error) {
    trackError(error, {
      context: 'changePassword',
      endpoint: USER_ENDPOINTS.CHANGE_PASSWORD,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to change password',
      code: error.code || 'PASSWORD_CHANGE_ERROR',
      details: error.details,
    };
  }
}

/**
 * Upload user avatar with progress tracking
 * POST /api/v1/users/avatar
 */
export async function uploadAvatar(file, options = {}) {
  const { onProgress, timeout = 30000 } = options;
  
  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: 'Invalid file provided',
      code: 'INVALID_FILE',
    };
  }
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      success: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed',
      code: 'INVALID_FILE_TYPE',
    };
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      success: false,
      error: 'File size must be less than 5MB',
      code: 'FILE_TOO_LARGE',
    };
  }
  
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const config = {
      timeout,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    
    // Add progress tracking if callback provided
    if (onProgress && typeof onProgress === 'function') {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }
    
    const response = await api.post(USER_ENDPOINTS.UPLOAD_AVATAR, formData, config);
    
    // Update cached user info with new avatar
    if (response.data?.avatarUrl) {
      const user = TokenManager.getUserInfo();
      if (user) {
        user.avatarUrl = response.data.avatarUrl;
        TokenManager.setUserInfo(user);
        apiEvents.emit('user:avatar:updated', response.data.avatarUrl);
      }
    }
    
    return {
      success: true,
      data: response.data,
      avatarUrl: response.data?.avatarUrl,
      message: response.data?.message || 'Avatar uploaded successfully',
    };
  } catch (error) {
    trackError(error, {
      context: 'uploadAvatar',
      endpoint: USER_ENDPOINTS.UPLOAD_AVATAR,
      file: { name: file.name, type: file.type, size: file.size },
    });
    
    return {
      success: false,
      error: error.message || 'Failed to upload avatar',
      code: error.code || 'AVATAR_UPLOAD_ERROR',
      details: error.details,
    };
  }
}

/**
 * Get user activity with pagination
 * GET /api/v1/users/activity
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
    });
    
    return {
      success: true,
      data: response.data,
      activities: response.data?.activities || [],
      pagination: response.data?.pagination || { page, limit, total: 0 },
    };
  } catch (error) {
    trackError(error, {
      context: 'getUserActivity',
      endpoint: USER_ENDPOINTS.ACTIVITY,
      params: options,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to fetch user activity',
      code: error.code || 'ACTIVITY_FETCH_ERROR',
      details: error.details,
    };
  }
}

/**
 * Update user preferences
 * PATCH /api/v1/users/preferences
 */
export async function updateUserPreferences(preferences, options = {}) {
  const { timeout = 10000 } = options;
  
  if (!preferences || typeof preferences !== 'object') {
    return {
      success: false,
      error: 'Invalid preferences data',
      code: 'INVALID_PREFERENCES',
    };
  }
  
  try {
    const response = await api.patch(USER_ENDPOINTS.PREFERENCES, { preferences }, { timeout });
    
    // Update cached user info
    const user = TokenManager.getUserInfo();
    if (user && response.data?.preferences) {
      user.preferences = response.data.preferences;
      TokenManager.setUserInfo(user);
    }
    
    apiEvents.emit('user:preferences:updated', response.data?.preferences);
    
    return {
      success: true,
      data: response.data,
      preferences: response.data?.preferences,
      message: response.data?.message || 'Preferences updated successfully',
    };
  } catch (error) {
    trackError(error, {
      context: 'updateUserPreferences',
      endpoint: USER_ENDPOINTS.PREFERENCES,
      preferences,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to update preferences',
      code: error.code || 'PREFERENCES_UPDATE_ERROR',
      details: error.details,
    };
  }
}

// ----------------------
// Utility Functions
// ----------------------

/**
 * Get current user info from cache or API
 */
export async function getCurrentUser(options = {}) {
  const { refresh = false } = options;
  
  // Return cached user if available and not refreshing
  const cachedUser = TokenManager.getUserInfo();
  if (cachedUser && !refresh) {
    return {
      success: true,
      data: { user: cachedUser },
      user: cachedUser,
      cached: true,
      timestamp: new Date().toISOString(),
    };
  }
  
  // Fetch fresh data
  return await fetchUserProfile({ refresh: true });
}

/**
 * Clear user cache
 */
export function clearUserCache() {
  TokenManager.setUserInfo(null);
  TokenManager.setOrganization(null);
  apiEvents.emit('user:cache:cleared');
}

/**
 * Check if user has specific permission
 */
export function hasPermission(permission, organizationId = null) {
  const user = TokenManager.getUserInfo();
  const org = TokenManager.getOrganization();
  
  if (!user || !user.permissions) return false;
  
  // Check global permissions
  if (user.permissions.includes(permission)) return true;
  
  // Check organization-specific permissions
  if (organizationId && user.organizationPermissions) {
    const orgPerms = user.organizationPermissions[organizationId];
    return orgPerms && orgPerms.includes(permission);
  }
  
  // Check current organization permissions
  if (org?.id && user.organizationPermissions?.[org.id]) {
    return user.organizationPermissions[org.id].includes(permission);
  }
  
  return false;
}

// ----------------------
// Event Listeners
// ----------------------

// Auto-refresh profile on organization switch
apiEvents.on('user:organization:switched', () => {
  fetchUserProfile({ refresh: true }).catch(() => {
    // Silently fail if auto-refresh fails
  });
});

// Clear cache on logout
apiEvents.on('auth:logout', () => {
  clearUserCache();
});

// Export everything
export default {
  fetchUserProfile,
  fetchOrganizations,
  switchOrganization,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  getUserActivity,
  updateUserPreferences,
  getCurrentUser,
  clearUserCache,
  hasPermission,
  USER_ENDPOINTS,
};
