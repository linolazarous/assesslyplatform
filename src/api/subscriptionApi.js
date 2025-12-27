// src/api/subscriptionApi.js
import { api, retryWithBackoff, validateResponse, apiEvents, TokenManager } from './index';

/**
 * Subscription API Service for Assessly Platform
 * Fully refactored for reliability, dev-mode mock support, and analytics
 */

const subscriptionApi = {
  // ===================== PLANS =====================

  fetchPlans: async (params = {}) => {
    try {
      if (import.meta.env.MODE === 'development') {
        console.warn('[SubscriptionAPI] Using mock subscription plans');
        return generateMockPlans(params);
      }

      const response = await retryWithBackoff(() =>
        api.get('/api/v1/subscription/plans', {
          params: {
            currency: params.currency || 'USD',
            includeFeatures: true,
            includeComparisons: true,
            includeEligibility: !!params.organizationId,
            organizationId: params.organizationId || TokenManager.getTenantId(),
            ...params
          }
        })
      );

      validateResponse(response.data, ['plans', 'currency', 'updatedAt']);
      apiEvents.emit('subscription:plans_loaded', { count: response.data.plans?.length || 0, ...response.data });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] fetchPlans error:', error);
      apiEvents.emit('subscription:plans_error', { error, params });
      throw error;
    }
  },

  getCurrent: async (options = {}) => {
    try {
      const organizationId = options.organizationId || TokenManager.getTenantId();
      if (!organizationId) throw new Error('Organization context required');

      if (import.meta.env.MODE === 'development') {
        console.warn('[SubscriptionAPI] Using mock subscription');
        return generateMockSubscription(organizationId, options);
      }

      const response = await retryWithBackoff(() =>
        api.get('/api/v1/subscription/current', {
          params: {
            organizationId,
            includeUsage: options.includeUsage ?? true,
            includeInvoices: options.includeInvoices ?? false,
            includePaymentMethods: options.includePaymentMethods ?? false,
            includeTrialInfo: true,
            ...options
          }
        })
      );

      validateResponse(response.data, ['id', 'plan', 'status', 'currentPeriodEnd', 'organizationId']);
      apiEvents.emit('subscription:loaded', { organizationId, ...response.data });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] getCurrent error:', error);
      throw error;
    }
  },

  create: async (data) => {
    try {
      validateResponse(data, ['planId', 'billingCycle']);
      const organizationId = data.organizationId || TokenManager.getTenantId();

      const payload = {
        ...data,
        organizationId,
        customerId: TokenManager.getUserInfo()?.id,
        customerEmail: TokenManager.getUserInfo()?.email,
        createdBy: TokenManager.getUserInfo()?.id,
        timestamp: new Date().toISOString(),
        metadata: { source: 'web_subscription', userAgent: navigator.userAgent, ...data.metadata }
      };

      const response = await retryWithBackoff(() => api.post('/api/v1/subscription', payload));
      validateResponse(response.data, ['subscriptionId', 'status', 'plan', 'currentPeriodEnd']);

      apiEvents.emit('subscription:created', { organizationId, planId: data.planId, subscriptionId: response.data.subscriptionId, ...response.data });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] create error:', error);
      apiEvents.emit('subscription:create_error', { data, error });
      throw error;
    }
  },

  update: async (subscriptionId, updates) => {
    try {
      const payload = { ...updates, updatedBy: TokenManager.getUserInfo()?.id, updatedAt: new Date().toISOString() };
      const response = await retryWithBackoff(() => api.put(`/api/v1/subscription/${subscriptionId}`, payload));
      validateResponse(response.data, ['id', 'plan', 'status', 'updatedAt']);
      apiEvents.emit('subscription:updated', { subscriptionId, updates, updatedBy: TokenManager.getUserInfo()?.id });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] update error:', error);
      throw error;
    }
  },

  cancel: async (subscriptionId, options = {}) => {
    try {
      const payload = { immediate: false, reason: 'User request', cancelledBy: TokenManager.getUserInfo()?.id, cancelledAt: new Date().toISOString(), ...options };
      const response = await retryWithBackoff(() => api.delete(`/api/v1/subscription/${subscriptionId}`, { data: payload }));
      apiEvents.emit('subscription:cancelled', { subscriptionId, ...payload });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] cancel error:', error);
      throw error;
    }
  },

  reactivate: async (subscriptionId) => {
    try {
      const response = await retryWithBackoff(() =>
        api.post(`/api/v1/subscription/${subscriptionId}/reactivate`, { reactivatedBy: TokenManager.getUserInfo()?.id, reactivatedAt: new Date().toISOString() })
      );
      apiEvents.emit('subscription:reactivated', { subscriptionId, reactivatedBy: TokenManager.getUserInfo()?.id });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] reactivate error:', error);
      throw error;
    }
  },

  // ===================== PAYMENT METHODS =====================
  fetchPaymentMethods: async (customerId, params = {}) => {
    try {
      const response = await retryWithBackoff(() =>
        api.get('/api/v1/subscription/payment-methods', { params: { customerId, organizationId: params.organizationId || TokenManager.getTenantId(), ...params } })
      );
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] fetchPaymentMethods error:', error);
      throw error;
    }
  },

  addPaymentMethod: async (data) => {
    try {
      validateResponse(data, ['customerId', 'paymentMethod']);
      const payload = { ...data, addedBy: TokenManager.getUserInfo()?.id, addedAt: new Date().toISOString(), organizationId: data.organizationId || TokenManager.getTenantId() };
      const response = await retryWithBackoff(() => api.post('/api/v1/subscription/payment-methods', payload));
      apiEvents.emit('subscription:payment_method_added', { customerId: data.customerId, paymentMethodId: response.data.id, ...response.data });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] addPaymentMethod error:', error);
      throw error;
    }
  },

  deletePaymentMethod: async (paymentMethodId, options = {}) => {
    try {
      const payload = { deletedBy: TokenManager.getUserInfo()?.id, deletedAt: new Date().toISOString(), ...options };
      const response = await retryWithBackoff(() => api.delete(`/api/v1/subscription/payment-methods/${paymentMethodId}`, { data: payload }));
      apiEvents.emit('subscription:payment_method_deleted', { paymentMethodId, ...payload });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] deletePaymentMethod error:', error);
      throw error;
    }
  },

  setDefaultPaymentMethod: async (paymentMethodId) => {
    try {
      const payload = { updatedBy: TokenManager.getUserInfo()?.id, updatedAt: new Date().toISOString() };
      const response = await retryWithBackoff(() => api.patch(`/api/v1/subscription/payment-methods/${paymentMethodId}/default`, payload));
      apiEvents.emit('subscription:default_payment_method_changed', { paymentMethodId, ...payload });
      return response.data;
    } catch (error) {
      console.error('[SubscriptionAPI] setDefaultPaymentMethod error:', error);
      throw error;
    }
  },

  // ===================== HELPERS =====================
  calculateRenewalDate: (startDate, cycle = 'monthly') => {
    const date = new Date(startDate);
    if (cycle === 'annual') date.setFullYear(date.getFullYear() + 1);
    else if (cycle === 'biennial') date.setFullYear(date.getFullYear() + 2);
    else date.setMonth(date.getMonth() + 1);
    return date;
  },

  formatAmount: (amount, currency = 'USD') => {
    if (amount === 0) return 'Free';
    if (!amount) return 'Custom';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount / 100);
  },

  on: (event, cb) => apiEvents.on(`subscription:${event}`, cb),
  off: (event, cb) => apiEvents.off(`subscription:${event}`, cb)
};

// ===================== MOCKS =====================
function generateMockPlans(params) {
  const plans = [
    { id: 'free', name: 'Free', pricing: { monthly: { amount: 0, currency: params.currency || 'USD' } }, features: { assessments: 50 }, trial: { available: false } },
    { id: 'basic', name: 'Basic', pricing: { monthly: { amount: 2900, currency: params.currency || 'USD' } }, features: { assessments: 100 }, trial: { available: true, durationDays: 14 } },
    { id: 'pro', name: 'Professional', pricing: { monthly: { amount: 7900, currency: params.currency || 'USD' } }, features: { assessments: 500 }, trial: { available: true, durationDays: 14 } },
    { id: 'enterprise', name: 'Enterprise', pricing: { monthly: { amount: null, currency: params.currency || 'USD' } }, features: { assessments: 'Unlimited' }, trial: { available: false } }
  ];
  return { plans, currency: params.currency || 'USD', updatedAt: new Date().toISOString(), fromMock: true };
}

function generateMockSubscription(orgId, options) {
  const plans = generateMockPlans({}).plans;
  const plan = plans[2];
  return {
    id: `sub_mock_${orgId}`,
    plan,
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    organizationId: orgId,
    customerId: `cus_mock_${orgId}`,
    trialEnd: null,
    quantity: 1,
    metadata: {},
    usage: options.includeUsage ? { assessments: { used: 125, limit: 500, percentage: 25 } } : undefined,
    fromMock: true
  };
}

export default subscriptionApi;
