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
    required: true
  },
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
  points: {
    type: Number,
    default: 1
  },
  explanation: String
});

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true
  },
  description: String,
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  settings: {
    duration: Number, // in minutes
    passingScore: {
      type: Number,
      default: 70
    },
    maxAttempts: {
      type: Number,
      default: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    showResults: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  assignedTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: Date
  }]
}, {
  timestamps: true
});

export default mongoose.model('Assessment', assessmentSchema);
