// src/api/userActivityApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * User Activity API Service for Assessly Platform
 * Comprehensive user activity tracking, analytics, and behavior monitoring
 * Real-time activity feeds with detailed analytics and insights
 */

const userActivityApi = {
  // ===================== ACTIVITY TRACKING =====================
  
  /**
   * Fetch user activities with advanced filtering
   * @param {Object} params - Activity query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.userId - Filter by specific user
   * @param {string} params.organizationId - Filter by organization
   * @param {Array<string>} params.activityTypes - Filter by activity types
   * @param {string} params.startDate - Start date filter (ISO)
   * @param {string} params.endDate - End date filter (ISO)
   * @param {string} params.search - Search query across activity details
   * @param {string} params.sortBy - Sort field (timestamp, user, type)
   * @param {string} params.sortOrder - Sort order (asc, desc)
   * @param {boolean} params.includeUserDetails - Include user information
   * @param {boolean} params.includeResourceDetails - Include resource details
   * @returns {Promise<Object>} Paginated user activities
   */
  fetchUserActivities: async (params = {}) => {
    try {
      // Check activity read permissions
      if (!TokenManager.hasPermission('activities:read') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Activity monitoring permission required');
      }
      
      const response = await api.get('/api/v1/activities', {
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includeDetails: true,
          includeAggregations: params.includeAggregations || false,
          includeSessionContext: params.includeSessionContext || false,
          ...params
        }
      });
      
      validateResponse(response.data, ['activities', 'pagination', 'summary']);
      
      // Emit activities loaded event
      apiEvents.emit('activities:loaded', {
        count: response.data.activities?.length || 0,
        organizationId: params.organizationId || TokenManager.getTenantId(),
        timestamp: response.data.timestamp
      });
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Fetch user activities error:', error);
      
      // Development mock data
      if (process.env.NODE_ENV === 'development') {
        console.warn('[UserActivityAPI] Using mock user activities for development');
        return generateMockUserActivities(params);
      }
      
      apiEvents.emit('activities:fetch_error', { error, params });
      throw error;
    }
  },
  
  /**
   * Get user activity by ID
   * @param {string} activityId - Activity ID
   * @param {Object} options - Activity details options
   * @returns {Promise<Object>} Detailed activity information
   */
  getUserActivity: async (activityId, options = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:read') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Activity monitoring permission required');
      }
      
      const response = await api.get(`/api/v1/activities/${activityId}`, {
        params: {
          includeContext: options.includeContext || true,
          includeRelated: options.includeRelated || false,
          includeChanges: options.includeChanges || false,
          ...options
        }
      });
      
      validateResponse(response.data, ['id', 'userId', 'type', 'timestamp', 'details']);
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Get user activity error:', error);
      throw error;
    }
  },
  
  /**
   * Create new activity log entry
   * @param {Object} activityData - Activity data
   * @param {string} activityData.userId - User ID
   * @param {string} activityData.type - Activity type
   * @param {Object} activityData.details - Activity details
   * @param {Object} activityData.metadata - Additional metadata
   * @param {string} activityData.organizationId - Organization ID
   * @param {string} activityData.sessionId - Session ID
   * @returns {Promise<Object>} Created activity
   */
  createActivity: async (activityData) => {
    try {
      // Only allow certain activity types to be created client-side
      const allowedTypes = ['session_start', 'session_end', 'page_view', 'search', 'file_download'];
      
      if (!allowedTypes.includes(activityData.type)) {
        throw new Error(`Unauthorized: Cannot create activity type ${activityData.type} from client`);
      }
      
      const response = await api.post('/api/v1/activities', {
        ...activityData,
        organizationId: activityData.organizationId || TokenManager.getTenantId(),
        clientInfo: {
          userAgent: navigator.userAgent,
          ipAddress: 'client', // Will be set by server middleware
          location: 'client',
          device: getDeviceInfo(),
          browser: getBrowserInfo()
        },
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'web_client',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0',
          ...activityData.metadata
        }
      });
      
      validateResponse(response.data, ['id', 'type', 'timestamp']);
      
      // Emit activity created event
      apiEvents.emit('activities:created', {
        id: response.data.id,
        type: activityData.type,
        userId: activityData.userId,
        organizationId: activityData.organizationId || TokenManager.getTenantId()
      });
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Create activity error:', error);
      throw error;
    }
  },
  
  // ===================== ACTIVITY ANALYTICS =====================
  
  /**
   * Fetch user activity analytics and insights
   * @param {Object} params - Analytics parameters
   * @returns {Promise<Object>} Activity analytics
   */
  fetchUserActivityAnalytics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:analytics') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Activity analytics permission required');
      }
      
      const response = await api.get('/api/v1/activities/analytics', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          period: params.period || 'month',
          includeTrends: true,
          includeHeatmap: params.includeHeatmap || false,
          includeUserSegments: params.includeUserSegments || false,
          includeEngagement: params.includeEngagement || true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'overview', 
        'trends', 
        'topActivities', 
        'userEngagement', 
        'insights'
      ]);
      
      apiEvents.emit('activities:analytics_loaded', {
        period: params.period || 'month',
        organizationId: params.organizationId || TokenManager.getTenantId(),
        insights: response.data.insights?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Fetch user activity analytics error:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[UserActivityAPI] Using mock activity analytics for development');
        return generateMockActivityAnalytics(params);
      }
      
      throw error;
    }
  },
  
  /**
   * Get real-time activity stream
   * @param {Object} params - Real-time parameters
   * @returns {Promise<Object>} Real-time activity stream
   */
  getRealtimeActivityStream: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:realtime') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Real-time activity permission required');
      }
      
      const response = await api.get('/api/v1/activities/stream', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          limit: params.limit || 20,
          types: params.types || 'all',
          includeUsers: params.includeUsers || true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Get real-time activity stream error:', error);
      throw error;
    }
  },
  
  // ===================== USER ENGAGEMENT METRICS =====================
  
  /**
   * Get user engagement metrics
   * @param {Object} params - Engagement parameters
   * @returns {Promise<Object>} User engagement metrics
   */
  getUserEngagementMetrics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:engagement') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Engagement metrics permission required');
      }
      
      const response = await api.get('/api/v1/activities/engagement', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          userId: params.userId,
          period: params.period || 'week',
          includeComparison: params.includeComparison || true,
          includeTrend: params.includeTrend || true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'engagementScore', 
        'metrics', 
        'trend', 
        'recommendations'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Get user engagement metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get user session analytics
   * @param {Object} params - Session parameters
   * @returns {Promise<Object>} Session analytics
   */
  getUserSessionAnalytics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:sessions') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Session analytics permission required');
      }
      
      const response = await api.get('/api/v1/activities/sessions', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          userId: params.userId,
          startDate: params.startDate,
          endDate: params.endDate,
          includeDetails: params.includeDetails || true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'sessions', 
        'stats', 
        'patterns', 
        'insights'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Get user session analytics error:', error);
      throw error;
    }
  },
  
  // ===================== ACTIVITY SEARCH & FILTERS =====================
  
  /**
   * Search activities with advanced filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  searchActivities: async (searchParams) => {
    try {
      if (!TokenManager.hasPermission('activities:search') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Activity search permission required');
      }
      
      const response = await api.post('/api/v1/activities/search', {
        ...searchParams,
        organizationId: searchParams.organizationId || TokenManager.getTenantId(),
        includeHighlights: true,
        includeScore: true
      });
      
      validateResponse(response.data, ['results', 'pagination', 'facets']);
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Search activities error:', error);
      throw error;
    }
  },
  
  /**
   * Get activity filters and facets
   * @returns {Promise<Object>} Available filters
   */
  getActivityFilters: async () => {
    try {
      const response = await api.get('/api/v1/activities/filters', {
        params: {
          organizationId: TokenManager.getTenantId(),
          includeOptions: true
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[UserActivityAPI] Get activity filters error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & REPORTING =====================
  
  /**
   * Export user activities
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data with blob
   */
  exportUserActivities: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('activities:export') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Activity export permission required');
      }
      
      const response = await api.get('/api/v1/activities/export', {
        responseType: 'blob',
        params: {
          format: options.format || 'csv',
          organizationId: options.organizationId || TokenManager.getTenantId(),
          startDate: options.startDate,
          endDate: options.endDate,
          types: options.types || 'all',
          fields: options.fields || ['timestamp', 'user', 'type', 'details', 'ip', 'userAgent'],
          ...options
        }
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `user_activities_${new Date().toISOString().split('T')[0]}.${options.format || 'csv'}`;
      
      return {
        blob: response.data,
        filename,
        contentType,
        size: response.data.size,
        url: URL.createObjectURL(response.data)
      };
    } catch (error) {
      console.error('[UserActivityAPI] Export user activities error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get activity type options
   * @returns {Array<Object>} Activity type options
   */
  getActivityTypes: () => {
    return [
      { value: 'login', label: 'Login', icon: 'log-in', category: 'authentication' },
      { value: 'logout', label: 'Logout', icon: 'log-out', category: 'authentication' },
      { value: 'assessment_created', label: 'Assessment Created', icon: 'file-plus', category: 'assessment' },
      { value: 'assessment_updated', label: 'Assessment Updated', icon: 'edit', category: 'assessment' },
      { value: 'assessment_deleted', label: 'Assessment Deleted', icon: 'trash-2', category: 'assessment' },
      { value: 'assessment_published', label: 'Assessment Published', icon: 'send', category: 'assessment' },
      { value: 'assessment_taken', label: 'Assessment Taken', icon: 'clipboard', category: 'assessment' },
      { value: 'question_created', label: 'Question Created', icon: 'help-circle', category: 'question' },
      { value: 'user_invited', label: 'User Invited', icon: 'user-plus', category: 'user' },
      { value: 'user_removed', label: 'User Removed', icon: 'user-minus', category: 'user' },
      { value: 'role_changed', label: 'Role Changed', icon: 'shield', category: 'user' },
      { value: 'file_uploaded', label: 'File Uploaded', icon: 'upload', category: 'file' },
      { value: 'file_downloaded', label: 'File Downloaded', icon: 'download', category: 'file' },
      { value: 'search_performed', label: 'Search Performed', icon: 'search', category: 'search' },
      { value: 'settings_updated', label: 'Settings Updated', icon: 'settings', category: 'settings' },
      { value: 'export_generated', label: 'Export Generated', icon: 'download-cloud', category: 'export' },
      { value: 'api_call', label: 'API Call', icon: 'code', category: 'api' },
      { value: 'error_occurred', label: 'Error Occurred', icon: 'alert-triangle', category: 'error' },
      { value: 'page_view', label: 'Page View', icon: 'eye', category: 'navigation' }
    ];
  },
  
  /**
   * Get activity severity options
   * @returns {Array<Object>} Severity options
   */
  getActivitySeverities: () => {
    return [
      { value: 'info', label: 'Info', color: 'blue', icon: 'info' },
      { value: 'low', label: 'Low', color: 'green', icon: 'check-circle' },
      { value: 'medium', label: 'Medium', color: 'yellow', icon: 'alert-triangle' },
      { value: 'high', label: 'High', color: 'orange', icon: 'alert-octagon' },
      { value: 'critical', label: 'Critical', color: 'red', icon: 'alert-circle' }
    ];
  },
  
  /**
   * Format activity timestamp
   * @param {string|Date} timestamp - Activity timestamp
   * @returns {string} Formatted timestamp
   */
  formatActivityTime: (timestamp) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },
  
  /**
   * Get activity icon based on type
   * @param {string} activityType - Activity type
   * @returns {string} Icon name
   */
  getActivityIcon: (activityType) => {
    const activityTypes = systemApi.getActivityTypes();
    const type = activityTypes.find(t => t.value === activityType);
    return type?.icon || 'activity';
  },
  
  /**
   * Get activity color based on severity
   * @param {string} severity - Activity severity
   * @returns {string} CSS color class
   */
  getActivityColor: (severity) => {
    const severityColors = {
      info: 'text-blue-600',
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    
    return severityColors[severity] || 'text-gray-600';
  },
  
  /**
   * Log client-side activity
   * @param {string} type - Activity type
   * @param {Object} details - Activity details
   */
  logActivity: (type, details = {}) => {
    const userId = TokenManager.getUserInfo()?.id;
    
    if (!userId) {
      console.warn('[UserActivityAPI] Cannot log activity: No user ID');
      return;
    }
    
    // Queue activity for batch processing
    const activity = {
      userId,
      type,
      details,
      timestamp: new Date().toISOString(),
      clientInfo: {
        userAgent: navigator.userAgent,
        pathname: window.location.pathname,
        referrer: document.referrer
      }
    };
    
    // Add to activity queue
    addToActivityQueue(activity);
    
    // Emit local activity event
    apiEvents.emit('activity:logged', activity);
  },
  
  /**
   * Subscribe to activity events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`activity:${event}`, callback);
  },
  
  /**
   * Unsubscribe from activity events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`activity:${event}`, callback);
  },
  
  /**
   * Initialize activity tracking
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check permissions
      if (!TokenManager.hasPermission('activities:read') && 
          !TokenManager.hasPermission('admin')) {
        return {
          success: false,
          authorized: false,
          message: 'Insufficient permissions for activity tracking'
        };
      }
      
      // Process any queued activities
      await processActivityQueue();
      
      // Start real-time subscription if permissions allow
      const ws = subscribeToActivityUpdates();
      
      apiEvents.emit('activity:initialized', {
        authorized: true,
        realtime: !!ws,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        authorized: true,
        realtime: !!ws,
        websocket: ws
      };
    } catch (error) {
      console.error('[UserActivityAPI] Initialize error:', error);
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
 * Add activity to queue for batch processing
 */
let activityQueue = [];
let activityQueueTimer = null;

function addToActivityQueue(activity) {
  activityQueue.push(activity);
  
  // Start timer if not already running
  if (!activityQueueTimer) {
    activityQueueTimer = setTimeout(processActivityQueue, 5000); // Process every 5 seconds
  }
}

/**
 * Process activity queue and send to server
 */
async function processActivityQueue() {
  if (activityQueue.length === 0) {
    activityQueueTimer = null;
    return;
  }
  
  try {
    const activities = [...activityQueue];
    activityQueue = []; // Clear queue
    
    await api.post('/api/v1/activities/batch', {
      activities,
      organizationId: TokenManager.getTenantId(),
      processedAt: new Date().toISOString()
    });
    
    console.log(`[UserActivityAPI] Processed ${activities.length} queued activities`);
  } catch (error) {
    console.warn('[UserActivityAPI] Failed to process activity queue:', error);
    // Re-add activities to queue for retry
    activityQueue.push(...activityQueue);
  }
  
  // Schedule next processing
  activityQueueTimer = setTimeout(processActivityQueue, 5000);
}

/**
 * Subscribe to real-time activity updates via WebSocket
 */
function subscribeToActivityUpdates() {
  try {
    const token = TokenManager.getToken();
    if (!token) return null;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsBaseUrl}/api/v1/activities/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[UserActivityAPI] WebSocket connected for activity updates');
      apiEvents.emit('activity:websocket_connected');
      
      // Subscribe to activity updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['activity_updates', 'user_activity'],
        userId: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        timestamp: new Date().toISOString()
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'activity') {
          apiEvents.emit('activity:received', data.activity);
        } else if (data.type === 'user_activity') {
          apiEvents.emit('activity:user_activity', data.activity);
        }
      } catch (error) {
        console.error('[UserActivityAPI] WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('[UserActivityAPI] WebSocket disconnected');
      apiEvents.emit('activity:websocket_disconnected');
      
      // Attempt reconnection
      setTimeout(() => {
        if (TokenManager.getToken()) {
          subscribeToActivityUpdates();
        }
      }, 5000);
    };
    
    return ws;
  } catch (error) {
    console.error('[UserActivityAPI] WebSocket subscription error:', error);
    return null;
  }
}

/**
 * Get browser information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';
  
  return browser;
}

/**
 * Get device information
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  
  if (/Android/.test(ua)) device = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) device = 'iOS';
  else if (/Windows/.test(ua)) device = 'Windows';
  else if (/Mac/.test(ua)) device = 'Mac';
  else if (/Linux/.test(ua)) device = 'Linux';
  
  return device;
}

/**
 * Generate mock user activities for development
 */
function generateMockUserActivities(params) {
  const now = new Date();
  const activities = [];
  const users = [
    { id: 'user_001', name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: 'user_002', name: 'Jane Smith', email: 'jane@example.com', role: 'manager' },
    { id: 'user_003', name: 'Bob Johnson', email: 'bob@example.com', role: 'assessor' },
    { id: 'user_004', name: 'Alice Williams', email: 'alice@example.com', role: 'candidate' }
  ];
  
  const activityTypes = [
    'login', 'logout', 'assessment_created', 'assessment_updated',
    'assessment_published', 'assessment_taken', 'question_created',
    'file_uploaded', 'search_performed', 'settings_updated'
  ];
  
  // Generate mock activities
  for (let i = 0; i < (params.limit || 50); i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const hoursAgo = Math.floor(Math.random() * 72); // Up to 3 days ago
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    activities.push({
      id: `activity_${Date.now()}_${i}`,
      userId: user.id,
      user: params.includeUserDetails ? user : undefined,
      type,
      severity: ['info', 'low', 'medium'][Math.floor(Math.random() * 3)],
      timestamp: timestamp.toISOString(),
      details: {
        description: getActivityDescription(type, user.name),
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'New York, US'
      },
      metadata: {
        sessionId: `session_${Math.random().toString(36).substring(2, 9)}`,
        organizationId: params.organizationId || 'org_001'
      }
    });
  }
  
  // Sort by timestamp if needed
  if (params.sortBy === 'timestamp') {
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp);
      const timeB = new Date(b.timestamp);
      return params.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }
  
  return {
    activities,
    pagination: {
      page: params.page || 1,
      limit: params.limit || 50,
      total: 245,
      pages: 5
    },
    summary: {
      totalActivities: 245,
      today: 12,
      thisWeek: 89,
      uniqueUsers: 45
    },
    timestamp: now.toISOString(),
    fromMock: true
  };
}

/**
 * Generate mock activity analytics
 */
function generateMockActivityAnalytics(params) {
  const now = new Date();
  const period = params.period || 'month';
  
  return {
    overview: {
      totalActivities: 1245,
      activeUsers: 45,
      avgActivitiesPerUser: 27.7,
      peakActivityHour: '14:00',
      busiestDay: 'Wednesday'
    },
    trends: {
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50
      })),
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 30) + (i >= 9 && i <= 17 ? 20 : 5)
      }))
    },
    topActivities: [
      { type: 'assessment_taken', count: 456, percentage: 36.5 },
      { type: 'login', count: 234, percentage: 18.8 },
      { type: 'search_performed', count: 189, percentage: 15.2 },
      { type: 'page_view', count: 156, percentage: 12.5 },
      { type: 'assessment_created', count: 89, percentage: 7.1 },
      { type: 'file_uploaded', count: 56, percentage: 4.5 },
      { type: 'settings_updated', count: 45, percentage: 3.6 },
      { type: 'other', count: 20, percentage: 1.6 }
    ],
    userEngagement: {
      high: { count: 12, percentage: 26.7 },
      medium: { count: 25, percentage: 55.6 },
      low: { count: 8, percentage: 17.8 }
    },
    heatmap: params.includeHeatmap ? {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      hours: Array.from({ length: 24 }, (_, i) => i),
      data: Array.from({ length: 7 }, () => 
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 50))
      )
    } : undefined,
    insights: [
      'Assessment activity peaks on Wednesdays',
      '45% of users are highly engaged',
      'Search activity increased by 12% this month',
      'New users show 20% higher engagement'
    ],
    fromMock: true
  };
}

/**
 * Get activity description based on type
 */
function getActivityDescription(type, userName) {
  const descriptions = {
    login: `${userName} logged into the system`,
    logout: `${userName} logged out of the system`,
    assessment_created: `${userName} created a new assessment`,
    assessment_updated: `${userName} updated an assessment`,
    assessment_deleted: `${userName} deleted an assessment`,
    assessment_published: `${userName} published an assessment`,
    assessment_taken: `${userName} took an assessment`,
    question_created: `${userName} created a question`,
    file_uploaded: `${userName} uploaded a file`,
    file_downloaded: `${userName} downloaded a file`,
    search_performed: `${userName} performed a search`,
    settings_updated: `${userName} updated settings`
  };
  
  return descriptions[type] || `${userName} performed ${type.replace('_', ' ')}`;
}

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

export default userActivityApi;
