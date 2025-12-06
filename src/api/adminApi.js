// src/api/adminApi.js
import api, { API_ENDPOINTS, TokenManager, trackError } from './index';

/**
 * Admin API Service
 * Handles all admin-related API calls for the Assessly Platform
 * Multi-tenant aware with role-based access control
 */

// ==================== DASHBOARD STATS ====================

/**
 * Fetch admin dashboard statistics
 * @param {Object} params - Filter parameters
 * @param {string} params.timeRange - Time range (1d, 7d, 30d, 90d, 1y)
 * @param {string} params.organizationId - Filter by organization ID
 * @param {string} params.assessorId - Filter by assessor ID
 * @param {Date} params.startDate - Custom start date
 * @param {Date} params.endDate - Custom end date
 * @returns {Promise} Dashboard statistics
 */
export const fetchAdminStats = async (params = {}) => {
  try {
    const response = await api.get('/admin/dashboard/stats', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching admin stats:', error);
    trackError(error, { endpoint: '/admin/dashboard/stats', params });
    throw error;
  }
};

/**
 * Fetch system-wide statistics (super admin only)
 * @returns {Promise} System statistics
 */
export const fetchSystemStats = async () => {
  try {
    const response = await api.get('/admin/system/stats');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching system stats:', error);
    trackError(error, { endpoint: '/admin/system/stats' });
    throw error;
  }
};

// ==================== ORGANIZATION MANAGEMENT ====================

/**
 * Fetch all organizations (super admin only)
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search query
 * @param {string} params.status - Filter by status
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order (asc/desc)
 * @returns {Promise} Organizations list
 */
export const fetchOrganizations = async (params = {}) => {
  try {
    const response = await api.get('/admin/organizations', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching organizations:', error);
    trackError(error, { endpoint: '/admin/organizations', params });
    throw error;
  }
};

/**
 * Fetch single organization details
 * @param {string} organizationId - Organization ID
 * @returns {Promise} Organization details
 */
export const fetchOrganizationById = async (organizationId) => {
  try {
    const response = await api.get(`/admin/organizations/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching organization:', error);
    trackError(error, { endpoint: `/admin/organizations/${organizationId}` });
    throw error;
  }
};

/**
 * Create a new organization
 * @param {Object} organizationData - Organization data
 * @returns {Promise} Created organization
 */
export const createOrganization = async (organizationData) => {
  try {
    const response = await api.post('/admin/organizations', organizationData);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error creating organization:', error);
    trackError(error, { 
      endpoint: '/admin/organizations', 
      method: 'POST',
      data: organizationData 
    });
    throw error;
  }
};

/**
 * Update organization
 * @param {string} organizationId - Organization ID
 * @param {Object} updates - Organization updates
 * @returns {Promise} Updated organization
 */
export const updateOrganization = async (organizationId, updates) => {
  try {
    const response = await api.put(`/admin/organizations/${organizationId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating organization:', error);
    trackError(error, { 
      endpoint: `/admin/organizations/${organizationId}`, 
      method: 'PUT',
      data: updates 
    });
    throw error;
  }
};

/**
 * Delete organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise} Delete result
 */
export const deleteOrganization = async (organizationId) => {
  try {
    const response = await api.delete(`/admin/organizations/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error deleting organization:', error);
    trackError(error, { 
      endpoint: `/admin/organizations/${organizationId}`, 
      method: 'DELETE' 
    });
    throw error;
  }
};

/**
 * Update organization status
 * @param {string} organizationId - Organization ID
 * @param {string} status - New status
 * @returns {Promise} Update result
 */
export const updateOrganizationStatus = async (organizationId, status) => {
  try {
    const response = await api.patch(`/admin/organizations/${organizationId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating organization status:', error);
    trackError(error, { 
      endpoint: `/admin/organizations/${organizationId}/status`, 
      method: 'PATCH',
      data: { status } 
    });
    throw error;
  }
};

// ==================== USER MANAGEMENT ====================

/**
 * Fetch all users with filtering
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Filter by organization
 * @param {string} params.role - Filter by role
 * @param {string} params.status - Filter by status
 * @param {string} params.search - Search query
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise} Users list
 */
export const fetchUsers = async (params = {}) => {
  try {
    const response = await api.get('/admin/users', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching users:', error);
    trackError(error, { endpoint: '/admin/users', params });
    throw error;
  }
};

/**
 * Fetch user details
 * @param {string} userId - User ID
 * @returns {Promise} User details
 */
export const fetchUserById = async (userId) => {
  try {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching user:', error);
    trackError(error, { endpoint: `/admin/users/${userId}` });
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise} Created user
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error creating user:', error);
    trackError(error, { 
      endpoint: '/admin/users', 
      method: 'POST',
      data: userData 
    });
    throw error;
  }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updates - User updates
 * @returns {Promise} Updated user
 */
export const updateUser = async (userId, updates) => {
  try {
    const response = await api.put(`/admin/users/${userId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating user:', error);
    trackError(error, { 
      endpoint: `/admin/users/${userId}`, 
      method: 'PUT',
      data: updates 
    });
    throw error;
  }
};

/**
 * Update user role
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise} Update result
 */
export const updateUserRole = async (userId, role, organizationId = null) => {
  try {
    const payload = { role };
    if (organizationId) {
      payload.organizationId = organizationId;
    }
    const response = await api.patch(`/admin/users/${userId}/role`, payload);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating user role:', error);
    trackError(error, { 
      endpoint: `/admin/users/${userId}/role`, 
      method: 'PATCH',
      data: { role, organizationId } 
    });
    throw error;
  }
};

/**
 * Update user status
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise} Update result
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const response = await api.patch(`/admin/users/${userId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating user status:', error);
    trackError(error, { 
      endpoint: `/admin/users/${userId}/status`, 
      method: 'PATCH',
      data: { status } 
    });
    throw error;
  }
};

/**
 * Bulk import users
 * @param {File} file - CSV/Excel file
 * @param {string} organizationId - Target organization
 * @returns {Promise} Import result
 */
export const bulkImportUsers = async (file, organizationId) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    const response = await api.post('/admin/users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error importing users:', error);
    trackError(error, { 
      endpoint: '/admin/users/import', 
      method: 'POST',
      fileName: file.name 
    });
    throw error;
  }
};

// ==================== ASSESSMENT MANAGEMENT ====================

/**
 * Fetch all assessments with filtering
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Filter by organization
 * @param {string} params.status - Filter by status
 * @param {string} params.type - Filter by type
 * @param {string} params.assessorId - Filter by assessor
 * @param {string} params.search - Search query
 * @returns {Promise} Assessments list
 */
export const fetchAssessments = async (params = {}) => {
  try {
    const response = await api.get('/admin/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching assessments:', error);
    trackError(error, { endpoint: '/admin/assessments', params });
    throw error;
  }
};

/**
 * Fetch assessment analytics
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Assessment analytics
 */
export const fetchAssessmentAnalytics = async (assessmentId) => {
  try {
    const response = await api.get(`/admin/assessments/${assessmentId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching assessment analytics:', error);
    trackError(error, { endpoint: `/admin/assessments/${assessmentId}/analytics` });
    throw error;
  }
};

/**
 * Fetch assessment responses
 * @param {string} assessmentId - Assessment ID
 * @param {Object} params - Query parameters
 * @returns {Promise} Assessment responses
 */
export const fetchAssessmentResponses = async (assessmentId, params = {}) => {
  try {
    const response = await api.get(`/admin/assessments/${assessmentId}/responses`, { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching assessment responses:', error);
    trackError(error, { 
      endpoint: `/admin/assessments/${assessmentId}/responses`, 
      params 
    });
    throw error;
  }
};

/**
 * Update assessment status
 * @param {string} assessmentId - Assessment ID
 * @param {string} status - New status
 * @returns {Promise} Update result
 */
export const updateAssessmentStatus = async (assessmentId, status) => {
  try {
    const response = await api.patch(`/admin/assessments/${assessmentId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating assessment status:', error);
    trackError(error, { 
      endpoint: `/admin/assessments/${assessmentId}/status`, 
      method: 'PATCH',
      data: { status } 
    });
    throw error;
  }
};

// ==================== ANALYTICS & REPORTS ====================

/**
 * Fetch assessment analytics over time
 * @param {Object} params - Query parameters
 * @param {string} params.timeRange - Time range filter
 * @param {string} params.organizationId - Organization filter
 * @returns {Promise} Analytics data
 */
export const fetchAssessmentAnalyticsOverTime = async (params = {}) => {
  try {
    const response = await api.get('/admin/analytics/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching assessment analytics:', error);
    trackError(error, { endpoint: '/admin/analytics/assessments', params });
    throw error;
  }
};

/**
 * Fetch user activity analytics
 * @param {Object} params - Query parameters
 * @returns {Promise} User activity data
 */
export const fetchUserActivityAnalytics = async (params = {}) => {
  try {
    const response = await api.get('/admin/analytics/user-activity', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching user activity analytics:', error);
    trackError(error, { endpoint: '/admin/analytics/user-activity', params });
    throw error;
  }
};

/**
 * Fetch revenue analytics
 * @param {Object} params - Query parameters
 * @returns {Promise} Revenue data
 */
export const fetchRevenueAnalytics = async (params = {}) => {
  try {
    const response = await api.get('/admin/analytics/revenue', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching revenue analytics:', error);
    trackError(error, { endpoint: '/admin/analytics/revenue', params });
    throw error;
  }
};

/**
 * Generate report
 * @param {Object} reportConfig - Report configuration
 * @returns {Promise} Report data
 */
export const generateReport = async (reportConfig) => {
  try {
    const response = await api.post('/admin/reports/generate', reportConfig);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error generating report:', error);
    trackError(error, { 
      endpoint: '/admin/reports/generate', 
      method: 'POST',
      data: reportConfig 
    });
    throw error;
  }
};

// ==================== SYSTEM HEALTH & MONITORING ====================

/**
 * Fetch system health status
 * @returns {Promise} System health data
 */
export const fetchSystemHealth = async () => {
  try {
    const response = await api.get('/admin/system/health');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching system health:', error);
    trackError(error, { endpoint: '/admin/system/health' });
    throw error;
  }
};

/**
 * Fetch server performance metrics
 * @returns {Promise} Performance data
 */
export const fetchPerformanceMetrics = async () => {
  try {
    const response = await api.get('/admin/system/performance');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching performance metrics:', error);
    trackError(error, { endpoint: '/admin/system/performance' });
    throw error;
  }
};

/**
 * Fetch database statistics
 * @returns {Promise} Database stats
 */
export const fetchDatabaseStats = async () => {
  try {
    const response = await api.get('/admin/system/database');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching database stats:', error);
    trackError(error, { endpoint: '/admin/system/database' });
    throw error;
  }
};

// ==================== ACTIVITY LOGS ====================

/**
 * Fetch recent activities
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of activities
 * @param {string} params.type - Filter by activity type
 * @returns {Promise} Recent activities
 */
export const fetchRecentActivities = async (params = {}) => {
  try {
    const response = await api.get('/admin/activities/recent', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching recent activities:', error);
    trackError(error, { endpoint: '/admin/activities/recent', params });
    throw error;
  }
};

/**
 * Fetch activity logs with filtering
 * @param {Object} params - Query parameters
 * @returns {Promise} Activity logs
 */
export const fetchActivityLogs = async (params = {}) => {
  try {
    const response = await api.get('/admin/activities', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching activity logs:', error);
    trackError(error, { endpoint: '/admin/activities', params });
    throw error;
  }
};

// ==================== BILLING & SUBSCRIPTIONS ====================

/**
 * Fetch all subscriptions
 * @param {Object} params - Query parameters
 * @returns {Promise} Subscriptions list
 */
export const fetchSubscriptions = async (params = {}) => {
  try {
    const response = await api.get('/admin/billing/subscriptions', { params });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching subscriptions:', error);
    trackError(error, { endpoint: '/admin/billing/subscriptions', params });
    throw error;
  }
};

/**
 * Fetch subscription analytics
 * @returns {Promise} Subscription analytics
 */
export const fetchSubscriptionAnalytics = async () => {
  try {
    const response = await api.get('/admin/billing/analytics');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching subscription analytics:', error);
    trackError(error, { endpoint: '/admin/billing/analytics' });
    throw error;
  }
};

/**
 * Update subscription plan
 * @param {string} organizationId - Organization ID
 * @param {string} plan - New plan
 * @returns {Promise} Update result
 */
export const updateSubscriptionPlan = async (organizationId, plan) => {
  try {
    const response = await api.put(`/admin/billing/organizations/${organizationId}/subscription`, { plan });
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating subscription:', error);
    trackError(error, { 
      endpoint: `/admin/billing/organizations/${organizationId}/subscription`, 
      method: 'PUT',
      data: { plan } 
    });
    throw error;
  }
};

// ==================== SETTINGS & CONFIGURATION ====================

/**
 * Fetch system settings
 * @returns {Promise} System settings
 */
export const fetchSystemSettings = async () => {
  try {
    const response = await api.get('/admin/settings');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching system settings:', error);
    trackError(error, { endpoint: '/admin/settings' });
    throw error;
  }
};

/**
 * Update system settings
 * @param {Object} settings - Settings updates
 * @returns {Promise} Update result
 */
export const updateSystemSettings = async (settings) => {
  try {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating system settings:', error);
    trackError(error, { 
      endpoint: '/admin/settings', 
      method: 'PUT',
      data: settings 
    });
    throw error;
  }
};

/**
 * Fetch email templates
 * @returns {Promise} Email templates
 */
export const fetchEmailTemplates = async () => {
  try {
    const response = await api.get('/admin/settings/email-templates');
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error fetching email templates:', error);
    trackError(error, { endpoint: '/admin/settings/email-templates' });
    throw error;
  }
};

/**
 * Update email template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Template updates
 * @returns {Promise} Update result
 */
export const updateEmailTemplate = async (templateId, updates) => {
  try {
    const response = await api.put(`/admin/settings/email-templates/${templateId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AdminAPI] Error updating email template:', error);
    trackError(error, { 
      endpoint: `/admin/settings/email-templates/${templateId}`, 
      method: 'PUT',
      data: updates 
    });
    throw error;
  }
};

// ==================== MOCK DATA FOR DEVELOPMENT ====================

/**
 * Get mock data for development
 * @param {string} endpoint - Mock endpoint name
 * @returns {Promise} Mock data
 */
export const getMockData = async (endpoint) => {
  // Only return mock data in development
  if (!import.meta.env.DEV) {
    console.warn('[AdminAPI] Mock data only available in development');
    return null;
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockData = {
    'dashboard/stats': {
      success: true,
      data: {
        totalAssessments: 1247,
        activeUsers: 345,
        totalOrganizations: 48,
        completedAssessments: 892,
        pendingAssessments: 67,
        totalRevenue: 125430,
        activeAssessments: 156,
        totalCandidates: 2345,
        averageScore: 78.5,
        organizations: [
          { id: 'org1', name: 'TechCorp Inc.', status: 'active', users: 45 },
          { id: 'org2', name: 'EduSystems', status: 'active', users: 23 },
          { id: 'org3', name: 'HealthOrg', status: 'pending', users: 12 },
        ],
      },
      fromMock: true,
    },
    'system/health': {
      success: true,
      data: {
        status: 'healthy',
        healthScore: 98,
        uptime: '99.9%',
        responseTime: 125,
        database: { status: 'connected', size: '2.4GB', connections: 24 },
        server: { cpu: 45, memory: 67, disk: 32 },
        services: [
          { name: 'API', status: 'up', responseTime: 120 },
          { name: 'Database', status: 'up', responseTime: 45 },
          { name: 'Cache', status: 'up', responseTime: 12 },
          { name: 'Email', status: 'up', responseTime: 200 },
        ],
      },
      fromMock: true,
    },
    'activities/recent': {
      success: true,
      data: [
        { id: 1, user: 'Sarah Johnson', action: 'created_assessment', target: 'Technical Skills Test', timestamp: '2024-01-15T10:30:00Z' },
        { id: 2, user: 'Michael Chen', action: 'completed_assessment', target: 'Leadership Evaluation', timestamp: '2024-01-15T09:15:00Z' },
        { id: 3, user: 'System', action: 'organization_created', target: 'NewCorp LLC', timestamp: '2024-01-14T16:45:00Z' },
        { id: 4, user: 'David Wilson', action: 'user_registered', target: 'john.doe@example.com', timestamp: '2024-01-14T14:20:00Z' },
        { id: 5, user: 'Admin', action: 'updated_settings', target: 'Email Templates', timestamp: '2024-01-14T11:10:00Z' },
      ],
      fromMock: true,
    },
  };

  return mockData[endpoint] || { success: true, data: {}, fromMock: true };
};

// ==================== ROLE-BASED ACCESS HELPERS ====================

/**
 * Check if current user has admin access
 * @returns {boolean} True if user is admin
 */
export const hasAdminAccess = () => {
  const userInfo = TokenManager.getUserInfo();
  return userInfo?.role === 'admin' || userInfo?.role === 'super_admin';
};

/**
 * Check if current user has super admin access
 * @returns {boolean} True if user is super admin
 */
export const hasSuperAdminAccess = () => {
  const userInfo = TokenManager.getUserInfo();
  return userInfo?.role === 'super_admin';
};

/**
 * Get admin role display name
 * @param {string} role - Role code
 * @returns {string} Display name
 */
export const getRoleDisplayName = (role) => {
  const roles = {
    'super_admin': 'Super Admin',
    'admin': 'Administrator',
    'org_admin': 'Organization Admin',
    'assessor': 'Assessor',
    'candidate': 'Candidate',
  };
  return roles[role] || role;
};

// Export all functions
export default {
  // Dashboard
  fetchAdminStats,
  fetchSystemStats,
  
  // Organizations
  fetchOrganizations,
  fetchOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  updateOrganizationStatus,
  
  // Users
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  bulkImportUsers,
  
  // Assessments
  fetchAssessments,
  fetchAssessmentAnalytics,
  fetchAssessmentResponses,
  updateAssessmentStatus,
  
  // Analytics
  fetchAssessmentAnalyticsOverTime,
  fetchUserActivityAnalytics,
  fetchRevenueAnalytics,
  generateReport,
  
  // System
  fetchSystemHealth,
  fetchPerformanceMetrics,
  fetchDatabaseStats,
  
  // Activities
  fetchRecentActivities,
  fetchActivityLogs,
  
  // Billing
  fetchSubscriptions,
  fetchSubscriptionAnalytics,
  updateSubscriptionPlan,
  
  // Settings
  fetchSystemSettings,
  updateSystemSettings,
  fetchEmailTemplates,
  updateEmailTemplate,
  
  // Development
  getMockData,
  
  // Role helpers
  hasAdminAccess,
  hasSuperAdminAccess,
  getRoleDisplayName,
};
