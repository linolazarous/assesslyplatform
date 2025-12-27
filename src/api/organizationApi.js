// src/api/organizationApi.js
import api, { apiEvents, trackError } from './index';

/**
 * Organization API Service (Production Safe)
 * Stateless, backend-authoritative, Render-ready
 */

// ===================== HELPERS =====================
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

// ===================== ADMIN DASHBOARD =====================

export const fetchOrganizationStats = async (params = {}) => {
  try {
    const res = await api.get('/admin/organizations/stats', {
      params: {
        period: params.period || 'month',
        includeDetails: true,
        includeTrends: true,
        ...params,
      },
    });

    apiEvents.emit('organizations:stats:fetched', res.data);
    return response(true, res.data, 'Organization stats loaded');
  } catch (e) {
    if (import.meta.env.DEV) {
      return response(true, generateMockOrganizationStats(params), 'Mock stats');
    }
    return errorResponse(e, 'fetchOrganizationStats', { params });
  }
};

export const fetchOrganizationGrowth = async (params = {}) => {
  try {
    const res = await api.get('/admin/organizations/growth', {
      params: {
        granularity: params.granularity || 'month',
        includePredictions: true,
        ...params,
      },
    });

    apiEvents.emit('organizations:growth:fetched', res.data);
    return response(true, res.data, 'Organization growth loaded');
  } catch (e) {
    if (import.meta.env.DEV) {
      return response(true, generateMockOrganizationGrowth(params), 'Mock growth');
    }
    return errorResponse(e, 'fetchOrganizationGrowth', { params });
  }
};

// ===================== ORGANIZATIONS =====================

export const getOrganization = async (organizationId, options = {}) => {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.get(`/organizations/${organizationId}`, {
      params: {
        includeMembers: !!options.includeMembers,
        includeStats: !!options.includeStats,
        includeSettings: !!options.includeSettings,
        includeBilling: !!options.includeBilling,
      },
    });

    apiEvents.emit('organizations:fetched', res.data);
    return response(true, res.data, 'Organization loaded');
  } catch (e) {
    if (import.meta.env.DEV) {
      return response(
        true,
        generateMockOrganization(organizationId, options),
        'Mock organization'
      );
    }
    return errorResponse(e, 'getOrganization', { organizationId });
  }
};

export const createOrganization = async (data) => {
  if (!data?.name || !data?.email) {
    return response(false, null, 'Name and email required');
  }

  try {
    const res = await api.post('/organizations', data);
    apiEvents.emit('organizations:created', res.data);
    return response(true, res.data, 'Organization created');
  } catch (e) {
    return errorResponse(e, 'createOrganization', { data });
  }
};

export const updateOrganization = async (organizationId, updates) => {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.put(`/organizations/${organizationId}`, updates);
    apiEvents.emit('organizations:updated', { organizationId, updates });
    return response(true, res.data, 'Organization updated');
  } catch (e) {
    return errorResponse(e, 'updateOrganization', { organizationId });
  }
};

// ===================== MEMBERS =====================

export const getOrganizationMembers = async (organizationId, params = {}) => {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.get(`/organizations/${organizationId}/members`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 50,
        ...params,
      },
    });

    return response(true, res.data, 'Members loaded');
  } catch (e) {
    return errorResponse(e, 'getOrganizationMembers', { organizationId });
  }
};

export const inviteMember = async (organizationId, invitation) => {
  if (!organizationId || !invitation?.email) {
    return response(false, null, 'Organization ID and email required');
  }

  try {
    const res = await api.post(
      `/organizations/${organizationId}/invite`,
      invitation
    );

    apiEvents.emit('organizations:member:invited', {
      organizationId,
      email: invitation.email,
    });

    return response(true, res.data, 'Invitation sent');
  } catch (e) {
    return errorResponse(e, 'inviteMember', { organizationId, invitation });
  }
};

// ===================== ANALYTICS =====================

export const getOrganizationAnalytics = async (organizationId, params = {}) => {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.get(
      `/organizations/${organizationId}/analytics`,
      { params }
    );

    return response(true, res.data, 'Analytics loaded');
  } catch (e) {
    return errorResponse(e, 'getOrganizationAnalytics', { organizationId });
  }
};

// ===================== CONTEXT SWITCH =====================

export const switchOrganization = async (organizationId) => {
  if (!organizationId) {
    return response(false, null, 'Organization ID required');
  }

  try {
    const res = await api.post('/users/switch-organization', {
      organizationId,
    });

    apiEvents.emit('organizations:switched', { organizationId });
    return response(true, res.data, 'Organization switched');
  } catch (e) {
    return errorResponse(e, 'switchOrganization', { organizationId });
  }
};

// ===================== MOCK HELPERS (DEV ONLY) =====================
// (unchanged – safe for local dev)

function generateMockOrganizationStats() { /* same as before */ }
function generateMockOrganizationGrowth() { /* same as before */ }
function generateMockOrganization(id, options) { /* same as before */ }

// ===================== DEFAULT EXPORT =====================

export default {
  fetchOrganizationStats,
  fetchOrganizationGrowth,
  getOrganization,
  createOrganization,
  updateOrganization,
  getOrganizationMembers,
  inviteMember,
  getOrganizationAnalytics,
  switchOrganization,
};
