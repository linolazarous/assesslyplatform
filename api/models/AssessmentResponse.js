// api/models/AssessmentResponse.js
import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
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
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    answer: mongoose.Schema.Types.Mixed,
    score: Number,
    feedback: String,
    timeSpent: Number // in seconds
  }],
  overallScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'graded'],
    default: 'in_progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  timeSpent: Number // total time in seconds
}, {
  timestamps: true
});

// Index for faster queries
responseSchema.index({ assessment: 1, candidate: 1 });
responseSchema.index({ candidate: 1, createdAt: -1 });

export default mongoose.model('AssessmentResponse', responseSchema);
