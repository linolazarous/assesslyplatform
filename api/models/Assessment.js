// api/models/Assessment.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
    required: true
  },
  question: { type: String, required: true, trim: true, maxlength: 1000 },
  description: { type: String, maxlength: 2000, default: '' },
  points: { type: Number, min: 0, max: 1000, default: 1 },
  options: [{
    id: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    isCorrect: { type: Boolean, default: false }
  }],
  correctAnswer: mongoose.Schema.Types.Mixed,
  explanation: { type: String, maxlength: 1000, default: '' },
  required: { type: Boolean, default: true },
  metadata: {
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    tags: [{ type: String, maxlength: 50 }],
    timeLimit: { type: Number, min: 0, default: 0 }
  }
});

const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
  description: { type: String, maxlength: 2000, default: '' },
  slug: { type: String, lowercase: true, trim: true },

  // 🔥 MULTITENANT FIELD
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true   // enforce strict tenant boundary
  },

  questions: [questionSchema],

  settings: {
    duration: { type: Number, min: 1, max: 480, default: 60 },
    attempts: { type: Number, min: 1, max: 10, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    allowBacktracking: { type: Boolean, default: true },
    requireFullScreen: { type: Boolean, default: false },
    webcamMonitoring: { type: Boolean, default: false }
  },

  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  },

  category: { type: String, maxlength: 100, default: 'General' },
  tags: [{ type: String, maxlength: 50 }],

  totalPoints: { type: Number, min: 0, default: 0 },
  passingScore: { type: Number, min: 0, max: 100, default: 70 },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  access: {
    type: String,
    enum: ['public', 'private', 'organization'],
    default: 'private'
  },

  allowedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  metadata: {
    views: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 }
  },

  schedule: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    timezone: { type: String, default: 'UTC' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* --------------------------------------------------------------------
   🔥 MULTITENANT INDEXES
   Ensures tenants are fully isolated.
-------------------------------------------------------------------- */

assessmentSchema.index({ organization: 1 });
assessmentSchema.index({ organization: 1, createdBy: 1 });
assessmentSchema.index({ organization: 1, status: 1 });
assessmentSchema.index({ organization: 1, category: 1 });
assessmentSchema.index({ organization: 1, tags: 1 });

// Prevents cross-tenant slug collisions
assessmentSchema.index(
  { organization: 1, slug: 1 },
  { unique: true, sparse: true }
);

assessmentSchema.index({ 'schedule.startDate': 1 });
assessmentSchema.index({ 'schedule.endDate': 1 });


// ----------------------------------------------------
// VIRTUAL POPULATIONS
// ----------------------------------------------------
assessmentSchema.virtual('responseCount', {
  ref: 'AssessmentResponse',
  localField: '_id',
  foreignField: 'assessment',
  count: true
});

assessmentSchema.virtual('activeResponses', {
  ref: 'AssessmentResponse',
  localField: '_id',
  foreignField: 'assessment',
  match: { status: { $in: ['submitted', 'in-progress'] } },
  count: true
});


// ----------------------------------------------------
// PRE-SAVE LOGIC
// ----------------------------------------------------
assessmentSchema.pre('save', async function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  if (this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }

  next();
});

export default mongoose.model('Assessment', assessmentSchema);
