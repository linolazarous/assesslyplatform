// api/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    // NO index: true - handled by explicit index below
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'assessor', 'candidate'],
    default: 'candidate'
    // NO index: true - handled by explicit index below
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
    // NO index: true - handled by explicit index below
  },
  isActive: {
    type: Boolean,
    default: true
    // NO index: true - handled by explicit index below
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  lastActivity: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  profile: {
    avatar: {
      type: String,
      validate: {
        validator: function(url) {
          return !url || url.startsWith('http');
        },
        message: 'Avatar must be a valid URL'
      }
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true
});

// SINGLE SET OF EXPLICIT INDEXES - NO DUPLICATES
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for isLocked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Reset login attempts on password change
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  
  if (!isMatch) {
    await this.recordFailedAttempt();
    throw new Error('Invalid password');
  }
  
  // Reset on successful login
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  this.lastActivity = new Date();
  await this.save({ validateBeforeSave: false });
  
  return true;
};

// Record failed login attempt
userSchema.methods.recordFailedAttempt = async function() {
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
  
  await this.save({ validateBeforeSave: false });
};

// Update last activity
userSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  await this.save({ validateBeforeSave: false });
};

// Remove sensitive information from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

// Static method to find by organization
userSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId, isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .populate('organization', 'name slug')
    .sort({ name: 1 });
};

// Static method to find admins
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin', isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

// Static method to get user statistics
userSchema.statics.getStats = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });
  const adminUsers = await this.countDocuments({ role: 'admin', isActive: true });
  const recentUsers = await this.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  
  return {
    totalUsers,
    activeUsers,
    adminUsers,
    recentUsers
  };
};

export default mongoose.model('User', userSchema);
