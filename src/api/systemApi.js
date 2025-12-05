// src/api/systemApi.js
import api from './axiosConfig';

/**
 * System API Service
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 * Handles system health, monitoring, and infrastructure endpoints
 */

const createApiMethod = (method, endpoint, options = {}) => {
  return async (data, params) => {
    try {
      const config = {
        ...options,
        params: params || options.params,
      };

      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint, config);
          break;
        case 'post':
          response = await api.post(endpoint, data, config);
          break;
        case 'put':
          response = await api.put(endpoint, data, config);
          break;
        case 'delete':
          response = await api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Normalize response
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`[SystemAPI] ${method} ${endpoint} error:`, error);
      
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     'An unexpected error occurred';
      
      const status = error.response?.status;
      
      return {
        success: false,
        message,
        status,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
    }
  };
};

// ===================== SYSTEM HEALTH & MONITORING =====================

/**
 * Fetch comprehensive system health information
 * This is the missing export needed by SystemHealthMonitor.jsx
 */
export const fetchSystemHealth = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/system/health')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[SystemAPI] Using mock system health data for development');
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      return {
        success: true,
        data: {
          overallHealth: 'healthy',
          uptime: '99.95%',
          responseTime: '128ms',
          lastChecked: now.toISOString(),
          services: [
            { name: 'API Gateway', status: 'healthy', latency: '45ms', lastChecked: now.toISOString() },
            { name: 'Authentication Service', status: 'healthy', latency: '68ms', lastChecked: now.toISOString() },
            { name: 'Database', status: 'healthy', latency: '12ms', lastChecked: now.toISOString() },
            { name: 'Cache', status: 'healthy', latency: '5ms', lastChecked: now.toISOString() },
            { name: 'File Storage', status: 'healthy', latency: '89ms', lastChecked: now.toISOString() },
            { name: 'Email Service', status: 'healthy', latency: '120ms', lastChecked: oneHourAgo.toISOString() },
            { name: 'Analytics Service', status: 'healthy', latency: '156ms', lastChecked: twoHoursAgo.toISOString() },
          ],
          metrics: {
            cpuUsage: 42.5,
            memoryUsage: 68.3,
            diskUsage: 45.2,
            networkIn: 125.8,
            networkOut: 89.4,
            activeConnections: 1245,
            requestsPerMinute: 256,
            errorRate: 0.23,
          },
          alerts: [
            { id: 'alert_001', severity: 'warning', message: 'Database connection pool reaching 80% capacity', timestamp: oneHourAgo.toISOString() },
            { id: 'alert_002', severity: 'info', message: 'Scheduled maintenance completed successfully', timestamp: twoHoursAgo.toISOString() },
          ],
          incidents: [
            { id: 'inc_001', title: 'API Latency Spike', status: 'resolved', startTime: twoHoursAgo.toISOString(), endTime: oneHourAgo.toISOString() },
          ],
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SystemAPI] Using mock system health data for development due to error:', error);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      return {
        success: true,
        data: {
          overallHealth: 'healthy',
          uptime: '99.95%',
          responseTime: '128ms',
          lastChecked: now.toISOString(),
          services: [
            { name: 'API Gateway', status: 'healthy', latency: '45ms', lastChecked: now.toISOString() },
            { name: 'Authentication Service', status: 'healthy', latency: '68ms', lastChecked: now.toISOString() },
            { name: 'Database', status: 'healthy', latency: '12ms', lastChecked: now.toISOString() },
            { name: 'Cache', status: 'healthy', latency: '5ms', lastChecked: now.toISOString() },
            { name: 'File Storage', status: 'healthy', latency: '89ms', lastChecked: now.toISOString() },
            { name: 'Email Service', status: 'healthy', latency: '120ms', lastChecked: oneHourAgo.toISOString() },
            { name: 'Analytics Service', status: 'healthy', latency: '156ms', lastChecked: twoHoursAgo.toISOString() },
          ],
          metrics: {
            cpuUsage: 42.5,
            memoryUsage: 68.3,
            diskUsage: 45.2,
            networkIn: 125.8,
            networkOut: 89.4,
            activeConnections: 1245,
            requestsPerMinute: 256,
            errorRate: 0.23,
          },
          alerts: [
            { id: 'alert_001', severity: 'warning', message: 'Database connection pool reaching 80% capacity', timestamp: oneHourAgo.toISOString() },
            { id: 'alert_002', severity: 'info', message: 'Scheduled maintenance completed successfully', timestamp: twoHoursAgo.toISOString() },
          ],
          incidents: [
            { id: 'inc_001', title: 'API Latency Spike', status: 'resolved', startTime: twoHoursAgo.toISOString(), endTime: oneHourAgo.toISOString() },
          ],
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch system health',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Fetch detailed service status
 * This is the missing export needed by SystemHealthMonitor.jsx
 */
export const fetchServiceStatus = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/system/services/status')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[SystemAPI] Using mock service status data for development');
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      return {
        success: true,
        data: {
          services: [
            {
              id: 'api_gateway',
              name: 'API Gateway',
              status: 'operational',
              uptime: '99.98%',
              latency: '45ms',
              version: '2.4.1',
              lastUpdated: now.toISOString(),
              endpoints: [
                { path: '/api/v1/auth', method: 'POST', status: 'healthy', latency: '32ms' },
                { path: '/api/v1/assessments', method: 'GET', status: 'healthy', latency: '56ms' },
                { path: '/api/v1/organizations', method: 'GET', status: 'healthy', latency: '48ms' },
              ],
            },
            {
              id: 'auth_service',
              name: 'Authentication Service',
              status: 'operational',
              uptime: '99.95%',
              latency: '68ms',
              version: '1.2.3',
              lastUpdated: now.toISOString(),
              features: ['JWT', 'OAuth', 'Session Management'],
            },
            {
              id: 'database',
              name: 'Database',
              status: 'operational',
              uptime: '99.99%',
              latency: '12ms',
              version: 'MongoDB 7.0',
              lastUpdated: now.toISOString(),
              metrics: {
                connections: 45,
                queriesPerSecond: 125,
                storageUsed: '45.2GB',
                replicationLag: '0ms',
              },
            },
            {
              id: 'cache',
              name: 'Redis Cache',
              status: 'operational',
              uptime: '99.97%',
              latency: '5ms',
              version: 'Redis 7.2',
              lastUpdated: now.toISOString(),
              hitRate: '94.5%',
              memoryUsed: '2.4GB',
            },
            {
              id: 'storage',
              name: 'File Storage',
              status: 'operational',
              uptime: '99.92%',
              latency: '89ms',
              version: 'S3 Compatible',
              lastUpdated: oneHourAgo.toISOString(),
              storageUsed: '125.8GB',
              files: 24560,
            },
            {
              id: 'email',
              name: 'Email Service',
              status: 'operational',
              uptime: '99.85%',
              latency: '120ms',
              version: 'SMTP/3.0',
              lastUpdated: twoHoursAgo.toISOString(),
              emailsSent: 12456,
              deliveryRate: '98.7%',
            },
            {
              id: 'analytics',
              name: 'Analytics Service',
              status: 'operational',
              uptime: '99.91%',
              latency: '156ms',
              version: '1.5.2',
              lastUpdated: twoHoursAgo.toISOString(),
              reportsGenerated: 845,
              dataPoints: 1245789,
            },
          ],
          lastUpdated: now.toISOString(),
          systemStatus: 'All systems operational',
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SystemAPI] Using mock service status data for development due to error:', error);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      return {
        success: true,
        data: {
          services: [
            {
              id: 'api_gateway',
              name: 'API Gateway',
              status: 'operational',
              uptime: '99.98%',
              latency: '45ms',
              version: '2.4.1',
              lastUpdated: now.toISOString(),
              endpoints: [
                { path: '/api/v1/auth', method: 'POST', status: 'healthy', latency: '32ms' },
                { path: '/api/v1/assessments', method: 'GET', status: 'healthy', latency: '56ms' },
                { path: '/api/v1/organizations', method: 'GET', status: 'healthy', latency: '48ms' },
              ],
            },
            {
              id: 'auth_service',
              name: 'Authentication Service',
              status: 'operational',
              uptime: '99.95%',
              latency: '68ms',
              version: '1.2.3',
              lastUpdated: now.toISOString(),
              features: ['JWT', 'OAuth', 'Session Management'],
            },
            {
              id: 'database',
              name: 'Database',
              status: 'operational',
              uptime: '99.99%',
              latency: '12ms',
              version: 'MongoDB 7.0',
              lastUpdated: now.toISOString(),
              metrics: {
                connections: 45,
                queriesPerSecond: 125,
                storageUsed: '45.2GB',
                replicationLag: '0ms',
              },
            },
            {
              id: 'cache',
              name: 'Redis Cache',
              status: 'operational',
              uptime: '99.97%',
              latency: '5ms',
              version: 'Redis 7.2',
              lastUpdated: now.toISOString(),
              hitRate: '94.5%',
              memoryUsed: '2.4GB',
            },
            {
              id: 'storage',
              name: 'File Storage',
              status: 'operational',
              uptime: '99.92%',
              latency: '89ms',
              version: 'S3 Compatible',
              lastUpdated: oneHourAgo.toISOString(),
              storageUsed: '125.8GB',
              files: 24560,
            },
            {
              id: 'email',
              name: 'Email Service',
              status: 'operational',
              uptime: '99.85%',
              latency: '120ms',
              version: 'SMTP/3.0',
              lastUpdated: twoHoursAgo.toISOString(),
              emailsSent: 12456,
              deliveryRate: '98.7%',
            },
            {
              id: 'analytics',
              name: 'Analytics Service',
              status: 'operational',
              uptime: '99.91%',
              latency: '156ms',
              version: '1.5.2',
              lastUpdated: twoHoursAgo.toISOString(),
              reportsGenerated: 845,
              dataPoints: 1245789,
            },
          ],
          lastUpdated: now.toISOString(),
          systemStatus: 'All systems operational',
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch service status',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== SYSTEM METRICS =====================

/**
 * Get system metrics and statistics
 */
export const fetchSystemMetrics = createApiMethod('get', '/api/v1/system/metrics');

/**
 * Get infrastructure resource usage
 */
export const fetchResourceUsage = createApiMethod('get', '/api/v1/system/resources');

/**
 * Get database performance metrics
 */
export const fetchDatabaseMetrics = createApiMethod('get', '/api/v1/system/database/metrics');

/**
 * Get API performance statistics
 */
export const fetchApiPerformance = createApiMethod('get', '/api/v1/system/api/performance');

/**
 * Get real-time monitoring data
 */
export const fetchRealtimeMonitoring = createApiMethod('get', '/api/v1/system/monitoring/realtime');

// ===================== SYSTEM ALERTS & INCIDENTS =====================

/**
 * Get system incidents and alerts
 */
export const fetchIncidents = createApiMethod('get', '/api/v1/system/incidents');

/**
 * Get system alerts configuration
 */
export const fetchAlertsConfig = createApiMethod('get', '/api/v1/system/alerts/config');

/**
 * Update system alerts configuration
 */
export const updateAlertsConfig = createApiMethod('put', '/api/v1/system/alerts/config');

/**
 * Get system error statistics
 */
export const fetchErrorStatistics = createApiMethod('get', '/api/v1/system/errors/statistics');

// ===================== SYSTEM LOGS =====================

/**
 * Get system logs with filtering
 */
export const fetchSystemLogs = createApiMethod('get', '/api/v1/system/logs');

/**
 * Get security audit logs
 */
export const fetchSecurityAuditLogs = createApiMethod('get', '/api/v1/system/security/audit-logs');

// ===================== SYSTEM CONFIGURATION =====================

/**
 * Get system configuration
 */
export const fetchSystemConfig = createApiMethod('get', '/api/v1/system/configuration');

/**
 * Update system configuration
 */
export const updateSystemConfig = createApiMethod('put', '/api/v1/system/configuration');

/**
 * Get system feature flags
 */
export const fetchFeatureFlags = createApiMethod('get', '/api/v1/system/feature-flags');

/**
 * Update system feature flags
 */
export const updateFeatureFlags = createApiMethod('put', '/api/v1/system/feature-flags');

// ===================== SYSTEM UPTIME & PERFORMANCE =====================

/**
 * Get system uptime and availability
 */
export const fetchUptimeStats = createApiMethod('get', '/api/v1/system/uptime');

/**
 * Get system performance summary
 */
export const fetchPerformanceSummary = createApiMethod('get', '/api/v1/system/performance/summary');

/**
 * Get system dashboard metrics (for admin dashboard)
 */
export const fetchDashboardMetrics = createApiMethod('get', '/api/v1/system/dashboard/metrics');

// ===================== SYSTEM MAINTENANCE =====================

/**
 * Get maintenance schedule
 */
export const fetchMaintenanceSchedule = createApiMethod('get', '/api/v1/system/maintenance/schedule');

/**
 * Schedule maintenance
 */
export const scheduleMaintenance = createApiMethod('post', '/api/v1/system/maintenance/schedule');

/**
 * Trigger system diagnostics
 */
export const runDiagnostics = createApiMethod('post', '/api/v1/system/diagnostics');

/**
 * Clear system cache
 */
export const clearCache = createApiMethod('post', '/api/v1/system/cache/clear');

// ===================== SYSTEM BACKUPS =====================

/**
 * Get backup status and information
 */
export const fetchBackupStatus = createApiMethod('get', '/api/v1/system/backups/status');

/**
 * Trigger manual backup
 */
export const triggerBackup = createApiMethod('post', '/api/v1/system/backups/trigger');

// ===================== SYSTEM VERSION & ENVIRONMENT =====================

/**
 * Get system version information
 */
export const fetchVersionInfo = createApiMethod('get', '/api/v1/system/version');

/**
 * Get environment information
 */
export const fetchEnvironmentInfo = createApiMethod('get', '/api/v1/system/environment');

/**
 * Get system health check (simple ping)
 */
export const healthCheck = createApiMethod('get', '/api/v1/system/health-check');

// ===================== SYSTEM NOTIFICATIONS =====================

/**
 * Get system notifications
 */
export const fetchSystemNotifications = createApiMethod('get', '/api/v1/system/notifications');

/**
 * Acknowledge system notification
 */
export const acknowledgeNotification = createApiMethod('post', '/api/v1/system/notifications/:id/acknowledge');

// ===================== SYSTEM EXPORT =====================

/**
 * Export system health report
 */
export const exportHealthReport = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/system/export/health', {
      responseType: 'blob',
      params,
    });
    
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const filename = `system_health_report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    return {
      success: true,
      data: {
        blob,
        url,
        filename,
        type: blob.type,
        size: blob.size,
      },
    };
  } catch (error) {
    console.error('[SystemAPI] Error exporting health report:', error);
    return {
      success: false,
      message: error.message || 'Failed to export health report',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== DEFAULT EXPORT =====================

const systemApi = {
  // Health monitoring (ADDED THE MISSING EXPORTS)
  fetchSystemHealth,
  fetchServiceStatus,
  
  // Metrics
  fetchSystemMetrics,
  fetchResourceUsage,
  fetchDatabaseMetrics,
  fetchApiPerformance,
  fetchRealtimeMonitoring,
  
  // Alerts & Incidents
  fetchIncidents,
  fetchAlertsConfig,
  updateAlertsConfig,
  fetchErrorStatistics,
  
  // Logs
  fetchSystemLogs,
  fetchSecurityAuditLogs,
  
  // Configuration
  fetchSystemConfig,
  updateSystemConfig,
  fetchFeatureFlags,
  updateFeatureFlags,
  
  // Uptime & Performance
  fetchUptimeStats,
  fetchPerformanceSummary,
  fetchDashboardMetrics,
  
  // Maintenance
  fetchMaintenanceSchedule,
  scheduleMaintenance,
  runDiagnostics,
  clearCache,
  
  // Backups
  fetchBackupStatus,
  triggerBackup,
  
  // Version & Environment
  fetchVersionInfo,
  fetchEnvironmentInfo,
  healthCheck,
  
  // Notifications
  fetchSystemNotifications,
  acknowledgeNotification,
  
  // Export
  exportHealthReport,
};

export default systemApi;
