// api/models/UserActivity.js
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    code: { type: String, maxlength: 2, default: '' },
    name: { type: String, maxlength: 100, default: '' }
  },
  region: {
    code: { type: String, maxlength: 10, default: '' },
    name: { type: String, maxlength: 100, default: '' }
  },
  city: {
    type: String,
    maxlength: [100, 'City name cannot exceed 100 characters'],
    default: ''
  },
  timezone: {
    type: String,
    maxlength: [50, 'Timezone cannot exceed 50 characters'],
    default: ''
  },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  },
  isp: {
    type: String,
    maxlength: [100, 'ISP name cannot exceed 100 characters'],
    default: ''
  },
  proxy: {
    isProxy: { type: Boolean, default: false },
    type: { type: String, enum: ['vpn', 'tor', 'proxy', 'hosting'], default: null },
    threatLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
  }
}, { _id: false });

const deviceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },
  os: {
    name: { type: String, maxlength: 50, default: '' },
    version: { type: String, maxlength: 50, default: '' },
    platform: { type: String, maxlength: 50, default: '' }
  },
  browser: {
    name: { type: String, maxlength: 50, default: '' },
    version: { type: String, maxlength: 50, default: '' },
    engine: { type: String, maxlength: 50, default: '' }
  },
  screen: {
    width: Number,
    height: Number,
    colorDepth: Number,
    pixelRatio: Number
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters'],
    default: ''
  },
  fingerprint: {
    type: String,
    default: ''
  }
}, { _id: false });

const performanceSchema = new mongoose.Schema({
  responseTime: { type: Number, min: 0, default: 0 }, // milliseconds
  processingTime: { type: Number, min: 0, default: 0 }, // milliseconds
  memoryUsage: { type: Number, min: 0, default: 0 }, // MB
  networkLatency: { type: Number, min: 0, default: 0 }, // milliseconds
  databaseQueries: {
    count: { type: Number, min: 0, default: 0 },
    time: { type: Number, min: 0, default: 0 }
  }
}, { _id: false });

const securitySchema = new mongoose.Schema({
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  anomalies: [{
    type: String,
    enum: [
      'unusual-time',
      'unusual-location',
      'multiple-sessions',
      'suspicious-pattern',
      'failed-authentication',
      'rate-limit-exceeded',
      'data-access-anomaly'
    ]
  }],
  threatIndicators: [{
    type: String,
    enum: [
      'ip-reputation',
      'user-behavior',
      'geolocation-mismatch',
      'device-fingerprint-change',
      'session-hijacking'
    ]
  }],
  compliance: {
    gdprLogged: { type: Boolean, default: false },
    dataSubject: String,
    legalBasis: { type: String, enum: ['consent', 'contract', 'legal_obligation', 'legitimate_interest'] }
  }
}, { _id: false });

const userActivitySchema = new mongoose.Schema({
  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // User & Session Context
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  session: {
    id: { type: String, required: true, index: true },
    type: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
    impersonatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },

  // Action & Event Details
  category: {
    type: String,
    enum: [
      'authentication',
      'authorization',
      'data-access',
      'data-modification',
      'system',
      'compliance',
      'security',
      'performance',
      'user-management',
      'assessment',
      'billing'
    ],
    required: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true
  },
  subaction: {
    type: String,
    trim: true,
    maxlength: [100, 'Subaction cannot exceed 100 characters'],
    default: ''
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },

  // Resource Context
  resourceType: {
    type: String,
    enum: [
      'user',
      'assessment',
      'assessment-response',
      'organization',
      'subscription',
      'billing',
      'api-key',
      'integration',
      'system'
    ],
    required: true,
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  resourceName: {
    type: String,
    maxlength: [200, 'Resource name cannot exceed 200 characters'],
    default: ''
  },

  // Operation & Outcome
  operation: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'execute', 'login', 'logout', 'export', 'import'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'partial', 'pending', 'cancelled'],
    default: 'success'
  },
  statusCode: {
    type: Number,
    min: 100,
    max: 599,
    default: 200
  },
  error: {
    code: String,
    message: String,
    stack: String,
    details: mongoose.Schema.Types.Mixed
  },

  // Severity & Impact
  severity: {
    type: String,
    enum: ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'],
    default: 'info',
    index: true
  },
  impact: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  // Technical Context
  location: locationSchema,
  device: deviceSchema,
  performance: performanceSchema,
  security: securitySchema,

  // Request/Response Context
  request: {
    id: { type: String, required: true, index: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], default: 'GET' },
    endpoint: String,
    query: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    size: { type: Number, min: 0, default: 0 } // bytes
  },
  response: {
    size: { type: Number, min: 0, default: 0 }, // bytes
    headers: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Business Context
  business: {
    feature: String,
    module: String,
    workflow: String,
    campaign: String,
    costCenter: String,
    project: String
  },

  // Additional Metadata
  metadata: {
    isSuspicious: { type: Boolean, default: false },
    requiresReview: { type: Boolean, default: false },
    reviewed: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
      notes: String
    },
    tags: [{
      type: String,
      maxlength: 50
    }],
    correlationId: String,
    parentActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'UserActivity', default: null }
  },

  // Data Changes (for audit trails)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    delta: mongoose.Schema.Types.Mixed,
    fields: [String]
  },

  // Retention & Archiving
  retention: {
    policy: { type: String, enum: ['standard', 'extended', 'permanent'], default: 'standard' },
    expiresAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    archiveLocation: String
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
   🔥 MULTI-TENANT INDEXES - Production Optimized
-------------------------------------------------------------------- */

// Primary query patterns
userActivitySchema.index({ organization: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, user: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, category: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, resourceType: 1, resourceId: 1 });

// Security and monitoring
userActivitySchema.index({ organization: 1, severity: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, 'security.riskScore': -1 });
userActivitySchema.index({ organization: 1, 'metadata.isSuspicious': 1 });

// Performance and analytics
userActivitySchema.index({ organization: 1, action: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, status: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, 'location.ip': 1 });

// Session and request tracking
userActivitySchema.index({ organization: 1, 'session.id': 1 });
userActivitySchema.index({ organization: 1, 'request.id': 1 });

// Retention and cleanup
userActivitySchema.index({ 
  'retention.expiresAt': 1,
  'retention.archived': 1 
}, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { 'retention.archived': false }
});

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

userActivitySchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
});

userActivitySchema.virtual('isHighRisk').get(function() {
  return this.security.riskScore >= 70 || this.severity === 'critical' || this.severity === 'alert';
});

userActivitySchema.virtual('isFailed').get(function() {
  return this.status === 'failure' || this.statusCode >= 400;
});

userActivitySchema.virtual('formattedAction').get(function() {
  return `${this.category}.${this.action}${this.subaction ? `.${this.subaction}` : ''}`;
});

userActivitySchema.virtual('duration').get(function() {
  return this.performance.responseTime + this.performance.processingTime;
});

userActivitySchema.virtual('isDataModification').get(function() {
  return ['create', 'update', 'delete'].includes(this.operation);
});

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

userActivitySchema.statics.logActivity = function(activityData) {
  // Generate request ID if not provided
  if (!activityData.request?.id) {
    activityData.request = activityData.request || {};
    activityData.request.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate session ID if not provided
  if (!activityData.session?.id) {
    activityData.session = activityData.session || {};
    activityData.session.id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate risk score if not provided
  if (activityData.security?.riskScore === undefined) {
    activityData.security = activityData.security || {};
    activityData.security.riskScore = this.calculateRiskScore(activityData);
  }

  return this.create(activityData);
};

userActivitySchema.statics.calculateRiskScore = function(activityData) {
  let score = 0;

  // Authentication failures
  if (activityData.category === 'authentication' && activityData.status === 'failure') {
    score += 30;
  }

  // Unusual locations
  if (activityData.location?.proxy?.isProxy) {
    score += activityData.location.proxy.threatLevel === 'high' ? 25 :
             activityData.location.proxy.threatLevel === 'medium' ? 15 : 5;
  }

  // High-impact operations
  if (activityData.impact === 'critical') score += 20;
  if (activityData.impact === 'high') score += 10;

  // Security-related actions
  if (activityData.category === 'security') score += 15;

  // Data modification outside business hours (simplified)
  if (activityData.isDataModification) {
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 10;
  }

  return Math.min(100, score);
};

userActivitySchema.statics.findByOrganization = function(organizationId, query = {}) {
  return this.find({ organization: organizationId, ...query })
    .populate('user', 'name email role')
    .populate('organization', 'name slug')
    .populate('metadata.reviewed.by', 'name email')
    .populate('session.impersonatedBy', 'name email');
};

userActivitySchema.statics.getSecurityReport = async function(organizationId, days = 30) {
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
        riskAnalysis: [
          {
            $bucket: {
              groupBy: '$security.riskScore',
              boundaries: [0, 25, 50, 75, 100],
              default: 'unknown',
              output: {
                count: { $sum: 1 },
                avgResponseTime: { $avg: '$performance.responseTime' }
              }
            }
          }
        ],
        threatBreakdown: [
          {
            $unwind: { path: '$security.threatIndicators', preserveNullAndEmptyArrays: true }
          },
          {
            $group: {
              _id: '$security.threatIndicators',
              count: { $sum: 1 },
              avgRiskScore: { $avg: '$security.riskScore' }
            }
          }
        ],
        suspiciousActivities: [
          {
            $match: {
              'metadata.isSuspicious': true
            }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              activities: { $push: '$$ROOT' }
            }
          }
        ],
        failedOperations: [
          {
            $match: {
              status: 'failure'
            }
          },
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 },
              lastOccurrence: { $max: '$createdAt' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        topUsersByActivity: [
          {
            $group: {
              _id: '$user',
              activityCount: { $sum: 1 },
              riskScore: { $avg: '$security.riskScore' },
              lastActivity: { $max: '$createdAt' }
            }
          },
          { $sort: { activityCount: -1 } },
          { $limit: 20 }
        ]
      }
    }
  ]);

  return report[0] || {};
};

userActivitySchema.statics.getPerformanceMetrics = async function(organizationId, days = 7) {
  const dateFilter = {
    createdAt: {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };

  const metrics = await this.aggregate([
    { 
      $match: { 
        organization: new mongoose.Types.ObjectId(organizationId),
        ...dateFilter
      } 
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        avgResponseTime: { $avg: '$performance.responseTime' },
        avgProcessingTime: { $avg: '$performance.processingTime' },
        p95ResponseTime: { $percentile: { input: '$performance.responseTime', p: 0.95 } },
        p99ResponseTime: { $percentile: { input: '$performance.responseTime', p: 0.99 } },
        totalRequests: { $sum: 1 },
        errorRate: {
          $avg: {
            $cond: [{ $in: ['$status', ['failure', 'error']] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return metrics;
};

userActivitySchema.statics.cleanupOldActivities = async function(organizationId = null, daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const filter = {
    createdAt: { $lt: cutoffDate },
    'retention.policy': { $ne: 'permanent' },
    'retention.archived': false
  };

  if (organizationId) {
    filter.organization = organizationId;
  }

  const result = await this.deleteMany(filter);
  return result;
};

userActivitySchema.statics.findSuspiciousActivities = function(organizationId, limit = 100) {
  return this.find({
    organization: organizationId,
    $or: [
      { 'security.riskScore': { $gte: 70 } },
      { 'metadata.isSuspicious': true },
      { 'metadata.requiresReview': true },
      { severity: { $in: ['critical', 'alert', 'emergency'] } }
    ]
  })
  .populate('user', 'name email role')
  .sort({ createdAt: -1 })
  .limit(limit);
};

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

userActivitySchema.methods.markAsReviewed = function(reviewedBy, notes = '') {
  this.metadata.reviewed = {
    by: reviewedBy,
    at: new Date(),
    notes
  };
  this.metadata.requiresReview = false;
  
  return this.save();
};

userActivitySchema.methods.flagAsSuspicious = function(reason = '') {
  this.metadata.isSuspicious = true;
  this.metadata.requiresReview = true;
  
  if (reason) {
    this.security.anomalies.push('manual-flag');
    this.description = this.description ? `${this.description} | ${reason}` : reason;
  }
  
  return this.save();
};

userActivitySchema.methods.addThreatIndicator = function(indicator, confidence = 'medium') {
  if (!this.security.threatIndicators.includes(indicator)) {
    this.security.threatIndicators.push(indicator);
    
    // Increase risk score based on new threat indicator
    const threatScores = {
      'ip-reputation': 20,
      'user-behavior': 25,
      'geolocation-mismatch': 15,
      'device-fingerprint-change': 30,
      'session-hijacking': 40
    };
    
    this.security.riskScore = Math.min(100, this.security.riskScore + (threatScores[indicator] || 10));
  }
  
  return this.save();
};

userActivitySchema.methods.archive = function(location = 'cold-storage') {
  this.retention.archived = true;
  this.retention.archiveLocation = location;
  return this.save();
};

userActivitySchema.methods.toAuditFormat = function() {
  return {
    id: this._id,
    timestamp: this.createdAt,
    organization: this.organization,
    user: this.user,
    session: this.session,
    action: this.formattedAction,
    resource: {
      type: this.resourceType,
      id: this.resourceId,
      name: this.resourceName
    },
    operation: this.operation,
    status: this.status,
    statusCode: this.statusCode,
    location: this.location,
    device: this.device,
    security: {
      riskScore: this.security.riskScore,
      anomalies: this.security.anomalies,
      threatIndicators: this.security.threatIndicators
    },
    performance: this.performance,
    metadata: this.metadata,
    changes: this.changes
  };
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

userActivitySchema.pre('save', function(next) {
  // Set retention expiration based on policy
  if (!this.retention.expiresAt) {
    const retentionPeriods = {
      'standard': 90,    // days
      'extended': 365,   // days
      'permanent': null  // never expire
    };
    
    if (this.retention.policy !== 'permanent') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retentionPeriods[this.retention.policy]);
      this.retention.expiresAt = expiresAt;
    }
  }
  
  // Auto-calculate impact based on severity and operation
  if (!this.impact || this.impact === 'low') {
    const impactMap = {
      'debug': 'low',
      'info': 'low',
      'notice': 'low',
      'warning': 'medium',
      'error': 'high',
      'critical': 'critical',
      'alert': 'critical',
      'emergency': 'critical'
    };
    
    this.impact = impactMap[this.severity] || 'low';
  }
  
  // Calculate delta for changes if both before and after are provided
  if (this.changes?.before && this.changes?.after && !this.changes.delta) {
    this.changes.delta = this.calculateDelta(this.changes.before, this.changes.after);
    this.changes.fields = Object.keys(this.changes.delta);
  }
  
  next();
});

userActivitySchema.methods.calculateDelta = function(before, after) {
  const delta = {};
  
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  
  for (const key of allKeys) {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];
    
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      delta[key] = {
        from: beforeVal,
        to: afterVal
      };
    }
  }
  
  return delta;
};

export default mongoose.model('UserActivity', userActivitySchema);
