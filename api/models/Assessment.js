// api/models/Assessment.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'single-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload'],
    required: true
  },
  question: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 2000 
  },
  description: { 
    type: String, 
    maxlength: 5000, 
    default: '' 
  },
  points: { 
    type: Number, 
    min: 0, 
    max: 1000, 
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
      maxlength: 1000 
    },
    isCorrect: { 
      type: Boolean, 
      default: false 
    },
    explanation: {
      type: String,
      maxlength: 1000,
      default: ''
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return ['short-answer', 'essay', 'code'].includes(this.type);
    }
  },
  explanation: { 
    type: String, 
    maxlength: 2000, 
    default: '' 
  },
  required: { 
    type: Boolean, 
    default: true 
  },
  metadata: {
    difficulty: { 
      type: String, 
      enum: ['easy', 'medium', 'hard', 'expert'], 
      default: 'medium' 
    },
    tags: [{ 
      type: String, 
      maxlength: 50 
    }],
    timeLimit: { 
      type: Number, 
      min: 0, 
      max: 3600, 
      default: 0 
    },
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced', 'expert']
      }
    }],
    hints: [{
      text: String,
      penalty: { type: Number, default: 0 }
    }]
  }
}, {
  _id: true,
  timestamps: false
});

const assessmentSettingsSchema = new mongoose.Schema({
  // Timing & Attempts
  duration: { 
    type: Number, 
    min: 1, 
    max: 1440,  // 24 hours max
    default: 60 
  },
  attempts: { 
    type: Number, 
    min: 1, 
    max: 100, 
    default: 1 
  },
  allowPause: { 
    type: Boolean, 
    default: false 
  },
  
  // Display & Navigation
  shuffleQuestions: { 
    type: Boolean, 
    default: false 
  },
  shuffleOptions: { 
    type: Boolean, 
    default: false 
  },
  allowBacktracking: { 
    type: Boolean, 
    default: true 
  },
  showProgress: { 
    type: Boolean, 
    default: true 
  },
  showQuestionNumbers: { 
    type: Boolean, 
    default: true 
  },
  
  // Security & Proctoring
  requireFullScreen: { 
    type: Boolean, 
    default: false 
  },
  webcamMonitoring: { 
    type: Boolean, 
    default: false 
  },
  disableCopyPaste: { 
    type: Boolean, 
    default: false 
  },
  disableRightClick: { 
    type: Boolean, 
    default: false 
  },
  tabSwitchingDetection: { 
    type: Boolean, 
    default: false 
  },
  
  // Results & Feedback
  showResults: { 
    type: Boolean, 
    default: true 
  },
  showCorrectAnswers: { 
    type: Boolean, 
    default: false 
  },
  showExplanations: { 
    type: Boolean, 
    default: false 
  },
  instantFeedback: { 
    type: Boolean, 
    default: false 
  },
  
  // Accessibility
  allowExtraTime: { 
    type: Boolean, 
    default: false 
  },
  highContrastMode: { 
    type: Boolean, 
    default: false 
  }
}, {
  _id: false
});

const assessmentSchema = new mongoose.Schema({
  // Basic Information
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    minlength: 3, 
    maxlength: 500 
  },
  description: { 
    type: String, 
    maxlength: 10000, 
    default: '' 
  },
  instructions: {
    type: String,
    maxlength: 5000,
    default: ''
  },
  slug: { 
    type: String, 
    lowercase: true, 
    trim: true 
  },

  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Content
  questions: [questionSchema],
  sections: [{
    title: String,
    description: String,
    questions: [questionSchema],
    timeLimit: Number,
    required: { type: Boolean, default: true }
  }],

  // Configuration
  settings: assessmentSettingsSchema,

  // Status & Lifecycle
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'paused', 'archived'],
    default: 'draft'
  },
  version: {
    number: { type: Number, default: 1 },
    notes: String,
    publishedAt: Date
  },

  // Categorization
  category: { 
    type: String, 
    maxlength: 200, 
    default: 'General' 
  },
  subcategory: {
    type: String,
    maxlength: 200
  },
  tags: [{ 
    type: String, 
    maxlength: 100 
  }],

  // Scoring
  totalPoints: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  passingScore: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 70 
  },
  gradingScheme: {
    type: String,
    enum: ['standard', 'weighted', 'rubric'],
    default: 'standard'
  },
  rubrics: [{
    criteria: String,
    description: String,
    points: Number,
    levels: [{
      level: String,
      description: String,
      score: Number
    }]
  }],

  // Ownership & Access Control
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['reviewer', 'approver'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'] }
  }],

  // Access Control
  access: {
    type: String,
    enum: ['private', 'organization', 'public', 'invite-only'],
    default: 'private'
  },
  allowedCandidates: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  allowedEmails: [{
    email: String,
    invitedAt: Date,
    status: { type: String, enum: ['pending', 'accepted', 'declined'] }
  }],
  inviteCodes: [{
    code: String,
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  }],

  // Scheduling
  schedule: {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    timezone: { type: String, default: 'UTC' },
    availability: {
      type: String,
      enum: ['always', 'scheduled', 'rolling'],
      default: 'always'
    }
  },

  // Analytics & Metadata
  metadata: {
    views: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    difficultyRating: { type: Number, min: 1, max: 5 },
    ratings: {
      count: { type: Number, default: 0 },
      average: { type: Number, default: 0 }
    },
    isTemplate: { type: Boolean, default: false },
    templateCategory: String,
    language: { type: String, default: 'en' },
    estimatedTime: Number // in minutes
  },

  // Advanced Features
  prerequisites: [{
    type: { type: String, enum: ['assessment', 'score', 'completion'] },
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
    minScore: Number,
    required: { type: Boolean, default: false }
  }],
  certifications: [{
    name: String,
    issuer: String,
    validFor: Number, // months
    autoIssue: { type: Boolean, default: false }
  }],

  // Security & Compliance
  security: {
    watermark: { type: Boolean, default: false },
    ipRestrictions: [String],
    allowedDomains: [String],
    requireAuthentication: { type: Boolean, default: true }
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
   🔥 MULTI-TENANT INDEXES - Production Optimized (FIXED - No Duplicates)
   All indexes consolidated here using schema.index() method
-------------------------------------------------------------------- */

// 🔹 PRIMARY ORGANIZATION COMPOUND INDEXES (Multi-Tenant)
assessmentSchema.index({ organization: 1, status: 1 }, { name: 'org_status_index' });
assessmentSchema.index({ organization: 1, createdBy: 1 }, { name: 'org_created_by_index' });
assessmentSchema.index({ organization: 1, category: 1 }, { name: 'org_category_index' });
assessmentSchema.index({ organization: 1, access: 1 }, { name: 'org_access_index' });

// 🔹 UNIQUE SLUG PER ORGANIZATION (Tenant Isolation)
assessmentSchema.index(
  { organization: 1, slug: 1 },
  { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { slug: { $exists: true } },
    name: 'org_slug_unique_index'
  }
);

// 🔹 PERFORMANCE AND ANALYTICS INDEXES
assessmentSchema.index({ organization: 1, createdAt: -1 }, { name: 'org_created_at_desc_index' });
assessmentSchema.index({ organization: 1, updatedAt: -1 }, { name: 'org_updated_at_desc_index' });
assessmentSchema.index({ organization: 1, 'metadata.views': -1 }, { name: 'org_views_desc_index' });
assessmentSchema.index({ organization: 1, 'metadata.completions': -1 }, { name: 'org_completions_desc_index' });

// 🔹 TAGS AND CATEGORIES INDEXES
assessmentSchema.index({ organization: 1, tags: 1 }, { name: 'org_tags_index' });

// 🔹 SCHEDULING AND TIMING INDEXES
assessmentSchema.index({ 'schedule.startDate': 1 }, { name: 'schedule_start_date_index' });
assessmentSchema.index({ 'schedule.endDate': 1 }, { name: 'schedule_end_date_index' });
assessmentSchema.index({ 
  organization: 1, 
  'schedule.startDate': 1, 
  'schedule.endDate': 1 
}, { name: 'org_schedule_composite_index' });

// 🔹 SEARCH AND DISCOVERY INDEXES
assessmentSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 3
  },
  name: 'assessment_search_index'
});

// 🔹 TEMPLATE DISCOVERY INDEXES
assessmentSchema.index({ 
  organization: 1, 
  'metadata.isTemplate': 1 
}, { name: 'org_template_index' });

// 🔹 ACCESS CONTROL INDEXES
assessmentSchema.index({ allowedCandidates: 1 }, { name: 'allowed_candidates_index' });
assessmentSchema.index({ 'allowedEmails.email': 1 }, { name: 'allowed_emails_index' });
assessmentSchema.index({ 'inviteCodes.code': 1 }, { name: 'invite_codes_index' });

// 🔹 ADDITIONAL COMPOUND INDEXES FOR COMMON QUERIES
assessmentSchema.index({ 
  organization: 1,
  status: 1,
  createdAt: -1 
}, { name: 'org_status_created_composite_index' });

assessmentSchema.index({ 
  organization: 1,
  'metadata.isTemplate': 1,
  status: 1 
}, { name: 'org_template_status_index' });

/* --------------------------------------------------------------------
   VIRTUAL FIELDS & METHODS
-------------------------------------------------------------------- */

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
  match: { status: { $in: ['in-progress', 'submitted'] } },
  count: true
});

assessmentSchema.virtual('isActive').get(function() {
  const now = new Date();
  if (this.schedule.startDate && this.schedule.startDate > now) return false;
  if (this.schedule.endDate && this.schedule.endDate < now) return false;
  return this.status === 'active' || this.status === 'published';
});

assessmentSchema.virtual('timeRemaining').get(function() {
  if (!this.schedule.endDate) return null;
  const now = new Date();
  return Math.max(0, this.schedule.endDate - now);
});

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

assessmentSchema.methods.canBeAccessedBy = function(user) {
  // Organization members can access organization-level assessments
  if (this.access === 'organization' && user.organization.equals(this.organization)) {
    return true;
  }
  
  // Private assessments only for allowed candidates
  if (this.access === 'private') {
    return this.allowedCandidates.some(candidateId => 
      candidateId.equals(user._id)
    );
  }
  
  // Public assessments
  if (this.access === 'public') {
    return true;
  }
  
  return false;
};

assessmentSchema.methods.incrementViews = async function() {
  this.metadata.views += 1;
  await this.save();
};

assessmentSchema.methods.updateStatistics = async function() {
  const Response = mongoose.model('AssessmentResponse');
  const stats = await Response.aggregate([
    { $match: { assessment: this._id, status: 'submitted' } },
    {
      $group: {
        _id: null,
        completions: { $sum: 1 },
        averageScore: { $avg: '$score' },
        averageTime: { $avg: '$timeSpent' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.metadata.completions = stats[0].completions;
    this.metadata.averageScore = Math.round(stats[0].averageScore || 0);
    this.metadata.averageTime = Math.round(stats[0].averageTime || 0);
    await this.save();
  }
};

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

assessmentSchema.statics.findByOrganization = function(organizationId, query = {}) {
  return this.find({ organization: organizationId, ...query });
};

assessmentSchema.statics.getTemplates = function(organizationId) {
  return this.find({
    organization: organizationId,
    'metadata.isTemplate': true,
    status: { $in: ['active', 'published'] }
  });
};

assessmentSchema.statics.getActiveAssessments = function(organizationId) {
  const now = new Date();
  return this.find({
    organization: organizationId,
    status: { $in: ['active', 'published'] },
    $or: [
      { 'schedule.startDate': { $exists: false } },
      { 'schedule.startDate': { $lte: now } }
    ],
    $or: [
      { 'schedule.endDate': { $exists: false } },
      { 'schedule.endDate': { $gte: now } }
    ]
  });
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

assessmentSchema.pre('save', async function(next) {
  // Generate slug if not present
  if (!this.slug && this.title) {
    const baseSlug = slugify(this.title, { 
      lower: true, 
      strict: true,
      trim: true 
    });
    
    // Ensure unique slug within organization
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Assessment').findOne({
      organization: this.organization,
      slug,
      _id: { $ne: this._id }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }

  // Calculate total points
  if (this.isModified('questions') || this.isNew) {
    const questionsPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const sectionsPoints = this.sections?.reduce((sum, section) => 
      sum + section.questions.reduce((sectionSum, q) => sectionSum + (q.points || 0), 0), 0) || 0;
    
    this.totalPoints = questionsPoints + sectionsPoints;
  }

  // Set updatedBy if not set
  if (this.isModified() && !this.isNew && !this.updatedBy) {
    this.updatedBy = this.createdBy;
  }

  next();
});

assessmentSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('An assessment with this title already exists in your organization.'));
  } else {
    next(error);
  }
});

export default mongoose.model('Assessment', assessmentSchema);
