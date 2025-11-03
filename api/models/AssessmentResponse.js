import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  files: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isCorrect: {
    type: Boolean,
    default: null
  },
  pointsAwarded: {
    type: Number,
    min: [0, 'Points cannot be negative'],
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    min: [0, 'Time spent cannot be negative'],
    default: 0
  },
  metadata: {
    startedAt: {
      type: Date,
      default: null
    },
    answeredAt: {
      type: Date,
      default: null
    },
    flagged: {
      type: Boolean,
      default: false
    },
    reviewNote: {
      type: String,
      maxlength: [500, 'Review note cannot exceed 500 characters'],
      default: ''
    }
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
  answers: [answerSchema],
  status: {
    type: String,
    enum: {
      values: ['in-progress', 'submitted', 'under-review', 'completed', 'expired', 'abandoned'],
      message: 'Status must be one of: in-progress, submitted, under-review, completed, expired, abandoned'
    },
    default: 'in-progress'
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative'],
    default: 0
  },
  totalPoints: {
    type: Number,
    min: [0, 'Total points cannot be negative'],
    default: 0
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    default: 0
  },
  passed: {
    type: Boolean,
    default: null
  },
  timeSpent: {
    type: Number, // in seconds
    min: [0, 'Time spent cannot be negative'],
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  feedback: {
    general: {
      type: String,
      maxlength: [2000, 'General feedback cannot exceed 2000 characters'],
      default: ''
    },
    strengths: [{
      type: String,
      maxlength: [200, 'Strength cannot exceed 200 characters']
    }],
    improvements: [{
      type: String,
      maxlength: [200, 'Improvement cannot exceed 200 characters']
    }]
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  metadata: {
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    browser: {
      name: String,
      version: String
    },
    os: {
      name: String,
      version: String
    },
    device: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile'],
      default: 'desktop'
    },
    warnings: [{
      type: String,
      maxlength: [200, 'Warning cannot exceed 200 characters']
    }],
    violations: [{
      type: String,
      enum: ['tab-switch', 'fullscreen-exit', 'multiple-tabs', 'copy-paste', 'right-click'],
      timestamp: Date
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
assessmentResponseSchema.index({ assessment: 1, candidate: 1 });
assessmentResponseSchema.index({ candidate: 1, status: 1 });
assessmentResponseSchema.index({ assessment: 1, status: 1 });
assessmentResponseSchema.index({ submittedAt: -1 });
assessmentResponseSchema.index({ expiresAt: 1 });
assessmentResponseSchema.index({ 'metadata.ipAddress': 1 });

// Virtual for duration (time from start to submit)
assessmentResponseSchema.virtual('duration').get(function() {
  if (this.submittedAt && this.startedAt) {
    return Math.floor((this.submittedAt - this.startedAt) / 1000); // in seconds
  }
  return null;
});

// Virtual for time remaining
assessmentResponseSchema.virtual('timeRemaining').get(function() {
  if (this.expiresAt && this.status === 'in-progress') {
    const now = new Date();
    return Math.max(0, Math.floor((this.expiresAt - now) / 1000)); // in seconds
  }
  return null;
});

// Pre-save middleware to calculate scores and status
assessmentResponseSchema.pre('save', function(next) {
  // Calculate total points and score if answers exist
  if (this.answers && this.answers.length > 0) {
    this.totalPoints = this.answers.reduce((total, answer) => {
      return total + (answer.pointsAwarded || 0);
    }, 0);
    
    if (this.totalPoints > 0) {
      this.percentage = Math.round((this.totalPoints / this.assessment?.totalPoints || 1) * 100);
    }
    
    // Calculate total time spent
    this.timeSpent = this.answers.reduce((total, answer) => {
      return total + (answer.timeSpent || 0);
    }, 0);
  }
  
  // Set submitted timestamp when status changes to submitted
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  // Set reviewed timestamp when reviewed
  if (this.isModified('reviewedBy') && this.reviewedBy && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  
  next();
});

// Static method to find responses by candidate
assessmentResponseSchema.statics.findByCandidate = function(candidateId, options = {}) {
  const query = this.find({ candidate: candidateId })
    .populate('assessment', 'title description category totalPoints passingScore')
    .sort({ submittedAt: -1 });
  
  if (options.status) {
    query.where('status').equals(options.status);
  }
  
  return query;
};

// Static method to get response statistics
assessmentResponseSchema.statics.getResponseStats = async function(assessmentId = null) {
  const matchStage = assessmentId ? { assessment: assessmentId } : {};
  
  const stats = await this.aggregate([
    { $match: { ...matchStage, status: 'completed' } },
    {
      $group: {
        _id: '$assessment',
        totalResponses: { $sum: 1 },
        averageScore: { $avg: '$percentage' },
        averageTime: { $avg: '$timeSpent' },
        passRate: {
          $avg: {
            $cond: ['$passed', 1, 0]
          }
        },
        minScore: { $min: '$percentage' },
        maxScore: { $max: '$percentage' }
      }
    }
  ]);
  
  return stats;
};

// Instance method to submit response
assessmentResponseSchema.methods.submit = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  return this.save();
};

// Instance method to calculate score automatically
assessmentResponseSchema.methods.calculateAutoScore = function() {
  let totalScore = 0;
  let totalPossible = 0;
  
  this.answers.forEach(answer => {
    if (answer.questionType === 'multiple-choice' || answer.questionType === 'true-false') {
      totalPossible += (answer.points || 1);
      if (answer.isCorrect) {
        totalScore += (answer.points || 1);
      }
    }
  });
  
  this.score = totalScore;
  this.totalPoints = totalPossible;
  this.percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  
  return this;
};

// Instance method to check if expired
assessmentResponseSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Instance method to add violation
assessmentResponseSchema.methods.addViolation = function(violationType) {
  if (!this.metadata.violations) {
    this.metadata.violations = [];
  }
  
  this.metadata.violations.push({
    type: violationType,
    timestamp: new Date()
  });
  
  return this.save();
};

export default mongoose.model('AssessmentResponse', assessmentResponseSchema);
