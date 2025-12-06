// src/utils/billing-helpers.js
/**
 * Enterprise-grade billing utilities for Stripe integration and subscription management
 * Compatible with Assessly Platform's multi-tenant architecture
 */

// Standard plan structure mapping Stripe price IDs to internal plans
export const PLAN_MAPPINGS = Object.freeze({
  // Free Plan (handled internally, no Stripe ID)
  FREE: 'free',
  STARTER_MONTHLY: 'price_starter_monthly',
  STARTER_YEARLY: 'price_starter_yearly',
  PROFESSIONAL_MONTHLY: 'price_professional_monthly',
  PROFESSIONAL_YEARLY: 'price_professional_yearly',
  ENTERPRISE_YEARLY: 'price_enterprise_yearly'
});

// Plan configurations with immutable structure
export const PLAN_CONFIGS = Object.freeze({
  [PLAN_MAPPINGS.FREE]: {
    name: 'Free',
    tier: 'free',
    features: {
      maxUsers: 3,
      maxAssessments: 10,
      maxStorage: 100, // MB
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      advancedAnalytics: false,
      ssoIntegration: false,
      webhooks: false,
      whiteLabeling: false,
      customDomains: false
    },
    stripePriceId: null,
    billingPeriod: null,
    monthlyPrice: 0,
    annualPrice: 0,
    isEnterprise: false,
    isTrialEligible: false
  },
  
  [PLAN_MAPPINGS.STARTER_MONTHLY]: {
    name: 'Starter',
    tier: 'starter',
    features: {
      maxUsers: 25,
      maxAssessments: 100,
      maxStorage: 1000,
      customBranding: true,
      apiAccess: true,
      prioritySupport: false,
      advancedAnalytics: true,
      ssoIntegration: false,
      webhooks: false,
      whiteLabeling: false,
      customDomains: false
    },
    stripePriceId: PLAN_MAPPINGS.STARTER_MONTHLY,
    billingPeriod: 'monthly',
    monthlyPrice: 29,
    annualPrice: 299,
    isEnterprise: false,
    isTrialEligible: true
  },
  
  [PLAN_MAPPINGS.STARTER_YEARLY]: {
    name: 'Starter',
    tier: 'starter',
    features: {
      maxUsers: 25,
      maxAssessments: 100,
      maxStorage: 1000,
      customBranding: true,
      apiAccess: true,
      prioritySupport: false,
      advancedAnalytics: true,
      ssoIntegration: false,
      webhooks: false,
      whiteLabeling: false,
      customDomains: false
    },
    stripePriceId: PLAN_MAPPINGS.STARTER_YEARLY,
    billingPeriod: 'yearly',
    monthlyPrice: 24.92, // Annual / 12
    annualPrice: 299,
    isEnterprise: false,
    isTrialEligible: true
  },
  
  [PLAN_MAPPINGS.PROFESSIONAL_MONTHLY]: {
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
      webhooks: true,
      whiteLabeling: false,
      customDomains: true
    },
    stripePriceId: PLAN_MAPPINGS.PROFESSIONAL_MONTHLY,
    billingPeriod: 'monthly',
    monthlyPrice: 99,
    annualPrice: 999,
    isEnterprise: false,
    isTrialEligible: true
  },
  
  [PLAN_MAPPINGS.PROFESSIONAL_YEARLY]: {
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
      webhooks: true,
      whiteLabeling: false,
      customDomains: true
    },
    stripePriceId: PLAN_MAPPINGS.PROFESSIONAL_YEARLY,
    billingPeriod: 'yearly',
    monthlyPrice: 83.25, // Annual / 12
    annualPrice: 999,
    isEnterprise: false,
    isTrialEligible: true
  },
  
  [PLAN_MAPPINGS.ENTERPRISE_YEARLY]: {
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
      compliance: ['GDPR', 'HIPAA', 'SOC2'],
      dedicatedSupport: true,
      customSLA: true,
      onboarding: true
    },
    stripePriceId: PLAN_MAPPINGS.ENTERPRISE_YEARLY,
    billingPeriod: 'yearly',
    monthlyPrice: 499, // Monthly equivalent
    annualPrice: 4990,
    isEnterprise: true,
    isTrialEligible: false
  }
});

// Stripe status to internal status mapping
export const STATUS_MAPPINGS = Object.freeze({
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'expired',
  incomplete: 'incomplete',
  incomplete_expired: 'expired'
});

// Internal subscription statuses
export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  INCOMPLETE: 'incomplete'
});

/**
 * Get comprehensive plan details from Stripe Price ID
 * @param {string} priceId - Stripe Price ID
 * @returns {Object} Complete plan configuration
 * @throws {Error} If priceId is invalid
 */
export const getPlanDetails = (priceId) => {
  if (!priceId || priceId === 'free') {
    return PLAN_CONFIGS[PLAN_MAPPINGS.FREE];
  }
  
  const planConfig = PLAN_CONFIGS[priceId];
  if (!planConfig) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }
  
  return {
    ...planConfig,
    isAnnual: planConfig.billingPeriod === 'yearly',
    isMonthly: planConfig.billingPeriod === 'monthly',
    isFree: planConfig.tier === 'free'
  };
};

/**
 * Get plan by tier and billing period
 * @param {string} tier - Plan tier (free, starter, professional, enterprise)
 * @param {string} billingPeriod - Billing period (monthly, yearly)
 * @returns {Object} Plan configuration
 */
export const getPlanByTier = (tier, billingPeriod = 'monthly') => {
  const tierKey = tier.toUpperCase();
  const periodKey = billingPeriod.toUpperCase();
  const planKey = `${tierKey}_${periodKey}`;
  
  const mappingKey = PLAN_MAPPINGS[planKey];
  if (!mappingKey) {
    if (tier === 'free') return PLAN_CONFIGS[PLAN_MAPPINGS.FREE];
    throw new Error(`Plan not found for tier: ${tier}, period: ${billingPeriod}`);
  }
  
  return PLAN_CONFIGS[mappingKey];
};

/**
 * Map Stripe subscription status to internal subscription status
 * @param {string} stripeStatus - Stripe subscription status
 * @returns {string} Internal subscription status
 */
export const mapSubscriptionStatus = (stripeStatus) => {
  const status = STATUS_MAPPINGS[stripeStatus];
  if (!status) {
    console.warn(`Unknown Stripe status: ${stripeStatus}`);
    return SUBSCRIPTION_STATUS.INCOMPLETE;
  }
  return status;
};

/**
 * Check if subscription is active
 * @param {string} status - Subscription status
 * @returns {boolean} True if subscription is active
 */
export const isSubscriptionActive = (status) => {
  const activeStatuses = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING];
  return activeStatuses.includes(status);
};

/**
 * Calculate subscription period dates
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Object} Period dates and metadata
 */
export const calculateSubscriptionPeriod = (stripeSubscription) => {
  if (!stripeSubscription) {
    throw new Error('Stripe subscription is required');
  }

  const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  const trialEnd = stripeSubscription.trial_end 
    ? new Date(stripeSubscription.trial_end * 1000)
    : null;

  const now = new Date();
  const daysInPeriod = Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24));
  const daysUsed = Math.ceil((now - currentPeriodStart) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
  
  const trialDaysRemaining = trialEnd 
    ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    startDate: currentPeriodStart,
    endDate: currentPeriodEnd,
    trialEndDate: trialEnd,
    nextBillingDate: stripeSubscription.cancel_at_period_end 
      ? new Date(stripeSubscription.cancel_at * 1000)
      : currentPeriodEnd,
    daysInPeriod,
    daysUsed,
    daysRemaining,
    trialDaysRemaining,
    percentageUsed: Math.min(100, Math.round((daysUsed / daysInPeriod) * 100)),
    isTrialActive: trialEnd ? trialEnd > now : false,
    willCancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
    isActive: now >= currentPeriodStart && now <= currentPeriodEnd
  };
};

/**
 * Extract payment details from Stripe subscription
 * @param {Object} stripeSubscription - Stripe subscription object
 * @returns {Object} Payment details
 */
export const extractPaymentDetails = (stripeSubscription) => {
  if (!stripeSubscription) return null;

  const defaultPaymentMethod = stripeSubscription.default_payment_method;
  const latestInvoice = stripeSubscription.latest_invoice;
  
  return {
    method: defaultPaymentMethod?.type || 'card',
    lastFour: defaultPaymentMethod?.card?.last4 || '',
    brand: defaultPaymentMethod?.card?.brand || '',
    expMonth: defaultPaymentMethod?.card?.exp_month || '',
    expYear: defaultPaymentMethod?.card?.exp_year || '',
    gateway: {
      name: 'stripe',
      customerId: stripeSubscription.customer,
      subscriptionId: stripeSubscription.id,
      priceId: stripeSubscription.items?.data[0]?.price?.id,
      paymentMethodId: defaultPaymentMethod?.id
    },
    billingAddress: {
      line1: defaultPaymentMethod?.billing_details?.address?.line1 || '',
      line2: defaultPaymentMethod?.billing_details?.address?.line2 || '',
      city: defaultPaymentMethod?.billing_details?.address?.city || '',
      state: defaultPaymentMethod?.billing_details?.address?.state || '',
      postalCode: defaultPaymentMethod?.billing_details?.address?.postal_code || '',
      country: defaultPaymentMethod?.billing_details?.address?.country || ''
    },
    lastPayment: extractLastPayment(latestInvoice),
    upcomingPayment: extractUpcomingPayment(stripeSubscription)
  };
};

/**
 * Extract last payment details from Stripe invoice
 */
const extractLastPayment = (stripeInvoice) => {
  if (!stripeInvoice || stripeInvoice.status !== 'paid') return null;
  
  return {
    amount: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency,
    date: new Date(stripeInvoice.created * 1000),
    invoiceUrl: stripeInvoice.hosted_invoice_url,
    receiptUrl: stripeInvoice.receipt_url,
    status: stripeInvoice.status,
    invoiceId: stripeInvoice.id,
    invoiceNumber: stripeInvoice.number
  };
};

/**
 * Extract upcoming payment details
 */
const extractUpcomingPayment = (stripeSubscription) => {
  if (!stripeSubscription.items?.data[0]?.price) return null;
  
  const price = stripeSubscription.items.data[0].price;
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000);
  
  return {
    amount: price.unit_amount / 100,
    currency: price.currency,
    date: periodEnd,
    description: price.nickname || `Plan renewal - ${getPlanDetails(price.id).name}`
  };
};

/**
 * Create subscription metadata for audit log
 */
export const createAuditLogEntry = (stripeSubscription, performedBy, action, oldValues = {}) => {
  const now = new Date();
  
  return {
    _id: new ObjectId(),
    action,
    performedBy: new ObjectId(performedBy),
    timestamp: now,
    oldValues,
    newValues: {
      status: mapSubscriptionStatus(stripeSubscription.status),
      plan: getPlanDetails(stripeSubscription.items?.data[0]?.price?.id),
      period: calculateSubscriptionPeriod(stripeSubscription),
      payment: extractPaymentDetails(stripeSubscription)
    },
    metadata: {
      stripeEventId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer,
      source: 'stripe_webhook',
      userAgent: '', // Would come from request context
      ipAddress: ''  // Would come from request context
    }
  };
};

/**
 * Validate organization ID
 */
const validateOrganizationId = (organizationId) => {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  
  try {
    return new ObjectId(organizationId);
  } catch (error) {
    throw new Error(`Invalid Organization ID: ${organizationId}`);
  }
};

/**
 * Update organization subscription in database
 */
export const updateOrganizationSubscription = async (db, organizationId, stripeSubscription, action = 'update') => {
  const organizations = db.collection('organizations');
  const subscriptions = db.collection('subscriptions');
  
  const orgObjectId = validateOrganizationId(organizationId);
  
  try {
    const planDetails = getPlanDetails(stripeSubscription.items?.data[0]?.price?.id);
    const subscriptionStatus = mapSubscriptionStatus(stripeSubscription.status);
    const periodDetails = calculateSubscriptionPeriod(stripeSubscription);
    const paymentDetails = extractPaymentDetails(stripeSubscription);
    
    // Create subscription document
    const subscriptionDoc = {
      organizationId: orgObjectId,
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
        storage: { current: 0, limit: planDetails.features.maxStorage, overage: 0, unit: 'MB' }
      },
      limits: {
        maxUsers: planDetails.features.maxUsers,
        maxAssessments: planDetails.features.maxAssessments,
        maxStorage: planDetails.features.maxStorage
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
          latestInvoice: stripeSubscription.latest_invoice,
          collectionMethod: stripeSubscription.collection_method || 'charge_automatically'
        }
      },
      updatedAt: new Date()
    };

    // Add createdAt for new subscriptions
    if (action === 'create') {
      subscriptionDoc.createdAt = new Date();
    }

    // Update or insert subscription
    const subscriptionResult = await subscriptions.findOneAndUpdate(
      { organizationId: orgObjectId },
      { 
        $set: subscriptionDoc,
        $setOnInsert: { createdAt: new Date() }
      },
      { 
        upsert: true, 
        returnDocument: 'after',
        maxTimeMS: 5000 // 5 second timeout
      }
    );

    if (!subscriptionResult.value) {
      throw new Error('Failed to create/update subscription');
    }

    // Update organization with subscription reference
    const organizationUpdate = {
      $set: {
        'subscription.status': subscriptionStatus,
        'subscription.plan': planDetails.tier,
        'subscription.planName': planDetails.name,
        'subscription.stripeSubscriptionId': stripeSubscription.id,
        'subscription.currentPeriodEnd': periodDetails.endDate,
        'subscription.isTrialActive': periodDetails.isTrialActive,
        'updatedAt': new Date()
      }
    };

    const organizationResult = await organizations.updateOne(
      { _id: orgObjectId },
      organizationUpdate
    );

    // Add audit log entry
    const auditLogEntry = createAuditLogEntry(
      stripeSubscription, 
      'system', 
      action,
      {} // Could store old values here
    );
    
    await subscriptions.updateOne(
      { _id: subscriptionResult.value._id },
      { 
        $push: { 
          auditLog: { 
            $each: [auditLogEntry], 
            $slice: -50 // Keep last 50 audit log entries
          } 
        } 
      }
    );

    return {
      success: true,
      subscription: subscriptionResult.value,
      organizationUpdated: organizationResult.modifiedCount > 0,
      action,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`[Billing Error] Failed to update subscription for organization ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Handle subscription webhook events
 */
export const handleStripeWebhook = async (db, event) => {
  const { type, data } = event;
  const stripeSubscription = data.object;
  
  if (!stripeSubscription) {
    throw new Error('Invalid webhook event: missing subscription data');
  }

  // Extract organization ID from metadata
  const organizationId = stripeSubscription.metadata?.organizationId;
  
  if (!organizationId) {
    console.warn('[Billing] No organization ID found in Stripe subscription metadata');
    return { 
      success: false, 
      error: 'Missing organization ID',
      eventType: type 
    };
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
        
      case 'customer.subscription.trial_will_end':
        result = await handleTrialEnding(db, organizationId, stripeSubscription);
        break;
        
      default:
        console.log(`[Billing] Unhandled webhook event type: ${type}`);
        return { 
          success: true, 
          skipped: true, 
          eventType: type 
        };
    }
    
    return { 
      success: true, 
      eventType: type, 
      ...result 
    };
  } catch (error) {
    console.error(`[Billing] Failed to process webhook ${type}:`, error);
    return { 
      success: false, 
      error: error.message, 
      eventType: type 
    };
  }
};

// Individual webhook handlers
const handleSubscriptionCancellation = async (db, organizationId, stripeSubscription) => {
  const subscriptions = db.collection('subscriptions');
  const orgObjectId = validateOrganizationId(organizationId);
  
  const update = {
    $set: {
      status: SUBSCRIPTION_STATUS.CANCELED,
      'period.canceledAt': new Date(),
      'period.cancelAtPeriodEnd': false,
      'metadata.autoRenew': false,
      updatedAt: new Date()
    }
  };

  const result = await subscriptions.updateOne(
    { organizationId: orgObjectId },
    update
  );

  return { 
    action: 'subscription_canceled', 
    modifiedCount: result.modifiedCount 
  };
};

const handlePaymentSuccess = async (db, organizationId, stripeInvoice) => {
  const subscriptions = db.collection('subscriptions');
  const orgObjectId = validateOrganizationId(organizationId);
  
  const paymentRecord = {
    _id: new ObjectId(),
    date: new Date(stripeInvoice.created * 1000),
    amount: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency,
    invoiceId: stripeInvoice.id,
    invoiceNumber: stripeInvoice.number,
    invoiceUrl: stripeInvoice.hosted_invoice_url,
    status: 'succeeded',
    description: `Payment for ${stripeInvoice.description || 'subscription renewal'}`
  };

  const update = {
    $set: {
      'payment.lastPayment': paymentRecord,
      'status': SUBSCRIPTION_STATUS.ACTIVE,
      updatedAt: new Date()
    },
    $push: {
      'payment.paymentHistory': {
        $each: [paymentRecord],
        $slice: -100 // Keep last 100 payments
      }
    }
  };

  const result = await subscriptions.updateOne(
    { organizationId: orgObjectId },
    update
  );

  return { 
    action: 'payment_success', 
    modifiedCount: result.modifiedCount 
  };
};

const handlePaymentFailure = async (db, organizationId, stripeInvoice) => {
  const subscriptions = db.collection('subscriptions');
  const orgObjectId = validateOrganizationId(organizationId);
  
  const update = {
    $set: {
      'payment.lastPayment.status': 'failed',
      'status': SUBSCRIPTION_STATUS.PAST_DUE,
      updatedAt: new Date()
    }
  };

  const result = await subscriptions.updateOne(
    { organizationId: orgObjectId },
    update
  );

  // Trigger notification logic would go here
  console.log(`[Billing] Payment failed for organization ${organizationId}, invoice: ${stripeInvoice.id}`);

  return { 
    action: 'payment_failed', 
    modifiedCount: result.modifiedCount,
    invoiceId: stripeInvoice.id
  };
};

const handleTrialEnding = async (db, organizationId, stripeSubscription) => {
  const subscriptions = db.collection('subscriptions');
  const orgObjectId = validateOrganizationId(organizationId);
  
  // Update trial ending notification
  const update = {
    $set: {
      'metadata.trialEndingNotified': true,
      updatedAt: new Date()
    }
  };

  const result = await subscriptions.updateOne(
    { organizationId: orgObjectId },
    update
  );

  // Send notification logic would go here
  console.log(`[Billing] Trial ending soon for organization ${organizationId}`);

  return { 
    action: 'trial_ending', 
    modifiedCount: result.modifiedCount 
  };
};

/**
 * Check if subscription allows a specific feature
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
 */
export const isWithinUsageLimits = (subscription, resource, currentUsage) => {
  if (!subscription?.usage?.[resource]) return true;
  
  const limit = subscription.usage[resource].limit;
  const current = subscription.usage[resource].current || 0;
  const totalUsage = current + currentUsage;
  
  return totalUsage <= limit;
};

/**
 * Calculate overage for a resource
 */
export const calculateOverage = (subscription, resource, currentUsage) => {
  if (!subscription?.usage?.[resource]) return 0;
  
  const limit = subscription.usage[resource].limit;
  const current = subscription.usage[resource].current || 0;
  const totalUsage = current + currentUsage;
  
  return Math.max(0, totalUsage - limit);
};

/**
 * Format price for display
 */
export const formatPrice = (amount, currency = 'USD', includeSymbol = true) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

/**
 * Format period for display
 */
export const formatPeriod = (billingPeriod) => {
  switch (billingPeriod) {
    case 'monthly':
      return 'month';
    case 'yearly':
      return 'year';
    default:
      return billingPeriod;
  }
};

/**
 * Calculate savings percentage for annual vs monthly
 */
export const calculateAnnualSavings = (monthlyPrice, annualPrice) => {
  if (!monthlyPrice || !annualPrice || monthlyPrice === 0) return 0;
  
  const monthlyEquivalent = annualPrice / 12;
  const savings = monthlyPrice - monthlyEquivalent;
  const percentage = (savings / monthlyPrice) * 100;
  
  return Math.round(percentage);
};

/**
 * Generate subscription summary
 */
export const generateSubscriptionSummary = (subscription) => {
  if (!subscription) return null;
  
  const planDetails = getPlanDetails(subscription.price?.stripePriceId);
  const periodDetails = calculateSubscriptionPeriod(subscription);
  const isActive = isSubscriptionActive(subscription.status);
  
  return {
    planName: planDetails.name,
    tier: planDetails.tier,
    status: subscription.status,
    isActive,
    isTrial: subscription.status === SUBSCRIPTION_STATUS.TRIALING,
    price: {
      amount: subscription.price?.amount || 0,
      currency: subscription.price?.currency || 'USD',
      billingPeriod: subscription.price?.billingPeriod,
      formatted: formatPrice(
        subscription.price?.amount || 0,
        subscription.price?.currency || 'USD'
      )
    },
    period: periodDetails,
    nextBillingDate: periodDetails.nextBillingDate,
    features: Object.entries(planDetails.features)
      .filter(([_, value]) => value === true || typeof value === 'number')
      .map(([key, value]) => ({ key, value })),
    limits: subscription.limits || planDetails.features
  };
};

export default {
  // Constants
  PLAN_MAPPINGS,
  PLAN_CONFIGS,
  STATUS_MAPPINGS,
  SUBSCRIPTION_STATUS,
  
  // Core functions
  getPlanDetails,
  getPlanByTier,
  mapSubscriptionStatus,
  isSubscriptionActive,
  calculateSubscriptionPeriod,
  extractPaymentDetails,
  createAuditLogEntry,
  updateOrganizationSubscription,
  handleStripeWebhook,
  
  // Feature and usage checks
  hasSubscriptionFeature,
  isWithinUsageLimits,
  calculateOverage,
  
  // Utility functions
  formatPrice,
  formatPeriod,
  calculateAnnualSavings,
  generateSubscriptionSummary
};
