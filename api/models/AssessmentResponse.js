// api/models/AssessmentResponse.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  score: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [500, 'Feedback cannot exceed 500 characters']
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const responseSchema = new mongoose.Schema({
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
  attemptNumber: {
    type: Number,
    required: true,
    min: [1, 'Attempt number must be at least 1'],
    default: 1
  },
  answers: [answerSchema],
  overallScore: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'graded', 'expired'],
    default: 'in_progress',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date >= this.startedAt;
      },
      message: 'Completion date cannot be before start date'
    }
  },
  timeSpent: {
    type: Number, // total time in seconds
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  metadata: {
    browser: String,
    platform: String,
    device: String
  }
}, {
  timestamps: true
});

// Indexes for optimal query performance
responseSchema.index({ assessment: 1, candidate: 1, attemptNumber: 1 }, { unique: true });
responseSchema.index({ candidate: 1, createdAt: -1 });
responseSchema.index({ status: 1, completedAt: -1 });
responseSchema.index({ assessment: 1, overallScore: -1 });

// Calculate overall score before saving
responseSchema.pre('save', function(next) {
  if (this.answers.length > 0) {
    const totalPoints = this.answers.reduce((sum, answer) => sum + answer.score, 0);
    const maxPossiblePoints = this.answers.reduce((sum, answer) => {
      // This would need to reference the actual question points
      return sum + 1; // Default to 1 point per question
    }, 0);
    
    this.overallScore = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;
  }
  
  // Calculate time spent if completed
  if (this.status === 'completed' && this.completedAt && this.startedAt) {
    this.timeSpent = Math.round((this.completedAt - this.startedAt) / 1000);
  }
  
  next();
});

// Virtual for percentage score
responseSchema.virtual('percentageScore').get(function() {
  return this.overallScore;
});

// Virtual for pass/fail status
responseSchema.virtual('isPassing').get(function() {
  // This would need to reference the assessment's passing score
  return this.overallScore >= 70; // Default passing score
});

// Method to check if response can be submitted
responseSchema.methods.canSubmit = function() {
  return this.status === 'in_progress';
};

// Static method to find completed responses
responseSchema.statics.findCompleted = function() {
  return this.find({ status: { $in: ['completed', 'graded'] } });
};

export default mongoose.model('AssessmentResponse', responseSchema);
