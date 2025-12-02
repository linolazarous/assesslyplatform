// src/api/subscriptionApi.js
// =============================================
// Assessly Platform - Subscription & Billing API
// =============================================
// Matches backend: "Subscription" endpoints in API documentation
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com/api/v1";

// Reuse or create shared utility functions
async function handleResponse(res, defaultMsg) {
  const contentType = res.headers.get('content-type');
  
  if (!res.ok) {
    let errorMessage = defaultMsg;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
      } catch (e) {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (data.success === false) {
      throw new Error(data.message || defaultMsg);
    }
    return data;
  }
  
  return { success: true, message: defaultMsg };
}

function getAuthToken() {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

function buildHeaders(includeAuth = false, contentType = 'application/json') {
  const headers = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * SUBSCRIPTION PLANS
 */

/**
 * Fetch subscription plans
 * GET /api/v1/subscription/plans
 */
export async function fetchSubscriptionPlans(organizationId = null) {
  const params = new URLSearchParams();
  if (organizationId) params.append('organizationId', organizationId);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/subscription/plans${queryString}`, {
    method: "GET",
    headers: buildHeaders(false), // Public endpoint
  });
  
  return handleResponse(res, "Failed to fetch subscription plans");
}

/**
 * Get current subscription
 * GET /api/v1/subscription
 */
export async function getCurrentSubscription(organizationId = null) {
  const params = new URLSearchParams();
  if (organizationId) params.append('organizationId', organizationId);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/subscription${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch current subscription");
}

/**
 * BILLING HISTORY
 */

/**
 * Fetch billing history
 * GET /api/v1/subscription/billing/history
 */
export async function fetchBillingHistory(params = {}) {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/subscription/billing/history${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch billing history");
}

/**
 * Download invoice
 * GET /api/v1/subscription/invoices/:id/download
 */
export async function downloadInvoice(invoiceId) {
  const res = await fetch(`${API_BASE}/subscription/invoices/${invoiceId}/download`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to download invoice: ${res.statusText}`);
  }
  
  return await res.blob();
}

/**
 * PAYMENT METHODS
 */

/**
 * Fetch payment methods
 * GET /api/v1/subscription/payment-methods
 */
export async function fetchPaymentMethods(customerId, organizationId = null) {
  const params = new URLSearchParams();
  params.append('customerId', customerId);
  if (organizationId) params.append('organizationId', organizationId);
  
  const queryString = `?${params.toString()}`;
  
  const res = await fetch(`${API_BASE}/subscription/payment-methods${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch payment methods");
}

/**
 * Add payment method
 * POST /api/v1/subscription/payment-methods
 */
export async function addPaymentMethod(paymentMethodData) {
  const res = await fetch(`${API_BASE}/subscription/payment-methods`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(paymentMethodData),
  });
  
  return handleResponse(res, "Failed to add payment method");
}

/**
 * Delete payment method
 * DELETE /api/v1/subscription/payment-methods/:id
 */
export async function deletePaymentMethod(paymentMethodId) {
  const res = await fetch(`${API_BASE}/subscription/payment-methods/${paymentMethodId}`, {
    method: "DELETE",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to delete payment method");
}

/**
 * Set default payment method
 * PATCH /api/v1/subscription/payment-methods/:id/default
 */
export async function setDefaultPaymentMethod(paymentMethodId) {
  const res = await fetch(`${API_BASE}/subscription/payment-methods/${paymentMethodId}/default`, {
    method: "PATCH",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to set default payment method");
}

/**
 * BILLING PORTAL
 */

/**
 * Create billing portal session
 * POST /api/v1/subscription/billing-portal
 */
export async function createBillingPortalSession(customerId, organizationId = null) {
  const res = await fetch(`${API_BASE}/subscription/billing-portal`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify({ customerId, organizationId }),
  });
  
  return handleResponse(res, "Failed to create billing portal session");
}

/**
 * CHECKOUT
 */

/**
 * Create checkout session
 * POST /api/v1/subscription/checkout
 */
export async function createCheckoutSession(checkoutData) {
  const res = await fetch(`${API_BASE}/subscription/checkout`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(checkoutData),
  });
  
  return handleResponse(res, "Failed to create checkout session");
}

export default {
  // Subscription Plans
  fetchSubscriptionPlans,
  getCurrentSubscription,
  
  // Billing History
  fetchBillingHistory,
  downloadInvoice,
  
  // Payment Methods
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  
  // Billing Portal
  createBillingPortalSession,
  
  // Checkout
  createCheckoutSession,
};
