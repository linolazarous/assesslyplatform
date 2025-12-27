// src/api/activityApi.js
import api, { TokenManager } from './index';

/**
 * Activity API Service
 * Handles user activity tracking, audit logs, and system events
 * Multi-tenant aware with organization context
 */

// Centralized endpoints (maintainability)
const ENDPOINTS = {
  RECENT: '/activities/recent',
  SUMMARY: '/activities/summary',
  USER: '/activities/user',
  ORGANIZATION: '/activities/organization',
  TYPES: '/activities/types',
  SEARCH: '/activities/search',
  STATS: '/activities/stats',
  PEAK_TIMES: '/activities/peak-times',
  SESSIONS: '/activities/sessions',
  ASSESSMENT: '/activities/assessment',
  EXPORT: '/activities/export',
  TRENDS: '/activities/trends',
  REALTIME: '/activities/realtime',
  ENGAGEMENT: '/activities/engagement',
  AUDIT_LOGS: '/activities/audit-logs',
  ADMIN: '/activities/admin',
  HEATMAP: '/activities/heatmap',
  MOST_ACTIVE_USERS: '/activities/most-active-users',
  FREQUENCY: '/activities/frequency',
  REPORTS: '/activities/reports',
  CLEAR: '/activities/clear',
  TRACK: '/activities/track',
  BATCH_TRACK: '/activities/batch-track',
  DASHBOARD: '/activities/dashboard-summary',
  NOTIFICATIONS: '/activities/notifications',
  MARK_READ: '/activities/notifications/read',
};

const activityApi = {
  fetchRecentActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.RECENT, { params })).data,

  fetchActivitySummary: async (params = {}) =>
    (await api.get(ENDPOINTS.SUMMARY, { params })).data,

  fetchUserActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.USER, { params })).data,

  fetchOrganizationActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.ORGANIZATION, { params })).data,

  fetchActivityTypes: async () =>
    (await api.get(ENDPOINTS.TYPES)).data,

  searchActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.SEARCH, { params })).data,

  fetchActivityStats: async (params = {}) =>
    (await api.get(ENDPOINTS.STATS, { params })).data,

  fetchPeakActivityTimes: async (params = {}) =>
    (await api.get(ENDPOINTS.PEAK_TIMES, { params })).data,

  fetchSessionActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.SESSIONS, { params })).data,

  fetchAssessmentActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.ASSESSMENT, { params })).data,

  exportActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.EXPORT, { params, responseType: 'blob' })).data,

  fetchActivityTrends: async (params = {}) =>
    (await api.get(ENDPOINTS.TRENDS, { params })).data,

  fetchRealtimeActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.REALTIME, { params })).data,

  fetchActivityById: async (activityId) => {
    if (!activityId) throw new Error('Activity ID is required');
    return (await api.get(`/activities/${activityId}`)).data;
  },

  fetchEngagementMetrics: async (params = {}) =>
    (await api.get(ENDPOINTS.ENGAGEMENT, { params })).data,

  fetchAuditLogs: async (params = {}) =>
    (await api.get(ENDPOINTS.AUDIT_LOGS, { params })).data,

  fetchAdminActivities: async (params = {}) =>
    (await api.get(ENDPOINTS.ADMIN, { params })).data,

  fetchActivityHeatmap: async (params = {}) =>
    (await api.get(ENDPOINTS.HEATMAP, { params })).data,

  fetchMostActiveUsers: async (params = {}) =>
    (await api.get(ENDPOINTS.MOST_ACTIVE_USERS, { params })).data,

  fetchActivityFrequency: async (params = {}) =>
    (await api.get(ENDPOINTS.FREQUENCY, { params })).data,

  createActivityReport: async (reportConfig) =>
    (await api.post(ENDPOINTS.REPORTS, reportConfig)).data,

  clearActivityHistory: async (params = {}) =>
    (await api.delete(ENDPOINTS.CLEAR, { params })).data,

  trackActivity: async (activityData) => {
    try {
      const organizationId = TokenManager.getTenantId();
      const userInfo = TokenManager.getUserInfo();

      const enhancedActivityData = {
        ...activityData,
        organizationId: organizationId || activityData.organizationId,
        userId: userInfo?.id || activityData.userId,
        userEmail: userInfo?.email || activityData.userEmail,
        timestamp: new Date().toISOString(),
      };

      return (await api.post(ENDPOINTS.TRACK, enhancedActivityData)).data;
    } catch (error) {
      console.warn('[ActivityAPI] Tracking failed (non-blocking)', error);
      return { success: false };
    }
  },

  batchTrackActivities: async (activities) => {
    try {
      return (await api.post(ENDPOINTS.BATCH_TRACK, { activities })).data;
    } catch (error) {
      console.warn('[ActivityAPI] Batch tracking failed (non-blocking)', error);
      return { success: false };
    }
  },

  fetchDashboardSummary: async (params = {}) =>
    (await api.get(ENDPOINTS.DASHBOARD, { params })).data,

  fetchActivityNotifications: async (params = {}) =>
    (await api.get(ENDPOINTS.NOTIFICATIONS, { params })).data,

  markNotificationsAsRead: async (notificationIds) =>
    (await api.post(ENDPOINTS.MARK_READ, { notificationIds })).data,
};

// Helper function for common activity tracking
export const trackUserActivity = (activityType, details = {}) => {
  if (typeof window === 'undefined') return;

  const activityData = {
    type: activityType,
    details,
    source: 'web',
    userAgent: navigator?.userAgent,
    screenResolution: `${window.screen?.width}x${window.screen?.height}`,
    url: window.location.href,
    path: window.location.pathname,
  };

  activityApi.trackActivity(activityData).catch(() => {});
  return activityData;
};

// Common activity types
export const ActivityTypes = {
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  PAGE_VIEW: 'page.view',
  ASSESSMENT_CREATED: 'assessment.created',
  ASSESSMENT_TAKEN: 'assessment.taken',
  ASSESSMENT_REVIEWED: 'assessment.reviewed',
  USER_CREATED: 'user.created',
  ORGANIZATION_CREATED: 'organization.created',
  SETTINGS_UPDATED: 'settings.updated',
  PROFILE_UPDATED: 'profile.updated',
  FILE_UPLOADED: 'file.uploaded',
  SEARCH_PERFORMED: 'search.performed',
  ERROR_OCCURRED: 'error.occurred',
  NOTIFICATION_SENT: 'notification.sent',
  PAYMENT_PROCESSED: 'payment.processed',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
};

export default activityApi;
