// src/utils/stripe.jsx (SERVER-SIDE CODE - DO NOT IMPORT IN FRONTEND)
import Stripe from 'stripe';

let stripe;

// Check if STRIPE_SECRET_KEY is set
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is missing. Stripe client will not be fully functional.");
}

// Initialize Stripe client
stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
  // Always specify the API version you developed against
  apiVersion: '2025-10-10', 
});

export { stripe };
