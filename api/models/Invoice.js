import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'paid', 'void', 'uncollectible'],
    default: 'draft'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'usd',
    uppercase: true,
    trim: true
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  billingPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  items: [invoiceItemSchema],
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'paypal', 'manual'],
    default: 'card'
  },
  paymentIntentId: {
    type: String,
    sparse: true
  },
  receiptNumber: {
    type: String,
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isOverdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'void') return false;
  return this.dueDate && new Date() > this.dueDate;
});

// Virtual for daysOverdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = Math.abs(today - dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate invoice number and calculate totals
invoiceSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments({
      createdAt: { $gte: new Date(year, 0, 1) }
    });
    this.invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }

  // Calculate total amount
  const itemsTotal = this.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  this.totalAmount = itemsTotal + this.taxAmount;
  
  // Ensure amount matches items total
  if (this.amount !== itemsTotal) {
    this.amount = itemsTotal;
  }

  next();
});

// Index for efficient queries
invoiceSchema.index({ organization: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: 1 });
invoiceSchema.index({ subscription: 1, createdAt: -1 });

// Static method to get organization's invoice statistics
invoiceSchema.statics.getOrganizationStats = async function(organizationId) {
  const stats = await this.aggregate([
    { $match: { organization: organizationId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        averageAmount: { $avg: '$totalAmount' }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount,
      averageAmount: stat.averageAmount
    };
    return acc;
  }, {});
};

// Instance method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentData = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paymentMethod = paymentData.paymentMethod || this.paymentMethod;
  this.paymentIntentId = paymentData.paymentIntentId || this.paymentIntentId;
  this.receiptNumber = paymentData.receiptNumber || this.receiptNumber;
  
  if (paymentData.metadata) {
    this.metadata = { ...this.metadata, ...paymentData.metadata };
  }
};

// Instance method to void invoice
invoiceSchema.methods.void = function(reason = '') {
  this.status = 'void';
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nVoided: ${reason}` : `Voided: ${reason}`;
  }
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
