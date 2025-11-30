import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['manager', 'member', 'viewer'],
    default: 'member'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  permissions: {
    canManageAssessments: { type: Boolean, default: false },
    canManageTeam: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
    canInviteMembers: { type: Boolean, default: false }
  }
}, { _id: true });

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  members: [teamMemberSchema],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  settings: {
    allowMemberInvites: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ['private', 'organization', 'public'],
      default: 'private'
    },
    autoJoin: { type: Boolean, default: false }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for active member count
teamSchema.virtual('activeMemberCount').get(function() {
  return this.members.filter(member => 
    mongoose.model('User').findById(member.user)?.isActive
  ).length;
});

// Pre-save middleware to generate slug and validate data
teamSchema.pre('save', async function(next) {
  // Generate slug from name
  if (this.isModified('name')) {
    const baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure unique slug within organization
    while (await mongoose.model('Team').findOne({ 
      organization: this.organization, 
      slug, 
      _id: { $ne: this._id } 
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }

  // Ensure manager is in members list
  if (this.manager && !this.members.some(member => member.user.equals(this.manager))) {
    this.members.push({
      user: this.manager,
      role: 'manager',
      addedBy: this.manager,
      permissions: {
        canManageAssessments: true,
        canManageTeam: true,
        canViewReports: true,
        canInviteMembers: true
      }
    });
  }

  next();
});

// Pre-remove middleware to handle team deletion
teamSchema.pre('remove', async function(next) {
  // Remove team references from assessments
  await mongoose.model('Assessment').updateMany(
    { teams: this._id },
    { $pull: { teams: this._id } }
  );
  
  // Remove team references from users' organizations
  await mongoose.model('User').updateMany(
    { 'organizations.teams': this._id },
    { $pull: { 'organizations.$.teams': this._id } }
  );

  next();
});

// Static method to get organization teams
teamSchema.statics.getOrganizationTeams = function(organizationId, options = {}) {
  const query = { organization: organizationId };
  
  if (options.active !== undefined) {
    query.isActive = options.active;
  }
  
  return this.find(query)
    .populate('manager', 'name email avatar')
    .populate('members.user', 'name email avatar role')
    .sort({ createdAt: -1 });
};

// Static method to find team by slug within organization
teamSchema.statics.findBySlug = function(organizationId, slug) {
  return this.findOne({ organization: organizationId, slug })
    .populate('manager', 'name email avatar')
    .populate('members.user', 'name email avatar role');
};

// Instance method to add member to team
teamSchema.methods.addMember = function(userId, role = 'member', addedBy, permissions = {}) {
  // Check if user is already a member
  if (this.members.some(member => member.user.equals(userId))) {
    throw new Error('User is already a member of this team');
  }

  this.members.push({
    user: userId,
    role,
    addedBy: addedBy || this.manager,
    permissions: {
      canManageAssessments: permissions.canManageAssessments || false,
      canManageTeam: permissions.canManageTeam || false,
      canViewReports: permissions.canViewReports !== false,
      canInviteMembers: permissions.canInviteMembers || false
    }
  });
};

// Instance method to remove member from team
teamSchema.methods.removeMember = function(userId) {
  if (this.manager.equals(userId)) {
    throw new Error('Cannot remove team manager');
  }
  
  this.members = this.members.filter(member => !member.user.equals(userId));
};

// Instance method to update member role
teamSchema.methods.updateMemberRole = function(userId, newRole, newPermissions = {}) {
  const member = this.members.find(m => m.user.equals(userId));
  if (!member) {
    throw new Error('User is not a member of this team');
  }

  member.role = newRole;
  if (newPermissions) {
    member.permissions = { ...member.permissions, ...newPermissions };
  }
};

// Instance method to check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.equals(userId));
};

// Instance method to check if user has permission
teamSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.user.equals(userId));
  if (!member) return false;

  return member.permissions[permission] || false;
};

// Instance method to get member permissions
teamSchema.methods.getMemberPermissions = function(userId) {
  const member = this.members.find(m => m.user.equals(userId));
  return member ? member.permissions : null;
};

// Index for efficient queries
teamSchema.index({ organization: 1, slug: 1 }, { unique: true });
teamSchema.index({ organization: 1, isActive: 1 });
teamSchema.index({ manager: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ createdAt: -1 });

const Team = mongoose.model('Team', teamSchema);

export default Team;
