// src/api/activityApi.js
import api, { API_ENDPOINTS, TokenManager } from './index';

/**
 * Activity API Service
 * Handles user activity tracking, audit logs, and system events
 * Multi-tenant aware with organization context
 */
const activityApi = {
  /**
   * Get recent activities with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} Recent activities
   */
  fetchRecentActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/recent', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching recent activities:', error);
      throw error;
    }
  },

  /**
   * Get activity summary and analytics
   * @param {Object} params - Query parameters
   * @returns {Promise} Activity summary
   */
  fetchActivitySummary: async (params = {}) => {
    try {
      const response = await api.get('/activities/summary', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity summary:', error);
      throw error;
    }
  },

  /**
   * Get user activities with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise} User activities
   */
  fetchUserActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/user', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching user activities:', error);
      throw error;
    }
  },

  /**
   * Get organization activities
   * @param {Object} params - Query parameters
   * @returns {Promise} Organization activities
   */
  fetchOrganizationActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/organization', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching organization activities:', error);
      throw error;
    }
  },

  /**
   * Get activity types and categories
   * @returns {Promise} Activity types
   */
  fetchActivityTypes: async () => {
    try {
      const response = await api.get('/activities/types');
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity types:', error);
      throw error;
    }
  },

  /**
   * Search activities with advanced filtering
   * @param {Object} params - Search parameters
   * @returns {Promise} Search results
   */
  searchActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/search', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error searching activities:', error);
      throw error;
    }
  },

  /**
   * Get activity statistics
   * @param {Object} params - Query parameters
   * @returns {Promise} Activity statistics
   */
  fetchActivityStats: async (params = {}) => {
    try {
      const response = await api.get('/activities/stats', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity stats:', error);
      throw error;
    }
  },

  /**
   * Get peak activity times
   * @param {Object} params - Query parameters
   * @returns {Promise} Peak activity data
   */
  fetchPeakActivityTimes: async (params = {}) => {
    try {
      const response = await api.get('/activities/peak-times', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching peak activity times:', error);
      throw error;
    }
  },

  /**
   * Get user session activities
   * @param {Object} params - Query parameters
   * @returns {Promise} Session activities
   */
  fetchSessionActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/sessions', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching session activities:', error);
      throw error;
    }
  },

  /**
   * Get assessment-related activities
   * @param {Object} params - Query parameters
   * @returns {Promise} Assessment activities
   */
  fetchAssessmentActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/assessment', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching assessment activities:', error);
      throw error;
    }
  },

  /**
   * Export activities data
   * @param {Object} params - Export parameters
   * @returns {Promise} Export data
   */
  exportActivities: async (params = {}) => {
    try {
      // Note: Download functionality might need to be implemented separately
      const response = await api.get('/activities/export', { 
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error exporting activities:', error);
      throw error;
    }
  },

  /**
   * Get activity trends over time
   * @param {Object} params - Query parameters
   * @returns {Promise} Activity trends
   */
  fetchActivityTrends: async (params = {}) => {
    try {
      const response = await api.get('/activities/trends', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity trends:', error);
      throw error;
    }
  },

  /**
   * Get real-time activity stream
   * @param {Object} params - Query parameters
   * @returns {Promise} Real-time activities
   */
  fetchRealtimeActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/realtime', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching real-time activities:', error);
      throw error;
    }
  },

  /**
   * Get activity by ID
   * @param {string} activityId - Activity ID
   * @returns {Promise} Activity details
   */
  fetchActivityById: async (activityId) => {
    try {
      const response = await api.get(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity by ID:', error);
      throw error;
    }
  },

  /**
   * Get user engagement metrics
   * @param {Object} params - Query parameters
   * @returns {Promise} Engagement metrics
   */
  fetchEngagementMetrics: async (params = {}) => {
    try {
      const response = await api.get('/activities/engagement', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching engagement metrics:', error);
      throw error;
    }
  },

  /**
   * Get system audit logs
   * @param {Object} params - Query parameters
   * @returns {Promise} Audit logs
   */
  fetchAuditLogs: async (params = {}) => {
    try {
      const response = await api.get('/activities/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching audit logs:', error);
      throw error;
    }
  },

  /**
   * Get admin activities
   * @param {Object} params - Query parameters
   * @returns {Promise} Admin activities
   */
  fetchAdminActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities/admin', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching admin activities:', error);
      throw error;
    }
  },

  /**
   * Get activity heatmap data
   * @param {Object} params - Query parameters
   * @returns {Promise} Heatmap data
   */
  fetchActivityHeatmap: async (params = {}) => {
    try {
      const response = await api.get('/activities/heatmap', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity heatmap:', error);
      throw error;
    }
  },

  /**
   * Get most active users
   * @param {Object} params - Query parameters
   * @returns {Promise} Most active users
   */
  fetchMostActiveUsers: async (params = {}) => {
    try {
      const response = await api.get('/activities/most-active-users', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching most active users:', error);
      throw error;
    }
  },

  /**
   * Get activity frequency distribution
   * @param {Object} params - Query parameters
   * @returns {Promise} Frequency distribution
   */
  fetchActivityFrequency: async (params = {}) => {
    try {
      const response = await api.get('/activities/frequency', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity frequency:', error);
      throw error;
    }
  },

  /**
   * Create custom activity report
   * @param {Object} reportConfig - Report configuration
   * @returns {Promise} Custom report
   */
  createActivityReport: async (reportConfig) => {
    try {
      const response = await api.post('/activities/reports', reportConfig);
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error creating activity report:', error);
      throw error;
    }
  },

  /**
   * Clear activity history (admin only)
   * @param {Object} params - Clear parameters
   * @returns {Promise} Clear results
   */
  clearActivityHistory: async (params = {}) => {
    try {
      const response = await api.delete('/activities/clear', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error clearing activity history:', error);
      throw error;
    }
  },

  /**
   * Track user activity (create new activity log)
   * @param {Object} activityData - Activity data to log
   * @returns {Promise} Created activity
   */
  trackActivity: async (activityData) => {
    try {
      // Add organization context automatically
      const organizationId = TokenManager.getTenantId();
      const userInfo = TokenManager.getUserInfo();
      
      const enhancedActivityData = {
        ...activityData,
        organizationId: organizationId || activityData.organizationId,
        userId: userInfo?.id || activityData.userId,
        userEmail: userInfo?.email || activityData.userEmail,
        timestamp: new Date().toISOString(),
      };
      
      const response = await api.post('/activities/track', enhancedActivityData);
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error tracking activity:', error);
      // Don't throw for tracking errors - they shouldn't break the app
      return { success: false, message: 'Failed to track activity' };
    }
  },

  /**
   * Batch track multiple activities
   * @param {Array} activities - Array of activity data
   * @returns {Promise} Batch tracking result
   */
  batchTrackActivities: async (activities) => {
    try {
      const response = await api.post('/activities/batch-track', { activities });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error batch tracking activities:', error);
      return { success: false, message: 'Failed to batch track activities' };
    }
  },

  /**
   * Get activity summary for dashboard
   * @param {Object} params - Query parameters
   * @returns {Promise} Dashboard activity summary
   */
  fetchDashboardSummary: async (params = {}) => {
    try {
      const response = await api.get('/activities/dashboard-summary', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching dashboard summary:', error);
      throw error;
    }
  },

  /**
   * Get activity notifications
   * @param {Object} params - Query parameters
   * @returns {Promise} Activity notifications
   */
  fetchActivityNotifications: async (params = {}) => {
    try {
      const response = await api.get('/activities/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error fetching activity notifications:', error);
      throw error;
    }
  },

  /**
   * Mark notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @returns {Promise} Mark read result
   */
  markNotificationsAsRead: async (notificationIds) => {
    try {
      const response = await api.post('/activities/notifications/read', { notificationIds });
      return response.data;
    } catch (error) {
      console.error('[ActivityAPI] Error marking notifications as read:', error);
      throw error;
    }
  },
};

// Helper function to track common user activities
export const trackUserActivity = (activityType, details = {}) => {
  const activityData = {
    type: activityType,
    details,
    source: 'web',
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    url: window.location.href,
    path: window.location.pathname,
  };
  
  // Track in background - don't await
  activityApi.trackActivity(activityData).catch(() => {
    // Silently fail - tracking shouldn't affect user experience
  });
  
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
