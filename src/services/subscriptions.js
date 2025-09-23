// src/services/subscriptions.js

import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

export const redirectToCheckout = async (orgId, priceId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await fetch('/api/billing/checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orgId,
        priceId,
        successUrl: `${window.location.origin}/organization/${orgId}/billing/success`,
        cancelUrl: `${window.location.origin}/organization/${orgId}/billing`
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create checkout session');
    }

    const stripe = await getStripe();
    await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw error;
  }
};

export const redirectToCustomerPortal = async (orgId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await fetch('/api/billing/portal-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orgId,
        returnUrl: `${window.location.origin}/organization/${orgId}/billing`
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to access billing portal');
    }

    window.location.href = data.url;
  } catch (error) {
    console.error('Stripe portal error:', error);
    throw error;
  }
};
