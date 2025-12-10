// src/api/subscriptionApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';
import { pricingApi } from './index';

/**
 * Subscription API Service for Assessly Platform
 * Comprehensive subscription management, billing, and payment processing
 * Multi-tenant subscription handling with Stripe integration
 */

const subscriptionApi = {
  // ===================== SUBSCRIPTION PLANS =====================
  
  /**
   * Fetch subscription plans with pricing and feature details
   * @param {Object} params - Plan query parameters
   * @param {string} params.currency - Currency for pricing
   * @param {string} params.region - Regional pricing adjustments
   * @param {boolean} params.includeEnterprise - Include enterprise plans
   * @param {string} params.organizationId - Organization context for eligibility
   * @returns {Promise<Object>} Subscription plans with details
   */
  fetchSubscriptionPlans: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/subscription/plans', {
        params: {
          currency: params.currency || 'USD',
          includeFeatures: true,
          includeComparisons: true,
          includeEligibility: !!params.organizationId,
          organizationId: params.organizationId || TokenManager.getTenantId(),
          ...params
        }
      });
      
      validateResponse(response.data, ['plans', 'currency', 'updatedAt']);
      
      // Emit plans loaded event
      apiEvents.emit('subscription:plans_loaded', {
        count: response.data.plans?.length || 0,
        currency: response.data.currency,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Fetch subscription plans error:', error);
      
      // Development mock data
      if (import.meta.env.MODE === 'development') {
        console.warn('[SubscriptionAPI] Using mock subscription plans for development');
        return generateMockSubscriptionPlans(params);
      }
      
      apiEvents.emit('subscription:plans_error', { error, params });
      throw error;
    }
  },
  
  /**
   * Get current subscription with detailed information
   * @param {Object} options - Subscription details options
   * @param {boolean} options.includeUsage - Include usage metrics
   * @param {boolean} options.includeInvoices - Include invoice history
   * @param {boolean} options.includePaymentMethods - Include payment methods
   * @param {string} options.organizationId - Specific organization ID
   * @returns {Promise<Object>} Current subscription details
   */
  getCurrentSubscription: async (options = {}) => {
    try {
      const organizationId = options.organizationId || TokenManager.getTenantId();
      
      if (!organizationId) {
        throw new Error('Organization context required for subscription');
      }
      
      const response = await api.get('/api/v1/subscription/current', {
        params: {
          organizationId,
          includeUsage: options.includeUsage || true,
          includeInvoices: options.includeInvoices || false,
          includePaymentMethods: options.includePaymentMethods || false,
          includeTrialInfo: true,
          ...options
        }
      });
      
      validateResponse(response.data, [
        'id', 
        'plan', 
        'status', 
        'currentPeriodEnd',
        'organizationId'
      ]);
      
      // Update local subscription context
      apiEvents.emit('subscription:loaded', {
        organizationId,
        plan: response.data.plan,
        status: response.data.status,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get current subscription error:', error);
      
      if (import.meta.env.MODE === 'development') {
        console.warn('[SubscriptionAPI] Using mock subscription data for development');
        return generateMockSubscription(options.organizationId || TokenManager.getTenantId(), options);
      }
      
      throw error;
    }
  },
  
  /**
   * Create new subscription or change plan
   * @param {Object} subscriptionData - Subscription creation data
   * @param {string} subscriptionData.planId - Selected plan ID
   * @param {string} subscriptionData.billingCycle - Billing cycle (monthly, annual)
   * @param {string} subscriptionData.organizationId - Organization ID
   * @param {Array<string>} subscriptionData.couponCodes - Applied coupon codes
   * @param {Object} subscriptionData.metadata - Additional metadata
   * @returns {Promise<Object>} Subscription creation result
   */
  createSubscription: async (subscriptionData) => {
    try {
      validateResponse(subscriptionData, ['planId', 'billingCycle']);
      
      const organizationId = subscriptionData.organizationId || TokenManager.getTenantId();
      
      const response = await api.post('/api/v1/subscription', {
        ...subscriptionData,
        organizationId,
        customerId: TokenManager.getUserInfo()?.id,
        customerEmail: TokenManager.getUserInfo()?.email,
        createdBy: TokenManager.getUserInfo()?.id,
        timestamp: new Date().toISOString(),
        metadata: {
          userAgent: navigator.userAgent,
          source: 'web_subscription',
          ...subscriptionData.metadata
        }
      });
      
      validateResponse(response.data, ['subscriptionId', 'status', 'plan', 'currentPeriodEnd']);
      
      apiEvents.emit('subscription:created', {
        organizationId,
        planId: subscriptionData.planId,
        billingCycle: subscriptionData.billingCycle,
        subscriptionId: response.data.subscriptionId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Create subscription error:', error);
      apiEvents.emit('subscription:create_error', { data: subscriptionData, error });
      throw error;
    }
  },
  
  /**
   * Update subscription (plan change, add-ons, etc.)
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} updates - Update data
   * @param {string} updates.planId - New plan ID
   * @param {string} updates.billingCycle - New billing cycle
   * @param {Array<string>} updates.addons - Additional features
   * @param {Object} updates.metadata - Updated metadata
   * @returns {Promise<Object>} Updated subscription
   */
  updateSubscription: async (subscriptionId, updates) => {
    try {
      const response = await api.put(`/api/v1/subscription/${subscriptionId}`, {
        ...updates,
        updatedBy: TokenManager.getUserInfo()?.id,
        updatedAt: new Date().toISOString(),
        prorationDate: new Date().toISOString()
      });
      
      validateResponse(response.data, ['id', 'plan', 'status', 'updatedAt', 'proration']);
      
      apiEvents.emit('subscription:updated', {
        subscriptionId,
        updates,
        proration: response.data.proration,
        updatedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Update subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Cancel subscription (immediate or end of period)
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} options - Cancellation options
   * @param {boolean} options.immediate - Cancel immediately vs end of period
   * @param {string} options.reason - Cancellation reason
   * @param {string} options.feedback - User feedback
   * @returns {Promise<Object>} Cancellation result
   */
  cancelSubscription: async (subscriptionId, options = {}) => {
    try {
      const response = await api.delete(`/api/v1/subscription/${subscriptionId}`, {
        data: {
          immediate: options.immediate || false,
          reason: options.reason || 'User request',
          feedback: options.feedback || '',
          cancelledBy: TokenManager.getUserInfo()?.id,
          cancelledAt: new Date().toISOString(),
          ...options
        }
      });
      
      apiEvents.emit('subscription:cancelled', {
        subscriptionId,
        immediate: options.immediate,
        reason: options.reason,
        cancelledBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Cancel subscription error:', error);
      throw error;
    }
  },
  
  /**
   * Reactivate cancelled subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Reactivation result
   */
  reactivateSubscription: async (subscriptionId) => {
    try {
      const response = await api.post(`/api/v1/subscription/${subscriptionId}/reactivate`, {
        reactivatedBy: TokenManager.getUserInfo()?.id,
        reactivatedAt: new Date().toISOString()
      });
      
      apiEvents.emit('subscription:reactivated', {
        subscriptionId,
        reactivatedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Reactivate subscription error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING & INVOICES =====================
  
  /**
   * Fetch billing history with pagination
   * @param {Object} params - Billing history parameters
   * @returns {Promise<Object>} Billing history with invoices
   */
  fetchBillingHistory: async (params = {}) => {
    try {
      const organizationId = params.organizationId || TokenManager.getTenantId();
      
      const response = await api.get('/api/v1/subscription/billing/history', {
        params: {
          organizationId,
          page: params.page || 1,
          limit: params.limit || 20,
          startDate: params.startDate,
          endDate: params.endDate,
          includeRefunds: params.includeRefunds || false,
          ...params
        }
      });
      
      validateResponse(response.data, ['invoices', 'pagination', 'summary']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Fetch billing history error:', error);
      throw error;
    }
  },
  
  /**
   * Download invoice as PDF
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Blob>} Invoice PDF blob
   */
  downloadInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/api/v1/subscription/invoices/${invoiceId}/download`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Download invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Get invoice details
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice details
   */
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/api/v1/subscription/invoices/${invoiceId}`);
      validateResponse(response.data, ['id', 'amount', 'status', 'items', 'period']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Send invoice via email
   * @param {string} invoiceId - Invoice ID
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send confirmation
   */
  sendInvoiceEmail: async (invoiceId, options = {}) => {
    try {
      const response = await api.post(`/api/v1/subscription/invoices/${invoiceId}/send`, {
        email: options.email,
        sendCopy: options.sendCopy !== false,
        includePdf: options.includePdf !== false,
        ...options
      });
      
      apiEvents.emit('subscription:invoice_sent', {
        invoiceId,
        email: options.email,
        sentAt: new Date().toISOString()
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Send invoice email error:', error);
      throw error;
    }
  },
  
  // ===================== PAYMENT METHODS =====================
  
  /**
   * Fetch payment methods for customer
   * @param {string} customerId - Customer/Stripe customer ID
   * @param {Object} params - Payment methods parameters
   * @returns {Promise<Array>} Payment methods list
   */
  fetchPaymentMethods: async (customerId, params = {}) => {
    try {
      const response = await api.get('/api/v1/subscription/payment-methods', {
        params: {
          customerId,
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includeExpired: params.includeExpired || false,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Fetch payment methods error:', error);
      throw error;
    }
  },
  
  /**
   * Add new payment method
   * @param {Object} paymentMethodData - Payment method details
   * @param {string} paymentMethodData.customerId - Customer ID
   * @param {Object} paymentMethodData.paymentMethod - Payment method token/object
   * @param {boolean} paymentMethodData.setAsDefault - Set as default payment method
   * @returns {Promise<Object>} Added payment method
   */
  addPaymentMethod: async (paymentMethodData) => {
    try {
      validateResponse(paymentMethodData, ['customerId', 'paymentMethod']);
      
      const response = await api.post('/api/v1/subscription/payment-methods', {
        ...paymentMethodData,
        addedBy: TokenManager.getUserInfo()?.id,
        addedAt: new Date().toISOString(),
        organizationId: paymentMethodData.organizationId || TokenManager.getTenantId()
      });
      
      apiEvents.emit('subscription:payment_method_added', {
        customerId: paymentMethodData.customerId,
        paymentMethodId: response.data.id,
        type: response.data.type,
        setAsDefault: paymentMethodData.setAsDefault
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Add payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Delete payment method
   * @param {string} paymentMethodId - Payment method ID
   * @param {Object} options - Delete options
   * @returns {Promise<Object>} Delete confirmation
   */
  deletePaymentMethod: async (paymentMethodId, options = {}) => {
    try {
      const response = await api.delete(`/api/v1/subscription/payment-methods/${paymentMethodId}`, {
        data: {
          deletedBy: TokenManager.getUserInfo()?.id,
          deletedAt: new Date().toISOString(),
          reason: options.reason || 'User request',
          ...options
        }
      });
      
      apiEvents.emit('subscription:payment_method_deleted', {
        paymentMethodId,
        deletedBy: TokenManager.getUserInfo()?.id,
        reason: options.reason
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Delete payment method error:', error);
      throw error;
    }
  },
  
  /**
   * Set default payment method
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Update confirmation
   */
  setDefaultPaymentMethod: async (paymentMethodId) => {
    try {
      const response = await api.patch(`/api/v1/subscription/payment-methods/${paymentMethodId}/default`, {
        updatedBy: TokenManager.getUserInfo()?.id,
        updatedAt: new Date().toISOString()
      });
      
      apiEvents.emit('subscription:default_payment_method_changed', {
        paymentMethodId,
        updatedBy: TokenManager.getUserInfo()?.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Set default payment method error:', error);
      throw error;
    }
  },
  
  // ===================== BILLING PORTAL =====================
  
  /**
   * Create billing portal session for customer self-service
   * @param {string} customerId - Stripe customer ID
   * @param {Object} options - Portal options
   * @returns {Promise<Object>} Portal session details
   */
  createBillingPortalSession: async (customerId, options = {}) => {
    try {
      const response = await api.post('/api/v1/subscription/billing-portal', {
        customerId,
        organizationId: options.organizationId || TokenManager.getTenantId(),
        returnUrl: options.returnUrl || `${window.location.origin}/billing`,
        configuration: options.configuration || 'default',
        flow: options.flow || {
          billingUpdate: options.allowBillingUpdate !== false,
          paymentMethodUpdate: options.allowPaymentMethodUpdate !== false,
          subscriptionCancel: options.allowSubscriptionCancel || false,
          subscriptionUpdate: options.allowSubscriptionUpdate || false
        },
        locale: options.locale || 'auto'
      });
      
      apiEvents.emit('subscription:portal_session_created', {
        customerId,
        url: response.data.url,
        expiresAt: response.data.expiresAt
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Create billing portal session error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT =====================
  
  /**
   * Create checkout session for new subscription or upgrade
   * @param {Object} checkoutData - Checkout configuration
   * @returns {Promise<Object>} Checkout session details
   */
  createCheckoutSession: async (checkoutData) => {
    try {
      validateResponse(checkoutData, ['planId', 'billingCycle']);
      
      const organizationId = checkoutData.organizationId || TokenManager.getTenantId();
      
      const response = await api.post('/api/v1/subscription/checkout', {
        ...checkoutData,
        organizationId,
        customerId: checkoutData.customerId || TokenManager.getUserInfo()?.id,
        customerEmail: checkoutData.customerEmail || TokenManager.getUserInfo()?.email,
        successUrl: checkoutData.successUrl || `${window.location.origin}/billing/success`,
        cancelUrl: checkoutData.cancelUrl || `${window.location.origin}/pricing`,
        mode: checkoutData.mode || 'subscription',
        allowPromotionCodes: checkoutData.allowPromotionCodes !== false,
        metadata: {
          userId: TokenManager.getUserInfo()?.id,
          organizationId,
          source: 'web_checkout',
          userAgent: navigator.userAgent,
          ...checkoutData.metadata
        }
      });
      
      validateResponse(response.data, ['sessionId', 'url', 'expiresAt']);
      
      apiEvents.emit('subscription:checkout_session_created', {
        planId: checkoutData.planId,
        billingCycle: checkoutData.billingCycle,
        sessionId: response.data.sessionId,
        organizationId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Create checkout session error:', error);
      apiEvents.emit('subscription:checkout_error', { data: checkoutData, error });
      throw error;
    }
  },
  
  /**
   * Retrieve checkout session details
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<Object>} Session details
   */
  getCheckoutSession: async (sessionId) => {
    try {
      const response = await api.get(`/api/v1/subscription/checkout/session/${sessionId}`);
      validateResponse(response.data, ['id', 'status', 'customer', 'subscription']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get checkout session error:', error);
      throw error;
    }
  },
  
  // ===================== TRIAL MANAGEMENT =====================
  
  /**
   * Check trial eligibility for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Eligibility status
   */
  checkTrialEligibility: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/subscription/trials/eligibility/${organizationId}`);
      validateResponse(response.data, ['eligible', 'reason', 'duration']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Check trial eligibility error:', error);
      throw error;
    }
  },
  
  /**
   * Start free trial for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Trial options
   * @returns {Promise<Object>} Trial activation result
   */
  startFreeTrial: async (organizationId, options = {}) => {
    try {
      const response = await api.post(`/api/v1/subscription/trials/start/${organizationId}`, {
        planId: options.planId || 'professional',
        duration: options.duration || 14,
        notify: options.notify !== false,
        trialType: options.trialType || 'standard',
        ...options
      });
      
      apiEvents.emit('subscription:trial_started', {
        organizationId,
        plan: response.data.plan,
        duration: response.data.duration,
        expiresAt: response.data.expiresAt
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Start free trial error:', error);
      throw error;
    }
  },
  
  /**
   * Get trial status and remaining time
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Trial status
   */
  getTrialStatus: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/subscription/trials/status/${organizationId}`);
      validateResponse(response.data, ['active', 'expiresAt', 'remainingDays', 'plan']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get trial status error:', error);
      throw error;
    }
  },
  
  // ===================== COUPONS & PROMOTIONS =====================
  
  /**
   * Validate coupon code
   * @param {string} couponCode - Coupon code to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  validateCouponCode: async (couponCode, options = {}) => {
    try {
      const response = await api.get(`/api/v1/subscription/coupons/validate/${couponCode}`, {
        params: {
          organizationId: options.organizationId || TokenManager.getTenantId(),
          planId: options.planId,
          billingCycle: options.billingCycle,
          ...options
        }
      });
      
      validateResponse(response.data, ['valid', 'discount', 'description', 'expiresAt']);
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Validate coupon code error:', error);
      throw error;
    }
  },
  
  /**
   * Get active promotions
   * @param {Object} params - Promotion parameters
   * @returns {Promise<Array>} Active promotions
   */
  getActivePromotions: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/subscription/promotions/active', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          eligibleOnly: params.eligibleOnly || false,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get active promotions error:', error);
      throw error;
    }
  },
  
  // ===================== WEBHOOKS & EVENTS =====================
  
  /**
   * Get subscription webhook events
   * @param {Object} params - Event parameters
   * @returns {Promise<Object>} Webhook events
   */
  getSubscriptionEvents: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/subscription/events', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          types: params.types || ['subscription.created', 'subscription.updated', 'payment.succeeded'],
          limit: params.limit || 50,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] Get subscription events error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get subscription status options
   * @returns {Array<Object>} Status options
   */
  getSubscriptionStatuses: () => {
    return [
      { value: 'active', label: 'Active', color: 'green', icon: 'check-circle' },
      { value: 'trialing', label: 'Trial', color: 'blue', icon: 'clock' },
      { value: 'past_due', label: 'Past Due', color: 'orange', icon: 'alert-circle' },
      { value: 'unpaid', label: 'Unpaid', color: 'red', icon: 'x-circle' },
      { value: 'canceled', label: 'Canceled', color: 'gray', icon: 'slash-circle' },
      { value: 'incomplete', label: 'Incomplete', color: 'yellow', icon: 'circle' },
      { value: 'incomplete_expired', label: 'Expired', color: 'gray', icon: 'calendar-x' }
    ];
  },
  
  /**
   * Get billing cycle options
   * @returns {Array<Object>} Billing cycle options
   */
  getBillingCycles: () => {
    return [
      { value: 'monthly', label: 'Monthly', discount: 0, description: 'Pay month-to-month' },
      { value: 'annual', label: 'Annual', discount: 20, description: 'Save 20% with annual billing' },
      { value: 'biennial', label: 'Biennial', discount: 30, description: 'Save 30% with 2-year billing' }
    ];
  },
  
  /**
   * Calculate subscription renewal date
   * @param {Date} startDate - Subscription start date
   * @param {string} billingCycle - Billing cycle
   * @returns {Date} Renewal date
   */
  calculateRenewalDate: (startDate, billingCycle = 'monthly') => {
    const date = new Date(startDate);
    
    switch (billingCycle) {
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'biennial':
        date.setFullYear(date.getFullYear() + 2);
        break;
      default: // monthly
        date.setMonth(date.getMonth() + 1);
    }
    
    return date;
  },
  
  /**
   * Format subscription amount
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code
   * @returns {string} Formatted amount
   */
  formatAmount: (amount, currency = 'USD') => {
    if (amount === 0) return 'Free';
    if (!amount) return 'Custom';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100);
  },
  
  /**
   * Get plan feature comparison
   * @param {Array} plans - Plans to compare
   * @returns {Array} Feature comparison matrix
   */
  getPlanComparison: (plans) => {
    if (!plans || !plans.length) return [];
    
    const features = [
      { key: 'assessments', label: 'Monthly Assessments', type: 'limit' },
      { key: 'questionTypes', label: 'Question Types', type: 'count' },
      { key: 'storage', label: 'Storage', type: 'storage' },
      { key: 'teamMembers', label: 'Team Members', type: 'count' },
      { key: 'apiAccess', label: 'API Access', type: 'boolean' },
      { key: 'customBranding', label: 'Custom Branding', type: 'boolean' },
      { key: 'analytics', label: 'Advanced Analytics', type: 'boolean' },
      { key: 'prioritySupport', label: 'Priority Support', type: 'boolean' },
      { key: 'ssoIntegration', label: 'SSO Integration', type: 'boolean' },
      { key: 'dedicatedManager', label: 'Dedicated Manager', type: 'boolean' },
      { key: 'sla', label: 'SLA Guarantee', type: 'boolean' }
    ];
    
    return features.map(feature => ({
      ...feature,
      plans: plans.map(plan => ({
        planId: plan.id,
        value: plan.features?.[feature.key],
        included: !['0', 'false', false, null, undefined].includes(plan.features?.[feature.key])
      }))
    }));
  },
  
  /**
   * Subscribe to subscription events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`subscription:${event}`, callback);
  },
  
  /**
   * Unsubscribe from subscription events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`subscription:${event}`, callback);
  },
  
  /**
   * Initialize subscription module
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      const organizationId = TokenManager.getTenantId();
      
      if (!organizationId) {
        return {
          success: false,
          authorized: false,
          message: 'Organization context required'
        };
      }
      
      // Check current subscription
      const subscription = await subscriptionApi.getCurrentSubscription({
        organizationId,
        includeUsage: true
      });
      
      // Load subscription plans
      const plans = await subscriptionApi.fetchSubscriptionPlans({
        organizationId,
        currency: 'USD'
      });
      
      apiEvents.emit('subscription:initialized', {
        organizationId,
        hasSubscription: !!subscription,
        plan: subscription?.plan,
        planCount: plans.plans?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        authorized: true,
        subscription,
        plans: plans.plans || [],
        featureComparison: subscriptionApi.getPlanComparison(plans.plans || [])
      };
    } catch (error) {
      console.error('[SubscriptionAPI] Initialize error:', error);
      return {
        success: false,
        authorized: false,
        error: error.message,
        subscription: null,
        plans: []
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Generate mock subscription plans for development
 */
function generateMockSubscriptionPlans(params) {
  const basePlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'For individuals and small projects',
      level: 0,
      pricing: {
        monthly: { amount: 0, currency: params.currency || 'USD', stripePriceId: null },
        annual: { amount: 0, currency: params.currency || 'USD', stripePriceId: null, savings: 0 }
      },
      features: {
        assessments: '50',
        questionTypes: '5',
        storage: '2GB',
        teamMembers: '1',
        apiAccess: false,
        customBranding: false,
        analytics: false,
        prioritySupport: false,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      trial: { available: false, durationDays: 0 },
      eligibility: { available: true, requirements: [] }
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'For small teams getting started',
      level: 1,
      pricing: {
        monthly: { amount: 2900, currency: params.currency || 'USD', stripePriceId: 'price_basic_monthly' },
        annual: { amount: 29000, currency: params.currency || 'USD', stripePriceId: 'price_basic_annual', savings: 17 }
      },
      features: {
        assessments: '100',
        questionTypes: '8',
        storage: '5GB',
        teamMembers: '5',
        apiAccess: false,
        customBranding: false,
        analytics: true,
        prioritySupport: false,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      trial: { available: true, durationDays: 14 },
      eligibility: { available: true, requirements: [] }
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams and businesses',
      level: 2,
      popular: true,
      pricing: {
        monthly: { amount: 7900, currency: params.currency || 'USD', stripePriceId: 'price_professional_monthly' },
        annual: { amount: 79000, currency: params.currency || 'USD', stripePriceId: 'price_professional_annual', savings: 20 }
      },
      features: {
        assessments: '500',
        questionTypes: '12',
        storage: '50GB',
        teamMembers: '25',
        apiAccess: true,
        customBranding: true,
        analytics: true,
        prioritySupport: true,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      trial: { available: true, durationDays: 14 },
      eligibility: { available: true, requirements: [] }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with complex needs',
      level: 3,
      pricing: {
        monthly: { amount: null, currency: params.currency || 'USD', stripePriceId: null },
        annual: { amount: null, currency: params.currency || 'USD', stripePriceId: null, savings: 0 }
      },
      features: {
        assessments: 'Unlimited',
        questionTypes: 'All',
        storage: 'Unlimited',
        teamMembers: 'Unlimited',
        apiAccess: true,
        customBranding: true,
        analytics: true,
        prioritySupport: true,
        ssoIntegration: true,
        dedicatedManager: true,
        sla: true
      },
      trial: { available: false, durationDays: 0 },
      eligibility: { available: true, requirements: ['Minimum 50 users', 'Annual contract'] }
    }
  ];
  
  return {
    plans: basePlans,
    currency: params.currency || 'USD',
    updatedAt: new Date().toISOString(),
    fromMock: true
  };
}

/**
 * Generate mock subscription data
 */
function generateMockSubscription(organizationId, options) {
  const plans = generateMockSubscriptionPlans({}).plans;
  const currentPlan = plans.find(p => p.id === 'professional') || plans[1];
  
  return {
    id: `sub_mock_${organizationId}`,
    plan: currentPlan,
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    organizationId,
    customerId: `cus_mock_${organizationId}`,
    trialEnd: null,
    quantity: 1,
    metadata: {},
    usage: options.includeUsage ? {
      assessments: { used: 125, limit: 500, percentage: 25 },
      storage: { used: 12.5, limit: 50, unit: 'GB', percentage: 25 },
      teamMembers: { used: 8, limit: 25, percentage: 32 },
      apiCalls: { used: 1250, limit: 5000, percentage: 25 }
    } : undefined,
    invoices: options.includeInvoices ? Array.from({ length: 3 }, (_, i) => ({
      id: `inv_mock_${i + 1}`,
      amount: currentPlan.pricing.monthly.amount,
      currency: 'USD',
      status: 'paid',
      date: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      downloadUrl: '#'
    })) : undefined,
    paymentMethods: options.includePaymentMethods ? [
      {
        id: 'pm_mock_1',
        type: 'card',
        card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
        isDefault: true
      }
    ] : undefined,
    fromMock: true
  };
}

export default subscriptionApi;
