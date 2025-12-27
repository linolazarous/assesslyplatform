import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Automatically mark expired invitations
invitationSchema.pre('save', function (next) {
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

// Use static to create a new invitation
invitationSchema.statics.createInvitation = async function (email, role, days = 7) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  return this.create({
    email,
    role,
    token,
    expiresAt,
    sentAt: new Date(),
  });
};

// Instance method to resend invitation
invitationSchema.methods.resend = function (newExpiresInDays = 7) {
  if (this.status !== 'pending') {
    throw new Error('Only pending invitations can be resent');
  }

  this.token = crypto.randomBytes(32).toString('hex');
  this.expiresAt = new Date(Date.now() + newExpiresInDays * 24 * 60 * 60 * 1000);
  this.sentAt = new Date();
};

// Update status on acceptance
invitationSchema.methods.accept = function () {
  this.status = 'accepted';
};

// Export model
const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;
