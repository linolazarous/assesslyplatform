// src/services/subscriptions.jsx
import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

const getStripe = () => {
  if (!stripePromise) {
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      throw new Error("Stripe public key (VITE_STRIPE_PUBLIC_KEY) is not configured.");
    }
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const response = await fetch('/api/subscriptions/plans');
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed to fetch plans');
    return data.plans;
  } catch (error) {
    console.error('[Subscription Plans Error]:', error);
    throw error;
  }
};

/**
 * Get current organization subscription
 */
export const getCurrentSubscription = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token missing');

    const response = await fetch('/api/subscriptions/current', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch subscription');
    return data;
  } catch (error) {
    console.error('[Current Subscription Error]:', error);
    throw error;
  }
};

/**
 * Check subscription limits
 */
export const checkSubscriptionLimits = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token missing');

    const response = await fetch('/api/subscriptions/limits', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to check limits');
    return data;
  } catch (error) {
    console.error('[Subscription Limits Error]:', error);
    throw error;
  }
};

/**
 * Upgrade/downgrade subscription
 */
export const changeSubscription = async (plan, priceId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token missing');

    const response = await fetch('/api/billing/checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan,
        priceId,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');

    // Handle free plan (no Stripe redirect needed)
    if (data.isFree) {
      window.location.href = data.url;
      return;
    }

    // Handle paid plans with Stripe redirect
    const stripe = await getStripe();
    const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('[Subscription Change Error]:', error);
    throw new Error(error.message || 'Unable to process subscription change. Please try again.');
  }
};

/**
 * Redirect to customer portal for subscription management
 */
export const redirectToCustomerPortal = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token missing');

    const response = await fetch('/api/billing/portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/billing`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');

    window.location.href = data.url;
  } catch (error) {
    console.error('[Customer Portal Error]:', error);
    throw new Error(error.message || 'Unable to open customer portal. Please try again.');
  }
};

/**
 * Cancel subscription (downgrade to free)
 */
export const cancelSubscription = async () => {
  try {
    // This would typically be handled through the Stripe portal
    // For immediate cancellation, you might have a separate endpoint
    await redirectToCustomerPortal();
  } catch (error) {
    console.error('[Cancel Subscription Error]:', error);
    throw error;
  }
};
