import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
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
    maxlength: [5000, 'Message cannot exceed 5000 characters']
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
  category: {
    type: String,
    enum: {
      values: ['general', 'support', 'sales', 'partnership', 'feedback', 'other'],
      message: 'Category must be one of: general, support, sales, partnership, feedback, other'
    },
    default: 'general'
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
      values: ['new', 'in-progress', 'responded', 'resolved', 'spam'],
      message: 'Status must be one of: new, in-progress, responded, resolved, spam'
    },
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  responseNote: {
    type: String,
    maxlength: [2000, 'Response note cannot exceed 2000 characters'],
    default: ''
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
    location: {
      country: String,
      region: String,
      city: String,
      timezone: String
    },
    referrer: {
      type: String,
      default: ''
    },
    pageUrl: {
      type: String,
      default: ''
    }
  },
  followUp: {
    scheduled: {
      type: Boolean,
      default: false
    },
    scheduledDate: {
      type: Date,
      default: null
    },
    reminderSent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ priority: 1 });
contactMessageSchema.index({ category: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ assignedTo: 1 });

// Virtual for age (time since creation)
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

// Virtual for isNew
contactMessageSchema.virtual('isNew').get(function() {
  return this.status === 'new';
});

// Virtual for requiresAction
contactMessageSchema.virtual('requiresAction').get(function() {
  return ['new', 'in-progress'].includes(this.status);
});

// Pre-save middleware to set priority based on category
contactMessageSchema.pre('save', function(next) {
  // Auto-set priority based on category
  if (this.isModified('category') && this.priority === 'normal') {
    const categoryPriority = {
      'support': 'high',
      'sales': 'normal',
      'partnership': 'high',
      'feedback': 'low',
      'general': 'normal',
      'other': 'normal'
    };
    
    this.priority = categoryPriority[this.category] || 'normal';
  }
  
  next();
});

// Static method to find by status
contactMessageSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'name email');
};

// Static method to get message statistics
contactMessageSchema.statics.getMessageStats = async function(days = 30) {
  const dateFilter = {
    createdAt: {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };
  
  const stats = await this.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { 
          $avg: {
            $cond: [
              { $ne: ['$responseNote', ''] },
              { $subtract: ['$updatedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      avgResponseTime: stat.avgResponseTime
    };
    return acc;
  }, {});
};

// Static method to get unresolved messages
contactMessageSchema.statics.getUnresolvedMessages = function() {
  return this.find({
    status: { $in: ['new', 'in-progress'] }
  })
  .sort({ priority: -1, createdAt: 1 })
  .populate('assignedTo', 'name email');
};

// Instance method to assign to user
contactMessageSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.status = 'in-progress';
  
  return this.save();
};

// Instance method to mark as responded
contactMessageSchema.methods.markAsResponded = function(responseNote, respondedBy) {
  this.responseNote = responseNote;
  this.status = 'responded';
  this.assignedTo = respondedBy;
  
  return this.save();
};

// Instance method to mark as resolved
contactMessageSchema.methods.markAsResolved = function(resolvedBy) {
  this.status = 'resolved';
  this.assignedTo = resolvedBy;
  
  return this.save();
};

// Instance method to mark as spam
contactMessageSchema.methods.markAsSpam = function() {
  this.status = 'spam';
  
  return this.save();
};

// Instance method to schedule follow-up
contactMessageSchema.methods.scheduleFollowUp = function(followUpDate) {
  this.followUp.scheduled = true;
  this.followUp.scheduledDate = followUpDate;
  this.followUp.reminderSent = false;
  
  return this.save();
};

export default mongoose.model('ContactMessage', contactMessageSchema);
