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
    unique: true, // unique creates its own index, no need for extra .index()
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
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
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  lastActivity: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  profile: {
    avatar: {
      type: String,
      validate: {
        validator: url => !url || url.startsWith('http'),
        message: 'Avatar must be a valid URL'
      }
    },
    jobTitle: { type: String, trim: true, maxlength: 100 },
    department: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  }
}, {
  timestamps: true
});

// Indexes (no duplicates)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ organization: 1, role: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  next();
});

// Password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.isLocked) throw new Error('Account is temporarily locked.');

  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  if (!isMatch) {
    await this.recordFailedAttempt();
    throw new Error('Invalid password');
  }

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

// Clean output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// Static queries
userSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.findByOrganization = function(orgId) {
  return this.find({ organization: orgId, isActive: true })
    .populate('organization', 'name slug')
    .sort({ name: 1 });
};

userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin', isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.getStats = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });
  const adminUsers = await this.countDocuments({ role: 'admin', isActive: true });
  const recentUsers = await this.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  return { totalUsers, activeUsers, adminUsers, recentUsers };
};

export default mongoose.model('User', userSchema);
