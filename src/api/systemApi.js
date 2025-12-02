// src/api/systemApi.js
import api from './api';

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
      const response = await api.get('/system/health', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
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
      const response = await api.get('/system/services', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching service status:', error);
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
      const response = await api.get('/system/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching system metrics:', error);
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
      const response = await api.get('/system/incidents', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching incidents:', error);
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
      const response = await api.get('/system/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching system logs:', error);
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
      const response = await api.get('/system/resources', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching resource usage:', error);
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
      const response = await api.get('/system/database/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching database metrics:', error);
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
      const response = await api.get('/system/api/performance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching API performance:', error);
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
      const response = await api.get('/system/uptime', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching uptime stats:', error);
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
      const response = await api.post('/system/diagnostics', data);
      return response.data;
    } catch (error) {
      console.error('Error running diagnostics:', error);
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
      const response = await api.post('/system/cache/clear', data);
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  },

  /**
   * Get system alerts configuration
   * @returns {Promise} Alerts configuration
   */
  fetchAlertsConfig: async () => {
    try {
      const response = await api.get('/system/alerts/config');
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts config:', error);
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
      const response = await api.put('/system/alerts/config', config);
      return response.data;
    } catch (error) {
      console.error('Error updating alerts config:', error);
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
      const response = await api.get('/system/monitoring/realtime', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time monitoring:', error);
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
      const response = await api.get('/system/export/health', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting health report:', error);
      throw error;
    }
  },

  /**
   * Get backup status and information
   * @returns {Promise} Backup information
   */
  fetchBackupStatus: async () => {
    try {
      const response = await api.get('/system/backups/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching backup status:', error);
      throw error;
    }
  },

  /**
   * Trigger manual backup
   * @returns {Promise} Backup results
   */
  triggerBackup: async () => {
    try {
      const response = await api.post('/system/backups/trigger');
      return response.data;
    } catch (error) {
      console.error('Error triggering backup:', error);
      throw error;
    }
  },
};

export default systemApi;
