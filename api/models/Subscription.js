// api/models/Subscription.js
import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema({
  amount: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    required: true
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    maxlength: 3
  },
  type: {
    type: String,
    enum: ['one-time', 'recurring', 'usage-based'],
    default: 'recurring'
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true
  },
  setupFee: {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  overageRates: {
    additionalUser: { type: Number, min: 0, default: 0 },
    additionalAssessment: { type: Number, min: 0, default: 0 },
    additionalStorage: { type: Number, min: 0, default: 0 } // per MB
  },
  discounts: [{
    type: { type: String, enum: ['percentage', 'fixed', 'trial'] },
    value: Number,
    duration: Number, // in months
    appliesTo: { type: String, enum: ['first-payment', 'all-payments'] },
    code: String,
    expiresAt: Date
  }]
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['card', 'bank_transfer', 'paypal', 'stripe', 'manual', 'free'],
    default: 'manual'
  },
  gateway: {
    name: { type: String, enum: ['stripe', 'paypal', 'razorpay', 'none'], default: 'none' },
    customerId: String,
    subscriptionId: String,
    priceId: String,
    paymentMethodId: String
  },
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  invoiceSettings: {
    autoAdvance: { type: Boolean, default: true },
    customFields: [{
      name: String,
      value: String
    }]
  },
  lastPayment: {
    amount: Number,
    currency: String,
    date: Date,
    invoiceUrl: String,
    receiptUrl: String,
    status: { type: String, enum: ['succeeded', 'failed', 'pending'] }
  },
  nextPayment: {
    amount: Number,
    currency: String,
    date: Date,
    estimated: { type: Boolean, default: true }
  },
  paymentHistory: [{
    date: Date,
    amount: Number,
    currency: String,
    invoiceId: String,
    invoiceUrl: String,
    status: String,
    description: String
  }]
}, { _id: false });

const usageSchema = new mongoose.Schema({
  users: {
    current: { type: Number, min: 0, default: 1 },
    limit: { type: Number, min: 1, required: true },
    overage: { type: Number, min: 0, default: 0 }
  },
  assessments: {
    current: { type: Number, min: 0, default: 0 },
    limit: { type: Number, min: 1, required: true },
    overage: { type: Number, min: 0, default: 0 }
  },
  storage: {
    current: { type: Number, min: 0, default: 0 }, // in MB
    limit: { type: Number, min: 0, required: true }, // in MB
    overage: { type: Number, min: 0, default: 0 }
  },
  responses: {
    current: { type: Number, min: 0, default: 0 },
    limit: { type: Number, min: 0, default: 0 },
    overage: { type: Number, min: 0, default: 0 }
  },
  api: {
    calls: { type: Number, min: 0, default: 0 },
    limit: { type: Number, min: 0, default: 0 },
    overage: { type: Number, min: 0, default: 0 }
  }
}, { _id: false });

const featureSchema = new mongoose.Schema({
  // Core Platform Features
  maxUsers: { type: Number, min: 1, required: true },
  maxAssessments: { type: Number, min: 1, required: true },
  maxStorage: { type: Number, min: 0, required: true }, // MB
  maxResponses: { type: Number, min: 0, default: 0 },
  
  // Advanced Features
  advancedAnalytics: { type: Boolean, default: false },
  customBranding: { type: Boolean, default: false },
  apiAccess: { type: Boolean, default: false },
  prioritySupport: { type: Boolean, default: false },
  ssoIntegration: { type: Boolean, default: false },
  whiteLabeling: { type: Boolean, default: false },
  
  // Assessment Features
  questionTypes: {
    multipleChoice: { type: Boolean, default: true },
    singleChoice: { type: Boolean, default: true },
    trueFalse: { type: Boolean, default: true },
    shortAnswer: { type: Boolean, default: true },
    essay: { type: Boolean, default: false },
    code: { type: Boolean, default: false },
    fileUpload: { type: Boolean, default: false }
  },
  proctoring: {
    basic: { type: Boolean, default: false },
    advanced: { type: Boolean, default: false },
    aiMonitoring: { type: Boolean, default: false }
  },
  
  // Customization
  customDomains: { type: Boolean, default: false },
  customEmailTemplates: { type: Boolean, default: false },
  customWorkflows: { type: Boolean, default: false },
  
  // Integration & API
  webhooks: { type: Boolean, default: false },
  zapierIntegration: { type: Boolean, default: false },
  apiRateLimit: { type: Number, default: 1000 }, // requests per hour
  
  // Security & Compliance
  compliance: {
    gdpr: { type: Boolean, default: false },
    hipaa: { type: Boolean, default: false },
    soc2: { type: Boolean, default: false }
  },
  security: {
    mfaEnforcement: { type: Boolean, default: false },
    ipRestrictions: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false }
  }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Plan & Pricing
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise', 'custom'],
    required: true
  },
  planName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  price: priceSchema,

  // Subscription Lifecycle
  status: {
    type: String,
    enum: [
      'active', 
      'trialing', 
      'past_due', 
      'canceled', 
      'expired', 
      'incomplete',
      'incomplete_expired',
      'paused'
    ],
    default: 'active'
  },
  period: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    trialEndDate: {
      type: Date,
      default: null
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    canceledAt: {
      type: Date,
      default: null
    }
  },

  // Features & Usage
  features: featureSchema,
  usage: usageSchema,

  // Payment & Billing
  payment: paymentSchema,

  // Metadata & Management
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    salesRep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: ''
    },
    tags: [{
      type: String,
      maxlength: 50
    }],
    autoRenew: {
      type: Boolean,
      default: true
    },
    renewalReminders: {
      sent: { type: Boolean, default: false },
      lastSent: Date,
      count: { type: Number, default: 0 }
    },
    cancellation: {
      requestedAt: Date,
      effectiveAt: Date,
      reason: {
        type: String,
        enum: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'not_using',
          'customer_service',
          'product_complexity',
          'other'
        ],
        default: 'other'
      },
      feedback: String,
      followUp: {
        scheduled: { type: Boolean, default: false },
        scheduledAt: Date,
        completed: { type: Boolean, default: false }
      }
    }
  },

  // Audit & Compliance
  auditLog: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],

  // Migration & History
  migration: {
    fromPlan: String,
    fromPrice: Number,
    migratedAt: Date,
    migratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    proratedAmount: Number
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true 
  }
});

/* --------------------------------------------------------------------
   🔥 MULTI-TENANT INDEXES - Production Optimized (FIXED - No Duplicates)
   All indexes consolidated here using schema.index() method
-------------------------------------------------------------------- */

// 🔹 PRIMARY ORGANIZATION UNIQUE INDEX (One subscription per organization)
subscriptionSchema.index({ organization: 1 }, { 
  unique: true, 
  name: 'organization_unique_index' 
});

// 🔹 SUBSCRIPTION STATUS AND LIFECYCLE INDEXES
subscriptionSchema.index({ status: 1 }, { name: 'status_index' });
subscriptionSchema.index({ plan: 1 }, { name: 'plan_index' });
subscriptionSchema.index({ 'price.billingPeriod': 1 }, { name: 'billing_period_index' });

// 🔹 BILLING AND RENEWAL INDEXES
subscriptionSchema.index({ 'period.endDate': 1 }, { name: 'period_end_date_index' });
subscriptionSchema.index({ 'period.trialEndDate': 1 }, { name: 'trial_end_date_index' });
subscriptionSchema.index({ 'period.canceledAt': 1 }, { name: 'canceled_at_index' });
subscriptionSchema.index({ 'payment.nextPayment.date': 1 }, { name: 'next_payment_date_index' });

// 🔹 PAYMENT GATEWAY INTEGRATION INDEXES
subscriptionSchema.index({ 
  'payment.gateway.subscriptionId': 1 
}, { name: 'gateway_subscription_id_index' });

subscriptionSchema.index({ 
  'payment.gateway.customerId': 1 
}, { name: 'gateway_customer_id_index' });

// 🔹 ANALYTICS AND REPORTING INDEXES
subscriptionSchema.index({ 'metadata.salesRep': 1 }, { name: 'sales_rep_index' });
subscriptionSchema.index({ createdAt: -1 }, { name: 'created_at_desc_index' });
subscriptionSchema.index({ updatedAt: -1 }, { name: 'updated_at_desc_index' });
subscriptionSchema.index({ 
  'metadata.cancellation.requestedAt': 1 
}, { name: 'cancellation_requested_index' });

// 🔹 COMPOUND INDEXES FOR COMMON QUERY PATTERNS
subscriptionSchema.index({ 
  status: 1,
  'period.endDate': 1 
}, { name: 'status_end_date_composite_index' });

subscriptionSchema.index({ 
  status: 1,
  plan: 1,
  createdAt: -1 
}, { name: 'status_plan_created_composite_index' });

subscriptionSchema.index({ 
  organization: 1,
  status: 1 
}, { name: 'org_status_composite_index' });

subscriptionSchema.index({ 
  'metadata.autoRenew': 1,
  'period.endDate': 1 
}, { name: 'auto_renew_end_date_index' });

// 🔹 TTL INDEX FOR EXPIRED SUBSCRIPTIONS (Auto-cleanup after 90 days)
subscriptionSchema.index({ 
  'period.endDate': 1 
}, { 
  expireAfterSeconds: 7776000, // 90 days in seconds
  partialFilterExpression: { 
    status: { $in: ['canceled', 'expired', 'incomplete_expired'] }
  },
  name: 'expired_subscriptions_ttl_index'
});

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

subscriptionSchema.virtual('daysRemaining').get(function() {
  if (this.period.endDate) {
    const now = new Date();
    const end = new Date(this.period.endDate);
    const diffTime = Math.max(0, end - now);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (this.period.trialEndDate) {
    const now = new Date();
    const end = new Date(this.period.trialEndDate);
    const diffTime = Math.max(0, end - now);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

subscriptionSchema.virtual('isTrial').get(function() {
  return this.status === 'trialing' || 
         (this.period.trialEndDate && new Date() < this.period.trialEndDate);
});

subscriptionSchema.virtual('isCanceled').get(function() {
  return this.status === 'canceled' || this.period.cancelAtPeriodEnd;
});

subscriptionSchema.virtual('totalOverage').get(function() {
  const userOverage = this.usage.users.overage * this.price.overageRates.additionalUser;
  const assessmentOverage = this.usage.assessments.overage * this.price.overageRates.additionalAssessment;
  const storageOverage = this.usage.storage.overage * this.price.overageRates.additionalStorage;
  
  return userOverage + assessmentOverage + storageOverage;
});

subscriptionSchema.virtual('usagePercentages').get(function() {
  return {
    users: this.usage.users.limit > 0 ? (this.usage.users.current / this.usage.users.limit) * 100 : 0,
    assessments: this.usage.assessments.limit > 0 ? (this.usage.assessments.current / this.usage.assessments.limit) * 100 : 0,
    storage: this.usage.storage.limit > 0 ? (this.usage.storage.current / this.usage.storage.limit) * 100 : 0
  };
});

subscriptionSchema.virtual('monthlyRecurringRevenue').get(function() {
  if (this.price.type === 'recurring') {
    switch (this.price.billingPeriod) {
      case 'monthly':
        return this.price.amount;
      case 'quarterly':
        return this.price.amount / 3;
      case 'yearly':
        return this.price.amount / 12;
      default:
        return this.price.amount;
    }
  }
  return 0;
});

subscriptionSchema.virtual('annualRecurringRevenue').get(function() {
  if (this.price.type === 'recurring') {
    switch (this.price.billingPeriod) {
      case 'monthly':
        return this.price.amount * 12;
      case 'quarterly':
        return this.price.amount * 4;
      case 'yearly':
        return this.price.amount;
      default:
        return this.price.amount;
    }
  }
  return 0;
});

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

subscriptionSchema.statics.findByOrganization = function(organizationId) {
  return this.findOne({ organization: organizationId })
    .populate('organization', 'name slug industry size')
    .populate('metadata.createdBy', 'name email')
    .populate('metadata.salesRep', 'name email');
};

subscriptionSchema.statics.findActiveSubscriptions = function() {
  return this.find({ 
    status: { $in: ['active', 'trialing'] },
    'period.endDate': { $gte: new Date() }
  }).populate('organization', 'name slug industry');
};

subscriptionSchema.statics.findExpiringSubscriptions = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    'period.endDate': { 
      $lte: cutoffDate,
      $gte: new Date()
    }
  }).populate('organization', 'name slug contact.email');
};

subscriptionSchema.statics.findTrialsEnding = function(days = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  
  return this.find({
    status: 'trialing',
    'period.trialEndDate': { 
      $lte: cutoffDate,
      $gte: new Date()
    }
  }).populate('organization', 'name slug contact.email');
};

subscriptionSchema.statics.getSubscriptionAnalytics = async function(organizationId = null) {
  const matchStage = organizationId ? { organization: new mongoose.Types.ObjectId(organizationId) } : {};
  
  const analytics = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        planDistribution: [
          {
            $group: {
              _id: '$plan',
              count: { $sum: 1 },
              totalMRR: { $sum: '$monthlyRecurringRevenue' }
            }
          }
        ],
        statusBreakdown: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        revenueMetrics: [
          {
            $match: {
              status: { $in: ['active', 'trialing'] }
            }
          },
          {
            $group: {
              _id: null,
              totalMRR: { $sum: '$monthlyRecurringRevenue' },
              totalARR: { $sum: '$annualRecurringRevenue' },
              avgPlanValue: { $avg: '$monthlyRecurringRevenue' },
              churnedThisMonth: {
                $sum: {
                  $cond: [
                    { 
                      $and: [
                        { $eq: ['$status', 'canceled'] },
                        { $gte: ['$period.canceledAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ],
        usageStatistics: [
          {
            $group: {
              _id: null,
              avgUserUsage: { $avg: '$usage.users.current' },
              avgAssessmentUsage: { $avg: '$usage.assessments.current' },
              avgStorageUsage: { $avg: '$usage.storage.current' },
              totalOverageRevenue: { $sum: '$totalOverage' }
            }
          }
        ]
      }
    }
  ]);
  
  return analytics[0] || {};
};

subscriptionSchema.statics.getPlanTemplates = function() {
  return {
    free: {
      planName: 'Free',
      price: { amount: 0, currency: 'USD', billingPeriod: 'monthly' },
      features: {
        maxUsers: 3,
        maxAssessments: 10,
        maxStorage: 100,
        maxResponses: 100,
        questionTypes: { multipleChoice: true, singleChoice: true, trueFalse: true, shortAnswer: true },
        apiRateLimit: 100
      }
    },
    starter: {
      planName: 'Starter',
      price: { amount: 29, currency: 'USD', billingPeriod: 'monthly' },
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        maxResponses: 1000,
        advancedAnalytics: true,
        customBranding: true,
        questionTypes: { multipleChoice: true, singleChoice: true, trueFalse: true, shortAnswer: true, essay: true },
        apiRateLimit: 1000
      }
    },
    professional: {
      planName: 'Professional',
      price: { amount: 99, currency: 'USD', billingPeriod: 'monthly' },
      features: {
        maxUsers: 100,
        maxAssessments: 500,
        maxStorage: 5000,
        maxResponses: 5000,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        questionTypes: { multipleChoice: true, singleChoice: true, trueFalse: true, shortAnswer: true, essay: true, code: true },
        proctoring: { basic: true },
        webhooks: true,
        apiRateLimit: 5000
      }
    },
    enterprise: {
      planName: 'Enterprise',
      price: { amount: 299, currency: 'USD', billingPeriod: 'yearly' },
      features: {
        maxUsers: 1000,
        maxAssessments: 5000,
        maxStorage: 50000,
        maxResponses: 50000,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        whiteLabeling: true,
        questionTypes: { multipleChoice: true, singleChoice: true, trueFalse: true, shortAnswer: true, essay: true, code: true, fileUpload: true },
        proctoring: { basic: true, advanced: true, aiMonitoring: true },
        customDomains: true,
        customEmailTemplates: true,
        customWorkflows: true,
        webhooks: true,
        zapierIntegration: true,
        compliance: { gdpr: true, hipaa: true, soc2: true },
        security: { mfaEnforcement: true, ipRestrictions: true, auditLogs: true },
        apiRateLimit: 50000
      }
    }
  };
};

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

subscriptionSchema.methods.cancel = function(reason = 'other', feedback = '') {
  this.status = 'canceled';
  this.period.cancelAtPeriodEnd = true;
  this.period.canceledAt = new Date();
  this.metadata.cancellation.reason = reason;
  this.metadata.cancellation.feedback = feedback;
  this.metadata.cancellation.requestedAt = new Date();
  this.metadata.autoRenew = false;
  
  this.addAuditLog('subscription_canceled', this.metadata.createdBy, {
    reason,
    feedback
  });
  
  return this.save();
};

subscriptionSchema.methods.renew = function() {
  if (this.status !== 'active' && this.status !== 'trialing') {
    throw new Error('Only active or trialing subscriptions can be renewed');
  }
  
  const currentEndDate = new Date(this.period.endDate);
  let newEndDate = new Date(currentEndDate);
  
  switch (this.price.billingPeriod) {
    case 'monthly':
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      break;
    case 'quarterly':
      newEndDate.setMonth(newEndDate.getMonth() + 3);
      break;
    case 'yearly':
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      break;
  }
  
  this.period.endDate = newEndDate;
  this.payment.nextPayment.date = newEndDate;
  
  this.addAuditLog('subscription_renewed', this.metadata.createdBy, {
    newEndDate,
    billingPeriod: this.price.billingPeriod
  });
  
  return this.save();
};

subscriptionSchema.methods.upgrade = function(newPlan, newPrice) {
  const oldPlan = this.plan;
  const oldPrice = this.price.amount;
  
  this.plan = newPlan;
  this.price.amount = newPrice.amount;
  this.price.billingPeriod = newPrice.billingPeriod;
  
  // Update features based on new plan
  const planTemplates = this.constructor.getPlanTemplates();
  if (planTemplates[newPlan]) {
    this.features = { ...this.features, ...planTemplates[newPlan].features };
  }
  
  this.migration = {
    fromPlan: oldPlan,
    fromPrice: oldPrice,
    migratedAt: new Date(),
    migratedBy: this.metadata.createdBy
  };
  
  this.addAuditLog('subscription_upgraded', this.metadata.createdBy, {
    fromPlan: oldPlan,
    toPlan: newPlan,
    fromPrice: oldPrice,
    toPrice: newPrice.amount
  });
  
  return this.save();
};

subscriptionSchema.methods.updateUsage = function(usageData) {
  const updates = {};
  
  if (usageData.users !== undefined) {
    this.usage.users.current = usageData.users;
    this.usage.users.overage = Math.max(0, usageData.users - this.usage.users.limit);
  }
  
  if (usageData.assessments !== undefined) {
    this.usage.assessments.current = usageData.assessments;
    this.usage.assessments.overage = Math.max(0, usageData.assessments - this.usage.assessments.limit);
  }
  
  if (usageData.storage !== undefined) {
    this.usage.storage.current = usageData.storage;
    this.usage.storage.overage = Math.max(0, usageData.storage - this.usage.storage.limit);
  }
  
  if (usageData.responses !== undefined) {
    this.usage.responses.current = usageData.responses;
    this.usage.responses.overage = Math.max(0, usageData.responses - this.usage.responses.limit);
  }
  
  if (usageData.apiCalls !== undefined) {
    this.usage.api.calls = usageData.apiCalls;
    this.usage.api.overage = Math.max(0, usageData.apiCalls - this.usage.api.limit);
  }
  
  this.addAuditLog('usage_updated', this.metadata.createdBy, usageData);
  
  return this.save();
};

subscriptionSchema.methods.hasFeature = function(featurePath) {
  const paths = featurePath.split('.');
  let current = this.features;
  
  for (const path of paths) {
    if (current[path] === undefined) {
      return false;
    }
    current = current[path];
  }
  
  return current === true;
};

subscriptionSchema.methods.isWithinLimits = function() {
  return this.usage.users.current <= this.usage.users.limit &&
         this.usage.assessments.current <= this.usage.assessments.limit &&
         this.usage.storage.current <= this.usage.storage.limit &&
         this.usage.responses.current <= this.usage.responses.limit &&
         this.usage.api.calls <= this.usage.api.limit;
};

subscriptionSchema.methods.addAuditLog = function(action, performedBy, changes = {}) {
  this.auditLog.push({
    action,
    performedBy,
    oldValues: changes.oldValues,
    newValues: changes.newValues,
    timestamp: new Date(),
    ipAddress: changes.ipAddress,
    userAgent: changes.userAgent
  });
  
  // Keep only last 500 audit logs
  if (this.auditLog.length > 500) {
    this.auditLog = this.auditLog.slice(-500);
  }
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

subscriptionSchema.pre('save', function(next) {
  // Set end date based on billing cycle if not provided
  if (!this.period.endDate) {
    const startDate = this.period.startDate || new Date();
    const endDate = new Date(startDate);
    
    switch (this.price.billingPeriod) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    
    this.period.endDate = endDate;
  }
  
  // Set next payment date
  if (!this.payment.nextPayment.date) {
    this.payment.nextPayment.date = this.period.endDate;
  }
  
  // Set usage limits from features
  if (this.isNew) {
    this.usage.users.limit = this.features.maxUsers;
    this.usage.assessments.limit = this.features.maxAssessments;
    this.usage.storage.limit = this.features.maxStorage;
    this.usage.responses.limit = this.features.maxResponses;
    this.usage.api.limit = this.features.apiRateLimit;
  }
  
  next();
});

subscriptionSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Organization already has an active subscription.'));
  } else {
    next(error);
  }
});

export default mongoose.model('Subscription', subscriptionSchema);
