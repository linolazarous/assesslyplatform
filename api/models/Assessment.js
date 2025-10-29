// api/models/Assessment.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'code'],
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return ['multiple_choice', 'true_false'].includes(this.type);
    }
  },
  points: {
    type: Number,
    default: 1,
    min: [0, 'Points cannot be negative']
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [500, 'Explanation cannot exceed 500 characters']
  },
  timeLimit: {
    type: Number, // in seconds
    default: null
  }
}, { _id: true });

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  questions: [questionSchema],
  settings: {
    duration: {
      type: Number, // in minutes
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 8 hours']
    },
    passingScore: {
      type: Number,
      default: 70,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100']
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, 'Maximum attempts must be at least 1']
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: Boolean,
      default: true
    },
    allowBackNavigation: {
      type: Boolean,
      default: true
    },
    requireFullScreen: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  assignedTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function(date) {
          return date > new Date();
        },
        message: 'Due date must be in the future'
      }
    },
    maxAttempts: {
      type: Number,
      default: null
    }
  }],
  totalPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total points before saving
assessmentSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  next();
});

// Indexes for better query performance
assessmentSchema.index({ organization: 1, status: 1 });
assessmentSchema.index({ createdBy: 1, createdAt: -1 });
assessmentSchema.index({ tags: 1 });
assessmentSchema.index({ 'assignedTo.user': 1 });

// Virtual for question count
assessmentSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Method to check if assessment can be activated
assessmentSchema.methods.canActivate = function() {
  return this.questions.length > 0 && this.status === 'draft';
};

// Static method to find active assessments
assessmentSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

export default mongoose.model('Assessment', assessmentSchema);
