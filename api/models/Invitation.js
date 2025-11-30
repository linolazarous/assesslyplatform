import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'team_lead', 'assessor', 'team_member', 'candidate'],
    index: true
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revocationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isExpired
invitationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for isValid (not expired and pending)
invitationSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && !this.isExpired;
});

// Virtual for daysUntilExpiry
invitationSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate token and set expiry
invitationSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate unique token
    this.token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 7 days from now if not provided
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

// Pre-save middleware to update status based on expiry
invitationSchema.pre('save', function(next) {
  if (this.isModified('expiresAt') || this.isNew) {
    if (this.isExpired && this.status === 'pending') {
      this.status = 'expired';
    }
  }
  next();
});

// Static method to create invitation
invitationSchema.statics.createInvitation = async function(invitationData) {
  const {
    organization,
    email,
    role,
    teams = [],
    invitedBy,
    message,
    expiresInDays = 7,
    metadata = {}
  } = invitationData;

  // Check for existing pending invitation for same email and organization
  const existingInvitation = await this.findOne({
    organization,
    email: email.toLowerCase(),
    status: 'pending'
  });

  if (existingInvitation) {
    if (!existingInvitation.isExpired) {
      throw new Error('Pending invitation already exists for this email');
    }
    // Mark expired invitation as expired
    existingInvitation.status = 'expired';
    await existingInvitation.save();
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return this.create({
    organization,
    email: email.toLowerCase(),
    role,
    teams,
    invitedBy,
    message,
    expiresAt,
    metadata
  });
};

// Static method to find valid invitation by token
invitationSchema.statics.findValidByToken = function(token) {
  return this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organization', 'name slug logo');
};

// Static method to get organization invitations
invitationSchema.statics.getOrganizationInvitations = function(organizationId, options = {}) {
  const query = { organization: organizationId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('invitedBy', 'name email avatar')
    .populate('acceptedBy', 'name email avatar')
    .populate('revokedBy', 'name email avatar')
    .populate('teams', 'name slug')
    .sort({ createdAt: -1 });
};

// Static method to get user's pending invitations
invitationSchema.statics.getUserPendingInvitations = function(email) {
  return this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('organization', 'name slug logo description');
};

// Static method to cleanup expired invitations
invitationSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lte: new Date() }
    },
    {
      status: 'expired'
    }
  );
};

// Instance method to accept invitation
invitationSchema.methods.accept = function(acceptedBy) {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }
  
  if (this.isExpired) {
    throw new Error('Invitation has expired');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.acceptedBy = acceptedBy;
};

// Instance method to revoke invitation
invitationSchema.methods.revoke = function(revokedBy, reason = '') {
  if (this.status !== 'pending') {
    throw new Error('Only pending invitations can be revoked');
  }

  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revocationReason = reason;
};

// Instance method to resend invitation
invitationSchema.methods.resend = function(newExpiresInDays = 7) {
  if (this.status !== 'pending') {
    throw new Error('Only pending invitations can be resent');
  }

  // Generate new token and extend expiry
  this.token = crypto.randomBytes(32).toString('hex');
  this.expiresAt = new Date(Date.now() + newExpiresInDays * 24 * 60 * 60 * 1000);
  this.sentAt = new Date();
};

// Index for efficient queries
invitationSchema.index({ organization: 1, email: 1, status: 1 });
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ status: 1, expiresAt: 1 });
invitationSchema.index({ invitedBy: 1 });
invitationSchema.index({ createdAt: -1 });

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;
