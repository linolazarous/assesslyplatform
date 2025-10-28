// api/models/Organization.js
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'canceled', 'past_due'],
      default: 'active'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date
  },
  settings: {
    allowRegistrations: {
      type: Boolean,
      default: true
    },
    maxUsers: {
      type: Number,
      default: 10
    },
    maxAssessments: {
      type: Number,
      default: 5
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Organization', organizationSchema);
