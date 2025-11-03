import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  resourceType: {
    type: String,
    enum: {
      values: ['user', 'assessment', 'response', 'organization', 'subscription', 'system'],
      message: 'Resource type must be one of: user, assessment, response, organization, subscription, system'
    },
    default: 'system'
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  severity: {
    type: String,
    enum: {
      values: ['info', 'warning', 'error', 'critical'],
      message: 'Severity must be one of: info, warning, error, critical'
    },
    default: 'info'
  },
  metadata: {
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    location: {
      country: String,
      region: String,
      city: String,
      timezone: String
    },
    device: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile', 'unknown'],
      default: 'unknown'
    },
    browser: {
      name: String,
      version: String
    },
    os: {
      name: String,
      version: String
    },
    sessionId: {
      type: String,
      default: ''
    },
    requestId: {
      type: String,
      default: ''
    },
    responseTime: {
      type: Number, // in milliseconds
      min: [0, 'Response time cannot be negative'],
      default: 0
    }
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and querying
userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, createdAt: -1 });
userActivitySchema.index({ action: 1 });
userActivitySchema.index({ resourceType: 1, resourceId: 1 });
userActivitySchema.index({ severity: 1 });
userActivitySchema.index({ createdAt: -1 });
userActivitySchema.index({ 'metadata.ipAddress': 1 });

// Virtual for formatted action
userActivitySchema.virtual('formattedAction').get(function() {
  return `${this.resourceType}.${this.action}`;
});

// Virtual for age (time since creation)
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

// Pre-save middleware to set default values
userActivitySchema.pre('save', function(next) {
  // Set request ID if not provided
  if (!this.metadata.requestId) {
    this.metadata.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  next();
});

// Static method to log activity
userActivitySchema.statics.log = function(activityData) {
  return this.create(activityData);
};

// Static method to get recent activities
userActivitySchema.statics.getRecentActivities = function(options = {}) {
  const {
    user = null,
    organization = null,
    action = null,
    resourceType = null,
    limit = 50,
    page = 1
  } = options;
  
  const query = this.find();
  
  if (user) query.where('user').equals(user);
  if (organization) query.where('organization').equals(organization);
  if (action) query.where('action').equals(action);
  if (resourceType) query.where('resourceType').equals(resourceType);
  
  return query
    .populate('user', 'name email role')
    .populate('organization', 'name slug')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// Static method to get activity statistics
userActivitySchema.statics.getActivityStats = async function(options = {}) {
  const { days = 30, organization = null } = options;
  
  const dateFilter = {
    createdAt: {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };
  
  const matchStage = organization 
    ? { organization, ...dateFilter }
    : dateFilter;
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          action: '$action'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalActivities: { $sum: '$count' },
        uniqueUsers: { $sum: { $size: '$uniqueUsers' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return stats;
};

// Static method to cleanup old activities
userActivitySchema.statics.cleanup = async function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $ne: 'critical' } // Keep critical logs forever
  });
  
  return result;
};

// Instance method to mark as reviewed
userActivitySchema.methods.markAsReviewed = function(reviewedBy) {
  this.additionalData.reviewed = true;
  this.additionalData.reviewedBy = reviewedBy;
  this.additionalData.reviewedAt = new Date();
  
  return this.save();
};

// Instance method to add note
userActivitySchema.methods.addNote = function(note, addedBy) {
  if (!this.additionalData.notes) {
    this.additionalData.notes = [];
  }
  
  this.additionalData.notes.push({
    note,
    addedBy,
    addedAt: new Date()
  });
  
  return this.save();
};

export default mongoose.model('UserActivity', userActivitySchema);
