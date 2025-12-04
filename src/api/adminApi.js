// src/api/adminApi.js
import api from './axiosConfig';

/**
 * Admin API Service
 * Handles all admin-related API calls for the Assessly Platform
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
    const response = await api.get('/api/v1/admin/dashboard/stats', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Fetch system-wide statistics (super admin only)
 * @returns {Promise} System statistics
 */
export const fetchSystemStats = async () => {
  try {
    const response = await api.get('/api/v1/admin/system/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching system stats:', error);
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
    const response = await api.get('/api/v1/admin/organizations', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching organizations:', error);
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
    const response = await api.get(`/api/v1/admin/organizations/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching organization:', error);
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
    const response = await api.post('/api/v1/admin/organizations', organizationData);
    return response.data;
  } catch (error) {
    console.error('Error creating organization:', error);
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
    const response = await api.put(`/api/v1/admin/organizations/${organizationId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating organization:', error);
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
    const response = await api.delete(`/api/v1/admin/organizations/${organizationId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting organization:', error);
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
    const response = await api.patch(`/api/v1/admin/organizations/${organizationId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating organization status:', error);
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
    const response = await api.get('/api/v1/admin/users', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const response = await api.get(`/api/v1/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
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
    const response = await api.post('/api/v1/admin/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
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
    const response = await api.put(`/api/v1/admin/users/${userId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
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
    const response = await api.patch(`/api/v1/admin/users/${userId}/role`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating user role:', error);
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
    const response = await api.patch(`/api/v1/admin/users/${userId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating user status:', error);
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

    const response = await api.post('/api/v1/admin/users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error importing users:', error);
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
    const response = await api.get('/api/v1/admin/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching assessments:', error);
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
    const response = await api.get(`/api/v1/admin/assessments/${assessmentId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching assessment analytics:', error);
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
    const response = await api.get(`/api/v1/admin/assessments/${assessmentId}/responses`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching assessment responses:', error);
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
    const response = await api.patch(`/api/v1/admin/assessments/${assessmentId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('Error updating assessment status:', error);
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
    const response = await api.get('/api/v1/admin/analytics/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching assessment analytics:', error);
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
    const response = await api.get('/api/v1/admin/analytics/user-activity', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching user activity analytics:', error);
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
    const response = await api.get('/api/v1/admin/analytics/revenue', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
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
    const response = await api.post('/api/v1/admin/reports/generate', reportConfig);
    return response.data;
  } catch (error) {
    console.error('Error generating report:', error);
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
    const response = await api.get('/api/v1/admin/system/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
};

/**
 * Fetch server performance metrics
 * @returns {Promise} Performance data
 */
export const fetchPerformanceMetrics = async () => {
  try {
    const response = await api.get('/api/v1/admin/system/performance');
    return response.data;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

/**
 * Fetch database statistics
 * @returns {Promise} Database stats
 */
export const fetchDatabaseStats = async () => {
  try {
    const response = await api.get('/api/v1/admin/system/database');
    return response.data;
  } catch (error) {
    console.error('Error fetching database stats:', error);
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
    const response = await api.get('/api/v1/admin/activities/recent', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
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
    const response = await api.get('/api/v1/admin/activities', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
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
    const response = await api.get('/api/v1/admin/billing/subscriptions', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

/**
 * Fetch subscription analytics
 * @returns {Promise} Subscription analytics
 */
export const fetchSubscriptionAnalytics = async () => {
  try {
    const response = await api.get('/api/v1/admin/billing/analytics');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
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
    const response = await api.put(`/api/v1/admin/billing/organizations/${organizationId}/subscription`, { plan });
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
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
    const response = await api.get('/api/v1/admin/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching system settings:', error);
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
    const response = await api.put('/api/v1/admin/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
};

/**
 * Fetch email templates
 * @returns {Promise} Email templates
 */
export const fetchEmailTemplates = async () => {
  try {
    const response = await api.get('/api/v1/admin/settings/email-templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching email templates:', error);
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
    const response = await api.put(`/api/v1/admin/settings/email-templates/${templateId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating email template:', error);
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockData = {
    'dashboard/stats': {
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
    'system/health': {
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
    'activities/recent': [
      { id: 1, user: 'Sarah Johnson', action: 'created_assessment', target: 'Technical Skills Test', timestamp: '2024-01-15T10:30:00Z' },
      { id: 2, user: 'Michael Chen', action: 'completed_assessment', target: 'Leadership Evaluation', timestamp: '2024-01-15T09:15:00Z' },
      { id: 3, user: 'System', action: 'organization_created', target: 'NewCorp LLC', timestamp: '2024-01-14T16:45:00Z' },
      { id: 4, user: 'David Wilson', action: 'user_registered', target: 'john.doe@example.com', timestamp: '2024-01-14T14:20:00Z' },
      { id: 5, user: 'Admin', action: 'updated_settings', target: 'Email Templates', timestamp: '2024-01-14T11:10:00Z' },
    ],
  };

  return mockData[endpoint] || {};
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
};
