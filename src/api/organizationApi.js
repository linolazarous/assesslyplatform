// src/api/organizationApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';
import { OrganizationService } from './index'; // Import the service if it exists

/**
 * Organization API Service for Assessly Platform
 * Comprehensive organization management with multi-tenant support
 * Handles CRUD, membership, settings, domains, and analytics
 */

// ===================== ADMIN DASHBOARD STATISTICS =====================

/**
 * Fetch comprehensive organization statistics for admin dashboard
 * @param {Object} params - Query parameters
 * @param {string} params.period - Time period (day, week, month, quarter, year)
 * @param {string} params.startDate - Start date filter
 * @param {string} params.endDate - End date filter
 * @param {Array<string>} params.statuses - Filter by organization statuses
 * @param {Array<string>} params.plans - Filter by subscription plans
 * @returns {Promise<Object>} Comprehensive statistics
 */
export const fetchOrganizationStats = async (params = {}) => {
  try {
    // Check admin permissions
    if (!TokenManager.hasPermission('admin:organizations') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    const response = await api.get('/api/v1/admin/organizations/stats', {
      params: {
        period: params.period || 'month',
        includeDetails: true,
        includeTrends: true,
        ...params
      }
    });
    
    validateResponse(response.data, [
      'totalOrganizations',
      'activeOrganizations',
      'growthRate',
      'revenue',
      'metrics'
    ]);
    
    // Emit stats fetched event
    apiEvents.emit('organizations:stats_fetched', {
      total: response.data.totalOrganizations,
      active: response.data.activeOrganizations,
      ...response.data
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Fetch organization stats error:', error);
    
    // Development mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization stats for development');
      return generateMockOrganizationStats(params);
    }
    
    apiEvents.emit('organizations:stats_error', { error, params });
    throw error;
  }
};

/**
 * Fetch organization growth trends over time
 * @param {Object} params - Query parameters
 * @param {string} params.granularity - Data granularity (day, week, month)
 * @param {string} params.startDate - Start date filter
 * @param {string} params.endDate - End date filter
 * @param {Array<string>} params.plans - Filter by subscription plans
 * @returns {Promise<Object>} Growth trend data
 */
export const fetchOrganizationGrowth = async (params = {}) => {
  try {
    if (!TokenManager.hasPermission('admin:organizations') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    const response = await api.get('/api/v1/admin/organizations/growth', {
      params: {
        granularity: params.granularity || 'month',
        includePredictions: true,
        ...params
      }
    });
    
    validateResponse(response.data, ['timeline', 'growthRate', 'predictions']);
    
    apiEvents.emit('organizations:growth_fetched', {
      timeline: response.data.timeline?.length || 0,
      growthRate: response.data.growthRate
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Fetch organization growth error:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization growth data for development');
      return generateMockOrganizationGrowth(params);
    }
    
    throw error;
  }
};

/**
 * Get organization by ID with detailed information
 * @param {string} organizationId - Organization ID
 * @param {Object} options - Additional options
 * @param {boolean} options.includeMembers - Include member list
 * @param {boolean} options.includeStats - Include statistics
 * @param {boolean} options.includeSettings - Include settings
 * @returns {Promise<Object>} Organization details
 */
export const getOrganization = async (organizationId, options = {}) => {
  try {
    // Check access permissions
    const userOrgs = TokenManager.getUserInfo()?.organizations || [];
    const userRole = TokenManager.getRole();
    
    // Super admin can access any organization
    if (userRole !== 'super_admin' && !userOrgs.includes(organizationId)) {
      throw new Error('Unauthorized: Access to this organization is restricted');
    }
    
    const response = await api.get(`/api/v1/organizations/${organizationId}`, {
      params: {
        includeMembers: options.includeMembers || false,
        includeStats: options.includeStats || false,
        includeSettings: options.includeSettings || false,
        includeBilling: options.includeBilling || false
      }
    });
    
    validateResponse(response.data, ['id', 'name', 'status', 'createdAt']);
    
    // Update current organization context if this is the user's org
    const currentOrg = TokenManager.getOrganization();
    if (currentOrg && currentOrg.id === organizationId) {
      TokenManager.setOrganization(response.data);
    }
    
    apiEvents.emit('organizations:fetched', {
      id: organizationId,
      name: response.data.name,
      ...response.data
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Get organization error:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OrganizationAPI] Using mock organization data for development');
      return generateMockOrganization(organizationId, options);
    }
    
    throw error;
  }
};

/**
 * Get current organization context
 * @returns {Promise<Object>} Current organization
 */
export const getCurrentOrganization = async () => {
  try {
    const orgId = TokenManager.getTenantId();
    if (!orgId) {
      throw new Error('No organization context set');
    }
    
    return await getOrganization(orgId, {
      includeMembers: true,
      includeSettings: true,
      includeStats: true
    });
  } catch (error) {
    console.error('[OrganizationAPI] Get current organization error:', error);
    throw error;
  }
};

/**
 * Create new organization
 * @param {Object} organizationData - Organization creation data
 * @param {string} organizationData.name - Organization name
 * @param {string} organizationData.email - Admin email
 * @param {string} organizationData.plan - Subscription plan
 * @param {Object} organizationData.settings - Initial settings
 * @param {Object} organizationData.billing - Billing information
 * @returns {Promise<Object>} Created organization
 */
export const createOrganization = async (organizationData) => {
  try {
    validateResponse(organizationData, ['name', 'email']);
    
    const response = await api.post('/api/v1/organizations', {
      ...organizationData,
      createdBy: TokenManager.getUserInfo()?.id,
      timestamp: new Date().toISOString()
    });
    
    validateResponse(response.data, ['id', 'name', 'adminToken']);
    
    // If user is automatically added as admin, update local context
    if (response.data.userAdded) {
      TokenManager.setOrganization(response.data.organization);
      TokenManager.setTenantContext(response.data.organization.id);
    }
    
    apiEvents.emit('organizations:created', {
      id: response.data.id,
      name: response.data.name,
      plan: response.data.plan
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Create organization error:', error);
    apiEvents.emit('organizations:create_error', { data: organizationData, error });
    throw error;
  }
};

/**
 * Update organization details
 * @param {string} organizationId - Organization ID
 * @param {Object} updates - Update data
 * @param {string} updates.name - Organization name
 * @param {string} updates.description - Organization description
 * @param {string} updates.website - Organization website
 * @param {Object} updates.branding - Branding updates
 * @param {Object} updates.settings - Settings updates
 * @returns {Promise<Object>} Updated organization
 */
export const updateOrganization = async (organizationId, updates) => {
  try {
    // Check update permissions
    if (!TokenManager.hasPermission('organization:update') && 
        !TokenManager.hasPermission('admin')) {
      throw new Error('Unauthorized: Update permission required');
    }
    
    const response = await api.put(`/api/v1/organizations/${organizationId}`, {
      ...updates,
      updatedBy: TokenManager.getUserInfo()?.id,
      updatedAt: new Date().toISOString()
    });
    
    validateResponse(response.data, ['id', 'name', 'updatedAt']);
    
    // Update local context if this is the current organization
    const currentOrg = TokenManager.getOrganization();
    if (currentOrg && currentOrg.id === organizationId) {
      TokenManager.setOrganization(response.data);
    }
    
    apiEvents.emit('organizations:updated', {
      id: organizationId,
      updates,
      updatedBy: TokenManager.getUserInfo()?.id
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Update organization error:', error);
    throw error;
  }
};

/**
 * Get organization members with detailed information
 * @param {string} organizationId - Organization ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Organization members
 */
export const getOrganizationMembers = async (organizationId, params = {}) => {
  try {
    if (!TokenManager.hasPermission('organization:members:read') && 
        !TokenManager.hasPermission('admin')) {
      throw new Error('Unauthorized: Member read permission required');
    }
    
    const response = await api.get(`/api/v1/organizations/${organizationId}/members`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 50,
        includeActivity: true,
        includeRoles: true,
        ...params
      }
    });
    
    validateResponse(response.data, ['members', 'pagination', 'total']);
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Get organization members error:', error);
    throw error;
  }
};

/**
 * Invite member via email with customizable invitation
 * @param {string} organizationId - Organization ID
 * @param {Object} invitation - Invitation data
 * @returns {Promise<Object>} Invitation result
 */
export const inviteMember = async (organizationId, invitation) => {
  try {
    if (!TokenManager.hasPermission('organization:members:invite') && 
        !TokenManager.hasPermission('admin')) {
      throw new Error('Unauthorized: Invitation permission required');
    }
    
    validateResponse(invitation, ['email']);
    
    const response = await api.post(`/api/v1/organizations/${organizationId}/invite`, {
      ...invitation,
      invitedBy: TokenManager.getUserInfo()?.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      invitationType: 'email'
    });
    
    apiEvents.emit('organizations:member_invited', {
      organizationId,
      email: invitation.email,
      role: invitation.role,
      invitedBy: TokenManager.getUserInfo()?.id
    });
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Invite member error:', error);
    throw error;
  }
};

/**
 * Get organization analytics
 * @param {string} organizationId - Organization ID
 * @param {Object} params - Analytics parameters
 * @returns {Promise<Object>} Analytics data
 */
export const getOrganizationAnalytics = async (organizationId, params = {}) => {
  try {
    if (!TokenManager.hasPermission('organization:analytics:read') && 
        !TokenManager.hasPermission('admin')) {
      throw new Error('Unauthorized: Analytics read permission required');
    }
    
    const response = await api.get(`/api/v1/organizations/${organizationId}/analytics`, {
      params: {
        period: params.period || 'month',
        includeComparisons: true,
        includeTrends: true,
        ...params
      }
    });
    
    validateResponse(response.data, ['metrics', 'trends', 'comparisons']);
    
    return response.data;
  } catch (error) {
    console.error('[OrganizationAPI] Get organization analytics error:', error);
    throw error;
  }
};

/**
 * Switch current organization context
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Switch result
 */
export const switchOrganization = async (organizationId) => {
  try {
    // Verify user has access to this organization
    const org = await getOrganization(organizationId);
    
    // Update context
    TokenManager.setOrganization(org);
    TokenManager.setTenantContext(organizationId);
    
    // Update API headers
    api.defaults.headers['X-Tenant-ID'] = organizationId;
    api.defaults.headers['X-Organization-ID'] = organizationId;
    
    apiEvents.emit('organizations:switched', {
      id: organizationId,
      name: org.name,
      previous: TokenManager.getOrganization()
    });
    
    return {
      success: true,
      organization: org,
      message: `Switched to ${org.name}`
    };
  } catch (error) {
    console.error('[OrganizationAPI] Switch organization error:', error);
    throw error;
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Generate mock organization statistics for development
 */
function generateMockOrganizationStats(params) {
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
    totalOrganizations: 156,
    activeOrganizations: 142,
    pendingOrganizations: 8,
    suspendedOrganizations: 6,
    trialOrganizations: 12,
    totalAssessments: 12478,
    totalCandidates: 84756,
    totalRevenue: 42560,
    monthlyGrowth: 12.5,
    churnRate: 2.3,
    metrics: {
      assessmentsPerOrg: 80,
      candidatesPerAssessment: 6.8,
      avgRevenuePerOrg: 272.8
    },
    timeline: months,
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
    fromMock: true
  };
}

/**
 * Generate mock organization growth data
 */
function generateMockOrganizationGrowth(params) {
  const now = new Date();
  const timeline = [];
  
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    timeline.push({
      date: date.toISOString().split('T')[0],
      organizations: Math.floor(Math.random() * 10) + 140 + i * 0.5,
      growth: Math.floor(Math.random() * 5) + 10
    });
  }
  
  return {
    timeline,
    growthRate: 12.5,
    predictions: timeline.slice(-7).map((point, i) => ({
      date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      organizations: Math.floor(point.organizations * (1 + 0.01 * (12.5 + Math.random() * 3))),
      confidence: 0.85
    })),
    fromMock: true
  };
}

/**
 * Generate mock organization data
 */
function generateMockOrganization(id, options) {
  return {
    id: id || 'org_mock_001',
    name: 'Demo Organization',
    slug: 'demo-org',
    description: 'A sample organization for demonstration purposes',
    email: 'contact@demo-org.com',
    website: 'https://demo-org.com',
    plan: 'professional',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    membersCount: options.includeMembers ? 15 : undefined,
    assessmentsCount: 45,
    candidatesCount: 3200,
    settings: options.includeSettings ? {
      branding: {
        logo: null,
        colors: { primary: '#1976d2', secondary: '#dc004e' },
        customDomain: null
      },
      features: {
        assessments: true,
        analytics: true,
        customDomains: false,
        apiAccess: true,
        sso: false
      },
      notifications: {
        email: true,
        inApp: true,
        frequency: 'daily'
      }
    } : undefined,
    stats: options.includeStats ? {
      assessmentsCreated: 45,
      assessmentsCompleted: 32,
      avgCompletionRate: 85.6,
      avgScore: 72.3,
      activeCandidates: 125
    } : undefined,
    members: options.includeMembers ? Array.from({ length: 15 }, (_, i) => ({
      id: `user_${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@demo-org.com`,
      role: i === 0 ? 'admin' : i < 5 ? 'manager' : 'assessor',
      joinedAt: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    })) : undefined,
    fromMock: true
  };
}

// ===================== DEFAULT EXPORT FOR BACKWARD COMPATIBILITY =====================

const organizationApi = {
  fetchOrganizationStats,
  fetchOrganizationGrowth,
  getOrganization,
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  getOrganizationMembers,
  inviteMember,
  getOrganizationAnalytics,
  switchOrganization,
};

export default organizationApi;
