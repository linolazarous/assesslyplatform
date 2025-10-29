// api/models/Organization.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'assessor', 'viewer'],
      default: 'assessor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'canceled', 'past_due', 'trialing'],
      default: 'active'
    },
    stripeCustomerId: {
      type: String,
      index: true
    },
    stripeSubscriptionId: {
      type: String,
      index: true
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    allowRegistrations: {
      type: Boolean,
      default: true
    },
    maxUsers: {
      type: Number,
      default: 10,
      min: [1, 'Maximum users must be at least 1']
    },
    maxAssessments: {
      type: Number,
      default: 5,
      min: [0, 'Maximum assessments cannot be negative']
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#3B82F6'
      },
      secondaryColor: {
        type: String,
        default: '#1E40AF'
      }
    },
    security: {
      requireMFA: {
        type: Boolean,
        default: false
      },
      sessionTimeout: {
        type: Number, // in minutes
        default: 120
      }
    }
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  }
}, {
  timestamps: true
});

// Generate slug before saving
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Indexes for better performance
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Virtual for member count (including owner)
organizationSchema.virtual('totalMembers').get(function() {
  return this.members.length + 1; // +1 for owner
});

// Virtual for active subscription
organizationSchema.virtual('hasActiveSubscription').get(function() {
  return this.subscription.status === 'active' || this.subscription.status === 'trialing';
});

// Method to check if user is member
organizationSchema.methods.isMember = function(userId) {
  return this.owner.toString() === userId.toString() || 
         this.members.some(member => member.user.toString() === userId.toString());
};

// Method to get user role
organizationSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return 'owner';
  }
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Static method to find organizations by plan
organizationSchema.statics.findByPlan = function(plan) {
  return this.find({ 'subscription.plan': plan });
};

export default mongoose.model('Organization', organizationSchema);
