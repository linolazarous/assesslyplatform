// api/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const profileSchema = new mongoose.Schema({
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
    default: ''
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    default: ''
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters'],
    default: ''
  },
  location: {
    address: { type: String, maxlength: 200, default: '' },
    city: { type: String, maxlength: 100, default: '' },
    state: { type: String, maxlength: 100, default: '' },
    country: { type: String, maxlength: 100, default: '' },
    zipCode: { type: String, maxlength: 20, default: '' },
    timezone: { type: String, default: 'UTC' }
  },
  social: {
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    github: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  skills: [{
    name: { type: String, required: true, maxlength: 50 },
    level: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    years: { type: Number, min: 0, max: 50 }
  }],
  education: [{
    institution: { type: String, required: true, maxlength: 200 },
    degree: { type: String, maxlength: 100 },
    field: { type: String, maxlength: 100 },
    startYear: Number,
    endYear: Number,
    current: { type: Boolean, default: false }
  }],
  experience: [{
    company: { type: String, required: true, maxlength: 100 },
    position: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    startDate: Date,
    endDate: Date,
    current: { type: Boolean, default: false }
  }]
}, { _id: false });

const preferencesSchema = new mongoose.Schema({
  notifications: {
    email: {
      assessments: { type: Boolean, default: true },
      responses: { type: Boolean, default: true },
      invitations: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true }
    },
    push: {
      assessments: { type: Boolean, default: true },
      responses: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true }
    },
    inApp: {
      assessments: { type: Boolean, default: true },
      responses: { type: Boolean, default: true },
      system: { type: Boolean, default: true }
    }
  },
  appearance: {
    theme: { 
      type: String, 
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      default: 'MM/DD/YYYY'
    }
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'organization', 'private'],
      default: 'organization'
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showActivity: { type: Boolean, default: true }
  },
  accessibility: {
    highContrast: { type: Boolean, default: false },
    largeText: { type: Boolean, default: false },
    screenReader: { type: Boolean, default: false }
  }
}, { _id: false });

const securitySchema = new mongoose.Schema({
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  twoFactorBackupCodes: [String],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  trustedDevices: [{
    deviceId: String,
    name: String,
    lastUsed: Date,
    ipAddress: String,
    userAgent: String
  }]
}, { _id: false });

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.githubId; // Password not required for OAuth users
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  // Authentication & Identity
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local'
  },

  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ['super_admin', 'org_admin', 'manager', 'assessor', 'candidate', 'viewer'],
    default: 'candidate',
    required: true
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

  // Profile & Preferences
  avatar: {
    type: String,
    default: null
  },
  profile: profileSchema,
  preferences: preferencesSchema,

  // Status & Activity
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },

  // Security
  security: securitySchema,

  // Metadata
  metadata: {
    signupSource: {
      type: String,
      enum: ['direct', 'invitation', 'oauth', 'api'],
      default: 'direct'
    },
    referralCode: String,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    campaign: {
      source: String,
      medium: String,
      name: String
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    locale: {
      type: String,
      default: 'en-US'
    }
  },

  // Audit & Compliance
  auditLog: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }]

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.security;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

/* --------------------------------------------------------------------
   🔥 MULTI-TENANT INDEXES - Production Optimized
-------------------------------------------------------------------- */

// Primary query patterns
userSchema.index({ organization: 1, email: 1 }, { unique: true });
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ organization: 1, isActive: 1 });

// Authentication indexes
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ githubId: 1 }, { sparse: true });
userSchema.index({ email: 1 }, { unique: true });

// Performance indexes
userSchema.index({ organization: 1, lastActivity: -1 });
userSchema.index({ organization: 1, createdAt: -1 });
userSchema.index({ 'metadata.referredBy': 1 });

// Search indexes
userSchema.index({ 
  name: 'text', 
  email: 'text',
  'profile.company': 'text',
  'profile.position': 'text'
});

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

userSchema.virtual('requiresPassword').get(function() {
  return this.provider === 'local' && !this.googleId && !this.githubId;
});

userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    organization: this.organization,
    profile: this.profile,
    preferences: this.preferences,
    isActive: this.isActive,
    emailVerified: this.emailVerified,
    lastLogin: this.lastLogin
  };
});

userSchema.virtual('activityStatus').get(function() {
  const now = new Date();
  const lastActivity = new Date(this.lastActivity);
  const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
  
  if (minutesSinceActivity < 5) return 'online';
  if (minutesSinceActivity < 60) return 'recent';
  if (minutesSinceActivity < 1440) return 'away';
  return 'offline';
});

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password comparison not available for OAuth users');
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.security.passwordChangedAt) {
    const changedTimestamp = parseInt(this.security.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.isPasswordExpired = function() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return this.security.lastPasswordChange < ninetyDaysAgo;
};

userSchema.methods.can = function(permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') {
    return true;
  }
  
  // Check explicit permissions
  return this.permissions[permission] === true;
};

userSchema.methods.hasRole = function(roles) {
  const userRoles = Array.isArray(roles) ? roles : [roles];
  return userRoles.includes(this.role);
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.security.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.security.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.security.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.security.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return verificationToken;
};

userSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      'security.loginAttempts': 1,
      'security.lockUntil': null
    });
  }
  
  // Otherwise, increment
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock the account if we've reached max attempts and it's not already locked
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    'security.loginAttempts': 0,
    'security.lockUntil': null
  });
};

userSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.addAuditLog = function(action, performedBy, details = {}) {
  this.auditLog.push({
    action,
    performedBy,
    timestamp: new Date(),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    details: details.changes || {}
  });
  
  // Keep only last 200 audit logs
  if (this.auditLog.length > 200) {
    this.auditLog = this.auditLog.slice(-200);
  }
  
  return this.save({ validateBeforeSave: false });
};

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

userSchema.statics.findByOrganization = function(organizationId, query = {}) {
  return this.find({ organization: organizationId, ...query })
    .select('-password -security')
    .populate('organization', 'name slug');
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() })
    .select('+password +security')
    .populate('organization', 'name slug settings');
};

userSchema.statics.findActiveUsers = function(organizationId) {
  return this.find({
    organization: organizationId,
    isActive: true
  }).select('-password -security');
};

userSchema.statics.getUserStatistics = async function(organizationId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        organization: new mongoose.Types.ObjectId(organizationId) 
      } 
    },
    {
      $facet: {
        roleDistribution: [
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
              active: {
                $sum: { $cond: ['$isActive', 1, 0] }
              }
            }
          }
        ],
        activityStats: [
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: {
                  $cond: [
                    { 
                      $and: [
                        { $eq: ['$isActive', true] },
                        { $gte: ['$lastActivity', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              avgLoginCount: { $avg: '$loginCount' },
              verifiedEmails: {
                $sum: { $cond: ['$emailVerified', 1, 0] }
              }
            }
          }
        ],
        providerBreakdown: [
          {
            $group: {
              _id: '$provider',
              count: { $sum: 1 }
            }
          }
        ],
        recentSignups: [
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);
  
  return stats[0] || {};
};

userSchema.statics.findLockedAccounts = function(organizationId) {
  return this.find({
    organization: organizationId,
    'security.lockUntil': { $gt: new Date() }
  });
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    try {
      this.password = await bcrypt.hash(this.password, 12);
      this.security.passwordChangedAt = new Date();
      this.security.lastPasswordChange = new Date();
    } catch (error) {
      return next(error);
    }
  }
  
  // Set permissions based on role for new users
  if (this.isNew) {
    this.setDefaultPermissions();
  }
  
  // Update last activity on modification
  if (this.isModified()) {
    this.lastActivity = new Date();
  }
  
  next();
});

userSchema.pre('save', function(next) {
  // Ensure OAuth users don't have passwords
  if ((this.googleId || this.githubId) && this.password) {
    this.password = undefined;
  }
  
  next();
});

userSchema.methods.setDefaultPermissions = function() {
  const rolePermissions = {
    super_admin: {
      createAssessments: true, editAssessments: true, deleteAssessments: true, publishAssessments: true,
      inviteMembers: true, manageMembers: true, removeMembers: true,
      viewAnalytics: true, exportData: true, viewResponses: true,
      manageSettings: true, manageBilling: true, manageIntegrations: true
    },
    org_admin: {
      createAssessments: true, editAssessments: true, deleteAssessments: true, publishAssessments: true,
      inviteMembers: true, manageMembers: true, removeMembers: true,
      viewAnalytics: true, exportData: true, viewResponses: true,
      manageSettings: true, manageBilling: true, manageIntegrations: true
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
    candidate: {
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
  
  this.permissions = { ...this.permissions, ...rolePermissions[this.role] };
};

userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    if (error.keyValue.email) {
      next(new Error('Email already exists in this organization.'));
    } else if (error.keyValue.googleId) {
      next(new Error('Google account already linked to another user.'));
    } else if (error.keyValue.githubId) {
      next(new Error('GitHub account already linked to another user.'));
    } else {
      next(new Error('Duplicate key error'));
    }
  } else {
    next(error);
  }
});

export default mongoose.model('User', userSchema);
