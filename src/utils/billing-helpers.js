// src/utils/billing-helpers.js
import { ObjectId } from 'mongodb';

/**
 * Enterprise-grade billing utilities for Stripe integration and subscription management
 * Compatible with Assessly Platform's multi-tenant architecture
 */

// Standard plan structure mapping Stripe price IDs to internal plans
const PLAN_MAPPINGS = {
  // Free Plan (handled internally, no Stripe ID)
  'free': {
    name: 'Free',
    tier: 'free',
    features: {
      maxUsers: 3,
      maxAssessments: 10,
      maxStorage: 100,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false
    },
    stripePriceId: null
  },
  
  // Starter Plan
  'price_starter_monthly': {
    name: 'Starter',
    tier: 'starter',
    features: {
      maxUsers: 25,
      maxAssessments: 100,
      maxStorage: 1000,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      advancedAnalytics: true
    },
    billingPeriod: 'monthly'
  },
  'price_starter_yearly': {
    name: 'Starter',
    tier: 'starter',
    features: {
      maxUsers: 25,
      maxAssessments: 100,
      maxStorage: 1000,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      advancedAnalytics: true
    },
    billingPeriod: 'yearly'
  },
  
  // Professional Plan
  'price_professional_monthly': {
    name: 'Professional',
    tier: 'professional',
    features: {
      maxUsers: 100,
      maxAssessments: 500,
      maxStorage: 5000,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      ssoIntegration: true,
      webhooks: true
    },
    billingPeriod: 'monthly'
  },
  'price_professional_yearly': {
    name: 'Professional',
    tier: 'professional',
    features: {
      maxUsers: 100,
      maxAssessments: 500,
      maxStorage: 5000,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      ssoIntegration: true,
      webhooks: true
    },
    billingPeriod: 'yearly'
  },
  
  // Enterprise Plan
  'price_enterprise_yearly': {
    name: 'Enterprise',
    tier: 'enterprise',
    features: {
      maxUsers: 1000,
      maxAssessments: 5000,
      maxStorage: 50000,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      advancedAnalytics: true,
      ssoIntegration: true,
      webhooks: true,
      whiteLabeling: true,
      customDomains: true,
      compliance: ['GDPR', 'HIPAA', 'SOC2']
    },
    billingPeriod: 'yearly'
  }
};

// Stripe status to internal status mapping
const STATUS_MAPPINGS = {
  'active': 'active',
  'trialing': 'trialing',
  'past_due': 'past_due',
  'canceled': 'canceled',
  'unpaid': 'expired',
  'incomplete': 'incomplete',
  'incomplete_expired': 'expired'
};

/**
 * Get comprehensive plan details from Stripe Price ID
 * @param {string} priceId - Stripe Price ID
 * @returns {Object} Complete plan configuration
 */
export const getPlanDetails = (priceId) => {
  if (!priceId) {
    return PLAN_MAPPINGS.free;
  }
  
  const plan = PLAN_MAPPINGS[priceId];
  if (!plan) {
    console.warn(`[Billing] Unknown price ID: ${priceId}. Using Free plan as fallback.`);
    return PLAN_MAPPINGS.free;
  }
  
  return {
    ...plan,
    stripePriceId: priceId,
    isAnnual: plan.billingPeriod === 'yearly',
    isMonthly: plan.billingPeriod === 'monthly'
  };
};

/**
 * Map Stripe subscription status to internal subscription status
 * @param {string} stripeStatus - Stripe subscription status
 * @returns {string} Internal subscription status
 */
export const mapSubscriptionStatus = (stripeStatus) => {
  return STATUS_MAPPINGS[stripeStatus] || 'unknown';
};

/**
 * Calculate trial end date based on Stripe trial period
 * @param {number} trialEnd - Unix timestamp from Stripe
 * @returns {Date|null} Trial end date
 */
export const calculateTrialEndDate = (trialEnd) => {
  if (!trialEnd) return null;
  return new Date(trialEnd * 1000);
};

/**
 * Calculate subscription period dates
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Object} Period dates
 */
export const calculateSubscriptionPeriod = (stripeSubscription) => {
  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  const trialEnd = stripeSubscription.trial_end 
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;

  // Calculate next billing date
  let nextBillingDate = null;
  if (stripeSubscription.cancel_at_period_end) {
    nextBillingDate = new Date(stripeSubscription.cancel_at * 1000);
  } else if (stripeSubscription.current_period_end) {
    nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
  }

  // Calculate days remaining
  const now = new Date();
  const daysRemaining = trialEnd 
    ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
    : Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24));

  return {
    startDate: currentPeriodStart,
    endDate: currentPeriodEnd,
    trialEndDate: trialEnd,
    nextBillingDate,
    daysRemaining: Math.max(0, daysRemaining),
    isTrialActive: trialEnd ? trialEnd > now : false,
    willCancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false
  };
};

/**
 * Extract payment details from Stripe subscription
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Object} Payment details
 */
export const extractPaymentDetails = (stripeSubscription) => {
  const defaultPaymentMethod = stripeSubscription.default_payment_method;
  const invoiceSettings = stripeSubscription.invoice_settings || {};
  
  return {
    method: defaultPaymentMethod?.type || 'card',
    gateway: {
      name: 'stripe',
      customerId: stripeSubscription.customer,
      subscriptionId: stripeSubscription.id,
      priceId: stripeSubscription.items?.data[0]?.price?.id,
      paymentMethodId: defaultPaymentMethod?.id
    },
    billingAddress: defaultPaymentMethod?.billing_details?.address || {},
    lastPayment: extractLastPayment(stripeSubscription.latest_invoice),
    nextPayment: {
      amount: stripeSubscription.items?.data[0]?.price?.unit_amount / 100 || 0,
      currency: stripeSubscription.items?.data[0]?.price?.currency || 'usd',
      date: new Date(stripeSubscription.current_period_end * 1000)
    }
  };
};

/**
 * Extract last payment details from Stripe invoice
 * @param {Object} stripeInvoice - Stripe invoice object
 * @returns {Object} Last payment details
 */
const extractLastPayment = (stripeInvoice) => {
  if (!stripeInvoice) return null;
  
  return {
    amount: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency,
    date: new Date(stripeInvoice.created * 1000),
    invoiceUrl: stripeInvoice.hosted_invoice_url,
    receiptUrl: stripeInvoice.receipt_url,
    status: stripeInvoice.status,
    invoiceId: stripeInvoice.id
  };
};

/**
 * Create subscription metadata for audit log
 * @param {Object} stripeSubscription - Stripe subscription object
 * @param {string} performedBy - User ID who performed the action
 * @param {string} action - Action performed
 * @returns {Object} Audit log entry
 */
export const createAuditLogEntry = (stripeSubscription, performedBy, action) => {
  const now = new Date();
  
  return {
    action,
    performedBy,
    oldValues: {}, // Could be populated from previous state
    newValues: {
      status: mapSubscriptionStatus(stripeSubscription.status),
      plan: getPlanDetails(stripeSubscription.items?.data[0]?.price?.id),
      period: calculateSubscriptionPeriod(stripeSubscription),
      payment: extractPaymentDetails(stripeSubscription)
    },
    timestamp: now,
    ipAddress: '', // Would come from request context
    userAgent: '', // Would come from request context
    metadata: {
      stripeEventId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer,
      source: 'stripe_webhook'
    }
  };
};

/**
 * Update organization subscription in database
 * @param {Object} db - MongoDB database instance
 * @param {string} organizationId - Organization ID
 * @param {Object} stripeSubscription - Stripe subscription object
 * @param {string} action - Action performed (create, update, cancel, etc.)
 * @returns {Promise<Object>} Update result
 */
export const updateOrganizationSubscription = async (db, organizationId, stripeSubscription, action = 'update') => {
  const organizations = db.collection('organizations');
  const subscriptions = db.collection('subscriptions');
  
  try {
    const planDetails = getPlanDetails(stripeSubscription.items?.data[0]?.price?.id);
    const subscriptionStatus = mapSubscriptionStatus(stripeSubscription.status);
    const periodDetails = calculateSubscriptionPeriod(stripeSubscription);
    const paymentDetails = extractPaymentDetails(stripeSubscription);
    
    // Create subscription update document
    const subscriptionUpdate = {
      organization: new ObjectId(organizationId),
      plan: planDetails.tier,
      planName: planDetails.name,
      status: subscriptionStatus,
      price: {
        amount: stripeSubscription.items?.data[0]?.price?.unit_amount / 100 || 0,
        currency: stripeSubscription.items?.data[0]?.price?.currency || 'usd',
        type: 'recurring',
        billingPeriod: planDetails.billingPeriod || 'monthly',
        stripePriceId: stripeSubscription.items?.data[0]?.price?.id
      },
      period: {
        startDate: periodDetails.startDate,
        endDate: periodDetails.endDate,
        trialEndDate: periodDetails.trialEndDate,
        cancelAtPeriodEnd: periodDetails.willCancelAtPeriodEnd,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
      },
      features: planDetails.features,
      usage: {
        users: { current: 1, limit: planDetails.features.maxUsers, overage: 0 },
        assessments: { current: 0, limit: planDetails.features.maxAssessments, overage: 0 },
        storage: { current: 0, limit: planDetails.features.maxStorage, overage: 0 }
      },
      payment: paymentDetails,
      metadata: {
        createdBy: new ObjectId(), // Would come from context
        salesRep: null,
        autoRenew: !periodDetails.willCancelAtPeriodEnd,
        stripe: {
          subscriptionId: stripeSubscription.id,
          customerId: stripeSubscription.customer,
          priceId: stripeSubscription.items?.data[0]?.price?.id,
          latestInvoice: stripeSubscription.latest_invoice
        }
      },
      updatedAt: new Date()
    };

    // Add createdAt for new subscriptions
    if (action === 'create') {
      subscriptionUpdate.createdAt = new Date();
    }

    // Update or insert subscription
    const subscriptionResult = await subscriptions.findOneAndUpdate(
      { organization: new ObjectId(organizationId) },
      { $set: subscriptionUpdate, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    // Update organization with subscription reference
    const organizationUpdate = {
      $set: {
        'subscription.status': subscriptionStatus,
        'subscription.plan': planDetails.tier,
        'subscription.planName': planDetails.name,
        'subscription.stripeSubscriptionId': stripeSubscription.id,
        'subscription.currentPeriodEnd': periodDetails.endDate,
        'updatedAt': new Date()
      }
    };

    const organizationResult = await organizations.updateOne(
      { _id: new ObjectId(organizationId) },
      organizationUpdate
    );

    // Add audit log entry
    const auditLogEntry = createAuditLogEntry(stripeSubscription, 'system', action);
    await subscriptions.updateOne(
      { _id: subscriptionResult.value._id },
      { $push: { auditLog: auditLogEntry } }
    );

    return {
      success: true,
      subscription: subscriptionResult.value,
      organizationUpdated: organizationResult.modifiedCount > 0,
      action
    };
  } catch (error) {
    console.error(`[Billing Error] Failed to update subscription for organization ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Handle subscription webhook events
 * @param {Object} db - MongoDB database instance
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} Processing result
 */
export const handleStripeWebhook = async (db, event) => {
  const { type, data } = event;
  const stripeSubscription = data.object;
  
  // Extract organization ID from metadata
  const organizationId = stripeSubscription.metadata?.organizationId;
  
  if (!organizationId) {
    console.warn('[Billing] No organization ID found in Stripe subscription metadata');
    return { success: false, error: 'Missing organization ID' };
  }

  try {
    let result;
    
    switch (type) {
      case 'customer.subscription.created':
        result = await updateOrganizationSubscription(db, organizationId, stripeSubscription, 'create');
        break;
        
      case 'customer.subscription.updated':
        result = await updateOrganizationSubscription(db, organizationId, stripeSubscription, 'update');
        break;
        
      case 'customer.subscription.deleted':
        result = await handleSubscriptionCancellation(db, organizationId, stripeSubscription);
        break;
        
      case 'invoice.payment_succeeded':
        result = await handlePaymentSuccess(db, organizationId, stripeSubscription);
        break;
        
      case 'invoice.payment_failed':
        result = await handlePaymentFailure(db, organizationId, stripeSubscription);
        break;
        
      default:
        console.log(`[Billing] Unhandled webhook event type: ${type}`);
        return { success: true, skipped: true, type };
    }
    
    return { success: true, type, ...result };
  } catch (error) {
    console.error(`[Billing] Failed to process webhook ${type}:`, error);
    return { success: false, error: error.message, type };
  }
};

/**
 * Handle subscription cancellation
 */
const handleSubscriptionCancellation = async (db, organizationId, stripeSubscription) => {
  const subscriptions = db.collection('subscriptions');
  
  const update = {
    $set: {
      status: 'canceled',
      'period.canceledAt': new Date(),
      'period.cancelAtPeriodEnd': false,
      'metadata.autoRenew': false,
      updatedAt: new Date()
    }
  };

  const result = await subscriptions.updateOne(
    { organization: new ObjectId(organizationId) },
    update
  );

  // Add audit log
  const auditLog = createAuditLogEntry(stripeSubscription, 'system', 'subscription_canceled');
  await subscriptions.updateOne(
    { organization: new ObjectId(organizationId) },
    { $push: { auditLog } }
  );

  return { action: 'cancel', modifiedCount: result.modifiedCount };
};

/**
 * Handle successful payment
 */
const handlePaymentSuccess = async (db, organizationId, stripeInvoice) => {
  const subscriptions = db.collection('subscriptions');
  
  const paymentRecord = {
    date: new Date(stripeInvoice.created * 1000),
    amount: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency,
    invoiceId: stripeInvoice.id,
    invoiceUrl: stripeInvoice.hosted_invoice_url,
    status: 'succeeded',
    description: `Payment for ${stripeInvoice.description || 'subscription'}`
  };

  const update = {
    $set: {
      'payment.lastPayment': paymentRecord,
      'status': 'active', // Ensure status is active after successful payment
      updatedAt: new Date()
    },
    $push: {
      'payment.paymentHistory': paymentRecord
    }
  };

  const result = await subscriptions.updateOne(
    { organization: new ObjectId(organizationId) },
    update
  );

  return { action: 'payment_success', modifiedCount: result.modifiedCount };
};

/**
 * Handle payment failure
 */
const handlePaymentFailure = async (db, organizationId, stripeInvoice) => {
  const subscriptions = db.collection('subscriptions');
  
  const update = {
    $set: {
      'payment.lastPayment.status': 'failed',
      'status': 'past_due',
      updatedAt: new Date()
    }
  };

  const result = await subscriptions.updateOne(
    { organization: new ObjectId(organizationId) },
    update
  );

  // Could trigger email notification here
  console.log(`[Billing] Payment failed for organization ${organizationId}`);

  return { action: 'payment_failed', modifiedCount: result.modifiedCount };
};

/**
 * Check if subscription allows a specific feature
 * @param {Object} subscription - Subscription document
 * @param {string} feature - Feature to check
 * @returns {boolean} Whether feature is allowed
 */
export const hasSubscriptionFeature = (subscription, feature) => {
  if (!subscription?.features) return false;
  
  // Support dot notation for nested features
  const featurePath = feature.split('.');
  let current = subscription.features;
  
  for (const path of featurePath) {
    if (current[path] === undefined) {
      return false;
    }
    current = current[path];
  }
  
  return current === true;
};

/**
 * Check if subscription is within usage limits
 * @param {Object} subscription - Subscription document
 * @param {string} resource - Resource to check (users, assessments, storage)
 * @param {number} currentUsage - Current usage count
 * @returns {boolean} Whether within limits
 */
export const isWithinUsageLimits = (subscription, resource, currentUsage) => {
  if (!subscription?.usage?.[resource]) return true;
  
  const limit = subscription.usage[resource].limit;
  return currentUsage <= limit;
};

/**
 * Calculate prorated amount for subscription change
 * @param {Object} currentSubscription - Current subscription
 * @param {Object} newPlan - New plan details
 * @param {Date} changeDate - Date of change
 * @returns {number} Prorated amount in cents
 */
export const calculateProratedAmount = (currentSubscription, newPlan, changeDate = new Date()) => {
  if (!currentSubscription?.period?.endDate) return newPlan.price.amount;
  
  const periodStart = new Date(currentSubscription.period.startDate);
  const periodEnd = new Date(currentSubscription.period.endDate);
  const daysInPeriod = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const daysUsed = Math.ceil((changeDate - periodStart) / (1000 * 60 * 60 * 24));
  const daysRemaining = daysInPeriod - daysUsed;
  
  const dailyRate = currentSubscription.price.amount / daysInPeriod;
  const credit = dailyRate * daysRemaining;
  
  const newDailyRate = newPlan.price.amount / (newPlan.billingPeriod === 'yearly' ? 365 : 30);
  const newCharge = newDailyRate * daysRemaining;
  
  return Math.max(0, newCharge - credit);
};

/**
 * Generate invoice data for display
 * @param {Object} stripeInvoice - Stripe invoice
 * @returns {Object} Formatted invoice data
 */
export const formatInvoiceData = (stripeInvoice) => {
  return {
    id: stripeInvoice.id,
    number: stripeInvoice.number,
    date: new Date(stripeInvoice.created * 1000),
    dueDate: new Date(stripeInvoice.due_date * 1000),
    amount: stripeInvoice.amount_due / 100,
    amountPaid: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency.toUpperCase(),
    status: stripeInvoice.status,
    pdfUrl: stripeInvoice.invoice_pdf,
    hostedUrl: stripeInvoice.hosted_invoice_url,
    lines: stripeInvoice.lines?.data.map(line => ({
      description: line.description,
      amount: line.amount / 100,
      quantity: line.quantity,
      period: line.period
    })) || []
  };
};

export default {
  getPlanDetails,
  mapSubscriptionStatus,
  calculateSubscriptionPeriod,
  updateOrganizationSubscription,
  handleStripeWebhook,
  hasSubscriptionFeature,
  isWithinUsageLimits,
  calculateProratedAmount,
  formatInvoiceData,
  PLAN_MAPPINGS,
  STATUS_MAPPINGS
};
