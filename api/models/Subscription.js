// api/models/Subscription.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'],
    default: 'active'
  },
  plan: {
    type: String,
    enum: ['free', 'professional', 'enterprise'],
    default: 'free'
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  priceId: String
}, {
  timestamps: true
});

export default mongoose.model('Subscription', subscriptionSchema);
