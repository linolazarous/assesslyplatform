// src/api/notificationApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * Notifications API Service for Assessly Platform
 * Handles real-time notifications, alerts, and user communication
 * Multi-tenant aware with WebSocket support and advanced filtering
 */

const notificationApi = {
  // ===================== NOTIFICATION MANAGEMENT =====================
  
  /**
   * Fetch user notifications with advanced filtering and pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.status - Filter by status (all, unread, read)
   * @param {string} params.type - Filter by notification type
   * @param {string} params.priority - Filter by priority
   * @param {string} params.startDate - Start date filter
   * @param {string} params.endDate - End date filter
   * @param {string} params.sortBy - Sort field (createdAt, priority)
   * @param {string} params.sortOrder - Sort order (asc, desc)
   * @param {boolean} params.includeArchived - Include archived notifications
   * @returns {Promise<Object>} Paginated notifications with metadata
   */
  fetchNotifications: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/notifications', {
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          status: params.status || 'all',
          ...params
        }
      });
      
      validateResponse(response.data, ['notifications', 'pagination', 'unreadCount']);
      
      // Emit fetched event
      apiEvents.emit('notifications:fetched', {
        count: response.data.notifications?.length || 0,
        unread: response.data.unreadCount || 0,
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Fetch notifications error:', error);
      apiEvents.emit('notifications:fetch_error', { error, params });
      throw error;
    }
  },
  
  /**
   * Get notification by ID with detailed information
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Notification details
   */
  getNotificationById: async (notificationId) => {
    try {
      const response = await api.get(`/api/v1/notifications/${notificationId}`);
      validateResponse(response.data, ['id', 'title', 'message', 'createdAt', 'status']);
      
      // Emit view event for analytics
      apiEvents.emit('notifications:viewed', { 
        id: notificationId,
        type: response.data.type,
        priority: response.data.priority
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get notification by ID error:', error);
      throw error;
    }
  },
  
  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {Object} options - Additional options
   * @param {boolean} options.recordView - Record detailed view analytics
   * @returns {Promise<Object>} Updated notification
   */
  markNotificationAsRead: async (notificationId, options = {}) => {
    try {
      const response = await api.patch(`/api/v1/notifications/${notificationId}/read`, {
        readAt: new Date().toISOString(),
        readBy: TokenManager.getUserInfo()?.id,
        ...options
      });
      
      validateResponse(response.data, ['id', 'status', 'readAt']);
      
      // Emit read event
      apiEvents.emit('notifications:marked_read', {
        id: notificationId,
        notification: response.data
      });
      
      // Update unread count in real-time
      apiEvents.emit('notifications:unread_updated', {
        count: -1 // Decrement count
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Mark notification as read error:', error);
      throw error;
    }
  },
  
  /**
   * Mark all notifications as read
   * @param {Object} options - Filter options
   * @param {string} options.type - Only mark specific type as read
   * @param {string} options.priority - Only mark specific priority as read
   * @returns {Promise<Object>} Bulk update result
   */
  markAllNotificationsAsRead: async (options = {}) => {
    try {
      const response = await api.post('/api/v1/notifications/read-all', options);
      validateResponse(response.data, ['markedCount', 'timestamp']);
      
      // Emit bulk read event
      apiEvents.emit('notifications:all_marked_read', {
        count: response.data.markedCount,
        filters: options
      });
      
      // Reset unread count
      apiEvents.emit('notifications:unread_updated', {
        count: 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Mark all notifications as read error:', error);
      throw error;
    }
  },
  
  /**
   * Archive notification (soft delete)
   * @param {string} notificationId - Notification ID
   * @param {Object} options - Archive options
   * @param {string} options.reason - Reason for archiving
   * @returns {Promise<Object>} Archived notification
   */
  archiveNotification: async (notificationId, options = {}) => {
    try {
      const response = await api.delete(`/api/v1/notifications/${notificationId}`, {
        data: {
          reason: options.reason || 'user_action',
          archivedBy: TokenManager.getUserInfo()?.id,
          ...options
        }
      });
      
      apiEvents.emit('notifications:archived', {
        id: notificationId,
        reason: options.reason
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Archive notification error:', error);
      throw error;
    }
  },
  
  /**
   * Restore archived notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Restored notification
   */
  restoreNotification: async (notificationId) => {
    try {
      const response = await api.post(`/api/v1/notifications/${notificationId}/restore`);
      
      apiEvents.emit('notifications:restored', {
        id: notificationId
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Restore notification error:', error);
      throw error;
    }
  },
  
  /**
   * Bulk archive notifications
   * @param {Array<string>} notificationIds - Array of notification IDs
   * @param {Object} options - Archive options
   * @returns {Promise<Object>} Bulk archive result
   */
  bulkArchiveNotifications: async (notificationIds, options = {}) => {
    try {
      const response = await api.post('/api/v1/notifications/bulk-archive', {
        notificationIds,
        reason: options.reason || 'user_bulk_action',
        ...options
      });
      
      apiEvents.emit('notifications:bulk_archived', {
        count: notificationIds.length,
        ids: notificationIds
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Bulk archive notifications error:', error);
      throw error;
    }
  },
  
  // ===================== NOTIFICATION PREFERENCES =====================
  
  /**
   * Get user notification preferences
   * @returns {Promise<Object>} Notification preferences
   */
  getNotificationPreferences: async () => {
    try {
      const response = await api.get('/api/v1/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Update notification preferences
   * @param {Object} preferences - Updated preferences
   * @param {Object} preferences.channels - Channel preferences (email, push, in_app)
   * @param {Object} preferences.categories - Category preferences
   * @param {Object} preferences.frequency - Notification frequency
   * @param {Array} preferences.mutedChannels - Muted notification channels
   * @param {Array} preferences.mutedTypes - Muted notification types
   * @returns {Promise<Object>} Updated preferences
   */
  updateNotificationPreferences: async (preferences) => {
    try {
      const response = await api.put('/api/v1/notifications/preferences', preferences);
      
      apiEvents.emit('notifications:preferences_updated', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Update preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Get notification templates (admin only)
   * @returns {Promise<Array>} Notification templates
   */
  getNotificationTemplates: async () => {
    try {
      if (!TokenManager.hasPermission('notifications:manage') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get('/api/v1/notifications/templates');
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get templates error:', error);
      throw error;
    }
  },
  
  /**
   * Create or update notification template (admin only)
   * @param {Object} template - Template data
   * @returns {Promise<Object>} Saved template
   */
  saveNotificationTemplate: async (template) => {
    try {
      if (!TokenManager.hasPermission('notifications:manage') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.post('/api/v1/notifications/templates', template);
      
      apiEvents.emit('notifications:template_saved', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Save template error:', error);
      throw error;
    }
  },
  
  // ===================== REAL-TIME & WEBHOOKS =====================
  
  /**
   * Subscribe to real-time notifications via WebSocket
   * @param {Object} options - WebSocket options
   * @param {Function} options.onMessage - Message handler
   * @param {Function} options.onOpen - Connection open handler
   * @param {Function} options.onClose - Connection close handler
   * @param {Function} options.onError - Error handler
   * @returns {WebSocket} WebSocket connection
   */
  subscribeToRealTimeNotifications: (options = {}) => {
    try {
      const token = TokenManager.getToken();
      if (!token) {
        throw new Error('Authentication required for WebSocket connection');
      }
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBaseUrl}/api/v1/notifications/ws?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[NotificationAPI] WebSocket connected');
        apiEvents.emit('notifications:websocket_connected');
        
        if (options.onOpen) options.onOpen();
        
        // Send initialization message
        ws.send(JSON.stringify({
          type: 'subscribe',
          userId: TokenManager.getUserInfo()?.id,
          organizationId: TokenManager.getTenantId(),
          timestamp: new Date().toISOString()
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Emit specific event based on notification type
          if (data.type === 'notification') {
            apiEvents.emit('notifications:new', data.notification);
            
            // Update unread count
            apiEvents.emit('notifications:unread_updated', {
              count: 1 // Increment count
            });
          }
          
          if (options.onMessage) options.onMessage(data);
        } catch (error) {
          console.error('[NotificationAPI] WebSocket message parse error:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('[NotificationAPI] WebSocket disconnected');
        apiEvents.emit('notifications:websocket_disconnected');
        
        if (options.onClose) options.onClose();
        
        // Attempt reconnection after delay
        setTimeout(() => {
          if (TokenManager.getToken()) {
            console.log('[NotificationAPI] Attempting WebSocket reconnection...');
            notificationApi.subscribeToRealTimeNotifications(options);
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('[NotificationAPI] WebSocket error:', error);
        apiEvents.emit('notifications:websocket_error', { error });
        
        if (options.onError) options.onError(error);
      };
      
      // Store WebSocket reference for cleanup
      notificationApi._wsConnection = ws;
      
      return ws;
    } catch (error) {
      console.error('[NotificationAPI] WebSocket subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Unsubscribe from real-time notifications
   */
  unsubscribeFromRealTimeNotifications: () => {
    if (notificationApi._wsConnection) {
      notificationApi._wsConnection.close();
      notificationApi._wsConnection = null;
      apiEvents.emit('notifications:websocket_unsubscribed');
    }
  },
  
  /**
   * Send test notification (admin only)
   * @param {Object} testNotification - Test notification data
   * @returns {Promise<Object>} Test result
   */
  sendTestNotification: async (testNotification) => {
    try {
      if (!TokenManager.hasPermission('notifications:manage') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.post('/api/v1/notifications/test', testNotification);
      
      apiEvents.emit('notifications:test_sent', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Send test notification error:', error);
      throw error;
    }
  },
  
  // ===================== ANALYTICS & INSIGHTS =====================
  
  /**
   * Get notification analytics
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Analytics data
   */
  getNotificationAnalytics: async (options = {}) => {
    try {
      const response = await api.get('/api/v1/notifications/analytics', { params: options });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get engagement metrics for notifications
   * @param {Object} options - Metrics options
   * @returns {Promise<Object>} Engagement metrics
   */
  getEngagementMetrics: async (options = {}) => {
    try {
      const response = await api.get('/api/v1/notifications/metrics/engagement', { 
        params: options 
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get engagement metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get delivery statistics
   * @param {Object} options - Statistics options
   * @returns {Promise<Object>} Delivery statistics
   */
  getDeliveryStatistics: async (options = {}) => {
    try {
      const response = await api.get('/api/v1/notifications/statistics/delivery', { 
        params: options 
      });
      
      return response.data;
    } catch (error) {
      console.error('[NotificationAPI] Get delivery statistics error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get notification type options
   * @returns {Array<Object>} Notification types with metadata
   */
  getNotificationTypes: () => {
    return [
      { value: 'system', label: 'System', icon: 'settings', color: 'blue', description: 'Platform updates and maintenance' },
      { value: 'assessment', label: 'Assessment', icon: 'clipboard-check', color: 'green', description: 'Assessment invitations and results' },
      { value: 'candidate', label: 'Candidate', icon: 'users', color: 'purple', description: 'Candidate activity and submissions' },
      { value: 'team', label: 'Team', icon: 'user-plus', color: 'orange', description: 'Team collaboration and mentions' },
      { value: 'billing', label: 'Billing', icon: 'credit-card', color: 'red', description: 'Payment and subscription updates' },
      { value: 'security', label: 'Security', icon: 'shield', color: 'yellow', description: 'Security alerts and warnings' },
      { value: 'announcement', label: 'Announcement', icon: 'megaphone', color: 'pink', description: 'Platform announcements and news' },
      { value: 'reminder', label: 'Reminder', icon: 'bell', color: 'indigo', description: 'Upcoming deadlines and reminders' }
    ];
  },
  
  /**
   * Get notification priority options
   * @returns {Array<Object>} Priority levels
   */
  getNotificationPriorities: () => {
    return [
      { value: 'low', label: 'Low', color: 'gray', icon: 'chevron-down' },
      { value: 'normal', label: 'Normal', color: 'blue', icon: 'minus' },
      { value: 'high', label: 'High', color: 'orange', icon: 'chevron-up' },
      { value: 'urgent', label: 'Urgent', color: 'red', icon: 'alert-triangle' }
    ];
  },
  
  /**
   * Get notification status options
   * @returns {Array<Object>} Status options
   */
  getNotificationStatuses: () => {
    return [
      { value: 'unread', label: 'Unread', color: 'blue', icon: 'circle' },
      { value: 'read', label: 'Read', color: 'green', icon: 'check-circle' },
      { value: 'archived', label: 'Archived', color: 'gray', icon: 'archive' }
    ];
  },
  
  /**
   * Format notification date
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatNotificationDate: (date) => {
    const now = new Date();
    const notificationDate = date instanceof Date ? date : new Date(date);
    const diffMs = now - notificationDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notificationDate.toLocaleDateString();
  },
  
  /**
   * Get notification icon based on type
   * @param {string} type - Notification type
   * @returns {string} Icon name
   */
  getNotificationIcon: (type) => {
    const typeIcons = {
      system: 'settings',
      assessment: 'clipboard-check',
      candidate: 'users',
      team: 'user-plus',
      billing: 'credit-card',
      security: 'shield',
      announcement: 'megaphone',
      reminder: 'bell'
    };
    
    return typeIcons[type] || 'bell';
  },
  
  /**
   * Get notification color based on priority
   * @param {string} priority - Notification priority
   * @returns {string} CSS color class
   */
  getNotificationColor: (priority) => {
    const priorityColors = {
      low: 'text-gray-600',
      normal: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    
    return priorityColors[priority] || 'text-blue-600';
  },
  
  /**
   * Subscribe to notification events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`notifications:${event}`, callback);
  },
  
  /**
   * Unsubscribe from notification events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`notifications:${event}`, callback);
  },
  
  /**
   * Initialize notification system
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check if user is authenticated
      const token = TokenManager.getToken();
      if (!token) {
        return {
          success: false,
          authenticated: false,
          message: 'Authentication required'
        };
      }
      
      // Fetch initial notifications
      const notifications = await notificationApi.fetchNotifications({ limit: 10 });
      
      // Start WebSocket connection for real-time updates
      const ws = notificationApi.subscribeToRealTimeNotifications({
        onMessage: (data) => {
          console.log('Real-time notification:', data);
        }
      });
      
      apiEvents.emit('notifications:initialized', {
        hasNotifications: notifications.notifications?.length > 0,
        unreadCount: notifications.unreadCount || 0,
        websocketConnected: !!ws
      });
      
      return {
        success: true,
        authenticated: true,
        notificationCount: notifications.notifications?.length || 0,
        unreadCount: notifications.unreadCount || 0,
        websocket: ws
      };
    } catch (error) {
      console.error('[NotificationAPI] Initialize error:', error);
      return {
        success: false,
        error: error.message,
        authenticated: !!TokenManager.getToken()
      };
    }
  },
  
  /**
   * Cleanup notification system
   */
  cleanup: () => {
    // Close WebSocket connection
    notificationApi.unsubscribeFromRealTimeNotifications();
    
    // Remove all event listeners
    const events = [
      'fetched', 'viewed', 'marked_read', 'all_marked_read',
      'archived', 'restored', 'new', 'preferences_updated',
      'websocket_connected', 'websocket_disconnected'
    ];
    
    events.forEach(event => {
      apiEvents.removeAllListeners(`notifications:${event}`);
    });
    
    apiEvents.emit('notifications:cleaned_up');
  }
};

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

export default notificationApi;
