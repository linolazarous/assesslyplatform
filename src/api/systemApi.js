// src/api/systemApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * System API Service for Assessly Platform
 * Comprehensive system monitoring, health checks, and infrastructure management
 * Real-time monitoring with alerting and diagnostics
 */

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

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
export const fetchSystemHealth = async (params = {}) => {
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
    if (import.meta.env.MODE === 'development') {
      console.warn('[SystemAPI] Using mock system health data for development');
      return generateMockSystemHealth(params);
    }
    
    apiEvents.emit('system:health_error', { error, params });
    throw error;
  }
};

/**
 * Fetch detailed service status with performance metrics
 * @param {Object} params - Service status parameters
 * @param {Array<string>} params.services - Specific services to check
 * @param {boolean} params.includeEndpoints - Include endpoint health
 * @param {boolean} params.includeHistory - Include historical data
 * @param {number} params.historyHours - Hours of historical data
 * @returns {Promise<Object>} Detailed service status
 */
export const fetchServiceStatus = async (params = {}) => {
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
    
    if (import.meta.env.MODE === 'development') {
      console.warn('[SystemAPI] Using mock service status data for development');
      return generateMockServiceStatus(params);
    }
    
    throw error;
  }
};

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
export const fetchSystemMetrics = async (params = {}) => {
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
};

/**
 * Fetch real-time monitoring data
 * @param {Object} params - Real-time monitoring parameters
 * @returns {Promise<Object>} Real-time system data
 */
export const fetchRealtimeMonitoring = async (params = {}) => {
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
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Get health status color
 * @param {string} status - Health status
 * @returns {string} CSS color class
 */
export const getHealthStatusColor = (status) => {
  const statusColors = {
    healthy: 'text-green-600 bg-green-50',
    degraded: 'text-yellow-600 bg-yellow-50',
    unhealthy: 'text-orange-600 bg-orange-50',
    down: 'text-red-600 bg-red-50',
    maintenance: 'text-blue-600 bg-blue-50',
    unknown: 'text-gray-600 bg-gray-50'
  };
  
  return statusColors[status] || statusColors.unknown;
};

/**
 * Get health status icon
 * @param {string} status - Health status
 * @returns {string} Icon name
 */
export const getHealthStatusIcon = (status) => {
  const statusIcons = {
    healthy: 'check-circle',
    degraded: 'alert-triangle',
    unhealthy: 'alert-octagon',
    down: 'x-circle',
    maintenance: 'wrench',
    unknown: 'help-circle'
  };
  
  return statusIcons[status] || statusIcons.unknown;
};

/**
 * Format uptime percentage
 * @param {number} uptime - Uptime decimal (0.9995)
 * @returns {string} Formatted percentage
 */
export const formatUptime = (uptime) => {
  return `${(uptime * 100).toFixed(2)}%`;
};

/**
 * Generate mock system health data for development
 */
function generateMockSystemHealth(params) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
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
        id: 'storage',
        name: 'File Storage',
        status: 'degraded',
        health: 85,
        latency: 89,
        uptime: '99.92%',
        version: 'S3 Compatible',
        lastChecked: oneHourAgo.toISOString(),
        issues: ['Increased latency on file uploads']
      }
    ],
    metrics: {
      cpuUsage: { current: 42.5, trend: 'stable', threshold: 80 },
      memoryUsage: { current: 68.3, trend: 'up', threshold: 85 },
      diskUsage: { current: 45.2, trend: 'stable', threshold: 90 },
      activeConnections: { current: 1245, trend: 'up', threshold: 5000 },
      requestsPerMinute: { current: 256, trend: 'stable', threshold: 1000 },
      errorRate: { current: 0.23, trend: 'down', threshold: 5, unit: '%' }
    },
    alerts: params.includeAlerts ? [
      {
        id: 'alert_001',
        severity: 'warning',
        service: 'database',
        message: 'Database connection pool reaching 80% capacity',
        timestamp: oneHourAgo.toISOString(),
        acknowledged: false
      }
    ] : [],
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
      issues: ['Increased latency on file uploads']
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

// ===================== DEFAULT EXPORT FOR BACKWARD COMPATIBILITY =====================

const systemApi = {
  fetchSystemHealth,
  fetchServiceStatus,
  fetchSystemMetrics,
  fetchRealtimeMonitoring,
  getHealthStatusColor,
  getHealthStatusIcon,
  formatUptime,
};

export default systemApi;
