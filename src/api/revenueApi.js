// src/api/revenueApi.js
import api from './axiosConfig';

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
      const response = await api.get('/api/v1/revenue/data', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue data:', error);
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
      const response = await api.get('/api/v1/revenue/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue analytics:', error);
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
      const response = await api.get('/api/v1/revenue/subscriptions', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching subscription revenue:', error);
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
      const response = await api.get('/api/v1/revenue/mrr', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching MRR:', error);
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
      const response = await api.get('/api/v1/revenue/arr', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching ARR:', error);
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
      const response = await api.get('/api/v1/revenue/churn', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching churn analytics:', error);
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
      const response = await api.get('/api/v1/revenue/ltv', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching LTV:', error);
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
      const response = await api.get('/api/v1/revenue/breakdown', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue breakdown:', error);
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
      const response = await api.get('/api/v1/revenue/payments', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching payments:', error);
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
      const response = await api.get('/api/v1/revenue/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching invoices:', error);
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
      const response = await api.get('/api/v1/revenue/forecast', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue forecast:', error);
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
      const response = await api.get('/api/v1/revenue/comparison', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue comparison:', error);
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
      const response = await api.get('/api/v1/revenue/by-organization', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue by organization:', error);
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
      const response = await api.get('/api/v1/revenue/top-organizations', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching top organizations:', error);
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
      const response = await api.get('/api/v1/revenue/dashboard-metrics', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching dashboard metrics:', error);
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
      const response = await api.download('/api/v1/revenue/export', params, 'revenue_report.xlsx');
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error exporting revenue report:', error);
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
      const response = await api.get('/api/v1/revenue/plans/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching plan analytics:', error);
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
      const response = await api.get('/api/v1/revenue/growth-rate', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching growth rate:', error);
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
      const response = await api.get('/api/v1/revenue/arpu', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching ARPU:', error);
      throw error;
    }
  },

  // ===================== NEW FUNCTIONS =====================

  /**
   * Get revenue summary (quick stats)
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue summary
   */
  fetchRevenueSummary: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/summary', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue summary:', error);
      throw error;
    }
  },

  /**
   * Get revenue by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} params - Additional parameters
   * @returns {Promise} Revenue by date range
   */
  fetchRevenueByDateRange: async (startDate, endDate, params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/date-range', {
        params: { startDate, endDate, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue by date range:', error);
      throw error;
    }
  },

  /**
   * Get revenue trends (daily, weekly, monthly)
   * @param {string} interval - Interval (daily, weekly, monthly)
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue trends
   */
  fetchRevenueTrends: async (interval = 'monthly', params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/trends', {
        params: { interval, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue trends:', error);
      throw error;
    }
  },

  /**
   * Get real-time revenue updates
   * @param {Object} params - Query parameters
   * @returns {Promise} Real-time revenue data
   */
  fetchRealtimeRevenue: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/realtime', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching real-time revenue:', error);
      throw error;
    }
  },

  /**
   * Get revenue goals and targets
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue goals
   */
  fetchRevenueGoals: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/goals', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue goals:', error);
      throw error;
    }
  },

  /**
   * Get revenue health score
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue health score
   */
  fetchRevenueHealthScore: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/health-score', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue health score:', error);
      throw error;
    }
  },

  /**
   * Get revenue alerts (anomalies, spikes, drops)
   * @param {Object} params - Query parameters
   * @returns {Promise} Revenue alerts
   */
  fetchRevenueAlerts: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/revenue/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Error fetching revenue alerts:', error);
      throw error;
    }
  },
};

export default revenueApi;
