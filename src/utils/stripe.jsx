// src/utils/stripe.jsx (SERVER-SIDE CODE - DO NOT IMPORT IN FRONTEND)
import Stripe from 'stripe';

let stripe;

// Check if STRIPE_SECRET_KEY is set
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is missing. Stripe client will not be fully functional.");
}

// Initialize Stripe client
// FIX: Using a stable recent API version
stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
  apiVersion: '2023-10-16', 
});

export { stripe };
