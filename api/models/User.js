// api/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'] },
  password: { type: String, required: [true, 'Password is required'], minlength: [8, 'Password must be at least 8 characters'], select: false },
  role: { type: String, enum: ['admin','assessor','candidate','user'], default: 'candidate' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  lastActivity: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  profile: { avatar: String, jobTitle: String, department: String, phone: String, bio: String },
  preferences: { notifications: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true } }, language: { type: String, default: 'en' }, timezone: { type: String, default: 'UTC' } }
}, {
  timestamps: true
});

userSchema.index({ email: 1 });
userSchema.virtual('isLocked').get(function() { return !!(this.lockUntil && this.lockUntil > Date.now()); });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  next();
});

// compare password
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

userSchema.methods.recordFailedAttempt = async function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 mins
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.createEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

userSchema.methods.createPasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

userSchema.methods.clearPasswordReset = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

userSchema.methods.clearEmailVerification = function() {
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
