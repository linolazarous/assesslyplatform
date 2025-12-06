// src/api/systemApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * System API Service for Assessly Platform
 * Comprehensive system monitoring, health checks, and infrastructure management
 * Real-time monitoring with alerting and diagnostics
 */

const systemApi = {
  // ===================== SYSTEM HEALTH & MONITORING =====================
  
  /**
   * Fetch comprehensive system health information
   * @param {Object} params - Health monitoring parameters
   * @param {boolean} params.detailed - Include detailed service health
   * @param {boolean} params.realtime - Include real-time metrics
   * @param {boolean} params.includeAlerts - Include active alerts
   * @param {boolean} params.includeIncidents - Include recent incidents
   * @returns {Promise<Object>} Complete system health status
   */
  fetchSystemHealth: async (params = {}) => {
    try {
      // Check admin permissions
      if (!TokenManager.hasPermission('system:health') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System health permission required');
      }
      
      const response = await api.get('/api/v1/system/health', {
        params: {
          detailed: params.detailed || true,
          realtime: params.realtime || false,
          includeServices: true,
          includeMetrics: true,
          includeAlerts: params.includeAlerts || true,
          includeIncidents: params.includeIncidents || true,
          includeRecommendations: true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'overallHealth', 
        'services', 
        'metrics', 
        'timestamp'
      ]);
      
      // Emit health status event
      apiEvents.emit('system:health_checked', {
        status: response.data.overallHealth,
        services: response.data.services?.length || 0,
        metrics: response.data.metrics,
        timestamp: response.data.timestamp
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch system health error:', error);
      
      // Development mock data
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SystemAPI] Using mock system health data for development');
        return generateMockSystemHealth(params);
      }
      
      apiEvents.emit('system:health_error', { error, params });
      throw error;
    }
  },
  
  /**
   * Fetch detailed service status with performance metrics
   * @param {Object} params - Service status parameters
   * @param {Array<string>} params.services - Specific services to check
   * @param {boolean} params.includeEndpoints - Include endpoint health
   * @param {boolean} params.includeHistory - Include historical data
   * @param {number} params.historyHours - Hours of historical data
   * @returns {Promise<Object>} Detailed service status
   */
  fetchServiceStatus: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:services') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Service monitoring permission required');
      }
      
      const response = await api.get('/api/v1/system/services/status', {
        params: {
          services: params.services || 'all',
          includeEndpoints: params.includeEndpoints || true,
          includeMetrics: params.includeMetrics || true,
          includeHistory: params.includeHistory || false,
          historyHours: params.historyHours || 24,
          ...params
        }
      });
      
      validateResponse(response.data, ['services', 'summary', 'timestamp']);
      
      apiEvents.emit('system:services_checked', {
        services: response.data.services?.length || 0,
        healthy: response.data.services?.filter(s => s.status === 'healthy').length || 0,
        degraded: response.data.services?.filter(s => s.status === 'degraded').length || 0,
        ...response.data.summary
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch service status error:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SystemAPI] Using mock service status data for development');
        return generateMockServiceStatus(params);
      }
      
      throw error;
    }
  },
  
  // ===================== SYSTEM METRICS & PERFORMANCE =====================
  
  /**
   * Fetch system metrics and performance statistics
   * @param {Object} params - Metrics parameters
   * @param {string} params.granularity - Data granularity (minute, hour, day)
   * @param {string} params.startTime - Start time for metrics
   * @param {string} params.endTime - End time for metrics
   * @param {Array<string>} params.metrics - Specific metrics to fetch
   * @returns {Promise<Object>} System metrics
   */
  fetchSystemMetrics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:metrics') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System metrics permission required');
      }
      
      const response = await api.get('/api/v1/system/metrics', {
        params: {
          granularity: params.granularity || 'hour',
          includeTrends: true,
          includeComparisons: true,
          includeAnomalies: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['metrics', 'trends', 'summary', 'timestamp']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch system metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch real-time monitoring data
   * @param {Object} params - Real-time monitoring parameters
   * @returns {Promise<Object>} Real-time system data
   */
  fetchRealtimeMonitoring: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:realtime') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Real-time monitoring permission required');
      }
      
      const response = await api.get('/api/v1/system/monitoring/realtime', {
        params: {
          window: params.window || '5m',
          includeAlerts: params.includeAlerts || true,
          includeEvents: params.includeEvents || true,
          ...params
        }
      });
      
      validateResponse(response.data, ['data', 'alerts', 'events', 'timestamp']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch real-time monitoring error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch API performance statistics
   * @param {Object} params - API performance parameters
   * @returns {Promise<Object>} API performance metrics
   */
  fetchApiPerformance: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:api') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: API performance permission required');
      }
      
      const response = await api.get('/api/v1/system/api/performance', {
        params: {
          includeEndpoints: true,
          includeResponseTimes: true,
          includeErrorRates: true,
          includeUsage: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['endpoints', 'performance', 'errors', 'usage']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch API performance error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch database performance metrics
   * @param {Object} params - Database metrics parameters
   * @returns {Promise<Object>} Database performance metrics
   */
  fetchDatabaseMetrics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:database') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Database metrics permission required');
      }
      
      const response = await api.get('/api/v1/system/database/metrics', {
        params: {
          includeQueries: params.includeQueries || false,
          includeConnections: true,
          includeStorage: true,
          includePerformance: true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'connections', 
        'queries', 
        'storage', 
        'performance', 
        'replication'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch database metrics error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM ALERTS & INCIDENTS =====================
  
  /**
   * Fetch system incidents and alerts
   * @param {Object} params - Incidents parameters
   * @returns {Promise<Object>} System incidents and alerts
   */
  fetchIncidents: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:incidents') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Incidents access permission required');
      }
      
      const response = await api.get('/api/v1/system/incidents', {
        params: {
          status: params.status || 'all',
          severity: params.severity || 'all',
          limit: params.limit || 50,
          includeResolved: params.includeResolved || false,
          ...params
        }
      });
      
      validateResponse(response.data, ['incidents', 'summary', 'stats']);
      
      apiEvents.emit('system:incidents_loaded', {
        active: response.data.summary?.active || 0,
        resolved: response.data.summary?.resolved || 0,
        total: response.data.incidents?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch incidents error:', error);
      throw error;
    }
  },
  
  /**
   * Get system alerts configuration
   * @returns {Promise<Object>} Alerts configuration
   */
  fetchAlertsConfig: async () => {
    try {
      if (!TokenManager.hasPermission('system:alerts') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Alerts configuration permission required');
      }
      
      const response = await api.get('/api/v1/system/alerts/config');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch alerts config error:', error);
      throw error;
    }
  },
  
  /**
   * Update system alerts configuration
   * @param {Object} config - Updated alerts configuration
   * @returns {Promise<Object>} Updated configuration
   */
  updateAlertsConfig: async (config) => {
    try {
      if (!TokenManager.hasPermission('system:alerts') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Alerts configuration permission required');
      }
      
      const response = await api.put('/api/v1/system/alerts/config', {
        ...config,
        updatedBy: TokenManager.getUserInfo()?.id,
        updatedAt: new Date().toISOString()
      });
      
      apiEvents.emit('system:alerts_config_updated', {
        config: response.data,
        updatedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Update alerts config error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM LOGS & AUDITING =====================
  
  /**
   * Fetch system logs with advanced filtering
   * @param {Object} params - Logs query parameters
   * @returns {Promise<Object>} System logs
   */
  fetchSystemLogs: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:logs') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System logs permission required');
      }
      
      const response = await api.get('/api/v1/system/logs', {
        params: {
          level: params.level || 'all',
          service: params.service || 'all',
          page: params.page || 1,
          limit: params.limit || 100,
          startTime: params.startTime,
          endTime: params.endTime,
          search: params.search,
          ...params
        }
      });
      
      validateResponse(response.data, ['logs', 'pagination', 'summary']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch system logs error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch security audit logs
   * @param {Object} params - Audit log parameters
   * @returns {Promise<Object>} Security audit logs
   */
  fetchSecurityAuditLogs: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:security') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Security audit permission required');
      }
      
      const response = await api.get('/api/v1/system/security/audit-logs', {
        params: {
          action: params.action || 'all',
          userId: params.userId,
          organizationId: params.organizationId,
          startTime: params.startTime,
          endTime: params.endTime,
          ...params
        }
      });
      
      validateResponse(response.data, ['auditLogs', 'pagination', 'summary']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch security audit logs error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM CONFIGURATION =====================
  
  /**
   * Fetch system configuration
   * @returns {Promise<Object>} System configuration
   */
  fetchSystemConfig: async () => {
    try {
      if (!TokenManager.hasPermission('system:config') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System configuration permission required');
      }
      
      const response = await api.get('/api/v1/system/configuration');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch system config error:', error);
      throw error;
    }
  },
  
  /**
   * Update system configuration
   * @param {Object} config - Updated configuration
   * @returns {Promise<Object>} Updated configuration
   */
  updateSystemConfig: async (config) => {
    try {
      if (!TokenManager.hasPermission('system:config') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System configuration permission required');
      }
      
      const response = await api.put('/api/v1/system/configuration', {
        ...config,
        updatedBy: TokenManager.getUserInfo()?.id,
        updatedAt: new Date().toISOString()
      });
      
      apiEvents.emit('system:config_updated', {
        config: response.data,
        updatedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Update system config error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch system feature flags
   * @returns {Promise<Object>} Feature flags configuration
   */
  fetchFeatureFlags: async () => {
    try {
      const response = await api.get('/api/v1/system/feature-flags');
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch feature flags error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM MAINTENANCE & DIAGNOSTICS =====================
  
  /**
   * Run system diagnostics
   * @param {Object} params - Diagnostics parameters
   * @returns {Promise<Object>} Diagnostics results
   */
  runDiagnostics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('system:diagnostics') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System diagnostics permission required');
      }
      
      const response = await api.post('/api/v1/system/diagnostics', {
        ...params,
        requestedBy: TokenManager.getUserInfo()?.id,
        requestedAt: new Date().toISOString()
      });
      
      validateResponse(response.data, ['results', 'status', 'recommendations']);
      
      apiEvents.emit('system:diagnostics_run', {
        status: response.data.status,
        tests: response.data.results?.length || 0,
        requestedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Run diagnostics error:', error);
      throw error;
    }
  },
  
  /**
   * Clear system cache
   * @param {Object} options - Cache clearing options
   * @returns {Promise<Object>} Cache clearing result
   */
  clearCache: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('system:cache') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Cache management permission required');
      }
      
      const response = await api.post('/api/v1/system/cache/clear', {
        cacheType: options.cacheType || 'all',
        clearedBy: TokenManager.getUserInfo()?.id,
        clearedAt: new Date().toISOString(),
        ...options
      });
      
      apiEvents.emit('system:cache_cleared', {
        cacheType: options.cacheType || 'all',
        clearedBy: TokenManager.getUserInfo()?.id,
        result: response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Clear cache error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM BACKUPS =====================
  
  /**
   * Fetch backup status and information
   * @returns {Promise<Object>} Backup status
   */
  fetchBackupStatus: async () => {
    try {
      if (!TokenManager.hasPermission('system:backups') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Backup management permission required');
      }
      
      const response = await api.get('/api/v1/system/backups/status');
      validateResponse(response.data, ['backups', 'status', 'schedule', 'storage']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch backup status error:', error);
      throw error;
    }
  },
  
  /**
   * Trigger manual backup
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup initiation result
   */
  triggerBackup: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('system:backups') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Backup management permission required');
      }
      
      const response = await api.post('/api/v1/system/backups/trigger', {
        backupType: options.backupType || 'full',
        triggeredBy: TokenManager.getUserInfo()?.id,
        triggeredAt: new Date().toISOString(),
        includeLogs: options.includeLogs !== false,
        ...options
      });
      
      apiEvents.emit('system:backup_triggered', {
        backupType: options.backupType || 'full',
        backupId: response.data.backupId,
        triggeredBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Trigger backup error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM VERSION & ENVIRONMENT =====================
  
  /**
   * Fetch system version information
   * @returns {Promise<Object>} Version information
   */
  fetchVersionInfo: async () => {
    try {
      const response = await api.get('/api/v1/system/version');
      validateResponse(response.data, ['version', 'components', 'build']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch version info error:', error);
      throw error;
    }
  },
  
  /**
   * Fetch environment information
   * @returns {Promise<Object>} Environment details
   */
  fetchEnvironmentInfo: async () => {
    try {
      const response = await api.get('/api/v1/system/environment');
      validateResponse(response.data, ['environment', 'settings', 'resources']);
      
      return response.data;
    } catch (error) {
      console.error('[SystemAPI] Fetch environment info error:', error);
      throw error;
    }
  },
  
  // ===================== SYSTEM EXPORT & REPORTS =====================
  
  /**
   * Export system health report
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data with blob
   */
  exportHealthReport: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('system:export') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: System export permission required');
      }
      
      const response = await api.get('/api/v1/system/export/health', {
        responseType: 'blob',
        params: {
          format: options.format || 'pdf',
          include: options.include || ['summary', 'services', 'metrics', 'incidents'],
          startDate: options.startDate,
          endDate: options.endDate,
          ...options
        }
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `system_health_report_${new Date().toISOString().split('T')[0]}.${options.format || 'pdf'}`;
      
      return {
        blob: response.data,
        filename,
        contentType,
        size: response.data.size,
        url: URL.createObjectURL(response.data)
      };
    } catch (error) {
      console.error('[SystemAPI] Export health report error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get health status color
   * @param {string} status - Health status
   * @returns {string} CSS color class
   */
  getHealthStatusColor: (status) => {
    const statusColors = {
      healthy: 'text-green-600 bg-green-50',
      degraded: 'text-yellow-600 bg-yellow-50',
      unhealthy: 'text-orange-600 bg-orange-50',
      down: 'text-red-600 bg-red-50',
      maintenance: 'text-blue-600 bg-blue-50',
      unknown: 'text-gray-600 bg-gray-50'
    };
    
    return statusColors[status] || statusColors.unknown;
  },
  
  /**
   * Get health status icon
   * @param {string} status - Health status
   * @returns {string} Icon name
   */
  getHealthStatusIcon: (status) => {
    const statusIcons = {
      healthy: 'check-circle',
      degraded: 'alert-triangle',
      unhealthy: 'alert-octagon',
      down: 'x-circle',
      maintenance: 'wrench',
      unknown: 'help-circle'
    };
    
    return statusIcons[status] || statusIcons.unknown;
  },
  
  /**
   * Format uptime percentage
   * @param {number} uptime - Uptime decimal (0.9995)
   * @returns {string} Formatted percentage
   */
  formatUptime: (uptime) => {
    return `${(uptime * 100).toFixed(2)}%`;
  },
  
  /**
   * Format response time
   * @param {number} ms - Response time in milliseconds
   * @returns {string} Formatted response time
   */
  formatResponseTime: (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },
  
  /**
   * Get metric trend direction
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {string} Trend direction (up, down, stable)
   */
  getMetricTrend: (current, previous) => {
    if (current > previous * 1.1) return 'up';
    if (current < previous * 0.9) return 'down';
    return 'stable';
  },
  
  /**
   * Subscribe to system events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`system:${event}`, callback);
  },
  
  /**
   * Unsubscribe from system events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`system:${event}`, callback);
  },
  
  /**
   * Initialize system monitoring
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check permissions
      if (!TokenManager.hasPermission('system:health') && 
          !TokenManager.hasPermission('super_admin')) {
        return {
          success: false,
          authorized: false,
          message: 'Insufficient permissions for system monitoring'
        };
      }
      
      // Check basic system health
      const health = await systemApi.fetchSystemHealth({ detailed: false });
      
      // Get version information
      const version = await systemApi.fetchVersionInfo();
      
      // Subscribe to real-time WebSocket updates if available
      const ws = subscribeToSystemUpdates();
      
      apiEvents.emit('system:initialized', {
        healthy: health.overallHealth === 'healthy',
        version: version.version,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        authorized: true,
        healthy: health.overallHealth === 'healthy',
        health: health,
        version: version,
        websocket: ws
      };
    } catch (error) {
      console.error('[SystemAPI] Initialize error:', error);
      return {
        success: false,
        authorized: false,
        error: error.message
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Subscribe to real-time system updates via WebSocket
 */
function subscribeToSystemUpdates() {
  try {
    const token = TokenManager.getToken();
    if (!token) return null;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsBaseUrl}/api/v1/system/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[SystemAPI] WebSocket connected for system updates');
      apiEvents.emit('system:websocket_connected');
      
      // Subscribe to system events
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['health_updates', 'alert_notifications', 'metric_updates'],
        userId: TokenManager.getUserInfo()?.id,
        timestamp: new Date().toISOString()
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'health_update') {
          apiEvents.emit('system:health_update', data.data);
        } else if (data.type === 'alert') {
          apiEvents.emit('system:alert_received', data.data);
        } else if (data.type === 'metric_update') {
          apiEvents.emit('system:metric_update', data.data);
        } else if (data.type === 'incident') {
          apiEvents.emit('system:incident_created', data.data);
        }
      } catch (error) {
        console.error('[SystemAPI] WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('[SystemAPI] WebSocket disconnected');
      apiEvents.emit('system:websocket_disconnected');
      
      // Attempt reconnection
      setTimeout(() => {
        if (TokenManager.getToken()) {
          subscribeToSystemUpdates();
        }
      }, 5000);
    };
    
    return ws;
  } catch (error) {
    console.error('[SystemAPI] WebSocket subscription error:', error);
    return null;
  }
}

/**
 * Generate mock system health data for development
 */
function generateMockSystemHealth(params) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    overallHealth: 'healthy',
    uptime: '99.95%',
    responseTime: 128,
    timestamp: now.toISOString(),
    services: [
      {
        id: 'api_gateway',
        name: 'API Gateway',
        status: 'healthy',
        health: 98,
        latency: 45,
        uptime: '99.98%',
        version: '2.4.1',
        lastChecked: now.toISOString(),
        endpoints: params.includeEndpoints ? [
          { path: '/api/v1/auth', method: 'POST', status: 'healthy', latency: 32, successRate: 99.8 },
          { path: '/api/v1/assessments', method: 'GET', status: 'healthy', latency: 56, successRate: 99.5 },
          { path: '/api/v1/organizations', method: 'GET', status: 'healthy', latency: 48, successRate: 99.7 },
        ] : undefined
      },
      {
        id: 'auth_service',
        name: 'Authentication Service',
        status: 'healthy',
        health: 97,
        latency: 68,
        uptime: '99.95%',
        version: '1.2.3',
        lastChecked: now.toISOString()
      },
      {
        id: 'database',
        name: 'Database',
        status: 'healthy',
        health: 99,
        latency: 12,
        uptime: '99.99%',
        version: 'MongoDB 7.0',
        lastChecked: now.toISOString()
      },
      {
        id: 'cache',
        name: 'Redis Cache',
        status: 'healthy',
        health: 96,
        latency: 5,
        uptime: '99.97%',
        version: 'Redis 7.2',
        lastChecked: now.toISOString()
      },
      {
        id: 'storage',
        name: 'File Storage',
        status: 'degraded',
        health: 85,
        latency: 89,
        uptime: '99.92%',
        version: 'S3 Compatible',
        lastChecked: oneHourAgo.toISOString(),
        issues: ['Increased latency on file uploads']
      },
      {
        id: 'email',
        name: 'Email Service',
        status: 'healthy',
        health: 94,
        latency: 120,
        uptime: '99.85%',
        version: 'SMTP/3.0',
        lastChecked: twoHoursAgo.toISOString()
      },
      {
        id: 'analytics',
        name: 'Analytics Service',
        status: 'healthy',
        health: 95,
        latency: 156,
        uptime: '99.91%',
        version: '1.5.2',
        lastChecked: twoHoursAgo.toISOString()
      }
    ],
    metrics: {
      cpuUsage: { current: 42.5, trend: 'stable', threshold: 80 },
      memoryUsage: { current: 68.3, trend: 'up', threshold: 85 },
      diskUsage: { current: 45.2, trend: 'stable', threshold: 90 },
      networkIn: { current: 125.8, trend: 'up', unit: 'Mbps', threshold: 1000 },
      networkOut: { current: 89.4, trend: 'stable', unit: 'Mbps', threshold: 1000 },
      activeConnections: { current: 1245, trend: 'up', threshold: 5000 },
      requestsPerMinute: { current: 256, trend: 'stable', threshold: 1000 },
      errorRate: { current: 0.23, trend: 'down', threshold: 5, unit: '%' },
      responseTimeP95: { current: 245, trend: 'stable', threshold: 500, unit: 'ms' }
    },
    alerts: params.includeAlerts ? [
      {
        id: 'alert_001',
        severity: 'warning',
        service: 'database',
        message: 'Database connection pool reaching 80% capacity',
        timestamp: oneHourAgo.toISOString(),
        acknowledged: false
      },
      {
        id: 'alert_002',
        severity: 'info',
        service: 'system',
        message: 'Scheduled maintenance completed successfully',
        timestamp: twoHoursAgo.toISOString(),
        acknowledged: true
      }
    ] : [],
    incidents: params.includeIncidents ? [
      {
        id: 'inc_001',
        title: 'API Latency Spike',
        status: 'resolved',
        severity: 'medium',
        startTime: twoHoursAgo.toISOString(),
        endTime: oneHourAgo.toISOString(),
        duration: '1 hour',
        affectedServices: ['api_gateway', 'auth_service'],
        rootCause: 'Database query optimization issue',
        resolution: 'Query optimization and cache implementation'
      }
    ] : [],
    recommendations: [
      'Consider scaling database connection pool',
      'Monitor file storage latency trends',
      'Review analytics service batch processing'
    ],
    fromMock: true
  };
}

/**
 * Generate mock service status data
 */
function generateMockServiceStatus(params) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const services = [
    {
      id: 'api_gateway',
      name: 'API Gateway',
      status: 'operational',
      category: 'core',
      health: 98,
      uptime: '99.98%',
      latency: 45,
      version: '2.4.1',
      lastUpdated: now.toISOString(),
      endpoints: params.includeEndpoints ? [
        { path: '/api/v1/auth', method: 'POST', status: 'healthy', latency: 32, successRate: 99.8 },
        { path: '/api/v1/assessments', method: 'GET', status: 'healthy', latency: 56, successRate: 99.5 },
        { path: '/api/v1/organizations', method: 'GET', status: 'healthy', latency: 48, successRate: 99.7 },
        { path: '/api/v1/search', method: 'POST', status: 'healthy', latency: 78, successRate: 99.3 }
      ] : undefined,
      metrics: {
        requests: { total: 245678, perSecond: 256 },
        errors: { count: 125, rate: 0.05 },
        responseTime: { avg: 45, p95: 89, p99: 145 }
      }
    },
    {
      id: 'auth_service',
      name: 'Authentication Service',
      status: 'operational',
      category: 'security',
      health: 97,
      uptime: '99.95%',
      latency: 68,
      version: '1.2.3',
      lastUpdated: now.toISOString(),
      features: ['JWT', 'OAuth', 'Session Management', 'MFA'],
      metrics: {
        authentications: { total: 124578, perSecond: 45 },
        failures: { count: 245, rate: 0.2 },
        sessions: { active: 1245, max: 5000 }
      }
    },
    {
      id: 'database',
      name: 'Database',
      status: 'operational',
      category: 'data',
      health: 99,
      uptime: '99.99%',
      latency: 12,
      version: 'MongoDB 7.0',
      lastUpdated: now.toISOString(),
      metrics: {
        connections: { active: 45, max: 200 },
        queries: { perSecond: 125, slowQueries: 2 },
        storage: { used: '45.2GB', total: '500GB', percentage: 9 },
        replication: { lag: '0ms', status: 'healthy' }
      }
    },
    {
      id: 'cache',
      name: 'Redis Cache',
      status: 'operational',
      category: 'performance',
      health: 96,
      uptime: '99.97%',
      latency: 5,
      version: 'Redis 7.2',
      lastUpdated: now.toISOString(),
      metrics: {
        hitRate: 94.5,
        memory: { used: '2.4GB', max: '8GB', percentage: 30 },
        keys: { total: 124578, expires: 45689 }
      }
    },
    {
      id: 'storage',
      name: 'File Storage',
      status: 'degraded',
      category: 'storage',
      health: 85,
      uptime: '99.92%',
      latency: 89,
      version: 'S3 Compatible',
      lastUpdated: oneHourAgo.toISOString(),
      metrics: {
        storage: { used: '125.8GB', objects: 24560 },
        throughput: { read: '45MB/s', write: '12MB/s' },
        errors: { rate: 0.8, lastError: 'Connection timeout' }
      },
      issues: ['Increased latency on file uploads']
    },
    {
      id: 'email',
      name: 'Email Service',
      status: 'operational',
      category: 'communication',
      health: 94,
      uptime: '99.85%',
      latency: 120,
      version: 'SMTP/3.0',
      lastUpdated: twoHoursAgo.toISOString(),
      metrics: {
        emails: { sent: 12456, queued: 45, failed: 12 },
        delivery: { rate: 98.7, bounceRate: 1.2 }
      }
    },
    {
      id: 'analytics',
      name: 'Analytics Service',
      status: 'operational',
      category: 'analytics',
      health: 95,
      uptime: '99.91%',
      latency: 156,
      version: '1.5.2',
      lastUpdated: twoHoursAgo.toISOString(),
      metrics: {
        reports: { generated: 845, processing: 12 },
        data: { points: 1245789, processed: '2.4TB' }
      }
    }
  ];
  
  // Filter services if specified
  const filteredServices = params.services && params.services !== 'all'
    ? services.filter(s => params.services.includes(s.id))
    : services;
  
  return {
    services: filteredServices,
    summary: {
      total: filteredServices.length,
      operational: filteredServices.filter(s => s.status === 'operational').length,
      degraded: filteredServices.filter(s => s.status === 'degraded').length,
      down: filteredServices.filter(s => s.status === 'down').length,
      overallHealth: filteredServices.every(s => s.status === 'operational') ? 'healthy' : 
                     filteredServices.some(s => s.status === 'down') ? 'unhealthy' : 'degraded'
    },
    timestamp: now.toISOString(),
    fromMock: true
  };
}

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

export default systemApi;
