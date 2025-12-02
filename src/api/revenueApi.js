// src/api/revenueApi.js
import api from './api';

/**
 * Revenue API Service
 * Handles financial analytics, revenue tracking, and subscription metrics
 */
const revenueApi = {
  /**
   * Get revenue data with time series
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue data
   */
  fetchRevenueData: async (params = {}) => {
    try {
      const response = await api.get('/revenue/data', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  },

  /**
   * Get revenue analytics and insights
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue analytics
   */
  fetchRevenueAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/revenue/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      throw error;
    }
  },

  /**
   * Get subscription revenue metrics
   * @param {Object} params - Query parameters
   * @returns {Promise} Subscription revenue data
   */
  fetchSubscriptionRevenue: async (params = {}) => {
    try {
      const response = await api.get('/revenue/subscriptions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription revenue:', error);
      throw error;
    }
  },

  /**
   * Get Monthly Recurring Revenue (MRR) trends
   * @param {Object} params - Query parameters
   * @returns {Promise} MRR data
   */
  fetchMRR: async (params = {}) => {
    try {
      const response = await api.get('/revenue/mrr', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching MRR:', error);
      throw error;
    }
  },

  /**
   * Get Annual Recurring Revenue (ARR) trends
   * @param {Object} params - Query parameters
   * @returns {Promise} ARR data
   */
  fetchARR: async (params = {}) => {
    try {
      const response = await api.get('/revenue/arr', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching ARR:', error);
      throw error;
    }
  },

  /**
   * Get customer churn analytics
   * @param {Object} params - Query parameters
   * @returns {Promise} Churn analytics
   */
  fetchChurnAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/revenue/churn', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching churn analytics:', error);
      throw error;
    }
  },

  /**
   * Get customer lifetime value (LTV) metrics
   * @param {Object} params - Query parameters
   * @returns {Promise} LTV data
   */
  fetchLTV: async (params = {}) => {
    try {
      const response = await api.get('/revenue/ltv', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching LTV:', error);
      throw error;
    }
  },

  /**
   * Get revenue breakdown by plan/segment
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue breakdown
   */
  fetchRevenueBreakdown: async (params = {}) => {
    try {
      const response = await api.get('/revenue/breakdown', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue breakdown:', error);
      throw error;
    }
  },

  /**
   * Get payment and transaction data
   * @param {Object} params - Query parameters
   * @returns {Promise} Payment data
   */
  fetchPayments: async (params = {}) => {
    try {
      const response = await api.get('/revenue/payments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Get invoice and billing data
   * @param {Object} params - Query parameters
   * @returns {Promise} Invoice data
   */
  fetchInvoices: async (params = {}) => {
    try {
      const response = await api.get('/revenue/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  /**
   * Get revenue forecasting
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue forecast
   */
  fetchRevenueForecast: async (params = {}) => {
    try {
      const response = await api.get('/revenue/forecast', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue forecast:', error);
      throw error;
    }
  },

  /**
   * Get revenue comparison between periods
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue comparison
   */
  fetchRevenueComparison: async (params = {}) => {
    try {
      const response = await api.get('/revenue/comparison', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue comparison:', error);
      throw error;
    }
  },

  /**
   * Get revenue by organization
   * @param {Object} params - Query parameters
   * @returns {Promise} Organization revenue
   */
  fetchRevenueByOrganization: async (params = {}) => {
    try {
      const response = await api.get('/revenue/by-organization', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue by organization:', error);
      throw error;
    }
  },

  /**
   * Get top revenue-generating organizations
   * @param {Object} params - Query parameters
   * @returns {Promise} Top organizations
   */
  fetchTopOrganizations: async (params = {}) => {
    try {
      const response = await api.get('/revenue/top-organizations', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching top organizations:', error);
      throw error;
    }
  },

  /**
   * Get revenue metrics for dashboard
   * @param {Object} params - Query parameters
   * @returns {Promise} Dashboard revenue metrics
   */
  fetchDashboardMetrics: async (params = {}) => {
    try {
      const response = await api.get('/revenue/dashboard-metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Export revenue report
   * @param {Object} params - Export parameters
   * @returns {Promise} Export data
   */
  exportRevenueReport: async (params = {}) => {
    try {
      const response = await api.get('/revenue/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting revenue report:', error);
      throw error;
    }
  },

  /**
   * Get subscription plan analytics
   * @param {Object} params - Query parameters
   * @returns {Promise} Plan analytics
   */
  fetchPlanAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/revenue/plans/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching plan analytics:', error);
      throw error;
    }
  },

  /**
   * Get revenue growth rate
   * @param {Object} params - Query parameters
   * @returns {Promise} Growth rate data
   */
  fetchGrowthRate: async (params = {}) => {
    try {
      const response = await api.get('/revenue/growth-rate', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching growth rate:', error);
      throw error;
    }
  },

  /**
   * Get average revenue per user (ARPU)
   * @param {Object} params - Query parameters
   * @returns {Promise} ARPU data
   */
  fetchARPU: async (params = {}) => {
    try {
      const response = await api.get('/revenue/arpu', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching ARPU:', error);
      throw error;
    }
  },
};

export default revenueApi;
