import mongoose from 'mongoose';

const planFeatureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  limit: {
    type: mongoose.Schema.Types.Mixed, // Can be number, string, or boolean
    default: null
  }
}, { _id: true });

const planLimitSchema = new mongoose.Schema({
  assessments: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 }
  },
  users: {
    total: { type: Number, default: 0 },
    teams: { type: Number, default: 0 }
  },
  storage: {
    total: { type: Number, default: 0 }, // in MB
    fileSize: { type: Number, default: 10 } // max file size in MB
  },
  responses: {
    monthly: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  advancedFeatures: {
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  }
});

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  price: {
    monthly: {
      type: Number,
      required: true,
      min: 0
    },
    yearly: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    }
  },
  billingIntervals: {
    type: [String],
    enum: ['month', 'quarter', 'year'],
    default: ['month', 'year']
  },
  features: [planFeatureSchema],
  limits: {
    type: planLimitSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  trialDays: {
    type: Number,
    default: 14,
    min: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for yearly savings percentage
planSchema.virtual('yearlySavings').get(function() {
  const monthlyTotal = this.price.monthly * 12;
  const yearlyPrice = this.price.yearly;
  if (monthlyTotal <= 0 || yearlyPrice >= monthlyTotal) return 0;
  
  const savings = monthlyTotal - yearlyPrice;
  return Math.round((savings / monthlyTotal) * 100);
});

// Pre-save middleware to generate slug
planSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static method to get active plans
planSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });
};

// Static method to get plan by slug
planSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Instance method to check if feature is available
planSchema.methods.hasFeature = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.enabled : false;
};

// Instance method to get feature limit
planSchema.methods.getFeatureLimit = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.limit : null;
};

// Instance method to check if billing interval is supported
planSchema.methods.supportsBillingInterval = function(interval) {
  return this.billingIntervals.includes(interval);
};

// Instance method to calculate price for billing interval
planSchema.methods.getPriceForInterval = function(interval) {
  switch (interval) {
    case 'month':
      return this.price.monthly;
    case 'year':
      return this.price.yearly;
    case 'quarter':
      return this.price.monthly * 3;
    default:
      return this.price.monthly;
  }
};

// Index for efficient queries
planSchema.index({ isActive: 1, sortOrder: 1 });
planSchema.index({ slug: 1 }, { unique: true });
planSchema.index({ 'price.monthly': 1 });
planSchema.index({ tags: 1 });

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
