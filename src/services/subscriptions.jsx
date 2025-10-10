// src/services/subscriptions.jsx
import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

/**
 * Lazily loads and returns the Stripe promise object.
 */
const getStripe = () => {
  if (!stripePromise) {
    // Ensure environment variable is defined
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      throw new Error("Stripe public key (VITE_STRIPE_PUBLIC_KEY) is not configured.");
    }
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

/**
 * Redirect user to Stripe checkout session
 */
export const redirectToCheckout = async (orgId, priceId) => {
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
        orgId,
        priceId,
        // Standardize success/cancel URLs based on organizational structure
        successUrl: `${window.location.origin}/organization/${orgId}/billing?success=true`,
        cancelUrl: `${window.location.origin}/organization/${orgId}/billing?canceled=true`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create checkout session');

    // Stripe requires session ID for redirection
    if (!data.sessionId) throw new Error('Checkout session ID missing from API response.');

    const stripe = await getStripe();
    // Use window.location.assign if stripe.redirectToCheckout is not preferred,
    // but the Stripe function is often cleaner.
    const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
    
    if (result.error) {
        throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('[Assessly Stripe Checkout Error]:', error);
    throw new Error(error.message || 'Unable to process payment. Please try again.');
  }
};

/**
 * Redirect user to Stripe customer portal
 */
export const redirectToCustomerPortal = async (orgId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token missing');

    const response = await fetch('/api/billing/portal-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orgId,
        // Standardize return URL
        returnUrl: `${window.location.origin}/organization/${orgId}/billing`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to open billing portal');

    // This method is generally preferred for simple external redirection
    window.location.href = data.url; 
  } catch (error) {
    console.error('[Assessly Stripe Portal Error]:', error);
    throw new Error(error.message || 'Unable to open customer portal. Please try again.');
  }
};
