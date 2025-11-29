// api/models/ContactMessage.js
import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  country: { type: String, maxlength: 100 },
  region: { type: String, maxlength: 100 },
  city: { type: String, maxlength: 100 },
  timezone: { type: String, maxlength: 50 },
  coordinates: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 }
  }
}, { _id: false });

const followUpSchema = new mongoose.Schema({
  scheduled: { type: Boolean, default: false },
  scheduledDate: { type: Date, default: null },
  reminderSent: { type: Boolean, default: false },
  reminderCount: { type: Number, default: 0 },
  notes: { type: String, maxlength: 1000 }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, min: 0, required: true },
  url: { type: String, required: true },
  storage: {
    provider: { type: String, enum: ['s3', 'gcs', 'local'], default: 'local' },
    bucket: String,
    key: String
  },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const interactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'note', 'call', 'meeting', 'internal'],
    required: true
  },
  content: { type: String, required: true, maxlength: 5000 },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  metadata: {
    email: {
      subject: String,
      to: [String],
      cc: [String],
      bcc: [String],
      messageId: String,
      inReplyTo: String
    },
    call: {
      duration: Number,
      participants: [String],
      recordingUrl: String
    },
    meeting: {
      scheduledFor: Date,
      duration: Number,
      participants: [String],
      meetingUrl: String
    }
  },
  attachments: [attachmentSchema]
}, {
  timestamps: true
});

const contactMessageSchema = new mongoose.Schema({
  // 🔥 MULTI-TENANT ARCHITECTURE
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Contact Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
    default: ''
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters'],
    default: ''
  },

  // Message Content
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [5, 'Subject must be at least 5 characters'],
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [10000, 'Message cannot exceed 10000 characters']
  },
  attachments: [attachmentSchema],

  // Categorization & Workflow
  category: {
    type: String,
    enum: {
      values: [
        'general-inquiry', 
        'technical-support', 
        'sales', 
        'billing', 
        'partnership', 
        'enterprise', 
        'feedback', 
        'bug-report',
        'feature-request',
        'press',
        'careers',
        'other'
      ],
      message: 'Invalid category selected'
    },
    default: 'general-inquiry'
  },
  subcategory: {
    type: String,
    maxlength: [100, 'Subcategory cannot exceed 100 characters'],
    default: ''
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Priority must be one of: low, normal, high, urgent'
    },
    default: 'normal'
  },
  status: {
    type: String,
    enum: {
      values: ['new', 'acknowledged', 'in-progress', 'awaiting-response', 'responded', 'resolved', 'escalated', 'spam'],
      message: 'Invalid status'
    },
    default: 'new'
  },
  source: {
    type: String,
    enum: ['contact-form', 'email', 'api', 'import', 'chat', 'phone'],
    default: 'contact-form'
  },

  // Assignment & Ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null for external submissions
  },

  // Response Tracking
  responseNote: {
    type: String,
    maxlength: [5000, 'Response note cannot exceed 5000 characters'],
    default: ''
  },
  respondedAt: {
    type: Date,
    default: null
  },
  firstResponseTime: {
    type: Number, // in minutes
    default: null
  },
  satisfactionScore: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  satisfactionFeedback: {
    type: String,
    maxlength: [1000, 'Satisfaction feedback cannot exceed 1000 characters'],
    default: ''
  },

  // Interaction History
  interactions: [interactionSchema],
  interactionCount: {
    type: Number,
    default: 0
  },

  // Follow-up Management
  followUp: followUpSchema,

  // Technical Metadata
  metadata: {
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    location: locationSchema,
    referrer: {
      type: String,
      default: ''
    },
    pageUrl: {
      type: String,
      default: ''
    },
    campaign: {
      source: String,
      medium: String,
      name: String,
      term: String,
      content: String
    },
    formData: mongoose.Schema.Types.Mixed, // Store additional form fields
    spamScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // SLA & Compliance
  sla: {
    targetResponseTime: { type: Number, default: 1440 }, // minutes (24 hours)
    targetResolutionTime: { type: Number, default: 10080 }, // minutes (7 days)
    breached: { type: Boolean, default: false },
    breachReason: String
  },

  // Internal Tags & Classification
  tags: [{
    type: String,
    maxlength: 50
  }],
  internalNotes: [{
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false }
  }],

  // Analytics
  analytics: {
    openCount: { type: Number, default: 0 },
    lastOpenedAt: Date,
    clickCount: { type: Number, default: 0 },
    lastClickedAt: Date,
    engagementScore: { type: Number, default: 0 }
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
contactMessageSchema.index({ organization: 1, status: 1 });
contactMessageSchema.index({ organization: 1, priority: 1 });
contactMessageSchema.index({ organization: 1, category: 1 });
contactMessageSchema.index({ organization: 1, assignedTo: 1 });
contactMessageSchema.index({ organization: 1, createdAt: -1 });

// Performance indexes
contactMessageSchema.index({ organization: 1, email: 1 });
contactMessageSchema.index({ organization: 1, 'metadata.spamScore': 1 });
contactMessageSchema.index({ organization: 1, respondedAt: -1 });

// SLA and workflow indexes
contactMessageSchema.index({ organization: 1, 'sla.breached': 1 });
contactMessageSchema.index({ organization: 1, 'followUp.scheduledDate': 1 });

// Search and discovery
contactMessageSchema.index({ 
  subject: 'text', 
  message: 'text',
  name: 'text',
  company: 'text'
});

// Analytics indexes
contactMessageSchema.index({ organization: 1, source: 1 });
contactMessageSchema.index({ organization: 1, satisfactionScore: 1 });

/* --------------------------------------------------------------------
   VIRTUAL FIELDS
-------------------------------------------------------------------- */

contactMessageSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
});

contactMessageSchema.virtual('isNew').get(function() {
  return this.status === 'new';
});

contactMessageSchema.virtual('requiresAction').get(function() {
  return ['new', 'in-progress', 'awaiting-response', 'escalated'].includes(this.status);
});

contactMessageSchema.virtual('responseTime').get(function() {
  if (!this.respondedAt) return null;
  return Math.floor((this.respondedAt - this.createdAt) / (1000 * 60)); // minutes
});

contactMessageSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || this.status === 'spam') return false;
  
  const now = new Date();
  const targetTime = new Date(this.createdAt.getTime() + (this.sla.targetResponseTime * 60 * 1000));
  return now > targetTime;
});

contactMessageSchema.virtual('slaProgress').get(function() {
  const now = new Date();
  const elapsed = now - this.createdAt;
  const target = this.sla.targetResponseTime * 60 * 1000;
  
  return Math.min(100, Math.round((elapsed / target) * 100));
});

/* --------------------------------------------------------------------
   INSTANCE METHODS
-------------------------------------------------------------------- */

contactMessageSchema.methods.assignToUser = function(userId) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  this.status = this.status === 'new' ? 'in-progress' : this.status;
  
  return this.save();
};

contactMessageSchema.methods.addInteraction = function(interactionData) {
  this.interactions.push(interactionData);
  this.interactionCount += 1;
  this.lastActivityAt = new Date();
  
  return this.save();
};

contactMessageSchema.methods.markAsResponded = function(responseData) {
  this.responseNote = responseData.note || '';
  this.status = 'responded';
  this.respondedAt = new Date();
  
  // Calculate first response time
  if (!this.firstResponseTime) {
    this.firstResponseTime = Math.floor((this.respondedAt - this.createdAt) / (1000 * 60));
  }
  
  // Check SLA breach
  if (this.firstResponseTime > this.sla.targetResponseTime) {
    this.sla.breached = true;
    this.sla.breachReason = 'Response time exceeded target';
  }
  
  return this.save();
};

contactMessageSchema.methods.markAsResolved = function() {
  this.status = 'resolved';
  return this.save();
};

contactMessageSchema.methods.escalate = function(reason, escalatedBy) {
  this.status = 'escalated';
  this.addInteraction({
    type: 'internal',
    content: `Escalated: ${reason}`,
    createdBy: escalatedBy
  });
  
  return this.save();
};

contactMessageSchema.methods.calculateSpamScore = function() {
  // Simple spam detection logic (can be enhanced with AI)
  let score = 0;
  
  // Check for common spam patterns
  const spamPatterns = [
    { pattern: /http(s)?:\/\//gi, score: 10 },
    { pattern: /[A-Z]{5,}/g, score: 5 },
    { pattern: /[!@#$%^&*()]{3,}/g, score: 8 },
    { pattern: /free|money|profit|earn/gi, score: 15 }
  ];
  
  spamPatterns.forEach(({ pattern, score: patternScore }) => {
    const matches = (this.subject + this.message).match(pattern);
    if (matches) {
      score += matches.length * patternScore;
    }
  });
  
  this.metadata.spamScore = Math.min(100, score);
  return this.metadata.spamScore;
};

/* --------------------------------------------------------------------
   STATIC METHODS
-------------------------------------------------------------------- */

contactMessageSchema.statics.findByOrganization = function(organizationId, query = {}) {
  return this.find({ organization: organizationId, ...query });
};

contactMessageSchema.statics.getDashboardStats = async function(organizationId, days = 30) {
  const dateFilter = {
    createdAt: {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };
  
  const stats = await this.aggregate([
    { 
      $match: { 
        organization: new mongoose.Types.ObjectId(organizationId),
        ...dateFilter
      } 
    },
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        categoryCounts: [
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          }
        ],
        priorityCounts: [
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 }
            }
          }
        ],
        responseTimeStats: [
          {
            $match: {
              firstResponseTime: { $ne: null }
            }
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: '$firstResponseTime' },
              minResponseTime: { $min: '$firstResponseTime' },
              maxResponseTime: { $max: '$firstResponseTime' }
            }
          }
        ],
        slaBreaches: [
          {
            $match: {
              'sla.breached': true
            }
          },
          {
            $count: 'count'
          }
        ]
      }
    }
  ]);
  
  return stats[0];
};

contactMessageSchema.statics.getUnassignedMessages = function(organizationId) {
  return this.find({
    organization: organizationId,
    assignedTo: null,
    status: { $in: ['new', 'acknowledged'] }
  }).sort({ priority: -1, createdAt: 1 });
};

contactMessageSchema.statics.getOverdueMessages = function(organizationId) {
  const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
  
  return this.find({
    organization: organizationId,
    status: { $in: ['new', 'in-progress', 'awaiting-response'] },
    createdAt: { $lte: cutoffTime }
  }).sort({ createdAt: 1 });
};

/* --------------------------------------------------------------------
   MIDDLEWARE
-------------------------------------------------------------------- */

contactMessageSchema.pre('save', function(next) {
  // Auto-calculate spam score for new messages
  if (this.isNew) {
    this.calculateSpamScore();
    
    // Auto-mark as spam if score is too high
    if (this.metadata.spamScore > 80) {
      this.status = 'spam';
      this.priority = 'low';
    }
  }
  
  // Update interaction count
  if (this.isModified('interactions')) {
    this.interactionCount = this.interactions.length;
  }
  
  // Update last activity timestamp
  if (this.isModified() && !this.isModified('lastActivityAt')) {
    this.lastActivityAt = new Date();
  }
  
  next();
});

// Auto-assign priority based on category and content
contactMessageSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('category')) {
    const priorityMap = {
      'technical-support': 'high',
      'billing': 'high',
      'enterprise': 'high',
      'bug-report': 'high',
      'sales': 'normal',
      'partnership': 'normal',
      'feature-request': 'normal',
      'general-inquiry': 'normal',
      'feedback': 'low',
      'careers': 'low',
      'press': 'low',
      'other': 'normal'
    };
    
    this.priority = priorityMap[this.category] || 'normal';
  }
  
  // Urgent priority for specific keywords
  if (this.isNew && (this.priority === 'normal' || this.priority === 'high')) {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'broken', 'not working', 'down'];
    const hasUrgentKeyword = urgentKeywords.some(keyword => 
      (this.subject + ' ' + this.message).toLowerCase().includes(keyword)
    );
    
    if (hasUrgentKeyword) {
      this.priority = 'urgent';
    }
  }
  
  next();
});

export default mongoose.model('ContactMessage', contactMessageSchema);
