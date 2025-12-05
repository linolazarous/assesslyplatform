// src/api/systemApi.js
import api from './axiosConfig';

/**
 * System API Service
 * Handles system health, monitoring, and infrastructure endpoints
 */
const systemApi = {
  /**
   * Get comprehensive system health status
   * @param {Object} params - Query parameters
   * @returns {Promise} System health data
   */
  fetchSystemHealth: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/health', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching system health:', error);
      throw error;
    }
  },

  /**
   * Get detailed service status
   * @param {Object} params - Query parameters
   * @returns {Promise} Service status data
   */
  fetchServiceStatus: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/services', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching service status:', error);
      throw error;
    }
  },

  /**
   * Get system metrics and statistics
   * @param {Object} params - Query parameters
   * @returns {Promise} System metrics
   */
  fetchSystemMetrics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching system metrics:', error);
      throw error;
    }
  },

  /**
   * Get system incidents and alerts
   * @param {Object} params - Query parameters
   * @returns {Promise} Incidents data
   */
  fetchIncidents: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/incidents', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching incidents:', error);
      throw error;
    }
  },

  /**
   * Get system logs with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} System logs
   */
  fetchSystemLogs: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/logs', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching system logs:', error);
      throw error;
    }
  },

  /**
   * Get infrastructure resource usage
   * @param {Object} params - Query parameters
   * @returns {Promise} Resource usage data
   */
  fetchResourceUsage: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/resources', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching resource usage:', error);
      throw error;
    }
  },

  /**
   * Get database performance metrics
   * @param {Object} params - Query parameters
   * @returns {Promise} Database metrics
   */
  fetchDatabaseMetrics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/database/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching database metrics:', error);
      throw error;
    }
  },

  /**
   * Get API performance statistics
   * @param {Object} params - Query parameters
   * @returns {Promise} API performance data
   */
  fetchApiPerformance: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/api/performance', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching API performance:', error);
      throw error;
    }
  },

  /**
   * Get system uptime and availability
   * @param {Object} params - Query parameters
   * @returns {Promise} Uptime statistics
   */
  fetchUptimeStats: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/uptime', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching uptime stats:', error);
      throw error;
    }
  },

  /**
   * Trigger system diagnostics
   * @param {Object} data - Diagnostics configuration
   * @returns {Promise} Diagnostics results
   */
  runDiagnostics: async (data = {}) => {
    try {
      const response = await api.post('/api/v1/system/diagnostics', data);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error running diagnostics:', error);
      throw error;
    }
  },

  /**
   * Clear system cache
   * @param {Object} data - Cache clearance configuration
   * @returns {Promise} Clearance results
   */
  clearCache: async (data = {}) => {
    try {
      const response = await api.post('/api/v1/system/cache/clear', data);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error clearing cache:', error);
      throw error;
    }
  },

  /**
   * Get system alerts configuration
   * @returns {Promise} Alerts configuration
   */
  fetchAlertsConfig: async () => {
    try {
      const response = await api.get('/api/v1/system/alerts/config');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching alerts config:', error);
      throw error;
    }
  },

  /**
   * Update system alerts configuration
   * @param {Object} config - New alerts configuration
   * @returns {Promise} Updated configuration
   */
  updateAlertsConfig: async (config) => {
    try {
      const response = await api.put('/api/v1/system/alerts/config', config);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error updating alerts config:', error);
      throw error;
    }
  },

  /**
   * Get real-time monitoring data
   * @param {Object} params - Query parameters
   * @returns {Promise} Real-time monitoring data
   */
  fetchRealtimeMonitoring: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/monitoring/realtime', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching real-time monitoring:', error);
      throw error;
    }
  },

  /**
   * Export system health report
   * @param {Object} params - Export parameters
   * @returns {Promise} Export data
   */
  exportHealthReport: async (params = {}) => {
    try {
      const response = await api.download('/api/v1/system/export/health', params, 'system_health_report.pdf');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error exporting health report:', error);
      throw error;
    }
  },

  /**
   * Get backup status and information
   * @returns {Promise} Backup information
   */
  fetchBackupStatus: async () => {
    try {
      const response = await api.get('/api/v1/system/backups/status');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching backup status:', error);
      throw error;
    }
  },

  /**
   * Trigger manual backup
   * @returns {Promise} Backup results
   */
  triggerBackup: async () => {
    try {
      const response = await api.post('/api/v1/system/backups/trigger');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error triggering backup:', error);
      throw error;
    }
  },

  // ===================== NEW FUNCTIONS =====================

  /**
   * Get system configuration
   * @returns {Promise} System configuration
   */
  fetchSystemConfig: async () => {
    try {
      const response = await api.get('/api/v1/system/configuration');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching system configuration:', error);
      throw error;
    }
  },

  /**
   * Update system configuration
   * @param {Object} config - New system configuration
   * @returns {Promise} Updated configuration
   */
  updateSystemConfig: async (config) => {
    try {
      const response = await api.put('/api/v1/system/configuration', config);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error updating system configuration:', error);
      throw error;
    }
  },

  /**
   * Get system version information
   * @returns {Promise} Version information
   */
  fetchVersionInfo: async () => {
    try {
      const response = await api.get('/api/v1/system/version');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching version info:', error);
      throw error;
    }
  },

  /**
   * Get environment information
   * @returns {Promise} Environment details
   */
  fetchEnvironmentInfo: async () => {
    try {
      const response = await api.get('/api/v1/system/environment');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching environment info:', error);
      throw error;
    }
  },

  /**
   * Get system performance summary
   * @param {Object} params - Query parameters
   * @returns {Promise} Performance summary
   */
  fetchPerformanceSummary: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/performance/summary', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching performance summary:', error);
      throw error;
    }
  },

  /**
   * Get system error statistics
   * @param {Object} params - Query parameters
   * @returns {Promise} Error statistics
   */
  fetchErrorStatistics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/errors/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching error statistics:', error);
      throw error;
    }
  },

  /**
   * Get security audit logs
   * @param {Object} params - Query parameters
   * @returns {Promise} Security audit logs
   */
  fetchSecurityAuditLogs: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/security/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching security audit logs:', error);
      throw error;
    }
  },

  /**
   * Get maintenance schedule
   * @returns {Promise} Maintenance schedule
   */
  fetchMaintenanceSchedule: async () => {
    try {
      const response = await api.get('/api/v1/system/maintenance/schedule');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching maintenance schedule:', error);
      throw error;
    }
  },

  /**
   * Schedule maintenance
   * @param {Object} maintenanceData - Maintenance schedule data
   * @returns {Promise} Scheduled maintenance
   */
  scheduleMaintenance: async (maintenanceData) => {
    try {
      const response = await api.post('/api/v1/system/maintenance/schedule', maintenanceData);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error scheduling maintenance:', error);
      throw error;
    }
  },

  /**
   * Get system notifications
   * @param {Object} params - Query parameters
   * @returns {Promise} System notifications
   */
  fetchSystemNotifications: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/system/notifications', { params });
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching system notifications:', error);
      throw error;
    }
  },

  /**
   * Acknowledge system notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise} Acknowledgment result
   */
  acknowledgeNotification: async (notificationId) => {
    try {
      const response = await api.post(`/api/v1/system/notifications/${notificationId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error acknowledging notification:', error);
      throw error;
    }
  },

  /**
   * Get system dashboard metrics (for admin dashboard)
   * @returns {Promise} Dashboard metrics
   */
  fetchDashboardMetrics: async () => {
    try {
      const response = await api.get('/api/v1/system/dashboard/metrics');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Get system health check (simple ping)
   * @returns {Promise} Health check result
   */
  healthCheck: async () => {
    try {
      const response = await api.get('/api/v1/system/health-check');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error performing health check:', error);
      throw error;
    }
  },

  /**
   * Get system feature flags
   * @returns {Promise} Feature flags
   */
  fetchFeatureFlags: async () => {
    try {
      const response = await api.get('/api/v1/system/feature-flags');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error fetching feature flags:', error);
      throw error;
    }
  },

  /**
   * Update system feature flags
   * @param {Object} featureFlags - Feature flags to update
   * @returns {Promise} Updated feature flags
   */
  updateFeatureFlags: async (featureFlags) => {
    try {
      const response = await api.put('/api/v1/system/feature-flags', featureFlags);
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Error updating feature flags:', error);
      throw error;
    }
  },
};

export default systemApi;
