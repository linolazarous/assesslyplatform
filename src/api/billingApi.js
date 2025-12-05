// src/api/billingApi.js
import api from './axiosConfig';

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
      const response = await api.get(`/api/v1/billing/subscriptions/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Update subscription plan
   */
  updateSubscription: async (organizationId, data) => {
    try {
      const response = await api.put(`/api/v1/billing/subscriptions/${organizationId}`, data);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Cancel subscription
   */
  cancelSubscription: async (organizationId, data = {}) => {
    try {
      const response = await api.delete(`/api/v1/billing/subscriptions/${organizationId}`, { data });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Cancel subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Reactivate subscription
   */
  reactivateSubscription: async (organizationId) => {
    try {
      const response = await api.post(`/api/v1/billing/subscriptions/${organizationId}/reactivate`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Reactivate subscription error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING & INVOICES =====================
  
  /**
   * Get billing information
   */
  getBillingInfo: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/info/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing info error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing history
   */
  getBillingHistory: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/billing/history/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Get invoice by ID
   */
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/api/v1/billing/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download invoice
   */
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.download(`/api/v1/billing/invoices/${invoiceId}/download`, {}, `invoice_${invoiceId}.pdf`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Download invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download latest invoice
   */
  downloadLatestInvoice: async (organizationId) => {
    try {
      const response = await api.download(`/api/v1/billing/invoices/latest/${organizationId}/download`, {}, `latest_invoice_${organizationId}.pdf`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Download latest invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Send invoice via email
   */
  sendInvoiceEmail: async (invoiceId, email) => {
    try {
      const response = await api.post(`/api/v1/billing/invoices/${invoiceId}/send`, { email });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Send invoice email error:', error);
      throw error;
    }
  },
  
  // ===================== PAYMENT METHODS =====================
  
  /**
   * Get payment methods
   */
  getPaymentMethods: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/payment-methods/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get payment methods error:', error);
      throw error;
    }
  },
  
  /**
   * Add payment method
   */
  addPaymentMethod: async (organizationId, paymentMethod) => {
    try {
      const response = await api.post(`/api/v1/billing/payment-methods/${organizationId}`, paymentMethod);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Add payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Update payment method
   */
  updatePaymentMethod: async (organizationId, paymentMethodId, updates) => {
    try {
      const response = await api.put(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}`, updates);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Remove payment method
   */
  removePaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.delete(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Remove payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Set default payment method
   */
  setDefaultPaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.post(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}/default`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Set default payment method error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT & UPGRADES =====================
  
  /**
   * Create checkout session
   */
  createCheckoutSession: async (data) => {
    try {
      const response = await api.post('/api/v1/billing/checkout-session', data);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Create checkout session error:', error);
      throw error;
    }
  },
  
  /**
   * Create portal session for customer billing management
   */
  createPortalSession: async (organizationId) => {
    try {
      const response = await api.post('/api/v1/billing/portal-session', { organizationId });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Create portal session error:', error);
      throw error;
    }
  },
  
  /**
   * Get upgrade options
   */
  getUpgradeOptions: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/upgrade-options/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get upgrade options error:', error);
      throw error;
    }
  },
  
  // ===================== COUPONS & DISCOUNTS =====================
  
  /**
   * Validate coupon code
   */
  validateCoupon: async (couponCode) => {
    try {
      const response = await api.get(`/api/v1/billing/coupons/validate/${couponCode}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Validate coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Apply coupon to subscription
   */
  applyCoupon: async (organizationId, couponCode) => {
    try {
      const response = await api.post(`/api/v1/billing/coupons/apply/${organizationId}`, { couponCode });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Apply coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Remove coupon from subscription
   */
  removeCoupon: async (organizationId) => {
    try {
      const response = await api.delete(`/api/v1/billing/coupons/remove/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Remove coupon error:', error);
      throw error;
    }
  },
  
  // ===================== USAGE & METRICS =====================
  
  /**
   * Get usage metrics
   */
  getUsageMetrics: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/billing/usage/${organizationId}`, { params });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get usage metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get usage alerts
   */
  getUsageAlerts: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/usage-alerts/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get usage alerts error:', error);
      throw error;
    }
  },
  
  /**
   * Set usage alert thresholds
   */
  setUsageAlertThresholds: async (organizationId, thresholds) => {
    try {
      const response = await api.post(`/api/v1/billing/usage-alerts/${organizationId}`, thresholds);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Set usage alert thresholds error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING PREFERENCES =====================
  
  /**
   * Get billing preferences
   */
  getBillingPreferences: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/preferences/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Update billing preferences
   */
  updateBillingPreferences: async (organizationId, preferences) => {
    try {
      const response = await api.put(`/api/v1/billing/preferences/${organizationId}`, preferences);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update billing preferences error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing notifications
   */
  getBillingNotifications: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/notifications/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing notifications error:', error);
      throw error;
    }
  },
  
  /**
   * Update billing notifications
   */
  updateBillingNotifications: async (organizationId, notifications) => {
    try {
      const response = await api.put(`/api/v1/billing/notifications/${organizationId}`, notifications);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update billing notifications error:', error);
      throw error;
    }
  },
  
  // ===================== TAX & COMPLIANCE =====================
  
  /**
   * Get tax information
   */
  getTaxInfo: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/tax/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get tax info error:', error);
      throw error;
    }
  },
  
  /**
   * Update tax information
   */
  updateTaxInfo: async (organizationId, taxInfo) => {
    try {
      const response = await api.put(`/api/v1/billing/tax/${organizationId}`, taxInfo);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update tax info error:', error);
      throw error;
    }
  },
  
  /**
   * Validate tax ID
   */
  validateTaxId: async (taxId, country) => {
    try {
      const response = await api.post('/api/v1/billing/tax/validate', { taxId, country });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Validate tax ID error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & REPORTS =====================
  
  /**
   * Export billing history
   */
  exportBillingHistory: async (organizationId, params = {}) => {
    try {
      const response = await api.download(`/api/v1/billing/export/history/${organizationId}`, params, `billing_history_${organizationId}.csv`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Export billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Generate billing report
   */
  generateBillingReport: async (organizationId, reportConfig) => {
    try {
      const response = await api.post(`/api/v1/billing/reports/${organizationId}`, reportConfig);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Generate billing report error:', error);
      throw error;
    }
  },
  
  // ===================== SUPPORT & DISPUTES =====================
  
  /**
   * Request billing support
   */
  requestBillingSupport: async (organizationId, supportRequest) => {
    try {
      const response = await api.post(`/api/v1/billing/support/${organizationId}`, supportRequest);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Request billing support error:', error);
      throw error;
    }
  },
  
  /**
   * Dispute charge
   */
  disputeCharge: async (organizationId, invoiceId, disputeData) => {
    try {
      const response = await api.post(`/api/v1/billing/disputes/${organizationId}/${invoiceId}`, disputeData);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Dispute charge error:', error);
      throw error;
    }
  },
  
  /**
   * Get dispute status
   */
  getDisputeStatus: async (disputeId) => {
    try {
      const response = await api.get(`/api/v1/billing/disputes/${disputeId}/status`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get dispute status error:', error);
      throw error;
    }
  },
  
  // ===================== HEALTH & STATUS =====================
  
  /**
   * Check billing service health
   */
  checkBillingHealth: async () => {
    try {
      const response = await api.get('/api/v1/billing/health');
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Check billing health error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing statistics
   */
  getBillingStats: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/stats/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing stats error:', error);
      throw error;
    }
  },

  // ===================== SUBSCRIPTION PLANS =====================

  /**
   * Get available subscription plans
   */
  getSubscriptionPlans: async () => {
    try {
      const response = await api.get('/api/v1/billing/plans');
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get subscription plans error:', error);
      throw error;
    }
  },

  /**
   * Get plan features
   */
  getPlanFeatures: async (planId) => {
    try {
      const response = await api.get(`/api/v1/billing/plans/${planId}/features`);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get plan features error:', error);
      throw error;
    }
  },
};

export default billingApi;
