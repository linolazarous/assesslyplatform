// src/api/billingApi.js
import api from './api';

/**
 * Billing API Service
 * Handles subscription management, invoices, payment methods, and billing operations
 */
const billingApi = {
  // ===================== SUBSCRIPTION MANAGEMENT =====================
  
  /**
   * Get organization subscription details
   */
  getSubscription: async (organizationId) => {
    try {
      const response = await api.get(`/billing/subscriptions/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Update subscription plan
   */
  updateSubscription: async (organizationId, data) => {
    try {
      const response = await api.put(`/billing/subscriptions/${organizationId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Cancel subscription
   */
  cancelSubscription: async (organizationId, data = {}) => {
    try {
      const response = await api.delete(`/billing/subscriptions/${organizationId}`, { data });
      return response.data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Reactivate subscription
   */
  reactivateSubscription: async (organizationId) => {
    try {
      const response = await api.post(`/billing/subscriptions/${organizationId}/reactivate`);
      return response.data;
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING & INVOICES =====================
  
  /**
   * Get billing information
   */
  getBillingInfo: async (organizationId) => {
    try {
      const response = await api.get(`/billing/info/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get billing info error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing history
   */
  getBillingHistory: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/billing/history/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Get invoice by ID
   */
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Get invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download invoice
   */
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Download invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download latest invoice
   */
  downloadLatestInvoice: async (organizationId) => {
    try {
      const response = await api.get(`/billing/invoices/latest/${organizationId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Download latest invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Send invoice via email
   */
  sendInvoiceEmail: async (invoiceId, email) => {
    try {
      const response = await api.post(`/billing/invoices/${invoiceId}/send`, { email });
      return response.data;
    } catch (error) {
      console.error('Send invoice email error:', error);
      throw error;
    }
  },
  
  // ===================== PAYMENT METHODS =====================
  
  /**
   * Get payment methods
   */
  getPaymentMethods: async (organizationId) => {
    try {
      const response = await api.get(`/billing/payment-methods/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw error;
    }
  },
  
  /**
   * Add payment method
   */
  addPaymentMethod: async (organizationId, paymentMethod) => {
    try {
      const response = await api.post(`/billing/payment-methods/${organizationId}`, paymentMethod);
      return response.data;
    } catch (error) {
      console.error('Add payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Update payment method
   */
  updatePaymentMethod: async (organizationId, paymentMethodId, updates) => {
    try {
      const response = await api.put(`/billing/payment-methods/${organizationId}/${paymentMethodId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Remove payment method
   */
  removePaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.delete(`/billing/payment-methods/${organizationId}/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      console.error('Remove payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.post(`/billing/payment-methods/${organizationId}/${paymentMethodId}/default`);
      return response.data;
    } catch (error) {
      console.error('Set default payment method error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT & UPGRADES =====================
  
  /**
   * Create checkout session
   */
  createCheckoutSession: async (data) => {
    try {
      const response = await api.post('/billing/checkout-session', data);
      return response.data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },
  
  /**
   * Create portal session for customer billing management
   */
  createPortalSession: async (organizationId) => {
    try {
      const response = await api.post('/billing/portal-session', { organizationId });
      return response.data;
    } catch (error) {
      console.error('Create portal session error:', error);
      throw error;
    }
  },
  
  /**
   * Get upgrade options
   */
  getUpgradeOptions: async (organizationId) => {
    try {
      const response = await api.get(`/billing/upgrade-options/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get upgrade options error:', error);
      throw error;
    }
  },
  
  // ===================== COUPONS & DISCOUNTS =====================
  
  /**
   * Validate coupon code
   */
  validateCoupon: async (couponCode) => {
    try {
      const response = await api.get(`/billing/coupons/validate/${couponCode}`);
      return response.data;
    } catch (error) {
      console.error('Validate coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Apply coupon to subscription
   */
  applyCoupon: async (organizationId, couponCode) => {
    try {
      const response = await api.post(`/billing/coupons/apply/${organizationId}`, { couponCode });
      return response.data;
    } catch (error) {
      console.error('Apply coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Remove coupon from subscription
   */
  removeCoupon: async (organizationId) => {
    try {
      const response = await api.delete(`/billing/coupons/remove/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Remove coupon error:', error);
      throw error;
    }
  },
  
  // ===================== USAGE & METRICS =====================
  
  /**
   * Get usage metrics
   */
  getUsageMetrics: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/billing/usage/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get usage metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get usage alerts
   */
  getUsageAlerts: async (organizationId) => {
    try {
      const response = await api.get(`/billing/usage-alerts/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get usage alerts error:', error);
      throw error;
    }
  },
  
  /**
   * Set usage alert thresholds
   */
  setUsageAlertThresholds: async (organizationId, thresholds) => {
    try {
      const response = await api.post(`/billing/usage-alerts/${organizationId}`, thresholds);
      return response.data;
    } catch (error) {
      console.error('Set usage alert thresholds error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING PREFERENCES =====================
  
  /**
   * Get billing preferences
   */
  getBillingPreferences: async (organizationId) => {
    try {
      const response = await api.get(`/billing/preferences/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get billing preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Update billing preferences
   */
  updateBillingPreferences: async (organizationId, preferences) => {
    try {
      const response = await api.put(`/billing/preferences/${organizationId}`, preferences);
      return response.data;
    } catch (error) {
      console.error('Update billing preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing notifications
   */
  getBillingNotifications: async (organizationId) => {
    try {
      const response = await api.get(`/billing/notifications/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get billing notifications error:', error);
      throw error;
    }
  },
  
  /**
   * Update billing notifications
   */
  updateBillingNotifications: async (organizationId, notifications) => {
    try {
      const response = await api.put(`/billing/notifications/${organizationId}`, notifications);
      return response.data;
    } catch (error) {
      console.error('Update billing notifications error:', error);
      throw error;
    }
  },
  
  // ===================== TAX & COMPLIANCE =====================
  
  /**
   * Get tax information
   */
  getTaxInfo: async (organizationId) => {
    try {
      const response = await api.get(`/billing/tax/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get tax info error:', error);
      throw error;
    }
  },
  
  /**
   * Update tax information
   */
  updateTaxInfo: async (organizationId, taxInfo) => {
    try {
      const response = await api.put(`/billing/tax/${organizationId}`, taxInfo);
      return response.data;
    } catch (error) {
      console.error('Update tax info error:', error);
      throw error;
    }
  },
  
  /**
   * Validate tax ID
   */
  validateTaxId: async (taxId, country) => {
    try {
      const response = await api.post('/billing/tax/validate', { taxId, country });
      return response.data;
    } catch (error) {
      console.error('Validate tax ID error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & REPORTS =====================
  
  /**
   * Export billing history
   */
  exportBillingHistory: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/billing/export/history/${organizationId}`, {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Generate billing report
   */
  generateBillingReport: async (organizationId, reportConfig) => {
    try {
      const response = await api.post(`/billing/reports/${organizationId}`, reportConfig);
      return response.data;
    } catch (error) {
      console.error('Generate billing report error:', error);
      throw error;
    }
  },
  
  // ===================== SUPPORT & DISPUTES =====================
  
  /**
   * Request billing support
   */
  requestBillingSupport: async (organizationId, supportRequest) => {
    try {
      const response = await api.post(`/billing/support/${organizationId}`, supportRequest);
      return response.data;
    } catch (error) {
      console.error('Request billing support error:', error);
      throw error;
    }
  },
  
  /**
   * Dispute charge
   */
  disputeCharge: async (organizationId, invoiceId, disputeData) => {
    try {
      const response = await api.post(`/billing/disputes/${organizationId}/${invoiceId}`, disputeData);
      return response.data;
    } catch (error) {
      console.error('Dispute charge error:', error);
      throw error;
    }
  },
  
  /**
   * Get dispute status
   */
  getDisputeStatus: async (disputeId) => {
    try {
      const response = await api.get(`/billing/disputes/${disputeId}/status`);
      return response.data;
    } catch (error) {
      console.error('Get dispute status error:', error);
      throw error;
    }
  },
  
  // ===================== HEALTH & STATUS =====================
  
  /**
   * Check billing service health
   */
  checkBillingHealth: async () => {
    try {
      const response = await api.get('/billing/health');
      return response.data;
    } catch (error) {
      console.error('Check billing health error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing statistics
   */
  getBillingStats: async (organizationId) => {
    try {
      const response = await api.get(`/billing/stats/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get billing stats error:', error);
      throw error;
    }
  },
};

export default billingApi;
