// api/models/UserActivity.js
import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'password_change', 'profile_update',
      'assessment_started', 'assessment_completed', 'assessment_graded',
      'user_invited', 'user_removed', 'subscription_updated',
      'organization_created', 'organization_updated'
    ],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  resourceType: {
    type: String,
    enum: ['user', 'assessment', 'organization', 'subscription', 'system'],
    default: 'system'
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  location: {
    country: String,
    region: String,
    city: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Compound indexes for common query patterns
userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ organization: 1, action: 1, createdAt: -1 });
userActivitySchema.index({ action: 1, createdAt: -1 });
userActivitySchema.index({ resourceType: 1, resourceId: 1 });
userActivitySchema.index({ severity: 1, createdAt: -1 });

// Virtual for readable timestamp
userActivitySchema.virtual('readableTime').get(function() {
  return this.createdAt.toLocaleString();
});

// Static method to get recent activities
userActivitySchema.statics.getRecentActivities = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('organization', 'name slug');
};

// Static method to get activities by action type
userActivitySchema.statics.getByAction = function(action, options = {}) {
  const query = { action };
  
  if (options.organization) {
    query.organization = options.organization;
  }
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: options.startDate,
      $lte: options.endDate
    };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .populate('user', 'name email')
    .populate('organization', 'name slug');
};

// Method to format activity for display
userActivitySchema.methods.formatForDisplay = function() {
  const base = {
    id: this._id,
    action: this.action,
    description: this.description,
    timestamp: this.createdAt,
    severity: this.severity
  };
  
  if (this.user && typeof this.user === 'object') {
    base.user = {
      id: this.user._id,
      name: this.user.name,
      email: this.user.email
    };
  }
  
  if (this.organization && typeof this.organization === 'object') {
    base.organization = {
      id: this.organization._id,
      name: this.organization.name,
      slug: this.organization.slug
    };
  }
  
  return base;
};

export default mongoose.model('UserActivity', userActivitySchema);
