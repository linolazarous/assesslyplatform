// src/api/billingApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents } from './index';

/**
 * Billing API Service
 * Enterprise-grade subscription management, invoices, payment methods, and billing operations
 * Multi-tenant aware with advanced error handling and real-time updates
 */
const billingApi = {
  // ===================== SUBSCRIPTION PLANS =====================
  
  /**
   * Get all available subscription plans with pricing
   * @returns {Promise<Array>} List of subscription plans
   */
  getSubscriptionPlans: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.BILLING.PLANS);
      validateResponse(response.data, ['plans']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get subscription plans error:', error);
      apiEvents.emit('billing:error', { operation: 'getPlans', error });
      throw error;
    }
  },
  
  /**
   * Get detailed plan features and limits
   * @param {string} planId - The plan identifier
   * @returns {Promise<Object>} Plan details with features
   */
  getPlanFeatures: async (planId) => {
    try {
      const response = await api.get(`/api/v1/billing/plans/${planId}/features`);
      validateResponse(response.data, ['id', 'name', 'features', 'limits']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get plan features error:', error);
      throw error;
    }
  },
  
  // ===================== SUBSCRIPTION MANAGEMENT =====================
  
  /**
   * Get organization subscription details with retry logic
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Subscription details
   */
  getSubscription: async (organizationId) => {
    return retryWithBackoff(async () => {
      const response = await api.get(`/api/v1/billing/subscriptions/${organizationId}`);
      validateResponse(response.data, ['id', 'status', 'plan']);
      
      // Emit subscription loaded event
      apiEvents.emit('billing:subscription_loaded', response.data);
      return response.data;
    });
  },
  
  /**
   * Update subscription plan with validation
   * @param {string} organizationId - Organization identifier
   * @param {Object} data - Update data including new plan
   * @returns {Promise<Object>} Updated subscription
   */
  updateSubscription: async (organizationId, data) => {
    try {
      validateResponse(data, ['planId']);
      
      const response = await api.put(`/api/v1/billing/subscriptions/${organizationId}`, data);
      validateResponse(response.data, ['id', 'status', 'plan']);
      
      apiEvents.emit('billing:subscription_updated', {
        organizationId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update subscription error:', error);
      apiEvents.emit('billing:subscription_update_failed', { organizationId, error });
      throw error;
    }
  },
  
  /**
   * Cancel subscription with optional feedback
   * @param {string} organizationId - Organization identifier
   * @param {Object} data - Cancellation data including reason
   * @returns {Promise<Object>} Cancellation confirmation
   */
  cancelSubscription: async (organizationId, data = {}) => {
    try {
      const response = await api.delete(`/api/v1/billing/subscriptions/${organizationId}`, { 
        data: {
          reason: data.reason || 'User requested',
          feedback: data.feedback || '',
          ...data
        }
      });
      
      apiEvents.emit('billing:subscription_cancelled', {
        organizationId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Cancel subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Reactivate cancelled subscription
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Reactivated subscription
   */
  reactivateSubscription: async (organizationId) => {
    try {
      const response = await api.post(`/api/v1/billing/subscriptions/${organizationId}/reactivate`);
      
      apiEvents.emit('billing:subscription_reactivated', {
        organizationId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Reactivate subscription error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING & INVOICES =====================
  
  /**
   * Get billing information for organization
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Billing information
   */
  getBillingInfo: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/info/${organizationId}`);
      validateResponse(response.data, ['organizationId', 'balance', 'nextBillingDate']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing info error:', error);
      throw error;
    }
  },
  
  /**
   * Get paginated billing history
   * @param {string} organizationId - Organization identifier
   * @param {Object} params - Query parameters (page, limit, startDate, endDate)
   * @returns {Promise<Object>} Billing history with pagination
   */
  getBillingHistory: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/billing/history/${organizationId}`, { 
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          ...params
        }
      });
      
      validateResponse(response.data, ['invoices', 'pagination']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Get detailed invoice by ID
   * @param {string} invoiceId - Invoice identifier
   * @returns {Promise<Object>} Invoice details
   */
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/api/v1/billing/invoices/${invoiceId}`);
      validateResponse(response.data, ['id', 'amount', 'status', 'items']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download invoice as PDF
   * @param {string} invoiceId - Invoice identifier
   * @returns {Promise<Blob>} PDF blob for download
   */
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/api/v1/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Download invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Download latest invoice for organization
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Blob>} PDF blob for download
   */
  downloadLatestInvoice: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/invoices/latest/${organizationId}/download`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Download latest invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Send invoice to email address
   * @param {string} invoiceId - Invoice identifier
   * @param {string} email - Recipient email address
   * @returns {Promise<Object>} Send confirmation
   */
  sendInvoiceEmail: async (invoiceId, email) => {
    try {
      const response = await api.post(`/api/v1/billing/invoices/${invoiceId}/send`, { 
        email,
        sendCopy: true
      });
      
      apiEvents.emit('billing:invoice_sent', { invoiceId, email });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Send invoice email error:', error);
      throw error;
    }
  },
  
  // ===================== PAYMENT METHODS =====================
  
  /**
   * Get all payment methods for organization
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Array>} List of payment methods
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
   * Add new payment method
   * @param {string} organizationId - Organization identifier
   * @param {Object} paymentMethod - Payment method details
   * @returns {Promise<Object>} Added payment method
   */
  addPaymentMethod: async (organizationId, paymentMethod) => {
    try {
      validateResponse(paymentMethod, ['type', 'token']);
      
      const response = await api.post(`/api/v1/billing/payment-methods/${organizationId}`, paymentMethod);
      
      apiEvents.emit('billing:payment_method_added', {
        organizationId,
        paymentMethod: response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Add payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Update payment method details
   * @param {string} organizationId - Organization identifier
   * @param {string} paymentMethodId - Payment method identifier
   * @param {Object} updates - Payment method updates
   * @returns {Promise<Object>} Updated payment method
   */
  updatePaymentMethod: async (organizationId, paymentMethodId, updates) => {
    try {
      const response = await api.put(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}`, updates);
      
      apiEvents.emit('billing:payment_method_updated', {
        organizationId,
        paymentMethodId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Remove payment method
   * @param {string} organizationId - Organization identifier
   * @param {string} paymentMethodId - Payment method identifier
   * @returns {Promise<Object>} Removal confirmation
   */
  removePaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.delete(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}`);
      
      apiEvents.emit('billing:payment_method_removed', {
        organizationId,
        paymentMethodId
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Remove payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Set default payment method
   * @param {string} organizationId - Organization identifier
   * @param {string} paymentMethodId - Payment method identifier
   * @returns {Promise<Object>} Update confirmation
   */
  setDefaultPaymentMethod: async (organizationId, paymentMethodId) => {
    try {
      const response = await api.post(`/api/v1/billing/payment-methods/${organizationId}/${paymentMethodId}/default`);
      
      apiEvents.emit('billing:default_payment_method_changed', {
        organizationId,
        paymentMethodId
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Set default payment method error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT & UPGRADES =====================
  
  /**
   * Create checkout session for new subscription or upgrade
   * @param {Object} data - Checkout session data
   * @returns {Promise<Object>} Checkout session details
   */
  createCheckoutSession: async (data) => {
    try {
      validateResponse(data, ['planId', 'organizationId']);
      
      const response = await api.post('/api/v1/billing/checkout-session', {
        successUrl: data.successUrl || `${window.location.origin}/billing/success`,
        cancelUrl: data.cancelUrl || `${window.location.origin}/billing`,
        ...data
      });
      
      apiEvents.emit('billing:checkout_session_created', response.data);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Create checkout session error:', error);
      throw error;
    }
  },
  
  /**
   * Create customer portal session for self-service billing
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Portal session details
   */
  createPortalSession: async (organizationId) => {
    try {
      const response = await api.post('/api/v1/billing/portal-session', { 
        organizationId,
        returnUrl: `${window.location.origin}/billing`
      });
      
      apiEvents.emit('billing:portal_session_created', response.data);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Create portal session error:', error);
      throw error;
    }
  },
  
  /**
   * Get upgrade options for current subscription
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Upgrade options with pricing
   */
  getUpgradeOptions: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/upgrade-options/${organizationId}`);
      validateResponse(response.data, ['currentPlan', 'availableUpgrades']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get upgrade options error:', error);
      throw error;
    }
  },
  
  // ===================== COUPONS & DISCOUNTS =====================
  
  /**
   * Validate coupon code
   * @param {string} couponCode - Coupon code to validate
   * @returns {Promise<Object>} Coupon validation result
   */
  validateCoupon: async (couponCode) => {
    try {
      const response = await api.get(`/api/v1/billing/coupons/validate/${couponCode}`);
      validateResponse(response.data, ['valid', 'discount']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Validate coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Apply coupon to subscription
   * @param {string} organizationId - Organization identifier
   * @param {string} couponCode - Valid coupon code
   * @returns {Promise<Object>} Updated subscription
   */
  applyCoupon: async (organizationId, couponCode) => {
    try {
      const response = await api.post(`/api/v1/billing/coupons/apply/${organizationId}`, { couponCode });
      
      apiEvents.emit('billing:coupon_applied', {
        organizationId,
        couponCode,
        discount: response.data.discount
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Apply coupon error:', error);
      throw error;
    }
  },
  
  /**
   * Remove coupon from subscription
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Updated subscription
   */
  removeCoupon: async (organizationId) => {
    try {
      const response = await api.delete(`/api/v1/billing/coupons/remove/${organizationId}`);
      
      apiEvents.emit('billing:coupon_removed', { organizationId });
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Remove coupon error:', error);
      throw error;
    }
  },
  
  // ===================== USAGE & METRICS =====================
  
  /**
   * Get usage metrics with period filtering
   * @param {string} organizationId - Organization identifier
   * @param {Object} params - Query parameters (period, startDate, endDate)
   * @returns {Promise<Object>} Usage metrics
   */
  getUsageMetrics: async (organizationId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/billing/usage/${organizationId}`, { 
        params: {
          period: params.period || 'month',
          ...params
        }
      });
      
      validateResponse(response.data, ['current', 'limit', 'percentage']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get usage metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get configured usage alerts
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Array>} List of usage alerts
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
   * @param {string} organizationId - Organization identifier
   * @param {Object} thresholds - Alert threshold percentages
   * @returns {Promise<Object>} Updated alerts
   */
  setUsageAlertThresholds: async (organizationId, thresholds) => {
    try {
      const response = await api.post(`/api/v1/billing/usage-alerts/${organizationId}`, {
        thresholds: {
          warning: thresholds.warning || 80,
          critical: thresholds.critical || 95,
          ...thresholds
        }
      });
      
      apiEvents.emit('billing:usage_alerts_updated', {
        organizationId,
        thresholds: response.data.thresholds
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Set usage alert thresholds error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING PREFERENCES =====================
  
  /**
   * Get billing preferences
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Billing preferences
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
   * @param {string} organizationId - Organization identifier
   * @param {Object} preferences - Updated preferences
   * @returns {Promise<Object>} Updated preferences
   */
  updateBillingPreferences: async (organizationId, preferences) => {
    try {
      const response = await api.put(`/api/v1/billing/preferences/${organizationId}`, preferences);
      
      apiEvents.emit('billing:preferences_updated', {
        organizationId,
        preferences: response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update billing preferences error:', error);
      throw error;
    }
  },
  
  // ===================== TAX & COMPLIANCE =====================
  
  /**
   * Get tax information
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Tax information
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
   * @param {string} organizationId - Organization identifier
   * @param {Object} taxInfo - Updated tax information
   * @returns {Promise<Object>} Updated tax info
   */
  updateTaxInfo: async (organizationId, taxInfo) => {
    try {
      const response = await api.put(`/api/v1/billing/tax/${organizationId}`, taxInfo);
      
      apiEvents.emit('billing:tax_info_updated', {
        organizationId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Update tax info error:', error);
      throw error;
    }
  },
  
  // ===================== HEALTH & MONITORING =====================
  
  /**
   * Check billing service health
   * @returns {Promise<Object>} Health status
   */
  checkBillingHealth: async () => {
    try {
      const response = await api.get('/api/v1/billing/health');
      validateResponse(response.data, ['status', 'timestamp', 'services']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Check billing health error:', error);
      throw error;
    }
  },
  
  /**
   * Get billing statistics
   * @param {string} organizationId - Organization identifier
   * @returns {Promise<Object>} Billing statistics
   */
  getBillingStats: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/billing/stats/${organizationId}`);
      validateResponse(response.data, ['totalSpent', 'invoicesCount', 'avgInvoiceAmount']);
      return response.data;
    } catch (error) {
      console.error('[BillingAPI] Get billing stats error:', error);
      throw error;
    }
  },
  
  // ===================== WEBHOOKS & EVENTS =====================
  
  /**
   * Listen for billing events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`billing:${event}`, callback);
  },
  
  /**
   * Remove billing event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`billing:${event}`, callback);
  },
  
  // ===================== UTILITIES =====================
  
  /**
   * Format currency for display
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (USD, EUR, etc.)
   * @returns {string} Formatted currency string
   */
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount / 100);
  },
  
  /**
   * Calculate prorated upgrade/downgrade amount
   * @param {Object} currentPlan - Current subscription plan
   * @param {Object} newPlan - New subscription plan
   * @param {number} daysRemaining - Days remaining in billing cycle
   * @returns {number} Prorated amount in cents
   */
  calculateProratedAmount: (currentPlan, newPlan, daysRemaining) => {
    const dailyCurrentRate = currentPlan.price / currentPlan.billingCycleDays;
    const dailyNewRate = newPlan.price / newPlan.billingCycleDays;
    const dailyDifference = dailyNewRate - dailyCurrentRate;
    return Math.round(dailyDifference * daysRemaining * 100); // Convert to cents
  },
  
  /**
   * Calculate next billing date
   * @param {Date} lastBillingDate - Last billing date
   * @param {string} interval - Billing interval (month, year)
   * @returns {Date} Next billing date
   */
  calculateNextBillingDate: (lastBillingDate, interval = 'month') => {
    const date = new Date(lastBillingDate);
    if (interval === 'year') {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  }
};

export default billingApi;
