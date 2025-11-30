// api/models/RefreshToken.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters'],
    default: 'Unknown Device'
  },
  type: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },
  os: {
    name: { type: String, trim: true, maxlength: 50, default: '' },
    version: { type: String, trim: true, maxlength: 50, default: '' },
    platform: { type: String, trim: true, maxlength: 50, default: '' }
  },
  browser: {
    name: { type: String, trim: true, maxlength: 50, default: '' },
    version: { type: String, trim: true, maxlength: 50, default: '' },
    engine: { type: String, trim: true, maxlength: 50, default: '' }
  },
  screen: {
    width: Number,
    height: Number,
    colorDepth: Number,
    pixelRatio: Number
  },
  hardware: {
    cores: Number,
    memory: Number
  }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  country: {
    code: { type: String, trim: true, maxlength: 2, default: '' },
    name: { type: String, trim: true, maxlength: 100, default: '' }
  },
  region: {
    code: { type: String, trim: true, maxlength: 10, default: '' },
    name: { type: String, trim: true, maxlength: 100, default: '' }
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters'],
    default: ''
  },
  timezone: {
    type: String,
    trim: true,
    maxlength: [50, 'Timezone cannot exceed 50 characters'],
    default: ''
  },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  isp: {
    type: String,
    trim: true,
    maxlength: [100, 'ISP name cannot exceed 100 characters'],
    default: ''
  },
  asn: {
    number: Number,
    name: String
  },
  proxy: {
    isProxy: { type: Boolean, default: false },
    type: { type: String, enum: ['vpn', 'tor', 'proxy', 'hosting'], default: null },
    threatLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
  }
}, { _id: false });

const securitySchema = new mongoose.Schema({
  fingerprint: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters'],
    default: ''
  },
  acceptLanguage: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  acceptEncoding: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  anomalies: [{
    type: String,
    enum: [
      'ip-change',
      'location-change', 
      'device-change',
      'user-agent-change',
      'unusual-time',
      'suspicious-activity',
      'multiple-sessions'
    ]
  }]
}, { _id: false });

const refreshTokenSchema = new mongoose.Schema({
  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Core Token Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true,
    trim: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  family: {
    type: String, // Token family for refresh token rotation
    required: true,
    index: true
  },

  // Token Lifecycle
  expires: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revokedByIp: {
    type: String,
    trim: true,
    default: null
  },

  // Token Rotation & Replacement
  replacedByToken: {
    type: String,
    trim: true,
    default: null
  },
  replacesToken: {
    type: String,
    trim: true,
    default: null
  },
  reasonRevoked: {
    type: String,
    enum: [
      'replaced', 
      'logout', 
      'security', 
      'expired', 
      'manual', 
      'suspicious',
      'compromised',
      'rotation',
      'system'
    ],
    default: null
  },

  // Device & Location Information
  device: deviceSchema,
  location: locationSchema,
  security: securitySchema,

  // Usage Tracking
  lastUsedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  usageCount: {
    type: Number,
    min: [0, 'Usage count cannot be negative'],
    default: 0
  },
  usagePattern: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    action: { type: String, enum: ['refresh', 'validate'] }
  }],

  // Session Management
  session: {
    id: {
      type: String,
      trim: true,
      default: ''
    },
    isPersistent: {
      type: Boolean,
      default: false
    },
    timeout: {
      type: Number, // in minutes
      default: 43200 // 30 days
    }
  },

  // Scope & Permissions
  scope: {
    type: [String],
    default: ['offline_access']
  },
  claims: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },

  // Security Metadata
  metadata: {
    isRememberMe: {
      type: Boolean,
      default: false
    },
    mfaVerified: {
      type: Boolean,
      default: false
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    compliance: {
      gdprConsent: { type: Boolean, default: false },
      dataProcessing: { type: Boolean, default: false }
    }
  },

  // Rate Limiting & Security
  rateLimit: {
    attempts: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null }
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.token;
      delete ret.tokenHash;
      delete ret.replacedByToken;
      delete ret.replacesToken;
      delete ret.security;
      delete ret.rateLimit;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.token;
      delete ret.tokenHash;
      delete ret.replacedByToken;
      delete ret.replacesToken;
      delete ret.security;
      delete ret.rateLimit;
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
refreshTokenSchema.index({ organization: 1, user: 1 });
refreshTokenSchema.index({ organization: 1, tokenHash: 1 });
refreshTokenSchema.index({ organization: 1, family: 1 });

// Token lifecycle management
refreshTokenSchema.index({ organization: 1, revokedAt: 1 });
refreshTokenSchema.index({ organization: 1, expires: 1 });
refreshTokenSchema.index({ organization: 1, lastUsedAt: -1 });

// Security and monitoring
refreshTokenSchema.index({ organization: 1, 'security.fingerprint': 1 });
refreshTokenSchema.index({ organization: 1, 'location.ip': 1 });
refreshTokenSchema.index({ organization: 1, 'metadata.riskLevel': 1 });

// Performance and cleanup
refreshTokenSchema.index({ expires: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { revokedAt: { $ne: null } }
});

// Compound indexes for common queries
refreshTokenSchema.index({ organization: 1, user: 1, revokedAt: 1 });
refreshTokenSchema.index({ organization: 1, user: 1, expires: 1 });

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

refreshTokenSchema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires.getTime();
});

refreshTokenSchema.virtual('isActive').get(function() {
  return !this.revokedAt && !this.isExpired && !this.rateLimit.lockedUntil;
});

refreshTokenSchema.virtual('isRevoked').get(function() {
  return !!this.revokedAt;
});

refreshTokenSchema.virtual('isLocked').get(function() {
  return this.rateLimit.lockedUntil && Date.now() < this.rateLimit.lockedUntil.getTime();
});

refreshTokenSchema.virtual('lifetime').get(function() {
  if (this.revokedAt) {
    return this.revokedAt.getTime() - this.issuedAt.getTime();
  }
  return Date.now() - this.issuedAt.getTime();
});

refreshTokenSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
});

refreshTokenSchema.virtual('timeUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.expires);
  return Math.max(0, expiry.getTime() - now.getTime());
});

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

refreshTokenSchema.statics.findActiveByUser = function(organizationId, userId, options = {}) {
  const query = this.find({
    organization: organizationId,
    user: userId,
    revokedAt: null,
    expires: { $gt: new Date() },
    'rateLimit.lockedUntil': { $in: [null, { $lt: new Date() }] }
  }).sort({ lastUsedAt: -1 });
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query;
};

refreshTokenSchema.statics.findByTokenHash = function(organizationId, tokenHash) {
  return this.findOne({ 
    organization: organizationId,
    tokenHash,
    revokedAt: null,
    expires: { $gt: new Date() }
  }).populate('user', 'name email role isActive organization');
};

refreshTokenSchema.statics.revokeAllForUser = function(organizationId, userId, reason = 'security', revokedBy = null, revokedByIp = null) {
  return this.updateMany(
    {
      organization: organizationId,
      user: userId,
      revokedAt: null
    },
    {
      revokedAt: new Date(),
      reasonRevoked: reason,
      revokedBy: revokedBy,
      revokedByIp: revokedByIp
    }
  );
};

refreshTokenSchema.statics.revokeByFamily = function(organizationId, family, reason = 'compromised', revokedBy = null) {
  return this.updateMany(
    {
      organization: organizationId,
      family: family,
      revokedAt: null
    },
    {
      revokedAt: new Date(),
      reasonRevoked: reason,
      revokedBy: revokedBy
    }
  );
};

refreshTokenSchema.statics.cleanupExpired = async function(organizationId = null) {
  const filter = {
    expires: { $lt: new Date() }
  };
  
  if (organizationId) {
    filter.organization = organizationId;
  }
  
  const result = await this.deleteMany(filter);
  return result;
};

refreshTokenSchema.statics.getSecurityReport = async function(organizationId, days = 30) {
  const dateFilter = {
    createdAt: {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };
  
  const report = await this.aggregate([
    { 
      $match: { 
        organization: new mongoose.Types.ObjectId(organizationId),
        ...dateFilter
      } 
    },
    {
      $facet: {
        tokenStats: [
          {
            $group: {
              _id: null,
              totalTokens: { $sum: 1 },
              activeTokens: {
                $sum: {
                  $cond: [
                    { 
                      $and: [
                        { $eq: ['$revokedAt', null] },
                        { $gt: ['$expires', new Date()] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              revokedTokens: {
                $sum: {
                  $cond: [
                    { $ne: ['$revokedAt', null] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ],
        riskAnalysis: [
          {
            $group: {
              _id: '$metadata.riskLevel',
              count: { $sum: 1 },
              avgRiskScore: { $avg: '$security.riskScore' }
            }
          }
        ],
        deviceBreakdown: [
          {
            $group: {
              _id: '$device.type',
              count: { $sum: 1 }
            }
          }
        ],
        locationAnalysis: [
          {
            $group: {
              _id: '$location.country.code',
              count: { $sum: 1 },
              countryName: { $first: '$location.country.name' }
            }
          }
        ],
        revocationReasons: [
          {
            $match: {
              revokedAt: { $ne: null }
            }
          },
          {
            $group: {
              _id: '$reasonRevoked',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
  
  return report[0] || {};
};

refreshTokenSchema.statics.generateTokenHash = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

refreshTokenSchema.statics.generateFamilyId = function() {
  return crypto.randomBytes(16).toString('hex');
};

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

refreshTokenSchema.methods.revoke = function(reason = 'logout', revokedBy = null, revokedByIp = null) {
  this.revokedAt = new Date();
  this.reasonRevoked = reason;
  this.revokedBy = revokedBy;
  this.revokedByIp = revokedByIp;
  
  return this.save();
};

refreshTokenSchema.methods.replaceWith = function(newToken, newTokenHash) {
  this.revokedAt = new Date();
  this.reasonRevoked = 'replaced';
  this.replacedByToken = newTokenHash;
  
  return this.save();
};

refreshTokenSchema.methods.recordUsage = function(ip = null, userAgent = null) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  // Record usage pattern for security analysis
  if (this.usagePattern.length >= 100) {
    this.usagePattern = this.usagePattern.slice(-50); // Keep last 50 entries
  }
  
  this.usagePattern.push({
    timestamp: new Date(),
    ip: ip || this.location.ip,
    userAgent: userAgent || this.security.userAgent,
    action: 'refresh'
  });
  
  return this.save({ validateBeforeSave: false });
};

refreshTokenSchema.methods.canUse = function() {
  return !this.revokedAt && 
         !this.isExpired && 
         !this.isLocked &&
         this.metadata.mfaVerified;
};

refreshTokenSchema.methods.lock = function(duration = 15) { // minutes
  this.rateLimit.lockedUntil = new Date(Date.now() + duration * 60 * 1000);
  return this.save();
};

refreshTokenSchema.methods.unlock = function() {
  this.rateLimit.lockedUntil = null;
  this.rateLimit.attempts = 0;
  return this.save();
};

refreshTokenSchema.methods.recordFailedAttempt = function() {
  this.rateLimit.attempts += 1;
  this.rateLimit.lastAttempt = new Date();
  
  // Auto-lock after 5 failed attempts
  if (this.rateLimit.attempts >= 5) {
    this.rateLimit.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  return this.save({ validateBeforeSave: false });
};

refreshTokenSchema.methods.calculateRiskScore = function() {
  let score = 0;
  
  // Check for anomalies
  if (this.security.anomalies.length > 0) {
    score += this.security.anomalies.length * 10;
  }
  
  // Check for proxy usage
  if (this.location.proxy.isProxy) {
    score += this.location.proxy.threatLevel === 'high' ? 30 : 
             this.location.proxy.threatLevel === 'medium' ? 20 : 10;
  }
  
  // Check usage patterns
  if (this.usageCount === 0) {
    score += 5; // Never used token
  }
  
  // Update risk level
  if (score >= 50) {
    this.metadata.riskLevel = 'critical';
  } else if (score >= 30) {
    this.metadata.riskLevel = 'high';
  } else if (score >= 15) {
    this.metadata.riskLevel = 'medium';
  } else {
    this.metadata.riskLevel = 'low';
  }
  
  this.security.riskScore = Math.min(100, score);
  return this.security.riskScore;
};

refreshTokenSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    user: this.user,
    organization: this.organization,
    device: this.device,
    location: {
      ip: this.location.ip,
      country: this.location.country,
      region: this.location.region,
      city: this.location.city
    },
    issuedAt: this.issuedAt,
    expires: this.expires,
    lastUsedAt: this.lastUsedAt,
    usageCount: this.usageCount,
    isActive: this.isActive,
    isExpired: this.isExpired,
    isRevoked: this.isRevoked,
    isLocked: this.isLocked,
    age: this.age,
    riskLevel: this.metadata.riskLevel,
    session: this.session
  };
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

refreshTokenSchema.pre('save', function(next) {
  // Generate token hash if not present
  if (this.token && !this.tokenHash) {
    this.tokenHash = this.constructor.generateTokenHash(this.token);
  }
  
  // Generate family ID for new tokens
  if (this.isNew && !this.family) {
    this.family = this.constructor.generateFamilyId();
  }
  
  // Set revocation reason if revoked
  if (this.revokedAt && !this.reasonRevoked) {
    this.reasonRevoked = 'manual';
  }
  
  // Calculate risk score for new tokens or when security data changes
  if (this.isNew || this.isModified('security') || this.isModified('location')) {
    this.calculateRiskScore();
  }
  
  next();
});

refreshTokenSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    if (error.keyValue.tokenHash) {
      next(new Error('Token security violation: duplicate token detected'));
    } else {
      next(new Error('Database constraint violation'));
    }
  } else {
    next(error);
  }
});

export default mongoose.model('RefreshToken', refreshTokenSchema);
