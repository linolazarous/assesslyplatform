// api/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ========================
// USER SCHEMA DEFINITION
// ========================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters']
      // REMOVED: select: false - This was breaking authentication
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
  },
  { timestamps: true }
);

// ========================
// INDEXES FOR PERFORMANCE
// ========================
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ organization: 1, role: 1 });

// ========================
// VIRTUALS
// ========================
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ========================
// MIDDLEWARE
// ========================
userSchema.pre('save', async function (next) {
  // Hash password only if modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Reset lock and attempts on password change
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  next();
});

// ========================
// INSTANCE METHODS
// ========================

// Compare password securely
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (this.isLocked) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }

  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  if (!isMatch) {
    await this.recordFailedAttempt();
    throw new Error('Invalid password.');
  }

  // Reset on success
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  this.lastActivity = new Date();
  await this.save({ validateBeforeSave: false });

  return true;
};

// Record failed login attempt
userSchema.methods.recordFailedAttempt = async function () {
  this.loginAttempts += 1;

  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 mins
  }

  await this.save({ validateBeforeSave: false });
};

// Update last activity timestamp
userSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date();
  await this.save({ validateBeforeSave: false });
};

// Clean and secure JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

// ========================
// STATIC METHODS
// ========================
userSchema.statics.findActive = function () {
  return this.find({ isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.findByOrganization = function (orgId) {
  return this.find({ organization: orgId, isActive: true })
    .populate('organization', 'name slug')
    .sort({ name: 1 });
};

userSchema.statics.findAdmins = function () {
  return this.find({ role: 'admin', isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .sort({ name: 1 });
};

userSchema.statics.getStats = async function () {
  const [totalUsers, activeUsers, adminUsers, recentUsers] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isActive: true }),
    this.countDocuments({ role: 'admin', isActive: true }),
    this.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
    })
  ]);

  return { totalUsers, activeUsers, adminUsers, recentUsers };
};

// ========================
// EXPORT MODEL
// ========================
export default mongoose.model('User', userSchema);
