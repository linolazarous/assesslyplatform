// src/api/billingApi.js
import { api, retryWithBackoff, validateResponse, apiEvents } from './index';

/**
 * Billing API Service
 * Enterprise-grade subscription management
 */

const billingApi = {
  /* ===================== SUBSCRIPTION PLANS ===================== */

  getSubscriptionPlans: async () => {
    try {
      const response = await api.get('/billing/plans');
      return validateResponse(response);
    } catch (error) {
      apiEvents.emit('billing:error', { action: 'getPlans', error });
      throw error;
    }
  },

  getPlanFeatures: async (planId) => {
    try {
      const response = await api.get(`/billing/plans/${planId}/features`);
      return validateResponse(response);
    } catch (error) {
      throw error;
    }
  },

  /* ===================== SUBSCRIPTIONS ===================== */

  getSubscription: async (organizationId) =>
    retryWithBackoff(async () => {
      const response = await api.get(`/billing/subscriptions/${organizationId}`);
      apiEvents.emit('billing:subscription_loaded', response.data);
      return validateResponse(response);
    }),

  updateSubscription: async (organizationId, data) => {
    const response = await api.put(
      `/billing/subscriptions/${organizationId}`,
      data
    );

    apiEvents.emit('billing:subscription_updated', response.data);
    return validateResponse(response);
  },

  cancelSubscription: async (organizationId, data = {}) => {
    const response = await api.delete(
      `/billing/subscriptions/${organizationId}`,
      { data }
    );

    apiEvents.emit('billing:subscription_cancelled', response.data);
    return validateResponse(response);
  },

  reactivateSubscription: async (organizationId) => {
    const response = await api.post(
      `/billing/subscriptions/${organizationId}/reactivate`
    );

    apiEvents.emit('billing:subscription_reactivated', response.data);
    return validateResponse(response);
  },

  /* ===================== BILLING & INVOICES ===================== */

  getBillingInfo: async (organizationId) => {
    const response = await api.get(`/billing/info/${organizationId}`);
    return validateResponse(response);
  },

  getBillingHistory: async (organizationId, params = {}) => {
    const response = await api.get(
      `/billing/history/${organizationId}`,
      { params }
    );
    return validateResponse(response);
  },

  getInvoice: async (invoiceId) => {
    const response = await api.get(`/billing/invoices/${invoiceId}`);
    return validateResponse(response);
  },

  downloadInvoice: async (invoiceId) => {
    const response = await api.get(
      `/billing/invoices/${invoiceId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  sendInvoiceEmail: async (invoiceId, email) => {
    const response = await api.post(
      `/billing/invoices/${invoiceId}/send`,
      { email }
    );

    apiEvents.emit('billing:invoice_sent', { invoiceId, email });
    return validateResponse(response);
  },

  /* ===================== PAYMENT METHODS ===================== */

  getPaymentMethods: async (organizationId) => {
    const response = await api.get(
      `/billing/payment-methods/${organizationId}`
    );
    return validateResponse(response);
  },

  addPaymentMethod: async (organizationId, paymentMethod) => {
    const response = await api.post(
      `/billing/payment-methods/${organizationId}`,
      paymentMethod
    );

    apiEvents.emit('billing:payment_method_added', response.data);
    return validateResponse(response);
  },

  removePaymentMethod: async (organizationId, paymentMethodId) => {
    const response = await api.delete(
      `/billing/payment-methods/${organizationId}/${paymentMethodId}`
    );

    apiEvents.emit('billing:payment_method_removed', {
      organizationId,
      paymentMethodId
    });

    return validateResponse(response);
  },

  /* ===================== CHECKOUT ===================== */

  createCheckoutSession: async (data) => {
    const response = await api.post(
      '/billing/checkout-session',
      data
    );

    apiEvents.emit('billing:checkout_created', response.data);
    return validateResponse(response);
  },

  createPortalSession: async (organizationId) => {
    const response = await api.post(
      '/billing/portal-session',
      { organizationId }
    );

    return validateResponse(response);
  },

  /* ===================== UTILITIES ===================== */

  formatCurrency: (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount / 100),
};

export default billingApi;
