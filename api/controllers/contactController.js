// api/controllers/contactController.js
import chalk from 'chalk';
import geoip from 'geoip-lite';
import uaParser from 'ua-parser-js';

import ContactMessage from '../models/ContactMessage.js';
import Organization from '../models/Organization.js';
import mailer, { EmailTemplates } from '../utils/mailer.js';

/**
 * Contact Controller - Production-ready contact form handling
 * Supports multi-tenant architecture with organization context
 */

/**
 * Get client information from request
 */
function getClientInfo(req) {
  const ip = req.ip || 
             req.headers['x-forwarded-for']?.split(',')[0] || 
             req.connection?.remoteAddress || 
             'unknown';
  
  const userAgent = req.get('User-Agent') || '';
  const referrer = req.get('Referer') || '';
  const pageUrl = req.get('Origin') || req.get('Referer') || '';

  // Parse user agent
  const parser = new uaParser(userAgent);
  const uaResult = parser.getResult();

  // Get location from IP
  const geo = geoip.lookup(ip) || {};

  return {
    ip,
    userAgent,
    referrer,
    pageUrl,
    device: {
      type: uaResult.device.type || 'desktop',
      name: uaResult.device.model || 'Unknown',
    },
    browser: {
      name: uaResult.browser.name || 'Unknown',
      version: uaResult.browser.version || '',
    },
    os: {
      name: uaResult.os.name || 'Unknown',
      version: uaResult.os.version || '',
    },
    location: {
      country: geo.country || '',
      region: geo.region || '',
      city: geo.city || '',
      timezone: geo.timezone || '',
      coordinates: geo.ll ? {
        latitude: geo.ll[0],
        longitude: geo.ll[1]
      } : null
    }
  };
}

/**
 * Calculate spam score for a message
 */
function calculateSpamScore(messageData, clientInfo) {
  let score = 0;
  const { name, email, message, subject } = messageData;

  // Check for common spam patterns
  const spamPatterns = [
    { pattern: /http(s)?:\/\//gi, score: 10 },
    { pattern: /[A-Z]{5,}/g, score: 5 },
    { pattern: /[!@#$%^&*()]{3,}/g, score: 8 },
    { pattern: /free|money|profit|earn/gi, score: 15 },
    { pattern: /viagra|cialis|pharmacy/gi, score: 25 },
    { pattern: /click here|buy now|limited time/gi, score: 12 }
  ];

  const content = `${subject} ${message}`;
  spamPatterns.forEach(({ pattern, score: patternScore }) => {
    const matches = content.match(pattern);
    if (matches) {
      score += matches.length * patternScore;
    }
  });

  // Check email patterns
  if (email.includes('+')) score += 5; // Gmail plus addressing
  if (email.split('@')[0].length > 30) score += 8; // Long username

  // Check message characteristics
  if (message.length < 20) score += 10; // Very short message
  if (message.length > 2000) score += 5; // Very long message

  // Location-based scoring
  if (clientInfo.location.country && 
      ['CN', 'RU', 'BR', 'IN'].includes(clientInfo.location.country)) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Determine priority based on category and content
 */
function determinePriority(category, content) {
  const urgentKeywords = ['urgent', 'emergency', 'critical', 'broken', 'not working', 'down'];
  const hasUrgentKeyword = urgentKeywords.some(keyword => 
    content.toLowerCase().includes(keyword)
  );

  if (hasUrgentKeyword) return 'urgent';

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

  return priorityMap[category] || 'normal';
}

/**
 * Submit contact form
 */
export async function submitContactForm(req, res) {
  const session = await ContactMessage.startSession();
  
  try {
    await session.startTransaction();

    const {
      name,
      email,
      subject,
      message,
      company,
      phone,
      category = 'general-inquiry',
      organizationId,
      ...additionalFields
    } = req.body;

    // Validation
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required'
      });
    }

    if (message.length < 10) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters long'
      });
    }

    if (message.length > 10000) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 10,000 characters'
      });
    }

    // Validate organization if provided
    let organization = null;
    if (organizationId) {
      organization = await Organization.findById(organizationId).session(session);
      if (!organization) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invalid organization'
        });
      }
    }

    // Get client information
    const clientInfo = getClientInfo(req);

    // Calculate spam score
    const spamScore = calculateSpamScore(
      { name, email, message, subject },
      clientInfo
    );

    // Determine priority
    const priority = determinePriority(category, `${subject} ${message}`);

    // Create contact message
    const contactMessage = new ContactMessage({
      organization: organizationId || null,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      company: company?.trim() || '',
      phone: phone?.trim() || '',
      category,
      priority,
      source: 'contact-form',
      metadata: {
        ipAddress: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        location: clientInfo.location,
        referrer: clientInfo.referrer,
        pageUrl: clientInfo.pageUrl,
        spamScore,
        formData: additionalFields
      }
    });

    await contactMessage.save({ session });

    // Auto-mark as spam if score is too high
    if (spamScore > 80) {
      contactMessage.status = 'spam';
      contactMessage.priority = 'low';
      await contactMessage.save({ session });

      await session.commitTransaction();

      console.log(chalk.yellow(`🚩 Marked as spam: ${email} (score: ${spamScore})`));

      return res.json({
        success: true,
        message: 'Thank you for your message. We will review it shortly.',
        data: {
          id: contactMessage._id,
          status: 'received'
        }
      });
    }

    // Send notification emails
    try {
      await sendNotificationEmails(contactMessage, organization);
    } catch (emailError) {
      console.warn(chalk.yellow('⚠️ Failed to send notification emails:'), emailError.message);
      // Don't fail the entire request if email fails
    }

    await session.commitTransaction();

    console.log(chalk.green(`📧 Contact form submitted: ${email} (org: ${organizationId || 'none'})`));

    res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      data: {
        id: contactMessage._id,
        status: contactMessage.status,
        priority: contactMessage.priority
      }
    });

  } catch (error) {
    await session.abortTransaction();
    
    console.error(chalk.red('❌ Contact form error:'), error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit message. Please try again.'
    });
  } finally {
    session.endSession();
  }
}

/**
 * Send notification emails for contact form submission
 */
async function sendNotificationEmails(contactMessage, organization) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@assessly.com';
  const adminEmail = process.env.ADMIN_EMAIL || 'system@assessly.com';

  // Email to support team
  const supportEmailTemplate = EmailTemplates.contactNotification({
    contactMessage,
    organization,
    type: 'support'
  });

  await mailer.sendMail({
    to: supportEmail,
    ...supportEmailTemplate,
    priority: contactMessage.priority === 'urgent' ? 'high' : 'normal',
    category: 'contact-form'
  });

  // Email to admin for high-priority messages
  if (contactMessage.priority === 'urgent' || contactMessage.priority === 'high') {
    const adminEmailTemplate = EmailTemplates.contactNotification({
      contactMessage,
      organization,
      type: 'admin'
    });

    await mailer.sendMail({
      to: adminEmail,
      ...adminEmailTemplate,
      priority: 'high',
      category: 'contact-alert'
    });
  }

  // Auto-responder to user
  const autoResponderTemplate = EmailTemplates.contactAutoResponder({
    name: contactMessage.name,
    subject: contactMessage.subject,
    category: contactMessage.category,
    expectedResponseTime: getExpectedResponseTime(contactMessage.priority)
  });

  await mailer.sendMail({
    to: contactMessage.email,
    ...autoResponderTemplate,
    priority: 'low',
    category: 'auto-responder'
  });
}

/**
 * Get expected response time based on priority
 */
function getExpectedResponseTime(priority) {
  const responseTimes = {
    'urgent': '2-4 hours',
    'high': '8-12 hours',
    'normal': '24-48 hours',
    'low': '2-3 business days'
  };
  
  return responseTimes[priority] || '24-48 hours';
}

/**
 * Get contact messages with filtering and pagination
 */
export async function getContactMessages(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      category, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const organizationId = req.user.organization;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { organization: organizationId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [messages, total, stats] = await Promise.all([
      ContactMessage.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'name email')
        .lean(),
      
      ContactMessage.countDocuments(filter),
      
      ContactMessage.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Get contact messages error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact messages'
    });
  }
}

/**
 * Get contact message by ID
 */
export async function getContactMessage(req, res) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const message = await ContactMessage.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('assignedTo', 'name email avatar')
      .populate('organization', 'name slug');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      data: {
        message
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Get contact message error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact message'
    });
  }
}

/**
 * Update contact message status
 */
export async function updateContactMessage(req, res) {
  try {
    const { id } = req.params;
    const { status, assignedTo, responseNote, priority } = req.body;
    const organizationId = req.user.organization;
    const userId = req.user.id;

    const message = await ContactMessage.findOne({
      _id: id,
      organization: organizationId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (assignedTo) updates.assignedTo = assignedTo;
    if (priority) updates.priority = priority;
    if (responseNote) updates.responseNote = responseNote;

    // Set responded timestamp if marking as responded
    if (status === 'responded' && !message.respondedAt) {
      updates.respondedAt = new Date();
    }

    // Update message
    const updatedMessage = await ContactMessage.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    // Add interaction if response note provided
    if (responseNote) {
      await updatedMessage.addInteraction({
        type: 'internal',
        content: responseNote,
        createdBy: userId
      });
    }

    // Log activity
    console.log(chalk.blue(`📝 Contact message updated: ${id} by ${req.user.email}`));

    res.json({
      success: true,
      message: 'Contact message updated successfully',
      data: {
        message: updatedMessage
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Update contact message error:'), error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update contact message'
    });
  }
}

/**
 * Get contact statistics
 */
export async function getContactStats(req, res) {
  try {
    const organizationId = req.user.organization;
    const { days = 30 } = req.query;

    const stats = await ContactMessage.getDashboardStats(organizationId, parseInt(days));

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Get contact stats error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics'
    });
  }
}

/**
 * Assign contact message to user
 */
export async function assignContactMessage(req, res) {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const organizationId = req.user.organization;
    const userId = req.user.id;

    const message = await ContactMessage.findOne({
      _id: id,
      organization: organizationId
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    const updatedMessage = await message.assignToUser(assignedTo);

    // Add interaction
    await updatedMessage.addInteraction({
      type: 'internal',
      content: `Assigned to user`,
      createdBy: userId
    });

    res.json({
      success: true,
      message: 'Contact message assigned successfully',
      data: {
        message: updatedMessage
      }
    });

  } catch (error) {
    console.error(chalk.red('❌ Assign contact message error:'), error);

    res.status(500).json({
      success: false,
      message: 'Failed to assign contact message'
    });
  }
}

export default {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  getContactStats,
  assignContactMessage
};
