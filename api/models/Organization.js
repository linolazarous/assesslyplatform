import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    minlength: [2, 'Organization name must be at least 2 characters'],
    maxlength: [100, 'Organization name cannot exceed 100 characters']
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
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  logo: {
    type: String,
    default: null
  },
  website: {
    type: String,
    validate: {
      validator: function(url) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+\..+/.test(url);
      },
      message: 'Please provide a valid website URL'
    },
    default: ''
  },
  industry: {
    type: String,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    default: ''
  },
  size: {
    type: String,
    enum: {
      values: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      message: 'Size must be one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+'
    },
    default: '1-10'
  },
  contact: {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          if (!email) return true; // Optional field
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
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'assessor', 'member', 'viewer'],
        message: 'Role must be one of: admin, manager, assessor, member, viewer'
      },
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
    permissions: {
      createAssessments: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false }
    }
  }],
  settings: {
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
    defaultUserRole: {
      type: String,
      enum: ['admin', 'manager', 'assessor', 'member', 'viewer'],
      default: 'member'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'canceled', 'expired'],
      default: 'active'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    features: {
      maxUsers: { type: Number, default: 10 },
      maxAssessments: { type: Number, default: 5 },
      maxStorage: { type: Number, default: 100 }, // in MB
      advancedAnalytics: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false }
    }
  },
  metadata: {
    totalAssessments: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 1
    },
    totalResponses: {
      type: Number,
      default: 0
    },
    activeSince: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ 'subscription.status': 1 });
organizationSchema.index({ 'settings.isPublic': 1 });

// Virtual for organization URL
organizationSchema.virtual('url').get(function() {
  return `/organizations/${this.slug}`;
});

// Virtual for assessments
organizationSchema.virtual('assessments', {
  ref: 'Assessment',
  localField: '_id',
  foreignField: 'organization'
});

// Virtual for active members count
organizationSchema.virtual('activeMembersCount').get(function() {
  return this.members.length + 1; // +1 for owner
});

// Pre-save middleware to generate slug and update metadata
organizationSchema.pre('save', async function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
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
  this.metadata.totalMembers = this.members.length + 1; // +1 for owner
  
  next();
});

// Static method to find by slug
organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase() })
    .populate('owner', 'name email')
    .populate('members.user', 'name email role');
};

// Static method to find organizations by user
organizationSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  }).populate('owner', 'name email');
};

// Static method to get organization stats
organizationSchema.statics.getOrganizationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$subscription.plan',
        count: { $sum: 1 },
        totalMembers: { $sum: '$metadata.totalMembers' },
        totalAssessments: { $sum: '$metadata.totalAssessments' }
      }
    }
  ]);
  
  return stats;
};

// Instance method to add member
organizationSchema.methods.addMember = function(userId, role = 'member', invitedBy = null) {
  // Check if user is already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }
  
  this.members.push({
    user: userId,
    role,
    invitedBy,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove member
organizationSchema.methods.removeMember = function(userId) {
  // Cannot remove owner
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Cannot remove organization owner');
  }
  
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Instance method to update member role
organizationSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.role = newRole;
  }
  
  return this.save();
};

// Instance method to check if user is member
organizationSchema.methods.isMember = function(userId) {
  return this.owner.toString() === userId.toString() ||
         this.members.some(member => member.user.toString() === userId.toString());
};

// Instance method to check if user has permission
organizationSchema.methods.hasPermission = function(userId, permission) {
  if (this.owner.toString() === userId.toString()) {
    return true; // Owner has all permissions
  }
  
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!member) return false;
  
  // Check role-based permissions
  const rolePermissions = {
    admin: ['createAssessments', 'manageUsers', 'viewAnalytics', 'manageSettings'],
    manager: ['createAssessments', 'viewAnalytics'],
    assessor: ['createAssessments'],
    member: [],
    viewer: []
  };
  
  return rolePermissions[member.role]?.includes(permission) || 
         member.permissions?.[permission] === true;
};

export default mongoose.model('Organization', organizationSchema);
