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
    unique: true, // creates a single unique index
    lowercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'assessor', 'viewer'], default: 'assessor' },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  subscription: {
    plan: { type: String, enum: ['basic', 'professional', 'enterprise'], default: 'basic' },
    status: { type: String, enum: ['active', 'inactive', 'canceled', 'past_due', 'trialing'], default: 'active' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  settings: {
    allowRegistrations: { type: Boolean, default: true },
    maxUsers: { type: Number, default: 10, min: 1 },
    maxAssessments: { type: Number, default: 5, min: 0 },
    branding: {
      logo: String,
      primaryColor: { type: String, default: '#3B82F6' },
      secondaryColor: { type: String, default: '#1E40AF' }
    },
    security: {
      requireMFA: { type: Boolean, default: false },
      sessionTimeout: { type: Number, default: 120 }
    }
  },
  contact: {
    email: { type: String, trim: true, lowercase: true },
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
}, { timestamps: true });

// Generate slug
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Clean index set
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
organizationSchema.index({ 'subscription.stripeCustomerId': 1 });
organizationSchema.index({ 'subscription.stripeSubscriptionId': 1 });
organizationSchema.index({ createdAt: -1 });

// Virtuals & Methods
organizationSchema.virtual('totalMembers').get(function() {
  return this.members.length + 1;
});

organizationSchema.virtual('hasActiveSubscription').get(function() {
  return ['active', 'trialing'].includes(this.subscription.status);
});

organizationSchema.methods.isMember = function(userId) {
  return this.owner.toString() === userId.toString() ||
         this.members.some(m => m.user.toString() === userId.toString());
};

organizationSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Statics
organizationSchema.statics.findByPlan = function(plan) {
  return this.find({ 'subscription.plan': plan });
};

organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug })
    .populate('owner', 'name email')
    .populate('members.user', 'name email');
};

organizationSchema.statics.slugExists = async function(slug) {
  return (await this.countDocuments({ slug })) > 0;
};

organizationSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId })
    .populate('owner', 'name email')
    .sort({ createdAt: -1 });
};

organizationSchema.statics.getStats = async function(id) {
  const org = await this.findById(id);
  if (!org) throw new Error('Organization not found');
  return {
    totalMembers: org.totalMembers,
    hasActiveSubscription: org.hasActiveSubscription,
    subscriptionPlan: org.subscription.plan,
    subscriptionStatus: org.subscription.status
  };
};

export default mongoose.model('Organization', organizationSchema);
