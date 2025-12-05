// src/api/organizationApi.js
import api from './axiosConfig';

/**
 * Organization API Service
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 * Handles organization management, membership, and multi-tenant operations
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
      console.error(`[OrganizationAPI] ${method} ${endpoint} error:`, error);
      
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

// ===================== ADMIN DASHBOARD STATISTICS =====================
// Added the missing exports for OrganizationStats.jsx

/**
 * Fetch organization statistics for super admin dashboard
 */
export const fetchOrganizationStats = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/admin/organizations/stats')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization stats for development');
      return {
        success: true,
        data: {
          totalOrganizations: 156,
          activeOrganizations: 142,
          pendingOrganizations: 8,
          suspendedOrganizations: 6,
          totalAssessments: 12478,
          totalCandidates: 84756,
          totalRevenue: 42560,
          monthlyGrowth: 12.5,
          topOrganizations: [
            { id: 'org_001', name: 'TechCorp Inc', assessments: 1250, candidates: 8500, revenue: 5200 },
            { id: 'org_002', name: 'EduLearn Systems', assessments: 980, candidates: 7200, revenue: 4200 },
            { id: 'org_003', name: 'HRPro Solutions', assessments: 750, candidates: 5600, revenue: 3800 },
            { id: 'org_004', name: 'SkillAssess Co', assessments: 620, candidates: 4500, revenue: 3100 },
            { id: 'org_005', name: 'LearnFast Academy', assessments: 580, candidates: 4200, revenue: 2900 },
          ],
          recentActivity: [
            { organization: 'NewStartup Co', action: 'registered', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
            { organization: 'GrowthTech Ltd', action: 'upgraded_plan', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
            { organization: 'EduGlobal Inc', action: 'created_assessment', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
            { organization: 'SkillMaster Pro', action: 'added_users', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
            { organization: 'TestReady LLC', action: 'renewed_subscription', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
          ],
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization stats for development due to error:', error);
      return {
        success: true,
        data: {
          totalOrganizations: 156,
          activeOrganizations: 142,
          pendingOrganizations: 8,
          suspendedOrganizations: 6,
          totalAssessments: 12478,
          totalCandidates: 84756,
          totalRevenue: 42560,
          monthlyGrowth: 12.5,
          topOrganizations: [
            { id: 'org_001', name: 'TechCorp Inc', assessments: 1250, candidates: 8500, revenue: 5200 },
            { id: 'org_002', name: 'EduLearn Systems', assessments: 980, candidates: 7200, revenue: 4200 },
            { id: 'org_003', name: 'HRPro Solutions', assessments: 750, candidates: 5600, revenue: 3800 },
            { id: 'org_004', name: 'SkillAssess Co', assessments: 620, candidates: 4500, revenue: 3100 },
            { id: 'org_005', name: 'LearnFast Academy', assessments: 580, candidates: 4200, revenue: 2900 },
          ],
          recentActivity: [
            { organization: 'NewStartup Co', action: 'registered', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
            { organization: 'GrowthTech Ltd', action: 'upgraded_plan', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
            { organization: 'EduGlobal Inc', action: 'created_assessment', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
            { organization: 'SkillMaster Pro', action: 'added_users', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
            { organization: 'TestReady LLC', action: 'renewed_subscription', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
          ],
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch organization statistics',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Fetch organization growth data over time
 */
export const fetchOrganizationGrowth = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/admin/organizations/growth')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization growth data for development');
      const now = new Date();
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          organizations: Math.floor(Math.random() * 30) + 100,
          assessments: Math.floor(Math.random() * 1000) + 800,
          candidates: Math.floor(Math.random() * 7000) + 6000,
          revenue: Math.floor(Math.random() * 3500) + 3000,
        });
      }
      
      return {
        success: true,
        data: {
          monthlyData: months,
          quarterlyData: [
            { quarter: 'Q1 2024', organizations: 320, growth: 15 },
            { quarter: 'Q2 2024', organizations: 368, growth: 18 },
            { quarter: 'Q3 2024', organizations: 434, growth: 21 },
            { quarter: 'Q4 2024', organizations: 512, growth: 25 },
          ],
          yearlyGrowth: 28.5,
          activeGrowthRate: 12.5,
          churnRate: 2.3,
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization growth data for development due to error:', error);
      const now = new Date();
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          organizations: Math.floor(Math.random() * 30) + 100,
          assessments: Math.floor(Math.random() * 1000) + 800,
          candidates: Math.floor(Math.random() * 7000) + 6000,
          revenue: Math.floor(Math.random() * 3500) + 3000,
        });
      }
      
      return {
        success: true,
        data: {
          monthlyData: months,
          quarterlyData: [
            { quarter: 'Q1 2024', organizations: 320, growth: 15 },
            { quarter: 'Q2 2024', organizations: 368, growth: 18 },
            { quarter: 'Q3 2024', organizations: 434, growth: 21 },
            { quarter: 'Q4 2024', organizations: 512, growth: 25 },
          ],
          yearlyGrowth: 28.5,
          activeGrowthRate: 12.5,
          churnRate: 2.3,
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch organization growth data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== ORGANIZATION CRUD =====================

/**
 * Get organization by ID
 */
export const getOrganization = async (organizationId) => {
  try {
    const result = await createApiMethod('get', `/api/v1/organizations/${organizationId}`)();
    
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization data for development');
      return {
        success: true,
        data: {
          id: organizationId,
          name: 'Demo Organization',
          slug: 'demo-org',
          plan: 'professional',
          status: 'active',
          membersCount: 15,
          assessmentsCount: 45,
          createdAt: new Date().toISOString(),
          settings: {
            branding: {
              logo: null,
              colors: {
                primary: '#1976d2',
                secondary: '#dc004e',
              },
            },
            features: {
              assessments: true,
              analytics: true,
              customDomains: false,
              apiAccess: true,
            },
          },
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization data for development due to error:', error);
      return {
        success: true,
        data: {
          id: organizationId,
          name: 'Demo Organization',
          slug: 'demo-org',
          plan: 'professional',
          status: 'active',
          membersCount: 15,
          assessmentsCount: 45,
          createdAt: new Date().toISOString(),
          settings: {
            branding: {
              logo: null,
              colors: {
                primary: '#1976d2',
                secondary: '#dc004e',
              },
            },
            features: {
              assessments: true,
              analytics: true,
              customDomains: false,
              apiAccess: true,
            },
          },
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch organization',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Get current organization details
 */
export const getCurrentOrganization = createApiMethod('get', '/api/v1/organizations/current');

/**
 * Create new organization
 */
export const createOrganization = createApiMethod('post', '/api/v1/organizations');

/**
 * Update organization
 */
export const updateOrganization = createApiMethod('put', '/api/v1/organizations/:id');

/**
 * Delete organization
 */
export const deleteOrganization = createApiMethod('delete', '/api/v1/organizations/:id');

// ===================== ORGANIZATION MEMBERSHIP =====================

/**
 * Get user's organizations
 */
export const getUserOrganizations = createApiMethod('get', '/api/v1/organizations/my');

/**
 * Get organization members
 */
export const getOrganizationMembers = createApiMethod('get', '/api/v1/organizations/:id/members');

/**
 * Add member to organization
 */
export const addMember = createApiMethod('post', '/api/v1/organizations/:id/members');

/**
 * Update member role
 */
export const updateMemberRole = createApiMethod('put', '/api/v1/organizations/:id/members/:userId');

/**
 * Remove member from organization
 */
export const removeMember = createApiMethod('delete', '/api/v1/organizations/:id/members/:userId');

/**
 * Invite member to organization
 */
export const inviteMember = createApiMethod('post', '/api/v1/organizations/:id/invite');

// ===================== ORGANIZATION SETTINGS =====================

/**
 * Get organization settings
 */
export const getOrganizationSettings = createApiMethod('get', '/api/v1/organizations/:id/settings');

/**
 * Update organization settings
 */
export const updateOrganizationSettings = createApiMethod('put', '/api/v1/organizations/:id/settings');

// ===================== ORGANIZATION ANALYTICS =====================

/**
 * Get organization analytics
 */
export const getOrganizationAnalytics = createApiMethod('get', '/api/v1/organizations/:id/analytics');

/**
 * Get organization usage statistics
 */
export const getUsageStatistics = createApiMethod('get', '/api/v1/organizations/:id/usage');

// ===================== ORGANIZATION DOMAINS =====================

/**
 * Get organization domains
 */
export const getDomains = createApiMethod('get', '/api/v1/organizations/:id/domains');

/**
 * Add domain to organization
 */
export const addDomain = createApiMethod('post', '/api/v1/organizations/:id/domains');

/**
 * Verify domain
 */
export const verifyDomain = createApiMethod('post', '/api/v1/organizations/:id/domains/:domainId/verify');

// ===================== ORGANIZATION BILLING =====================

/**
 * Get billing information
 */
export const getBillingInfo = createApiMethod('get', '/api/v1/organizations/:id/billing');

/**
 * Update billing information
 */
export const updateBillingInfo = createApiMethod('put', '/api/v1/organizations/:id/billing');

// ===================== ORGANIZATION EXPORT =====================

/**
 * Export organization data
 */
export const exportOrganizationData = async (organizationId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/organizations/${organizationId}/export`, {
      responseType: 'blob',
      params,
    });
    
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const filename = `organization_${organizationId}_export_${new Date().toISOString().split('T')[0]}.zip`;
    
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
    console.error('[OrganizationAPI] Error exporting organization data:', error);
    return {
      success: false,
      message: error.message || 'Failed to export organization data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== ORGANIZATION HEALTH =====================

/**
 * Check organization health
 */
export const checkOrganizationHealth = createApiMethod('get', '/api/v1/organizations/:id/health');

// ===================== ORGANIZATION SUBSCRIPTION =====================

/**
 * Check subscription status
 */
export const checkSubscriptionStatus = createApiMethod('get', '/api/v1/organizations/:id/subscription');

/**
 * Get subscription details
 */
export const getSubscriptionDetails = createApiMethod('get', '/api/v1/organizations/:id/subscription/details');

// ===================== ORGANIZATION ACCESS =====================

/**
 * Verify user access to organization
 */
export const verifyOrganizationAccess = createApiMethod('get', '/api/v1/organizations/:id/access');

// ===================== DEFAULT EXPORT =====================

const organizationApi = {
  // Admin dashboard statistics (NEW - for OrganizationStats.jsx)
  fetchOrganizationStats,
  fetchOrganizationGrowth,
  
  // Organization CRUD
  getOrganization,
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  
  // Organization membership
  getUserOrganizations,
  getOrganizationMembers,
  addMember,
  updateMemberRole,
  removeMember,
  inviteMember,
  
  // Organization settings
  getOrganizationSettings,
  updateOrganizationSettings,
  
  // Organization analytics
  getOrganizationAnalytics,
  getUsageStatistics,
  
  // Organization domains
  getDomains,
  addDomain,
  verifyDomain,
  
  // Organization billing
  getBillingInfo,
  updateBillingInfo,
  
  // Organization export
  exportOrganizationData,
  
  // Organization health
  checkOrganizationHealth,
  
  // Organization subscription
  checkSubscriptionStatus,
  getSubscriptionDetails,
  
  // Organization access
  verifyOrganizationAccess,
};

export default organizationApi;
