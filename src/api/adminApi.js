// src/api/adminApi.js
import api, { TokenManager, trackError } from './index';

/**
 * Admin API Service
 * Handles all admin-related API calls
 * Multi-tenant + role-based access control
 */

// ==================== DASHBOARD ====================

export const fetchAdminStats = async (params = {}) => {
  try {
    return (await api.get('/admin/dashboard/stats', { params })).data;
  } catch (error) {
    trackError(error, { endpoint: '/admin/dashboard/stats', params });
    throw error;
  }
};

export const fetchSystemStats = async () => {
  try {
    return (await api.get('/admin/system/stats')).data;
  } catch (error) {
    trackError(error, { endpoint: '/admin/system/stats' });
    throw error;
  }
};

// ==================== ORGANIZATIONS ====================

export const fetchOrganizations = async (params = {}) =>
  (await api.get('/admin/organizations', { params })).data;

export const fetchOrganizationById = async (organizationId) =>
  (await api.get(`/admin/organizations/${organizationId}`)).data;

export const createOrganization = async (data) =>
  (await api.post('/admin/organizations', data)).data;

export const updateOrganization = async (id, updates) =>
  (await api.put(`/admin/organizations/${id}`, updates)).data;

export const deleteOrganization = async (id) =>
  (await api.delete(`/admin/organizations/${id}`)).data;

export const updateOrganizationStatus = async (id, status) =>
  (await api.patch(`/admin/organizations/${id}/status`, { status })).data;

// ==================== USERS ====================

export const fetchUsers = async (params = {}) =>
  (await api.get('/admin/users', { params })).data;

export const fetchUserById = async (id) =>
  (await api.get(`/admin/users/${id}`)).data;

export const createUser = async (data) =>
  (await api.post('/admin/users', data)).data;

export const updateUser = async (id, updates) =>
  (await api.put(`/admin/users/${id}`, updates)).data;

export const updateUserRole = async (id, role, organizationId) =>
  (await api.patch(`/admin/users/${id}/role`, { role, organizationId })).data;

export const updateUserStatus = async (id, status) =>
  (await api.patch(`/admin/users/${id}/status`, { status })).data;

export const bulkImportUsers = async (file, organizationId) => {
  if (typeof FormData === 'undefined') {
    throw new Error('FormData is not available in this environment');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('organizationId', organizationId);

  return (await api.post('/admin/users/import', formData)).data;
};

// ==================== ASSESSMENTS ====================

export const fetchAssessments = async (params = {}) =>
  (await api.get('/admin/assessments', { params })).data;

export const fetchAssessmentAnalytics = async (id) =>
  (await api.get(`/admin/assessments/${id}/analytics`)).data;

export const fetchAssessmentResponses = async (id, params = {}) =>
  (await api.get(`/admin/assessments/${id}/responses`, { params })).data;

export const updateAssessmentStatus = async (id, status) =>
  (await api.patch(`/admin/assessments/${id}/status`, { status })).data;

// ==================== ANALYTICS ====================

export const fetchAssessmentAnalyticsOverTime = async (params = {}) =>
  (await api.get('/admin/analytics/assessments', { params })).data;

export const fetchUserActivityAnalytics = async (params = {}) =>
  (await api.get('/admin/analytics/user-activity', { params })).data;

export const fetchRevenueAnalytics = async (params = {}) =>
  (await api.get('/admin/analytics/revenue', { params })).data;

export const generateReport = async (config) =>
  (await api.post('/admin/reports/generate', config)).data;

// ==================== SYSTEM ====================

export const fetchSystemHealth = async () =>
  (await api.get('/admin/system/health')).data;

export const fetchPerformanceMetrics = async () =>
  (await api.get('/admin/system/performance')).data;

export const fetchDatabaseStats = async () =>
  (await api.get('/admin/system/database')).data;

// ==================== ACTIVITIES ====================

export const fetchRecentActivities = async (params = {}) =>
  (await api.get('/admin/activities/recent', { params })).data;

export const fetchActivityLogs = async (params = {}) =>
  (await api.get('/admin/activities', { params })).data;

// ==================== BILLING ====================

export const fetchSubscriptions = async (params = {}) =>
  (await api.get('/admin/billing/subscriptions', { params })).data;

export const fetchSubscriptionAnalytics = async () =>
  (await api.get('/admin/billing/analytics')).data;

export const updateSubscriptionPlan = async (orgId, plan) =>
  (await api.put(`/admin/billing/organizations/${orgId}/subscription`, { plan })).data;

// ==================== SETTINGS ====================

export const fetchSystemSettings = async () =>
  (await api.get('/admin/settings')).data;

export const updateSystemSettings = async (settings) =>
  (await api.put('/admin/settings', settings)).data;

export const fetchEmailTemplates = async () =>
  (await api.get('/admin/settings/email-templates')).data;

export const updateEmailTemplate = async (id, updates) =>
  (await api.put(`/admin/settings/email-templates/${id}`, updates)).data;

// ==================== ACCESS HELPERS ====================

export const hasAdminAccess = () => {
  const user = TokenManager.getUserInfo();
  return user?.role === 'admin' || user?.role === 'super_admin';
};

export const hasSuperAdminAccess = () => {
  const user = TokenManager.getUserInfo();
  return user?.role === 'super_admin';
};

export const getRoleDisplayName = (role) =>
  ({
    super_admin: 'Super Admin',
    admin: 'Administrator',
    org_admin: 'Organization Admin',
    assessor: 'Assessor',
    candidate: 'Candidate',
  }[role] || role);

// ==================== DEFAULT EXPORT ====================

export default {
  fetchAdminStats,
  fetchSystemStats,
  fetchOrganizations,
  fetchOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  updateOrganizationStatus,
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  bulkImportUsers,
  fetchAssessments,
  fetchAssessmentAnalytics,
  fetchAssessmentResponses,
  updateAssessmentStatus,
  fetchAssessmentAnalyticsOverTime,
  fetchUserActivityAnalytics,
  fetchRevenueAnalytics,
  generateReport,
  fetchSystemHealth,
  fetchPerformanceMetrics,
  fetchDatabaseStats,
  fetchRecentActivities,
  fetchActivityLogs,
  fetchSubscriptions,
  fetchSubscriptionAnalytics,
  updateSubscriptionPlan,
  fetchSystemSettings,
  updateSystemSettings,
  fetchEmailTemplates,
  updateEmailTemplate,
  hasAdminAccess,
  hasSuperAdminAccess,
  getRoleDisplayName,
};
