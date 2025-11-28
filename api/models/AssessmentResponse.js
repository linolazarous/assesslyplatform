// api/models/AssessmentResponse.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
    required: true
  },
  answer: mongoose.Schema.Types.Mixed,
  files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  isCorrect: { type: Boolean, default: null },
  pointsAwarded: { type: Number, min: 0, default: 0 },
  timeSpent: { type: Number, min: 0, default: 0 },
  metadata: {
    startedAt: Date,
    answeredAt: Date,
    flagged: { type: Boolean, default: false },
    reviewNote: { type: String, maxlength: 500 }
  }
});

const assessmentResponseSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },

  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🔥 MULTITENANT FIELD (same as assessment)
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  answers: [answerSchema],

  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'under-review', 'completed', 'expired', 'abandoned'],
    default: 'in-progress'
  },

  score: { type: Number, min: 0, default: 0 },
  totalPoints: { type: Number, min: 0, default: 0 },
  percentage: { type: Number, min: 0, max: 100, default: 0 },
  passed: { type: Boolean, default: null },

  timeSpent: { type: Number, min: 0, default: 0 },

  startedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  expiresAt: Date,

  feedback: {
    general: { type: String, maxlength: 2000 },
    strengths: [{ type: String, maxlength: 200 }],
    improvements: [{ type: String, maxlength: 200 }]
  },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,

  metadata: {
    ipAddress: String,
    userAgent: String,
    browser: { name: String, version: String },
    os: { name: String, version: String },
    device: { type: String, enum: ['desktop', 'tablet', 'mobile'], default: 'desktop' },
    warnings: [{ type: String, maxlength: 200 }],
    violations: [{
      type: {
        type: String,
        enum: ['tab-switch', 'fullscreen-exit', 'multiple-tabs', 'copy-paste', 'right-click']
      },
      timestamp: Date
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* --------------------------------------------------------------------
   🔥 MULTITENANT INDEXES
-------------------------------------------------------------------- */

// Single-tenant base
assessmentResponseSchema.index({ organization: 1 });

// Prevents user/assessment collisions across tenants
assessmentResponseSchema.index({ organization: 1, assessment: 1, candidate: 1 });

// Query optimization within tenant constraints
assessmentResponseSchema.index({ organization: 1, candidate: 1, status: 1 });
assessmentResponseSchema.index({ organization: 1, assessment: 1, status: 1 });

assessmentResponseSchema.index({ organization: 1, submittedAt: -1 });
assessmentResponseSchema.index({ organization: 1, expiresAt: 1 });
assessmentResponseSchema.index({ organization: 1, 'metadata.ipAddress': 1 });


// ----------------------------------------------------
// VIRTUALS
// ----------------------------------------------------
assessmentResponseSchema.virtual('duration').get(function() {
  if (!this.submittedAt) return null;
  return Math.floor((this.submittedAt - this.startedAt) / 1000);
});

assessmentResponseSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt || this.status !== 'in-progress') return null;
  return Math.max(0, Math.floor((this.expiresAt - new Date()) / 1000));
});


// ----------------------------------------------------
// PRE-SAVE
// ----------------------------------------------------
assessmentResponseSchema.pre('save', function(next) {
  if (this.answers.length > 0) {
    this.totalPoints = this.answers.reduce((sum, ans) => sum + (ans.pointsAwarded || 0), 0);
    this.timeSpent = this.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0);
  }

  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (this.isModified('reviewedBy') && this.reviewedBy && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }

  next();
});

export default mongoose.model('AssessmentResponse', assessmentResponseSchema);
