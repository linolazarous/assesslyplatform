// api/models/RefreshToken.js
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, index: true },
  expires: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  createdByIp: { type: String },
  revokedAt: Date,
  revokedByIp: String,
  replacedByToken: String,
  reasonRevoked: String,
}, { timestamps: true });

refreshTokenSchema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires;
});

refreshTokenSchema.virtual('isActive').get(function() {
  return !this.revokedAt && !this.isExpired;
});

export default mongoose.model('RefreshToken', refreshTokenSchema);
