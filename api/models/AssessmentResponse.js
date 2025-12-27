// api/models/AssessmentResponse.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  questionIndex: {
    type: Number,
    min: 0,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'single-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(value) {
        // Validate based on question type
        switch (this.questionType) {
          case 'multiple-choice':
          case 'single-choice':
            return Array.isArray(value) || typeof value === 'string';
          case 'true-false':
            return typeof value === 'boolean';
          case 'short-answer':
          case 'essay':
          case 'code':
            return typeof value === 'string';
          case 'file-upload':
            return Array.isArray(value) && value.every(file => typeof file === 'string');
          default:
            return true;
        }
      },
      message: 'Invalid answer format for question type'
    }
  },
  selectedOptions: [{
    optionId: String,
    text: String,
    selectedAt: Date
  }],
  files: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, min: 0, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    storage: {
      provider: { type: String, enum: ['s3', 'gcs', 'local'], default: 'local' },
      bucket: String,
      key: String
    }
  }],
  isCorrect: { 
    type: Boolean, 
    default: null 
  },
  pointsAwarded: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  maxPoints: {
    type: Number,
    min: 0,
    required: true
  },
  timeSpent: { 
    type: Number, 
    min: 0, 
    default: 0 
  }, // in seconds
  autoGraded: {
    type: Boolean,
    default: false
  },
  manualOverride: {
    points: Number,
    reason: String,
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overriddenAt: Date
  },
  metadata: {
    startedAt: { type: Date, default: Date.now },
    answeredAt: Date,
    flagged: { type: Boolean, default: false },
    reviewNote: { type: String, maxlength: 1000 },
    confidence: { type: Number, min: 0, max: 1 }, // AI confidence score
    similarityScore: { type: Number, min: 0, max: 1 }, // Plagiarism detection
    aiFeedback: String
  }
}, {
  _id: true,
  timestamps: false
});

const feedbackSchema = new mongoose.Schema({
  general: { 
    type: String, 
    maxlength: 5000 
  },
  strengths: [{ 
    type: String, 
    maxlength: 500 
  }],
  improvements: [{ 
    type: String, 
    maxlength: 500 
  }],
  rubricScores: [{
    criteria: String,
    score: Number,
    maxScore: Number,
    comments: String
  }],
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  recommendedActions: [{
    action: String,
    priority: { type: String, enum: ['low', 'medium', 'high'] },
    resources: [String]
  }]
}, {
  _id: false
});

const securityViolationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'tab-switch', 
      'fullscreen-exit', 
      'multiple-tabs', 
      'copy-paste', 
      'right-click',
      'keyboard-shortcut',
      'developer-tools',
      'print-attempt',
      'screen-capture',
      'unusual-mouse-movement',
      'face-not-visible',
      'multiple-faces-detected',
      'noise-detected'
    ],
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  details: mongoose.Schema.Types.Mixed,
  screenshot: {
    filename: String,
    url: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, {
  _id: true
});

const assessmentResponseSchema = new mongoose.Schema({
  // Core References
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
    index: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Response Content
  answers: [answerSchema],
  currentQuestion: {
    index: Number,
    startedAt: Date,
    timeSpent: Number
  },

  // Status & Lifecycle
  status: {
    type: String,
    enum: [
      'not-started', 
      'in-progress', 
      'submitted', 
      'under-review', 
      'auto-graded', 
      'manually-graded',
      'completed', 
      'expired', 
      'abandoned',
      'flagged',
      'needs-clarification'
    ],
    default: 'not-started'
  },
  attempt: {
    number: { type: Number, min: 1, default: 1 },
    maxAttempts: { type: Number, min: 1, default: 1 },
    previousAttempts: [{
      responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentResponse' },
      submittedAt: Date,
      score: Number
    }]
  },

  // Scoring & Evaluation
  score: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  totalPoints: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  percentage: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0 
  },
  passed: { 
    type: Boolean, 
    default: null 
  },
  grade: {
    letter: String,
    description: String,
    threshold: Number
  },
  percentile: {
    type: Number,
    min: 0,
    max: 100
  },

  // Timing & Duration
  timeSpent: { 
    type: Number, 
    min: 0, 
    default: 0 
  }, // Total in seconds
  timeLimit: {
    type: Number,
    min: 0
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  submittedAt: Date,
  expiresAt: Date,
  lastActivityAt: { 
    type: Date, 
    default: Date.now 
  },

  // Review & Feedback
  feedback: feedbackSchema,
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: Date,
  reviewStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'escalated'],
    default: 'pending'
  },
  reviewNotes: [{
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['comment', 'question', 'concern'] }
  }],

  // Security & Proctoring
  metadata: {
    ipAddress: String,
    userAgent: String,
    browser: { 
      name: String, 
      version: String,
      engine: String
    },
    os: { 
      name: String, 
      version: String,
      platform: String
    },
    device: { 
      type: String, 
      enum: ['desktop', 'tablet', 'mobile', 'unknown'],
      default: 'unknown'
    },
    screenResolution: {
      width: Number,
      height: Number
    },
    network: {
      type: { type: String, enum: ['wifi', 'cellular', 'ethernet', 'unknown'] },
      downlink: Number, // Mbps
      effectiveType: String // 4g, 3g, etc.
    },
    warnings: [{
      type: String, 
      maxlength: 500,
      severity: { type: String, enum: ['low', 'medium', 'high'] },
      timestamp: Date
    }],
    violations: [securityViolationSchema],
    proctoring: {
      enabled: { type: Boolean, default: false },
      sessionId: String,
      recordings: [{
        type: { type: String, enum: ['video', 'audio', 'screen'] },
        url: String,
        duration: Number,
        startedAt: Date,
        endedAt: Date
      }],
      faceDetection: {
        confidence: Number,
        anomalies: [String]
      },
      audioAnalysis: {
        noiseLevel: Number,
        speechDetected: Boolean,
        anomalies: [String]
      }
    }
  },

  // Analytics & Insights
  analytics: {
    questionTimeDistribution: [{
      questionIndex: Number,
      timeSpent: Number
    }],
    difficultyPerception: [{
      questionIndex: Number,
      perceivedDifficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
    }],
    confidenceScores: [{
      questionIndex: Number,
      confidence: { type: Number, min: 0, max: 1 }
    }],
    plagiarismScore: {
      overall: { type: Number, min: 0, max: 1 },
      sources: [{
        url: String,
        similarity: Number,
        matchedText: String
      }]
    },
    behaviorAnalysis: {
      typingPattern: mongoose.Schema.Types.Mixed,
      mouseMovements: [{
        timestamp: Date,
        x: Number,
        y: Number
      }],
      focusTime: Number,
      distractionCount: Number
    }
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true 
  }
});

/* --------------------------------------------------------------------
   🔥 MULTI-TENANT INDEXES - Production Optimized
-------------------------------------------------------------------- */

// Primary query patterns
assessmentResponseSchema.index({ organization: 1, assessment: 1 });
assessmentResponseSchema.index({ organization: 1, candidate: 1 });
assessmentResponseSchema.index({ organization: 1, status: 1 });
assessmentResponseSchema.index({ organization: 1, submittedAt: -1 });

// Unique attempt per candidate per assessment within organization
assessmentResponseSchema.index(
  { organization: 1, assessment: 1, candidate: 1, 'attempt.number': 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['in-progress', 'submitted', 'under-review', 'completed'] } 
    }
  }
);

// Performance indexes
assessmentResponseSchema.index({ organization: 1, createdAt: -1 });
assessmentResponseSchema.index({ organization: 1, reviewedBy: 1 });
assessmentResponseSchema.index({ organization: 1, passed: 1 });
assessmentResponseSchema.index({ organization: 1, percentage: -1 });

// Analytics indexes
assessmentResponseSchema.index({ organization: 1, 'metadata.proctoring.enabled': 1 });
assessmentResponseSchema.index({ organization: 1, 'metadata.violations.type': 1 });

// Time-based queries
assessmentResponseSchema.index({ organization: 1, expiresAt: 1 });
assessmentResponseSchema.index({ organization: 1, lastActivityAt: -1 });

// Review workflow
assessmentResponseSchema.index({ organization: 1, reviewStatus: 1 });

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

assessmentResponseSchema.virtual('duration').get(function() {
  if (!this.submittedAt) return null;
  return Math.floor((this.submittedAt - this.startedAt) / 1000);
});

assessmentResponseSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt || this.status !== 'in-progress') return null;
  const remaining = Math.max(0, this.expiresAt - new Date());
  return Math.floor(remaining / 1000);
});

assessmentResponseSchema.virtual('completionPercentage').get(function() {
  if (!this.assessment) return 0;
  const totalQuestions = this.assessment.questions?.length || 0;
  if (totalQuestions === 0) return 0;
  
  const answeredQuestions = this.answers.filter(answer => 
    answer.answer !== null && answer.answer !== undefined && answer.answer !== ''
  ).length;
  
  return Math.round((answeredQuestions / totalQuestions) * 100);
});

assessmentResponseSchema.virtual('isTimedOut').get(function() {
  return this.expiresAt && new Date() > this.expiresAt && this.status === 'in-progress';
});

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

assessmentResponseSchema.methods.startAttempt = function() {
  this.status = 'in-progress';
  this.startedAt = new Date();
  this.lastActivityAt = new Date();
  
  if (this.assessment?.settings?.duration) {
    this.expiresAt = new Date(this.startedAt.getTime() + (this.assessment.settings.duration * 60 * 1000));
    this.timeLimit = this.assessment.settings.duration * 60; // Convert to seconds
  }
};

assessmentResponseSchema.methods.submitAnswer = function(questionId, answerData) {
  const existingAnswerIndex = this.answers.findIndex(a => a.questionId.equals(questionId));
  
  const answer = {
    questionId,
    questionIndex: answerData.questionIndex,
    questionType: answerData.questionType,
    answer: answerData.answer,
    selectedOptions: answerData.selectedOptions,
    files: answerData.files || [],
    timeSpent: answerData.timeSpent || 0,
    maxPoints: answerData.maxPoints,
    metadata: {
      ...answerData.metadata,
      answeredAt: new Date()
    }
  };

  if (existingAnswerIndex >= 0) {
    this.answers[existingAnswerIndex] = answer;
  } else {
    this.answers.push(answer);
  }
  
  this.lastActivityAt = new Date();
};

assessmentResponseSchema.methods.calculateScore = function() {
  const autoGradedAnswers = this.answers.filter(answer => 
    answer.autoGraded && answer.pointsAwarded !== undefined
  );
  
  const autoScore = autoGradedAnswers.reduce((sum, answer) => 
    sum + (answer.pointsAwarded || 0), 0
  );
  
  const manualGradedAnswers = this.answers.filter(answer => 
    answer.manualOverride && answer.manualOverride.points !== undefined
  );
  
  const manualScore = manualGradedAnswers.reduce((sum, answer) => 
    sum + (answer.manualOverride.points || 0), 0
  );
  
  this.score = autoScore + manualScore;
  this.totalPoints = this.answers.reduce((sum, answer) => sum + (answer.maxPoints || 0), 0);
  
  if (this.totalPoints > 0) {
    this.percentage = Math.round((this.score / this.totalPoints) * 100);
  }
  
  if (this.assessment?.passingScore !== undefined) {
    this.passed = this.percentage >= this.assessment.passingScore;
  }
};

assessmentResponseSchema.methods.addViolation = function(violationData) {
  this.metadata.violations.push({
    ...violationData,
    timestamp: new Date()
  });
  
  // Auto-flag response if critical violations
  const criticalViolations = this.metadata.violations.filter(v => 
    v.severity === 'critical'
  );
  
  if (criticalViolations.length >= 3) {
    this.status = 'flagged';
  }
  
  this.lastActivityAt = new Date();
};

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

assessmentResponseSchema.statics.findByOrganization = function(organizationId, query = {}) {
  return this.find({ organization: organizationId, ...query });
};

assessmentResponseSchema.statics.getCandidateResponses = function(organizationId, candidateId) {
  return this.find({
    organization: organizationId,
    candidate: candidateId
  }).populate('assessment', 'title category totalPoints passingScore');
};

assessmentResponseSchema.statics.getAssessmentStatistics = function(organizationId, assessmentId) {
  return this.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        assessment: new mongoose.Types.ObjectId(assessmentId),
        status: { $in: ['completed', 'manually-graded'] }
      }
    },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: 1 },
        averageScore: { $avg: '$percentage' },
        averageTime: { $avg: '$timeSpent' },
        passRate: {
          $avg: {
            $cond: [{ $eq: ['$passed', true] }, 1, 0]
          }
        },
        minScore: { $min: '$percentage' },
        maxScore: { $max: '$percentage' }
      }
    }
  ]);
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

assessmentResponseSchema.pre('save', function(next) {
  // Update total time spent
  if (this.answers.length > 0) {
    this.timeSpent = this.answers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0);
  }

  // Set submitted timestamp
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
    this.calculateScore();
  }

  // Set reviewed timestamp
  if (this.isModified('reviewedBy') && this.reviewedBy && !this.reviewedAt) {
    this.reviewedAt = new Date();
    this.reviewStatus = 'completed';
  }

  // Update last activity on any modification
  if (this.isModified()) {
    this.lastActivityAt = new Date();
  }

  next();
});

assessmentResponseSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('A response for this assessment attempt already exists.'));
  } else {
    next(error);
  }
});

// Auto-expire responses
assessmentResponseSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'in-progress' }
  }
);

export default mongoose.model('AssessmentResponse', assessmentResponseSchema);
