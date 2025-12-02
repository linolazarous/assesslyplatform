// src/api/activityApi.js
import api from './api';

/**
 * Activity API Service
 * Handles user activity tracking, audit logs, and system events
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
      console.error('Error fetching recent activities:', error);
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
      console.error('Error fetching activity summary:', error);
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
      console.error('Error fetching user activities:', error);
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
      console.error('Error fetching organization activities:', error);
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
      console.error('Error fetching activity types:', error);
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
      console.error('Error searching activities:', error);
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
      console.error('Error fetching activity stats:', error);
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
      console.error('Error fetching peak activity times:', error);
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
      console.error('Error fetching session activities:', error);
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
      console.error('Error fetching assessment activities:', error);
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
      const response = await api.get('/activities/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting activities:', error);
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
      console.error('Error fetching activity trends:', error);
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
      console.error('Error fetching real-time activities:', error);
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
      console.error('Error fetching activity by ID:', error);
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
      console.error('Error fetching engagement metrics:', error);
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
      console.error('Error fetching audit logs:', error);
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
      console.error('Error fetching admin activities:', error);
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
      console.error('Error fetching activity heatmap:', error);
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
      console.error('Error fetching most active users:', error);
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
      console.error('Error fetching activity frequency:', error);
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
      console.error('Error creating activity report:', error);
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
      console.error('Error clearing activity history:', error);
      throw error;
    }
  },
};

export default activityApi;
