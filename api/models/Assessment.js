import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: {
      values: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
      message: 'Question type must be one of: multiple-choice, true-false, short-answer, essay, code, file-upload'
    },
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  points: {
    type: Number,
    min: [0, 'Points cannot be negative'],
    max: [1000, 'Points cannot exceed 1000'],
    default: 1
  },
  options: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Option text cannot exceed 500 characters']
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  explanation: {
    type: String,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
    default: ''
  },
  required: {
    type: Boolean,
    default: true
  },
  metadata: {
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    tags: [{
      type: String,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    timeLimit: {
      type: Number, // in seconds
      min: [0, 'Time limit cannot be negative'],
      default: 0
    }
  }
});

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  questions: [questionSchema],
  settings: {
    duration: {
      type: Number, // in minutes
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 480 minutes (8 hours)'],
      default: 60
    },
    attempts: {
      type: Number,
      min: [1, 'Attempts must be at least 1'],
      max: [10, 'Attempts cannot exceed 10'],
      default: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: Boolean,
      default: true
    },
    allowBacktracking: {
      type: Boolean,
      default: true
    },
    requireFullScreen: {
      type: Boolean,
      default: false
    },
    webcamMonitoring: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'paused', 'archived'],
      message: 'Status must be one of: draft, active, paused, archived'
    },
    default: 'draft'
  },
  category: {
    type: String,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    default: 'General'
  },
  tags: [{
    type: String,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  totalPoints: {
    type: Number,
    min: [0, 'Total points cannot be negative'],
    default: 0
  },
  passingScore: {
    type: Number,
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100%'],
    default: 70
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  access: {
    type: String,
    enum: ['public', 'private', 'organization'],
    default: 'private'
  },
  allowedCandidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    views: {
      type: Number,
      default: 0
    },
    completions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number, // in minutes
      default: 0
    }
  },
  schedule: {
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
assessmentSchema.index({ createdBy: 1 });
assessmentSchema.index({ organization: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ 'schedule.startDate': 1 });
assessmentSchema.index({ 'schedule.endDate': 1 });
assessmentSchema.index({ category: 1 });
assessmentSchema.index({ tags: 1 });
assessmentSchema.index({ slug: 1 }, { unique: true });

// Virtual for response count
assessmentSchema.virtual('responseCount', {
  ref: 'AssessmentResponse',
  localField: '_id',
  foreignField: 'assessment',
  count: true
});

// Virtual for active responses
assessmentSchema.virtual('activeResponses', {
  ref: 'AssessmentResponse',
  localField: '_id',
  foreignField: 'assessment',
  match: { status: { $in: ['submitted', 'in-progress'] } },
  count: true
});

// Pre-save middleware to generate slug and calculate total points
assessmentSchema.pre('save', async function(next) {
  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
  
  // Calculate total points
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, question) => {
      return total + (question.points || 0);
    }, 0);
  }
  
  next();
});

// Static method to find active assessments
assessmentSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { 'schedule.startDate': { $lte: new Date() } },
      { 'schedule.startDate': null }
    ],
    $or: [
      { 'schedule.endDate': { $gte: new Date() } },
      { 'schedule.endDate': null }
    ]
  });
};

// Static method to get assessment stats
assessmentSchema.statics.getAssessmentStats = async function(organizationId = null) {
  const matchStage = organizationId ? { organization: organizationId } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPoints: { $sum: '$totalPoints' },
        avgQuestions: { $avg: { $size: '$questions' } }
      }
    }
  ]);
  
  return stats;
};

// Instance method to check if assessment is available
assessmentSchema.methods.isAvailable = function() {
  const now = new Date();
  const isWithinSchedule = (!this.schedule.startDate || this.schedule.startDate <= now) &&
                          (!this.schedule.endDate || this.schedule.endDate >= now);
  
  return this.status === 'active' && isWithinSchedule;
};

// Instance method to add question
assessmentSchema.methods.addQuestion = function(questionData) {
  this.questions.push(questionData);
  return this.save();
};

// Instance method to remove question
assessmentSchema.methods.removeQuestion = function(questionId) {
  this.questions.id(questionId).remove();
  return this.save();
};

// Instance method to update question
assessmentSchema.methods.updateQuestion = function(questionId, updateData) {
  const question = this.questions.id(questionId);
  if (question) {
    Object.assign(question, updateData);
  }
  return this.save();
};

export default mongoose.model('Assessment', assessmentSchema);
