// src/services/subscriptions.jsx
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { showError, showSuccess } from '../utils/notifications';

// Configure axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?session_expired=true';
    } else if (error.response?.status === 403) {
      showError('You do not have permission to perform this action');
    } else if (error.response?.status === 429) {
      showError('Too many requests. Please try again later.');
    }
    return Promise.reject(error);
  }
);

// Stripe initialization with retry logic
let stripePromise;
const MAX_RETRIES = 2;

const getStripe = async (retryCount = 0) => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripeKey) {
    throw new Error('Stripe public key is not configured. Please contact support.');
  }

  if (!stripePromise) {
    try {
      stripePromise = loadStripe(stripeKey);
    } catch (error) {
      console.error('[Stripe Load Error]:', error);
      throw new Error('Failed to initialize payment system.');
    }
  }

  try {
    const stripe = await stripePromise;
    // Verify Stripe is properly loaded
    if (!stripe || !stripe.elements) {
      throw new Error('Stripe not properly initialized');
    }
    return stripe;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`Retrying Stripe initialization (attempt ${retryCount + 1})`);
      stripePromise = null; // Reset on failure
      return getStripe(retryCount + 1);
    }
    throw error;
  }
};

/**
 * Get available subscription plans with caching
 */
export const getSubscriptionPlans = async (forceRefresh = false) => {
  try {
    const cacheKey = 'subscription_plans';
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    // Return cached data if not expired (5 minutes) and not forced refresh
    if (!forceRefresh && cachedData && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp, 10);
      if (age < 5 * 60 * 1000) { // 5 minutes
        return JSON.parse(cachedData);
      }
    }

    const response = await api.get('/v1/subscriptions/plans');
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(response.data.data));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    
    return response.data.data;
  } catch (error) {
    console.error('[Subscription Plans Error]:', error);
    // Return fallback plans if API fails
    const fallbackPlans = generateFallbackPlans();
    showError('Could not load plans. Showing fallback options.');
    return fallbackPlans;
  }
};

/**
 * Get current organization subscription with detailed analytics
 */
export const getCurrentSubscription = async () => {
  try {
    const response = await api.get('/v1/subscriptions/current');
    return response.data.data;
  } catch (error) {
    // If no subscription exists, return free plan
    if (error.response?.status === 404) {
      return generateFreeSubscription();
    }
    console.error('[Current Subscription Error]:', error);
    throw error;
  }
};

/**
 * Get subscription analytics and usage statistics
 */
export const getSubscriptionAnalytics = async () => {
  try {
    const response = await api.get('/v1/subscriptions/analytics');
    return response.data.data;
  } catch (error) {
    console.error('[Subscription Analytics Error]:', error);
    throw error;
  }
};

/**
 * Check subscription limits with real-time validation
 */
export const checkSubscriptionLimits = async (feature = null) => {
  try {
    const response = await api.get('/v1/subscriptions/limits', {
      params: { feature }
    });
    
    const data = response.data.data;
    
    // Return formatted limits with boolean checks
    return {
      ...data,
      canAddUser: data.users.current < data.users.limit,
      canCreateAssessment: data.assessments.current < data.assessments.limit,
      hasStorageSpace: data.storage.current < data.storage.limit,
      usagePercentages: {
        users: (data.users.current / data.users.limit) * 100,
        assessments: (data.assessments.current / data.assessments.limit) * 100,
        storage: (data.storage.current / data.storage.limit) * 100,
      }
    };
  } catch (error) {
    console.error('[Subscription Limits Error]:', error);
    // Return generous limits if API fails
    return {
      canAddUser: true,
      canCreateAssessment: true,
      hasStorageSpace: true,
      usagePercentages: { users: 0, assessments: 0, storage: 0 }
    };
  }
};

/**
 * Validate if feature is available in current subscription
 */
export const hasFeature = async (featurePath) => {
  try {
    const response = await api.get(`/v1/subscriptions/features/${featurePath}`);
    return response.data.data.hasFeature;
  } catch (error) {
    console.error('[Feature Check Error]:', error);
    // Default to false for safety
    return false;
  }
};

/**
 * Upgrade/downgrade subscription with comprehensive error handling
 */
export const changeSubscription = async (plan, priceId, billingCycle = 'monthly') => {
  try {
    // Validate inputs
    if (!plan || !priceId) {
      throw new Error('Plan and price ID are required');
    }

    // Special handling for free plan
    if (plan === 'free') {
      return await downgradeToFree();
    }

    // Create checkout session for paid plans
    const response = await api.post('/v1/billing/checkout-session', {
      plan,
      priceId,
      billingCycle,
      successUrl: `${window.location.origin}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
      metadata: {
        organizationId: localStorage.getItem('organizationId'),
        userId: localStorage.getItem('userId'),
        userEmail: localStorage.getItem('userEmail'),
        plan,
        billingCycle
      }
    });

    const sessionData = response.data.data;
    
    // Handle free trial (no payment required)
    if (sessionData.isTrial) {
      showSuccess('Free trial started successfully!');
      window.location.href = sessionData.redirectUrl;
      return;
    }

    // Handle paid plans with Stripe
    const stripe = await getStripe();
    const result = await stripe.redirectToCheckout({ 
      sessionId: sessionData.sessionId 
    });

    if (result.error) {
      showError(result.error.message);
      throw new Error(`Payment redirect failed: ${result.error.message}`);
    }
    
  } catch (error) {
    console.error('[Subscription Change Error]:', error);
    
    // User-friendly error messages
    let userMessage = 'Unable to process subscription change. ';
    
    if (error.response) {
      switch (error.response.status) {
        case 402:
          userMessage += 'Payment failed. Please check your payment details.';
          break;
        case 403:
          userMessage += 'You do not have permission to change the subscription.';
          break;
        case 422:
          userMessage += 'Invalid subscription parameters.';
          break;
        case 429:
          userMessage += 'Too many requests. Please try again in a few minutes.';
          break;
        default:
          userMessage += 'Please try again later.';
      }
    } else if (error.message.includes('Stripe')) {
      userMessage = 'Payment system is currently unavailable. Please try again later.';
    }
    
    showError(userMessage);
    throw new Error(userMessage);
  }
};

/**
 * Downgrade to free plan
 */
const downgradeToFree = async () => {
  try {
    const response = await api.post('/v1/subscriptions/downgrade-free');
    showSuccess('Successfully downgraded to Free plan');
    
    // Clear subscription cache
    localStorage.removeItem('subscription_plans');
    localStorage.removeItem('subscription_plans_timestamp');
    
    return response.data.data;
  } catch (error) {
    console.error('[Downgrade Error]:', error);
    throw error;
  }
};

/**
 * Redirect to customer portal for subscription management
 */
export const redirectToCustomerPortal = async () => {
  try {
    const response = await api.post('/v1/billing/portal-session', {
      returnUrl: `${window.location.origin}/dashboard/billing`
    });

    window.location.href = response.data.data.url;
  } catch (error) {
    console.error('[Customer Portal Error]:', error);
    
    if (error.response?.status === 400) {
      showError('No active subscription found. Please upgrade to access billing management.');
    } else {
      showError('Unable to open billing portal. Please contact support.');
    }
    
    throw error;
  }
};

/**
 * Update subscription payment method
 */
export const updatePaymentMethod = async () => {
  try {
    const response = await api.post('/v1/billing/update-payment-method', {
      returnUrl: `${window.location.origin}/dashboard/billing`
    });

    const stripe = await getStripe();
    await stripe.redirectToCheckout({
      sessionId: response.data.data.sessionId
    });
  } catch (error) {
    console.error('[Update Payment Method Error]:', error);
    throw error;
  }
};

/**
 * Get invoice history
 */
export const getInvoiceHistory = async (limit = 10, offset = 0) => {
  try {
    const response = await api.get('/v1/billing/invoices', {
      params: { limit, offset }
    });
    return response.data.data;
  } catch (error) {
    console.error('[Invoice History Error]:', error);
    throw error;
  }
};

/**
 * Download invoice PDF
 */
export const downloadInvoice = async (invoiceId) => {
  try {
    const response = await api.get(`/v1/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    showSuccess('Invoice downloaded successfully');
  } catch (error) {
    console.error('[Download Invoice Error]:', error);
    showError('Failed to download invoice');
    throw error;
  }
};

/**
 * Cancel subscription with optional feedback
 */
export const cancelSubscription = async (reason = 'other', feedback = '') => {
  try {
    // Confirm cancellation
    if (!window.confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return;
    }

    const response = await api.post('/v1/subscriptions/cancel', {
      reason,
      feedback
    });

    showSuccess('Subscription canceled successfully. You will retain access until the end of your billing period.');
    
    // Refresh subscription data
    setTimeout(() => {
      window.location.reload();
    }, 2000);

    return response.data.data;
  } catch (error) {
    console.error('[Cancel Subscription Error]:', error);
    
    if (error.response?.status === 400) {
      showError('Subscription is already canceled or expired.');
    } else {
      showError('Failed to cancel subscription. Please try again or contact support.');
    }
    
    throw error;
  }
};

/**
 * Apply coupon code
 */
export const applyCoupon = async (couponCode) => {
  try {
    const response = await api.post('/v1/billing/coupons/apply', {
      couponCode
    });

    showSuccess('Coupon applied successfully!');
    return response.data.data;
  } catch (error) {
    console.error('[Apply Coupon Error]:', error);
    
    if (error.response?.status === 400) {
      showError('Invalid or expired coupon code.');
    } else if (error.response?.status === 409) {
      showError('Coupon already applied to this subscription.');
    }
    
    throw error;
  }
};

/**
 * Get upcoming renewal details
 */
export const getRenewalDetails = async () => {
  try {
    const response = await api.get('/v1/subscriptions/renewal-details');
    return response.data.data;
  } catch (error) {
    console.error('[Renewal Details Error]:', error);
    throw error;
  }
};

/**
 * Generate fallback plans for offline/error state
 */
const generateFallbackPlans = () => {
  return [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for individuals and small teams getting started',
      price: { monthly: 0, yearly: 0 },
      features: {
        maxUsers: 3,
        maxAssessments: 10,
        maxStorage: 100,
        maxResponses: 100
      },
      isPopular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'For growing teams needing more assessments',
      price: { monthly: 29, yearly: 290 },
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        maxResponses: 1000
      },
      isPopular: true
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For organizations requiring advanced features',
      price: { monthly: 99, yearly: 950 },
      features: {
        maxUsers: 100,
        maxAssessments: 500,
        maxStorage: 5000,
        maxResponses: 5000
      },
      isPopular: false
    }
  ];
};

/**
 * Generate free subscription template
 */
const generateFreeSubscription = () => {
  return {
    id: 'free_default',
    plan: 'free',
    planName: 'Free',
    status: 'active',
    price: { amount: 0, currency: 'USD', billingPeriod: 'monthly' },
    period: {
      startDate: new Date().toISOString(),
      endDate: null,
      trialEndDate: null
    },
    features: {
      maxUsers: 3,
      maxAssessments: 10,
      maxStorage: 100,
      maxResponses: 100
    },
    usage: {
      users: { current: 1, limit: 3, overage: 0 },
      assessments: { current: 0, limit: 10, overage: 0 },
      storage: { current: 0, limit: 100, overage: 0 }
    },
    isActive: true,
    isTrial: false,
    daysRemaining: null
  };
};

/**
 * Subscribe to subscription webhook events
 */
export const subscribeToSubscriptionEvents = (callback) => {
  // In a real app, this would use WebSockets or Server-Sent Events
  // For now, we'll simulate with polling
  const pollInterval = setInterval(async () => {
    try {
      const subscription = await getCurrentSubscription();
      callback('subscription_updated', subscription);
    } catch (error) {
      console.error('[Subscription Polling Error]:', error);
    }
  }, 60000); // Poll every minute

  return () => clearInterval(pollInterval);
};

export default {
  getSubscriptionPlans,
  getCurrentSubscription,
  getSubscriptionAnalytics,
  checkSubscriptionLimits,
  hasFeature,
  changeSubscription,
  redirectToCustomerPortal,
  updatePaymentMethod,
  getInvoiceHistory,
  downloadInvoice,
  cancelSubscription,
  applyCoupon,
  getRenewalDetails,
  subscribeToSubscriptionEvents
};
