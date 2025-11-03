import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  plan: {
    type: String,
    enum: {
      values: ['free', 'basic', 'professional', 'enterprise'],
      message: 'Plan must be one of: free, basic, professional, enterprise'
    },
    required: true
  },
  billingCycle: {
    type: String,
    enum: {
      values: ['monthly', 'quarterly', 'yearly'],
      message: 'Billing cycle must be one of: monthly, quarterly, yearly'
    },
    required: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'canceled', 'expired', 'past_due'],
      message: 'Status must be one of: active, inactive, canceled, expired, past_due'
    },
    default: 'active'
  },
  price: {
    amount: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      required: true
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    setupFee: {
      type: Number,
      min: [0, 'Setup fee cannot be negative'],
      default: 0
    }
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
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal', 'manual'],
      default: 'manual'
    },
    lastPaymentDate: {
      type: Date,
      default: null
    },
    nextPaymentDate: {
      type: Date,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    invoiceUrl: {
      type: String,
      default: null
    }
  },
  features: {
    maxUsers: {
      type: Number,
      min: [1, 'Max users must be at least 1'],
      required: true
    },
    maxAssessments: {
      type: Number,
      min: [1, 'Max assessments must be at least 1'],
      required: true
    },
    maxStorage: {
      type: Number, // in MB
      min: [0, 'Max storage cannot be negative'],
      required: true
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    ssoIntegration: {
      type: Boolean,
      default: false
    }
  },
  limits: {
    currentUsers: {
      type: Number,
      min: [0, 'Current users cannot be negative'],
      default: 1
    },
    currentAssessments: {
      type: Number,
      min: [0, 'Current assessments cannot be negative'],
      default: 0
    },
    currentStorage: {
      type: Number, // in MB
      min: [0, 'Current storage cannot be negative'],
      default: 0
    }
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: ''
    },
    cancellationDate: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionSchema.index({ organization: 1 }, { unique: true });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'period.endDate': 1 });
subscriptionSchema.index({ 'payment.stripeSubscriptionId': 1 });
subscriptionSchema.index({ 'payment.stripeCustomerId': 1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (this.period.endDate) {
    const now = new Date();
    const end = new Date(this.period.endDate);
    const diffTime = end - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for isActive
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && 
         (!this.period.endDate || new Date() < this.period.endDate);
});

// Virtual for isTrial
subscriptionSchema.virtual('isTrial').get(function() {
  return this.period.trialEndDate && new Date() < this.period.trialEndDate;
});

// Pre-save middleware to calculate end date and set default features
subscriptionSchema.pre('save', function(next) {
  // Set end date based on billing cycle if not provided
  if (!this.period.endDate) {
    const startDate = this.period.startDate || new Date();
    const endDate = new Date(startDate);
    
    switch (this.billingCycle) {
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
  
  // Set default features based on plan
  if (this.isModified('plan')) {
    const planFeatures = {
      free: {
        maxUsers: 10,
        maxAssessments: 5,
        maxStorage: 100,
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false
      },
      basic: {
        maxUsers: 50,
        maxAssessments: 20,
        maxStorage: 500,
        advancedAnalytics: true,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false
      },
      professional: {
        maxUsers: 200,
        maxAssessments: 100,
        maxStorage: 2000,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: false
      },
      enterprise: {
        maxUsers: 1000,
        maxAssessments: 500,
        maxStorage: 10000,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true
      }
    };
    
    this.features = { ...this.features, ...planFeatures[this.plan] };
  }
  
  next();
});

// Static method to find active subscriptions
subscriptionSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    'period.endDate': { $gte: new Date() }
  }).populate('organization', 'name slug');
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiring = function(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  return this.find({
    status: 'active',
    'period.endDate': { 
      $lte: date,
      $gte: new Date()
    }
  }).populate('organization', 'name slug contact.email');
};

// Static method to get subscription statistics
subscriptionSchema.statics.getSubscriptionStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$price.amount' },
        active: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $gte: ['$period.endDate', new Date()] }
                ]
              }, 
              1, 
              0 
            ]
          }
        }
      }
    }
  ]);
  
  return stats;
};

// Instance method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = '') {
  this.status = 'canceled';
  this.metadata.cancellationReason = reason;
  this.metadata.cancellationDate = new Date();
  this.metadata.autoRenew = false;
  
  return this.save();
};

// Instance method to renew subscription
subscriptionSchema.methods.renew = function() {
  if (this.status !== 'active') {
    throw new Error('Only active subscriptions can be renewed');
  }
  
  const currentEndDate = new Date(this.period.endDate);
  let newEndDate = new Date(currentEndDate);
  
  switch (this.billingCycle) {
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
  this.payment.nextPaymentDate = newEndDate;
  
  return this.save();
};

// Instance method to check if feature is available
subscriptionSchema.methods.hasFeature = function(feature) {
  return this.features[feature] === true;
};

// Instance method to check usage limits
subscriptionSchema.methods.isWithinLimits = function() {
  return this.limits.currentUsers <= this.features.maxUsers &&
         this.limits.currentAssessments <= this.features.maxAssessments &&
         this.limits.currentStorage <= this.features.maxStorage;
};

// Instance method to update usage
subscriptionSchema.methods.updateUsage = function(updates) {
  if (updates.users !== undefined) {
    this.limits.currentUsers = updates.users;
  }
  if (updates.assessments !== undefined) {
    this.limits.currentAssessments = updates.assessments;
  }
  if (updates.storage !== undefined) {
    this.limits.currentStorage = updates.storage;
  }
  
  return this.save();
};

export default mongoose.model('Subscription', subscriptionSchema);
