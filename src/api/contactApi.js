// src/api/contactApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents } from './index';
import { TokenManager } from './index';

/**
 * Contact API Service for Assessly Platform
 * Handles contact form submissions, message management, and analytics
 * Multi-tenant aware with proper admin/role-based permissions
 */

const contactApi = {
  // ===================== PUBLIC ENDPOINTS =====================
  
  /**
   * Submit a contact form (Public - no authentication required)
   * @param {Object} formData - Contact form data
   * @param {string} formData.name - Full name (required)
   * @param {string} formData.email - Email address (required)
   * @param {string} formData.subject - Message subject (required)
   * @param {string} formData.message - Message content (required)
   * @param {string} [formData.organization] - Organization name
   * @param {string} [formData.phone] - Phone number
   * @param {string} [formData.category] - Inquiry category
   * @param {string} [formData.priority] - Priority level
   * @returns {Promise<Object>} Submission response with ticket ID
   */
  submitContactForm: async (formData) => {
    try {
      // Enhanced validation
      const validation = validateContactForm(formData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const response = await api.post('/api/v1/contact', {
        ...formData,
        userAgent: navigator.userAgent,
        ipAddress: 'client', // Will be set by server middleware
        timestamp: new Date().toISOString(),
        source: 'web_contact_form'
      }, {
        headers: {
          'X-Public-Endpoint': 'true',
          'X-Request-Source': 'contact_form'
        }
      });
      
      validateResponse(response.data, ['success', 'message', 'data']);
      
      // Emit event for tracking
      apiEvents.emit('contact:form_submitted', {
        id: response.data.data?.ticketId || response.data.data?.id,
        email: formData.email,
        subject: formData.subject
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Submit contact form error:', error);
      apiEvents.emit('contact:submission_error', { formData, error });
      throw error;
    }
  },
  
  // ===================== ADMIN ENDPOINTS =====================
  
  /**
   * Fetch all contact messages with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.search] - Search query
   * @param {string} [options.category] - Filter by category
   * @param {string} [options.priority] - Filter by priority
   * @param {string} [options.startDate] - Start date filter
   * @param {string} [options.endDate] - End date filter
   * @param {string} [options.sortBy] - Sort field
   * @param {string} [options.sortOrder] - Sort order (asc/desc)
   * @returns {Promise<Object>} Paginated contact messages
   */
  fetchMessages: async (options = {}) => {
    try {
      // Check admin permissions
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const params = {
        page: options.page || 1,
        limit: options.limit || 20,
        ...options
      };
      
      const response = await api.get('/api/v1/contact', { params });
      validateResponse(response.data, ['messages', 'pagination']);
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Fetch messages error:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific contact message by ID
   * @param {string} id - Message ID
   * @returns {Promise<Object>} Contact message details
   */
  getMessageById: async (id) => {
    try {
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get(`/api/v1/contact/${id}`);
      validateResponse(response.data, ['id', 'email', 'subject', 'message', 'createdAt']);
      
      // Emit view event for analytics
      apiEvents.emit('contact:message_viewed', { 
        id, 
        viewedBy: TokenManager.getUserInfo()?.id 
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get message by ID error:', error);
      throw error;
    }
  },
  
  /**
   * Update contact message status and details
   * @param {string} id - Message ID
   * @param {Object} updates - Update data
   * @param {string} updates.status - New status
   * @param {string} updates.notes - Admin notes
   * @param {string} updates.assignedTo - Assigned admin user ID
   * @param {string} updates.response - Admin response
   * @param {boolean} updates.notifyUser - Send email notification
   * @returns {Promise<Object>} Updated message
   */
  updateMessage: async (id, updates) => {
    try {
      if (!TokenManager.hasPermission('contact:update') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.patch(`/api/v1/contact/${id}`, {
        ...updates,
        updatedBy: TokenManager.getUserInfo()?.id,
        updatedAt: new Date().toISOString()
      });
      
      validateResponse(response.data, ['id', 'status', 'updatedAt']);
      
      // Emit update events
      apiEvents.emit('contact:message_updated', { 
        id, 
        updates,
        updatedBy: TokenManager.getUserInfo()?.id 
      });
      
      if (updates.status === 'resolved' || updates.status === 'closed') {
        apiEvents.emit('contact:message_resolved', { id, status: updates.status });
      }
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Update message error:', error);
      throw error;
    }
  },
  
  /**
   * Delete a contact message
   * @param {string} id - Message ID
   * @param {Object} options - Delete options
   * @param {string} options.reason - Reason for deletion
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteMessage: async (id, options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:delete') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.delete(`/api/v1/contact/${id}`, {
        data: {
          reason: options.reason || 'Admin request',
          deletedBy: TokenManager.getUserInfo()?.id
        }
      });
      
      apiEvents.emit('contact:message_deleted', { 
        id, 
        deletedBy: TokenManager.getUserInfo()?.id,
        reason: options.reason 
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Delete message error:', error);
      throw error;
    }
  },
  
  /**
   * Bulk update contact messages
   * @param {Array<string>} ids - Array of message IDs
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Bulk update result
   */
  bulkUpdateMessages: async (ids, updates) => {
    try {
      if (!TokenManager.hasPermission('contact:update') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.post('/api/v1/contact/bulk-update', {
        ids,
        updates: {
          ...updates,
          updatedBy: TokenManager.getUserInfo()?.id
        }
      });
      
      apiEvents.emit('contact:bulk_updated', { 
        count: ids.length, 
        updates,
        updatedBy: TokenManager.getUserInfo()?.id 
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Bulk update messages error:', error);
      throw error;
    }
  },
  
  /**
   * Bulk delete contact messages
   * @param {Array<string>} ids - Array of message IDs
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Bulk delete result
   */
  bulkDeleteMessages: async (ids, options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:delete') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.post('/api/v1/contact/bulk-delete', {
        ids,
        reason: options.reason || 'Admin bulk delete',
        deletedBy: TokenManager.getUserInfo()?.id
      });
      
      apiEvents.emit('contact:bulk_deleted', { 
        count: ids.length, 
        deletedBy: TokenManager.getUserInfo()?.id 
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Bulk delete messages error:', error);
      throw error;
    }
  },
  
  // ===================== ANALYTICS & REPORTS =====================
  
  /**
   * Get contact analytics with advanced filtering
   * @param {Object} options - Analytics options
   * @param {string} options.startDate - Start date (ISO)
   * @param {string} options.endDate - End date (ISO)
   * @param {string} options.period - Time period (day, week, month, year)
   * @param {Array<string>} options.categories - Filter by categories
   * @param {Array<string>} options.statuses - Filter by statuses
   * @returns {Promise<Object>} Analytics data
   */
  getContactAnalytics: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get('/api/v1/contact/analytics', { params: options });
      validateResponse(response.data, [
        'totalMessages', 
        'statusDistribution', 
        'categoryDistribution',
        'responseTimeMetrics'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get contact analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Export contact messages in various formats
   * @param {Object} options - Export options
   * @param {string} options.format - Export format (csv, json, excel, pdf)
   * @param {string} options.startDate - Start date filter
   * @param {string} options.endDate - End date filter
   * @param {Array<string>} options.fields - Fields to include
   * @param {Array<string>} options.statuses - Status filter
   * @param {Array<string>} options.categories - Category filter
   * @returns {Promise<Blob>} Exported file data
   */
  exportContactMessages: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:export') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Export access required');
      }
      
      const response = await api.get('/api/v1/contact/export', {
        params: {
          format: options.format || 'csv',
          ...options
        },
        responseType: 'blob'
      });
      
      // Determine content type
      const contentType = getContentType(options.format || 'csv');
      
      return {
        data: response.data,
        contentType,
        filename: generateExportFilename(options.format || 'csv')
      };
    } catch (error) {
      console.error('[ContactAPI] Export contact messages error:', error);
      throw error;
    }
  },
  
  /**
   * Get contact response time metrics
   * @param {Object} options - Time period options
   * @returns {Promise<Object>} Response time statistics
   */
  getResponseTimeMetrics: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get('/api/v1/contact/metrics/response-time', { 
        params: options 
      });
      
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get response time metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get contact trends over time
   * @param {Object} options - Trend analysis options
   * @returns {Promise<Object>} Trend data
   */
  getContactTrends: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get('/api/v1/contact/trends', { params: options });
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get contact trends error:', error);
      throw error;
    }
  },
  
  // ===================== ADMIN CONFIGURATION =====================
  
  /**
   * Get contact form configuration
   * @returns {Promise<Object>} Contact form settings
   */
  getContactConfig: async () => {
    try {
      if (!TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Super admin access required');
      }
      
      const response = await api.get('/api/v1/contact/config');
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get contact config error:', error);
      throw error;
    }
  },
  
  /**
   * Update contact form configuration
   * @param {Object} config - Configuration updates
   * @returns {Promise<Object>} Updated configuration
   */
  updateContactConfig: async (config) => {
    try {
      if (!TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Super admin access required');
      }
      
      const response = await api.put('/api/v1/contact/config', config);
      apiEvents.emit('contact:config_updated', response.data);
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Update contact config error:', error);
      throw error;
    }
  },
  
  /**
   * Get automated response templates
   * @returns {Promise<Array>} List of response templates
   */
  getResponseTemplates: async () => {
    try {
      if (!TokenManager.hasPermission('contact:read') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.get('/api/v1/contact/templates');
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Get response templates error:', error);
      throw error;
    }
  },
  
  /**
   * Create or update response template
   * @param {Object} template - Template data
   * @returns {Promise<Object>} Saved template
   */
  saveResponseTemplate: async (template) => {
    try {
      if (!TokenManager.hasPermission('contact:update') && !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const response = await api.post('/api/v1/contact/templates', template);
      apiEvents.emit('contact:template_saved', response.data);
      return response.data;
    } catch (error) {
      console.error('[ContactAPI] Save response template error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get available contact status options
   * @returns {Array<Object>} Status options with metadata
   */
  getContactStatusOptions: () => {
    return [
      { 
        value: 'new', 
        label: 'New', 
        color: 'blue', 
        icon: 'bell',
        description: 'Recently submitted and not yet reviewed'
      },
      { 
        value: 'pending', 
        label: 'Pending', 
        color: 'orange', 
        icon: 'clock',
        description: 'Under review or awaiting action'
      },
      { 
        value: 'in_progress', 
        label: 'In Progress', 
        color: 'purple', 
        icon: 'progress',
        description: 'Currently being addressed'
      },
      { 
        value: 'awaiting_response', 
        label: 'Awaiting Response', 
        color: 'yellow', 
        icon: 'message',
        description: 'Response sent, waiting for user reply'
      },
      { 
        value: 'resolved', 
        label: 'Resolved', 
        color: 'green', 
        icon: 'check-circle',
        description: 'Successfully resolved and closed'
      },
      { 
        value: 'closed', 
        label: 'Closed', 
        color: 'gray', 
        icon: 'archive',
        description: 'Closed without resolution'
      },
      { 
        value: 'spam', 
        label: 'Spam', 
        color: 'red', 
        icon: 'shield-alert',
        description: 'Marked as spam or irrelevant'
      }
    ];
  },
  
  /**
   * Get contact category options
   * @returns {Array<Object>} Category options
   */
  getContactCategoryOptions: () => {
    return [
      { value: 'general', label: 'General Inquiry', icon: 'help-circle' },
      { value: 'technical', label: 'Technical Support', icon: 'settings' },
      { value: 'billing', label: 'Billing & Payments', icon: 'credit-card' },
      { value: 'feature_request', label: 'Feature Request', icon: 'lightbulb' },
      { value: 'bug_report', label: 'Bug Report', icon: 'bug' },
      { value: 'account', label: 'Account Issues', icon: 'user' },
      { value: 'partnership', label: 'Partnership', icon: 'handshake' },
      { value: 'feedback', label: 'Feedback', icon: 'message-square' },
      { value: 'other', label: 'Other', icon: 'more-horizontal' }
    ];
  },
  
  /**
   * Get priority level options
   * @returns {Array<Object>} Priority options
   */
  getPriorityOptions: () => {
    return [
      { value: 'low', label: 'Low', color: 'gray', icon: 'chevron-down' },
      { value: 'normal', label: 'Normal', color: 'blue', icon: 'minus' },
      { value: 'high', label: 'High', color: 'orange', icon: 'chevron-up' },
      { value: 'urgent', label: 'Urgent', color: 'red', icon: 'alert-triangle' },
      { value: 'critical', label: 'Critical', color: 'red', icon: 'alert-octagon' }
    ];
  },
  
  /**
   * Validate contact form data client-side
   * @param {Object} formData - Contact form data
   * @returns {Object} Validation result
   */
  validateContactForm: (formData) => {
    const errors = [];
    const warnings = [];
    
    // Required field validation
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (formData.name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Valid email address is required');
    }
    
    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push('Subject must be at least 5 characters long');
    } else if (formData.subject.trim().length > 200) {
      errors.push('Subject must be less than 200 characters');
    }
    
    if (!formData.message || formData.message.trim().length < 10) {
      errors.push('Message must be at least 10 characters long');
    } else if (formData.message.trim().length > 5000) {
      errors.push('Message must be less than 5000 characters');
    }
    
    // Optional field validation
    if (formData.phone && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(formData.phone)) {
      warnings.push('Phone number format may be invalid');
    }
    
    // Check for spam-like content
    if (formData.message && isPotentialSpam(formData.message)) {
      warnings.push('Message contains content that may be flagged as spam');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  },
  
  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @param {string} format - Format style (relative, short, long)
   * @returns {string} Formatted date
   */
  formatDate: (date, format = 'relative') => {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (format === 'relative') {
      const now = new Date();
      const diffMs = now - dateObj;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return dateObj.toLocaleDateString();
    }
    
    if (format === 'short') {
      return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return dateObj.toLocaleString();
  },
  
  /**
   * Sanitize message content for display
   * @param {string} content - Raw message content
   * @returns {string} Sanitized content
   */
  sanitizeMessage: (content) => {
    if (!content) return '';
    
    // Basic HTML escaping
    let sanitized = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Preserve line breaks
    sanitized = sanitized.replace(/\n/g, '<br>');
    
    return sanitized;
  },
  
  /**
   * Subscribe to contact events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`contact:${event}`, callback);
  },
  
  /**
   * Unsubscribe from contact events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`contact:${event}`, callback);
  },
  
  /**
   * Initialize contact module
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check if user has contact access permissions
      const user = TokenManager.getUserInfo();
      
      if (user && (TokenManager.hasPermission('contact:read') || TokenManager.hasPermission('admin'))) {
        // Subscribe to real-time updates if available
        apiEvents.emit('contact:initialized', { 
          user: user.id,
          permissions: TokenManager.getPermissions(),
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          hasAccess: true,
          permissions: TokenManager.getPermissions().filter(p => p.startsWith('contact:'))
        };
      }
      
      return {
        success: true,
        hasAccess: false,
        permissions: []
      };
    } catch (error) {
      console.error('[ContactAPI] Initialize error:', error);
      return {
        success: false,
        error: error.message,
        hasAccess: false
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Determine content type based on export format
 * @param {string} format - Export format
 * @returns {string} Content type
 */
function getContentType(format) {
  const types = {
    csv: 'text/csv',
    json: 'application/json',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf'
  };
  
  return types[format] || 'application/octet-stream';
}

/**
 * Generate filename for export
 * @param {string} format - Export format
 * @returns {string} Filename
 */
function generateExportFilename(format) {
  const timestamp = new Date().toISOString().split('T')[0];
  const extensions = {
    csv: 'csv',
    json: 'json',
    excel: 'xlsx',
    pdf: 'pdf'
  };
  
  return `assessly_contacts_${timestamp}.${extensions[format] || 'csv'}`;
}

/**
 * Simple spam detection (can be enhanced)
 * @param {string} content - Message content
 * @returns {boolean} True if potential spam
 */
function isPotentialSpam(content) {
  const spamIndicators = [
    /http[s]?:\/\/(?!assessly)/gi,
    /(buy|cheap|discount|price|offer|click here)/gi,
    /(viagra|cialis|pharmacy)/gi,
    /(bitcoin|crypto|investment)/gi,
    /(win|prize|lottery|free money)/gi,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b.*\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi // Multiple emails
  ];
  
  return spamIndicators.some(pattern => pattern.test(content));
}

export default contactApi;
