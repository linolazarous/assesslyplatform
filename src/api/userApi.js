// src/api/userApi.js
import api, { apiEvents, trackError } from './index';

/**
 * User Management API
 * Stateless, production-safe
 */

// ----------------------
// Endpoints
// ----------------------
export const USER_ENDPOINTS = {
  PROFILE: '/users/profile',
  PREFERENCES: '/users/preferences',
  ORGANIZATIONS: '/users/organizations',
  SWITCH_ORGANIZATION: '/users/switch-organization',
  CHANGE_PASSWORD: '/users/change-password',
  SESSIONS: '/users/sessions',
  AVATAR: '/users/avatar',
  ACTIVITY: '/users/activity',
};

// ----------------------
// Helpers
// ----------------------
const response = (success, data = null, message = '', meta = {}) => ({
  success,
  data,
  message,
  ...meta,
  timestamp: new Date().toISOString(),
});

const errorResponse = (error, context, meta = {}) => {
  trackError(error, { context, ...meta });
  return response(
    false,
    null,
    error.response?.data?.message || error.message || 'Request failed',
    {
      status: error.response?.status,
      code: error.response?.data?.code,
      errors: error.response?.data?.errors,
    }
  );
};

// ----------------------
// Profile
// ----------------------
export async function fetchUserProfile(options = {}) {
  try {
    const res = await api.get(USER_ENDPOINTS.PROFILE, {
      timeout: options.timeout || 15000,
    });

    apiEvents.emit('user:profile:loaded', res.data);
    return response(true, res.data, 'Profile loaded');
  } catch (e) {
    return errorResponse(e, 'fetchUserProfile');
  }
}

export async function updateUserProfile(profileData) {
  if (!profileData || typeof profileData !== 'object') {
    return response(false, null, 'Invalid profile data');
  }

  try {
    const res = await api.patch(USER_ENDPOINTS.PROFILE, profileData);
    apiEvents.emit('user:profile:updated', res.data);
    return response(true, res.data, 'Profile updated');
  } catch (e) {
    return errorResponse(e, 'updateUserProfile');
  }
}

// ----------------------
// Avatar
// ----------------------
export async function uploadAvatar(file) {
  if (!(file instanceof File)) {
    return response(false, null, 'Invalid file');
  }

  const form = new FormData();
  form.append('avatar', file);

  try {
    const res = await api.post(USER_ENDPOINTS.AVATAR, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });

    apiEvents.emit('user:avatar:updated', res.data);
    return response(true, res.data, 'Avatar uploaded');
  } catch (e) {
    return errorResponse(e, 'uploadAvatar');
  }
}

// ----------------------
// Organizations
// ----------------------
export async function fetchOrganizations() {
  try {
    const res = await api.get(USER_ENDPOINTS.ORGANIZATIONS);
    apiEvents.emit('user:organizations:loaded', res.data);
    return response(true, res.data, 'Organizations loaded');
  } catch (e) {
    return errorResponse(e, 'fetchOrganizations');
  }
}

export async function switchOrganization(organizationId) {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.post(USER_ENDPOINTS.SWITCH_ORGANIZATION, {
      organizationId,
    });

    apiEvents.emit('user:organization:switched', res.data);
    return response(true, res.data, 'Organization switched');
  } catch (e) {
    return errorResponse(e, 'switchOrganization');
  }
}

// ----------------------
// Security
// ----------------------
export async function changePassword(data) {
  if (!data?.currentPassword || !data?.newPassword) {
    return response(false, null, 'Invalid password data');
  }

  try {
    const res = await api.post(USER_ENDPOINTS.CHANGE_PASSWORD, data);
    apiEvents.emit('user:password:changed');
    return response(true, res.data, 'Password changed');
  } catch (e) {
    return errorResponse(e, 'changePassword');
  }
}

// ----------------------
// Sessions & Activity
// ----------------------
export async function getUserSessions() {
  try {
    const res = await api.get(USER_ENDPOINTS.SESSIONS);
    return response(true, res.data, 'Sessions loaded');
  } catch (e) {
    return errorResponse(e, 'getUserSessions');
  }
}

export async function revokeSession(sessionId) {
  if (!sessionId) return response(false, null, 'Session ID required');

  try {
    const res = await api.delete(`${USER_ENDPOINTS.SESSIONS}/${sessionId}`);
    apiEvents.emit('user:session:revoked', { sessionId });
    return response(true, res.data, 'Session revoked');
  } catch (e) {
    return errorResponse(e, 'revokeSession');
  }
}

export async function getUserActivity(params = {}) {
  try {
    const res = await api.get(USER_ENDPOINTS.ACTIVITY, { params });
    return response(true, res.data, 'Activity loaded');
  } catch (e) {
    return errorResponse(e, 'getUserActivity');
  }
}

// ----------------------
// Default Export
// ----------------------
export default {
  fetchUserProfile,
  updateUserProfile,
  uploadAvatar,
  fetchOrganizations,
  switchOrganization,
  changePassword,
  getUserSessions,
  revokeSession,
  getUserActivity,
  USER_ENDPOINTS,
};
