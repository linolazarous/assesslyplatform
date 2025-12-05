// src/api/organizationApi.js
import api from './axiosConfig';

/**
 * Organization API Service
 * Handles organization management, membership, and multi-tenant operations
 */
const organizationApi = {
  // ===================== ORGANIZATION CRUD =====================

  /**
   * Get organization by ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Organization data
   */
  getOrganization: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching organization:', error);
      throw error;
    }
  },

  /**
   * Get current organization details
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Current organization
   */
  getCurrentOrganization: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/current`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching current organization:', error);
      throw error;
    }
  },

  /**
   * Verify user access to organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Access verification result
   */
  verifyOrganizationAccess: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/access`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error verifying organization access:', error);
      throw error;
    }
  },

  /**
   * Create new organization
   * @param {Object} organizationData - Organization creation data
   * @returns {Promise} Created organization
   */
  createOrganization: async (organizationData) => {
    try {
      const response = await api.post('/api/v1/organizations', organizationData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error creating organization:', error);
      throw error;
    }
  },

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Organization update data
   * @returns {Promise} Updated organization
   */
  updateOrganization: async (organizationId, updateData) => {
    try {
      const response = await api.put(`/api/v1/organizations/${organizationId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error updating organization:', error);
      throw error;
    }
  },

  /**
   * Delete organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Deletion result
   */
  deleteOrganization: async (organizationId) => {
    try {
      const response = await api.delete(`/api/v1/organizations/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error deleting organization:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION SUBSCRIPTION =====================

  /**
   * Check subscription status
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Subscription status
   */
  checkSubscriptionStatus: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/subscription`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error checking subscription status:', error);
      throw error;
    }
  },

  /**
   * Get subscription details
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Subscription details
   */
  getSubscriptionDetails: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/subscription/details`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching subscription details:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION MEMBERSHIP =====================

  /**
   * Get user's organizations
   * @param {Object} params - Query parameters
   * @returns {Promise} User organizations
   */
  getUserOrganizations: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/organizations/my', { params });
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching user organizations:', error);
      throw error;
    }
  },

  /**
   * Get organization members
   * @param {string} organizationId - Organization ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Organization members
   */
  getOrganizationMembers: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/members`, { params });
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching organization members:', error);
      throw error;
    }
  },

  /**
   * Add member to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} memberData - Member data
   * @returns {Promise} Added member
   */
  addMember: async (organizationId, memberData) => {
    try {
      const response = await api.post(`/api/v1/organizations/${organizationId}/members`, memberData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error adding member:', error);
      throw error;
    }
  },

  /**
   * Update member role
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @param {Object} roleData - Role update data
   * @returns {Promise} Updated member
   */
  updateMemberRole: async (organizationId, userId, roleData) => {
    try {
      const response = await api.put(`/api/v1/organizations/${organizationId}/members/${userId}`, roleData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error updating member role:', error);
      throw error;
    }
  },

  /**
   * Remove member from organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Promise} Removal result
   */
  removeMember: async (organizationId, userId) => {
    try {
      const response = await api.delete(`/api/v1/organizations/${organizationId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error removing member:', error);
      throw error;
    }
  },

  /**
   * Invite member to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} inviteData - Invitation data
   * @returns {Promise} Invitation result
   */
  inviteMember: async (organizationId, inviteData) => {
    try {
      const response = await api.post(`/api/v1/organizations/${organizationId}/invite`, inviteData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error inviting member:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION SETTINGS =====================

  /**
   * Get organization settings
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Organization settings
   */
  getOrganizationSettings: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/settings`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching organization settings:', error);
      throw error;
    }
  },

  /**
   * Update organization settings
   * @param {string} organizationId - Organization ID
   * @param {Object} settingsData - Settings data
   * @returns {Promise} Updated settings
   */
  updateOrganizationSettings: async (organizationId, settingsData) => {
    try {
      const response = await api.put(`/api/v1/organizations/${organizationId}/settings`, settingsData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error updating organization settings:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION ANALYTICS =====================

  /**
   * Get organization analytics
   * @param {string} organizationId - Organization ID
   * @param {Object} params - Query parameters
   * @returns {Promise} Organization analytics
   */
  getOrganizationAnalytics: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/analytics`, { params });
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching organization analytics:', error);
      throw error;
    }
  },

  /**
   * Get organization usage statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Usage statistics
   */
  getUsageStatistics: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/usage`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching usage statistics:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION DOMAINS =====================

  /**
   * Get organization domains
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Organization domains
   */
  getDomains: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/domains`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching domains:', error);
      throw error;
    }
  },

  /**
   * Add domain to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} domainData - Domain data
   * @returns {Promise} Added domain
   */
  addDomain: async (organizationId, domainData) => {
    try {
      const response = await api.post(`/api/v1/organizations/${organizationId}/domains`, domainData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error adding domain:', error);
      throw error;
    }
  },

  /**
   * Verify domain
   * @param {string} organizationId - Organization ID
   * @param {string} domainId - Domain ID
   * @returns {Promise} Verification result
   */
  verifyDomain: async (organizationId, domainId) => {
    try {
      const response = await api.post(`/api/v1/organizations/${organizationId}/domains/${domainId}/verify`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error verifying domain:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION BILLING =====================

  /**
   * Get billing information
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Billing information
   */
  getBillingInfo: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/billing`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error fetching billing info:', error);
      throw error;
    }
  },

  /**
   * Update billing information
   * @param {string} organizationId - Organization ID
   * @param {Object} billingData - Billing data
   * @returns {Promise} Updated billing info
   */
  updateBillingInfo: async (organizationId, billingData) => {
    try {
      const response = await api.put(`/api/v1/organizations/${organizationId}/billing`, billingData);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error updating billing info:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION EXPORT =====================

  /**
   * Export organization data
   * @param {string} organizationId - Organization ID
   * @param {Object} params - Export parameters
   * @returns {Promise} Export data
   */
  exportOrganizationData: async (organizationId, params = {}) => {
    try {
      const response = await api.download(`/api/v1/organizations/${organizationId}/export`, params, `organization_${organizationId}_data.zip`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error exporting organization data:', error);
      throw error;
    }
  },

  // ===================== ORGANIZATION HEALTH =====================

  /**
   * Check organization health
   * @param {string} organizationId - Organization ID
   * @returns {Promise} Health status
   */
  checkOrganizationHealth: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/organizations/${organizationId}/health`);
      return response.data;
    } catch (error) {
      console.error('[OrganizationAPI] Error checking organization health:', error);
      throw error;
    }
  },
};

export default organizationApi;
