// api/models/Organization.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const contactSchema = new mongoose.Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        if (!email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    },
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },
    zipCode: { type: String, maxlength: 20 }
  },
  social: {
    website: {
      type: String,
      validate: {
        validator: function(url) {
          if (!url) return true;
          return /^https?:\/\/.+\..+/.test(url);
        },
        message: 'Please provide a valid website URL'
      },
      default: ''
    },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    github: { type: String, default: '' }
  }
}, { _id: false });

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'assessor', 'member', 'viewer'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  permissions: {
    // Assessment permissions
    createAssessments: { type: Boolean, default: false },
    editAssessments: { type: Boolean, default: false },
    deleteAssessments: { type: Boolean, default: false },
    publishAssessments: { type: Boolean, default: false },
    
    // User management
    inviteMembers: { type: Boolean, default: false },
    manageMembers: { type: Boolean, default: false },
    removeMembers: { type: Boolean, default: false },
    
    // Analytics & Data
    viewAnalytics: { type: Boolean, default: false },
    exportData: { type: Boolean, default: false },
    viewResponses: { type: Boolean, default: false },
    
    // Organization settings
    manageSettings: { type: Boolean, default: false },
    manageBilling: { type: Boolean, default: false },
    manageIntegrations: { type: Boolean, default: false }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  features: {
    maxUsers: { type: Number, default: 3 },
    maxAssessments: { type: Number, default: 10 },
    maxStorage: { type: Number, default: 100 }, // MB
    advancedAnalytics: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    ssoIntegration: { type: Boolean, default: false },
    whiteLabeling: { type: Boolean, default: false }
  },
  limits: {
    questionsPerAssessment: { type: Number, default: 20 },
    candidatesPerAssessment: { type: Number, default: 50 },
    responseRetention: { type: Number, default: 30 } // days
  },
  stripe: {
    customerId: String,
    subscriptionId: String,
    priceId: String
  }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  // Access & Security
  isPublic: {
    type: Boolean,
    default: false
  },
  allowSelfRegistration: {
    type: Boolean,
    default: false
  },
  requireApproval: {
    type: Boolean,
    default: true
  },
  allowGoogleOAuth: {
    type: Boolean,
    default: true
  },
  allowEmailPassword: {
    type: Boolean,
    default: true
  },
  requireDomainVerification: {
    type: Boolean,
    default: false
  },
  allowedDomains: [String],
  
  // Branding & Customization
  branding: {
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    primaryColor: { type: String, default: '#1e88e5' },
    secondaryColor: { type: String, default: '#0d47a1' },
    customCSS: { type: String, default: '' },
    customJavaScript: { type: String, default: '' }
  },
  
  // Assessment Settings
  assessmentDefaults: {
    duration: { type: Number, default: 60 },
    attempts: { type: Number, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    requireFullScreen: { type: Boolean, default: false }
  },
  
  // Notifications
  notifications: {
    email: {
      assessments: { type: Boolean, default: true },
      responses: { type: Boolean, default: true },
      members: { type: Boolean, default: true },
      billing: { type: Boolean, default: true }
    },
    inApp: {
      assessments: { type: Boolean, default: true },
      responses: { type: Boolean, default: true },
      members: { type: Boolean, default: true }
    }
  },
  
  // Compliance & Privacy
  compliance: {
    dataRetention: { type: Number, default: 365 }, // days
    autoDeleteExpired: { type: Boolean, default: false },
    requireConsent: { type: Boolean, default: true },
    privacyPolicy: { type: String, default: '' },
    termsOfService: { type: String, default: '' }
  }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [200, 'Organization name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: true
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  type: {
    type: String,
    enum: ['system', 'regular', 'sample'],
    default: 'regular'
  },
  
  // Industry & Classification
  industry: {
    type: String,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    default: ''
  },
  subindustry: {
    type: String,
    maxlength: [100, 'Sub-industry cannot exceed 100 characters'],
    default: ''
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    default: '1-10'
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  
  // Contact Information
  contact: contactSchema,
  
  // Ownership & Members
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema],
  
  // Settings & Configuration
  settings: settingsSchema,
  
  // Subscription & Billing
  subscription: subscriptionSchema,
  
  // Analytics & Metadata
  metadata: {
    totalAssessments: { type: Number, default: 0 },
    totalMembers: { type: Number, default: 1 },
    totalResponses: { type: Number, default: 0 },
    totalCandidates: { type: Number, default: 0 },
    activeSince: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    
    // Usage tracking
    storageUsed: { type: Number, default: 0 }, // MB
    assessmentsCreated: { type: Number, default: 0 },
    responsesCollected: { type: Number, default: 0 },
    
    // Performance metrics
    averageScore: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 }
  },

  // Integrations
  integrations: {
    googleWorkspace: {
      enabled: { type: Boolean, default: false },
      domain: String,
      settings: mongoose.Schema.Types.Mixed
    },
    slack: {
      enabled: { type: Boolean, default: false },
      teamId: String,
      settings: mongoose.Schema.Types.Mixed
    },
    zapier: {
      enabled: { type: Boolean, default: false },
      apiKey: String
    }
  },

  // Audit & Compliance
  auditLog: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    target: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }]

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

// 🔹 PRIMARY IDENTIFIERS AND SLUG INDEXES
organizationSchema.index({ slug: 1 }, { unique: true, name: 'slug_unique_index' });
organizationSchema.index({ type: 1 }, { name: 'type_index' });

// 🔹 OWNERSHIP AND MEMBERSHIP INDEXES
organizationSchema.index({ owner: 1 }, { name: 'owner_index' });
organizationSchema.index({ 'members.user': 1 }, { name: 'members_user_index' });
organizationSchema.index({ 'members.status': 1 }, { name: 'members_status_index' });
organizationSchema.index({ 'members.role': 1 }, { name: 'members_role_index' });

// 🔹 SUBSCRIPTION AND BILLING INDEXES
organizationSchema.index({ 'subscription.status': 1 }, { name: 'subscription_status_index' });
organizationSchema.index({ 'subscription.plan': 1 }, { name: 'subscription_plan_index' });
organizationSchema.index({ 
  'subscription.currentPeriodEnd': 1 
}, { name: 'subscription_period_end_index' });
organizationSchema.index({ 
  'subscription.status': 1,
  'subscription.currentPeriodEnd': 1 
}, { name: 'subscription_status_period_index' });

// 🔹 PERFORMANCE AND ANALYTICS INDEXES
organizationSchema.index({ 'metadata.lastActivity': -1 }, { name: 'last_activity_desc_index' });
organizationSchema.index({ 'settings.isPublic': 1 }, { name: 'is_public_index' });
organizationSchema.index({ industry: 1 }, { name: 'industry_index' });
organizationSchema.index({ size: 1 }, { name: 'size_index' });
organizationSchema.index({ createdAt: -1 }, { name: 'created_at_desc_index' });

// 🔹 SEARCH AND DISCOVERY INDEXES
organizationSchema.index({ 
  name: 'text', 
  description: 'text',
  'contact.email': 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    'contact.email': 2
  },
  name: 'organization_search_index'
});

// 🔹 COMPOUND INDEXES FOR COMMON QUERY PATTERNS
organizationSchema.index({ 
  type: 1,
  'settings.isPublic': 1,
  'metadata.lastActivity': -1 
}, { name: 'public_organizations_index' });

organizationSchema.index({ 
  owner: 1,
  createdAt: -1 
}, { name: 'owner_created_index' });

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

organizationSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.status === 'active').length + 1; // +1 for owner
});

organizationSchema.virtual('pendingMembersCount').get(function() {
  return this.members.filter(member => member.status === 'pending').length;
});

organizationSchema.virtual('isActive').get(function() {
  return this.subscription.status === 'active' || this.subscription.status === 'trialing';
});

organizationSchema.virtual('subscriptionDaysRemaining').get(function() {
  if (!this.subscription.currentPeriodEnd) return null;
  const now = new Date();
  const end = new Date(this.subscription.currentPeriodEnd);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
});

organizationSchema.virtual('storageUsagePercentage').get(function() {
  const maxStorage = this.subscription.features.maxStorage;
  return maxStorage > 0 ? Math.round((this.metadata.storageUsed / maxStorage) * 100) : 0;
});

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

organizationSchema.methods.addMember = function(userId, role = 'member', invitedBy = null, permissions = {}) {
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }

  // Set default permissions based on role
  const defaultPermissions = this.getDefaultPermissions(role);
  
  this.members.push({
    user: userId,
    role,
    invitedBy,
    permissions: { ...defaultPermissions, ...permissions },
    status: this.settings.requireApproval ? 'pending' : 'active'
  });

  return this.save();
};

organizationSchema.methods.removeMember = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Cannot remove organization owner');
  }

  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );

  return this.save();
};

organizationSchema.methods.updateMemberRole = function(userId, newRole, permissions = {}) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );

  if (member) {
    member.role = newRole;
    const defaultPermissions = this.getDefaultPermissions(newRole);
    member.permissions = { ...defaultPermissions, ...permissions };
  }

  return this.save();
};

organizationSchema.methods.isMember = function(userId) {
  return this.owner.toString() === userId.toString() ||
         this.members.some(member => 
           member.user.toString() === userId.toString() && member.status === 'active'
         );
};

organizationSchema.methods.hasPermission = function(userId, permission) {
  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  const member = this.members.find(member => 
    member.user.toString() === userId.toString() && member.status === 'active'
  );

  if (!member) return false;

  // Check explicit permissions first, then role-based defaults
  return member.permissions[permission] === true;
};

organizationSchema.methods.getDefaultPermissions = function(role) {
  const rolePermissions = {
    owner: {
      createAssessments: true, editAssessments: true, deleteAssessments: true, publishAssessments: true,
      inviteMembers: true, manageMembers: true, removeMembers: true,
      viewAnalytics: true, exportData: true, viewResponses: true,
      manageSettings: true, manageBilling: true, manageIntegrations: true
    },
    admin: {
      createAssessments: true, editAssessments: true, deleteAssessments: true, publishAssessments: true,
      inviteMembers: true, manageMembers: true, removeMembers: true,
      viewAnalytics: true, exportData: true, viewResponses: true,
      manageSettings: true, manageBilling: false, manageIntegrations: true
    },
    manager: {
      createAssessments: true, editAssessments: true, deleteAssessments: false, publishAssessments: true,
      inviteMembers: true, manageMembers: false, removeMembers: false,
      viewAnalytics: true, exportData: true, viewResponses: true,
      manageSettings: false, manageBilling: false, manageIntegrations: false
    },
    assessor: {
      createAssessments: true, editAssessments: true, deleteAssessments: false, publishAssessments: false,
      inviteMembers: false, manageMembers: false, removeMembers: false,
      viewAnalytics: true, exportData: false, viewResponses: true,
      manageSettings: false, manageBilling: false, manageIntegrations: false
    },
    member: {
      createAssessments: false, editAssessments: false, deleteAssessments: false, publishAssessments: false,
      inviteMembers: false, manageMembers: false, removeMembers: false,
      viewAnalytics: false, exportData: false, viewResponses: false,
      manageSettings: false, manageBilling: false, manageIntegrations: false
    },
    viewer: {
      createAssessments: false, editAssessments: false, deleteAssessments: false, publishAssessments: false,
      inviteMembers: false, manageMembers: false, removeMembers: false,
      viewAnalytics: true, exportData: false, viewResponses: false,
      manageSettings: false, manageBilling: false, manageIntegrations: false
    }
  };

  return rolePermissions[role] || rolePermissions.member;
};

organizationSchema.methods.addAuditLog = function(action, performedBy, target = null, metadata = {}) {
  this.auditLog.push({
    action,
    performedBy,
    target,
    timestamp: new Date(),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  });

  // Keep only last 1000 audit logs
  if (this.auditLog.length > 1000) {
    this.auditLog = this.auditLog.slice(-1000);
  }

  return this.save();
};

organizationSchema.methods.updateUsageStats = async function() {
  const Assessment = mongoose.model('Assessment');
  const AssessmentResponse = mongoose.model('AssessmentResponse');
  
  const [assessmentCount, responseCount] = await Promise.all([
    Assessment.countDocuments({ organization: this._id }),
    AssessmentResponse.countDocuments({ organization: this._id })
  ]);

  this.metadata.totalAssessments = assessmentCount;
  this.metadata.totalResponses = responseCount;
  this.metadata.lastActivity = new Date();

  return this.save();
};

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase() })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar role lastActive');
};

organizationSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId, 'members.status': 'active' }
    ]
  }).populate('owner', 'name email avatar');
};

organizationSchema.statics.getOrganizationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$subscription.plan',
        count: { $sum: 1 },
        totalMembers: { $sum: '$metadata.totalMembers' },
        totalAssessments: { $sum: '$metadata.totalAssessments' },
        totalResponses: { $sum: '$metadata.totalResponses' },
        avgSatisfaction: { $avg: '$metadata.satisfactionScore' }
      }
    }
  ]);

  return stats;
};

organizationSchema.statics.getExpiringSubscriptions = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);

  return this.find({
    'subscription.status': 'active',
    'subscription.currentPeriodEnd': { $lte: cutoffDate }
  });
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

organizationSchema.pre('save', async function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    let baseSlug = slugify(this.name, { 
      lower: true, 
      strict: true,
      trim: true 
    });
    
    // Ensure uniqueness
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.models.Organization.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }

  // Update total members count
  this.metadata.totalMembers = this.members.filter(m => m.status === 'active').length + 1;

  // Set subscription period end if not set
  if (this.isNew && !this.subscription.currentPeriodEnd) {
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1); // Default to 1 year
    this.subscription.currentPeriodEnd = periodEnd;
  }

  next();
});

organizationSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('An organization with this name already exists. Please choose a different name.'));
  } else {
    next(error);
  }
});

export default mongoose.model('Organization', organizationSchema);
