import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
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
  expires: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true
  },
  device: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Device name cannot exceed 100 characters'],
      default: 'Unknown Device'
    },
    type: {
      type: String,
      enum: {
        values: ['desktop', 'tablet', 'mobile', 'unknown'],
        message: 'Device type must be one of: desktop, tablet, mobile, unknown'
      },
      default: 'unknown'
    },
    os: {
      type: String,
      trim: true,
      maxlength: [50, 'OS name cannot exceed 50 characters'],
      default: ''
    },
    browser: {
      type: String,
      trim: true,
      maxlength: [50, 'Browser name cannot exceed 50 characters'],
      default: ''
    }
  },
  location: {
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      trim: true
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters'],
      default: ''
    },
    region: {
      type: String,
      trim: true,
      maxlength: [100, 'Region name cannot exceed 100 characters'],
      default: ''
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
    }
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true
  },
  revokedByIp: {
    type: String,
    trim: true,
    default: null
  },
  replacedByToken: {
    type: String,
    trim: true,
    default: null
  },
  reasonRevoked: {
    type: String,
    enum: {
      values: ['replaced', 'logout', 'security', 'expired', 'manual', 'suspicious'],
      message: 'Revocation reason must be one of: replaced, logout, security, expired, manual, suspicious'
    },
    default: null
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  usageCount: {
    type: Number,
    min: [0, 'Usage count cannot be negative'],
    default: 0
  },
  metadata: {
    isRememberMe: {
      type: Boolean,
      default: false
    },
    sessionId: {
      type: String,
      trim: true,
      default: ''
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot exceed 500 characters'],
      default: ''
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive and internal fields from JSON output
      delete ret.token;
      delete ret.replacedByToken;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.token;
      delete ret.replacedByToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for performance
refreshTokenSchema.index({ user: 1, revokedAt: 1 });
refreshTokenSchema.index({ user: 1, expires: 1 });
refreshTokenSchema.index({ token: 1, revokedAt: 1 });
refreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Virtual for token status
refreshTokenSchema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires.getTime();
});

refreshTokenSchema.virtual('isActive').get(function() {
  return !this.revokedAt && !this.isExpired;
});

refreshTokenSchema.virtual('isRevoked').get(function() {
  return !!this.revokedAt;
});

refreshTokenSchema.virtual('lifetime').get(function() {
  if (this.revokedAt) {
    return this.revokedAt.getTime() - this.createdAt.getTime();
  }
  return Date.now() - this.createdAt.getTime();
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

// Pre-save middleware for data validation and cleanup
refreshTokenSchema.pre('save', function(next) {
  // Ensure revoked tokens have a revocation reason
  if (this.revokedAt && !this.reasonRevoked) {
    this.reasonRevoked = 'manual';
  }
  
  // Update last used timestamp when token is used
  if (this.isModified('usageCount') && this.usageCount > 0) {
    this.lastUsedAt = new Date();
  }
  
  next();
});

// Static method to find active tokens for a user
refreshTokenSchema.statics.findActiveByUser = function(userId, options = {}) {
  const query = this.find({
    user: userId,
    revokedAt: null,
    expires: { $gt: new Date() }
  }).sort({ createdAt: -1 });
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query;
};

// Static method to find token by value
refreshTokenSchema.statics.findByToken = function(token) {
  return this.findOne({ 
    token,
    revokedAt: null,
    expires: { $gt: new Date() }
  }).populate('user', 'name email role isActive');
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = function(userId, reason = 'security', revokedByIp = null) {
  return this.updateMany(
    {
      user: userId,
      revokedAt: null
    },
    {
      revokedAt: new Date(),
      reasonRevoked: reason,
      revokedByIp: revokedByIp
    }
  );
};

// Static method to revoke token by value
refreshTokenSchema.statics.revokeByToken = function(token, reason = 'logout', revokedByIp = null) {
  return this.findOneAndUpdate(
    { 
      token,
      revokedAt: null 
    },
    {
      revokedAt: new Date(),
      reasonRevoked: reason,
      revokedByIp: revokedByIp
    },
    { new: true }
  );
};

// Static method to cleanup expired tokens
refreshTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expires: { $lt: new Date() }
  });
  
  return result;
};

// Static method to get token statistics
refreshTokenSchema.statics.getTokenStats = async function(userId = null) {
  const matchStage = userId ? { user: userId } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
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
        expiredTokens: {
          $sum: {
            $cond: [
              { $lt: ['$expires', new Date()] },
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
        },
        avgUsageCount: { $avg: '$usageCount' },
        maxUsageCount: { $max: '$usageCount' }
      }
    }
  ]);
  
  return stats[0] || {
    totalTokens: 0,
    activeTokens: 0,
    expiredTokens: 0,
    revokedTokens: 0,
    avgUsageCount: 0,
    maxUsageCount: 0
  };
};

// Instance method to revoke this token
refreshTokenSchema.methods.revoke = function(reason = 'logout', revokedByIp = null) {
  this.revokedAt = new Date();
  this.reasonRevoked = reason;
  this.revokedByIp = revokedByIp;
  
  return this.save();
};

// Instance method to mark as replaced
refreshTokenSchema.methods.replaceWith = function(newToken) {
  this.revokedAt = new Date();
  this.reasonRevoked = 'replaced';
  this.replacedByToken = newToken;
  
  return this.save();
};

// Instance method to record usage
refreshTokenSchema.methods.recordUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  return this.save({ validateBeforeSave: false });
};

// Instance method to check if token can be used
refreshTokenSchema.methods.canUse = function() {
  return !this.revokedAt && Date.now() < this.expires.getTime();
};

// Instance method to get safe representation (for logging)
refreshTokenSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    user: this.user,
    device: this.device,
    location: this.location,
    createdAt: this.createdAt,
    expires: this.expires,
    lastUsedAt: this.lastUsedAt,
    usageCount: this.usageCount,
    isActive: this.isActive,
    isExpired: this.isExpired,
    isRevoked: this.isRevoked,
    age: this.age
  };
};

export default mongoose.model('RefreshToken', refreshTokenSchema);
