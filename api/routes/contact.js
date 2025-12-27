// api/routes/contact.js
import express from "express";
import ContactMessage from "../models/ContactMessage.js";
import Organization from "../models/Organization.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect, authorizeRoles } from "../middleware/auth.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Multitenant contact form and message management
 */

// Middleware to validate organization access for admin routes
const validateOrganizationAccess = asyncHandler(async (req, res, next) => {
  let organizationId = req.query.organization || req.body.organization;
  
  // For super admin, organization is optional
  if (req.user.role === 'superadmin' && !organizationId) {
    return next();
  }
  
  // For organization admins, require organization ID
  if (!organizationId && req.user.organizations?.length > 0) {
    organizationId = req.user.organizations[0].organization;
  }
  
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
  }
  
  // Verify organization exists and user has access
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Check if user belongs to this organization (unless superadmin)
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === organizationId.toString()
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this organization'
      });
    }
  }
  
  req.organization = organization;
  next();
});

/**
 * @swagger
 * /api/v1/contact:
 *   post:
 *     summary: Submit contact form with organization context
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               company:
 *                 type: string
 *               phone:
 *                 type: string
 *               organization:
 *                 type: string
 *                 description: Organization slug or ID for organization-specific contact
 *               department:
 *                 type: string
 *                 enum: [sales, support, technical, billing, general]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(async (req, res) => {
  const { 
    name, 
    email, 
    subject, 
    message, 
    company, 
    phone, 
    organization: orgIdentifier,
    department = 'general',
    priority = 'normal'
  } = req.body;
  
  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be provided: name, email, subject, message'
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  // Validate message length
  if (message.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Message must be at least 10 characters long'
    });
  }
  
  if (message.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Message must not exceed 2000 characters'
    });
  }
  
  let organization = null;
  
  // Resolve organization if provided
  if (orgIdentifier) {
    organization = await Organization.findOne({
      $or: [
        { _id: orgIdentifier },
        { slug: orgIdentifier.toLowerCase() }
      ],
      isActive: true
    });
    
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization reference'
      });
    }
  }
  
  const contactMessage = new ContactMessage({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    subject: subject.trim(),
    message: message.trim(),
    company: company?.trim(),
    phone: phone?.trim(),
    organization: organization?._id,
    department,
    priority,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      source: 'contact_form',
      url: req.get('Referer'),
      language: req.get('Accept-Language')
    }
  });
  
  await contactMessage.save();
  
  // Send notification emails
  await sendContactNotifications(contactMessage, organization);
  
  res.status(201).json({
    success: true,
    data: { 
      id: contactMessage._id,
      estimatedResponseTime: getEstimatedResponseTime(priority)
    },
    message: 'Thank you for your message. We will get back to you soon.'
  });
}));

/**
 * @swagger
 * /api/v1/contact:
 *   get:
 *     summary: Get contact messages with organization isolation
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, in-progress, resolved, spam]
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *           enum: [sales, support, technical, billing, general]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, subject, message
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
router.get("/", protect, authorizeRoles('admin', 'team_lead'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    department,
    priority,
    assignedTo,
    search,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build multitenant filter
  const filter = {};
  
  // Organization isolation (superadmin can see all)
  if (req.user.role !== 'superadmin') {
    filter.organization = req.organization._id;
  } else if (req.organization) {
    // Superadmin filtering by specific organization
    filter.organization = req.organization._id;
  }
  
  // Additional filters
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  
  // Date range filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
  }
  
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
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [messages, total, stats] = await Promise.all([
    ContactMessage.find(filter)
      .populate('organization', 'name slug logo')
      .populate('assignedTo', 'name email avatar')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    ContactMessage.countDocuments(filter),
    getContactStats(filter)
  ]);
  
  res.json({
    success: true,
    data: messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats,
    ...(req.organization && {
      organization: {
        id: req.organization._id,
        name: req.organization.name
      }
    })
  });
}));

/**
 * @swagger
 * /api/v1/contact/stats:
 *   get:
 *     summary: Get contact messages statistics
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/stats", protect, authorizeRoles('admin', 'team_lead'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const filter = {};
  
  if (req.user.role !== 'superadmin') {
    filter.organization = req.organization._id;
  } else if (req.organization) {
    filter.organization = req.organization._id;
  }
  
  const stats = await getContactStats(filter);
  
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   get:
 *     summary: Get contact message by ID with organization isolation
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 */
router.get("/:id", protect, authorizeRoles('admin', 'team_lead'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin' && req.organization) {
    filter.organization = req.organization._id;
  }
  
  const message = await ContactMessage.findOne(filter)
    .populate('organization', 'name slug logo')
    .populate('assignedTo', 'name email avatar')
    .populate('respondedBy', 'name email');
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  res.json({
    success: true,
    data: message
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   patch:
 *     summary: Update message status with organization isolation
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in-progress, resolved, spam]
 *               responseNote:
 *                 type: string
 *                 maxLength: 1000
 *               assignedTo:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               internalNotes:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Message updated successfully
 */
router.patch("/:id", protect, authorizeRoles('admin', 'team_lead'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { status, responseNote, assignedTo, priority, internalNotes } = req.body;
  
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin' && req.organization) {
    filter.organization = req.organization._id;
  }
  
  const message = await ContactMessage.findOne(filter);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  const updateData = {};
  if (status) updateData.status = status;
  if (responseNote) updateData.responseNote = responseNote;
  if (assignedTo) updateData.assignedTo = assignedTo;
  if (priority) updateData.priority = priority;
  if (internalNotes) updateData.internalNotes = internalNotes;
  
  // Track status changes
  if (status && status !== message.status) {
    updateData.statusHistory = updateData.statusHistory || [];
    updateData.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      note: `Status changed from ${message.status} to ${status}`
    });
  }
  
  if (status === 'resolved') {
    updateData.resolvedAt = new Date();
    updateData.respondedBy = req.user._id;
    
    // Send resolution email to contact
    if (message.email && responseNote) {
      await sendResolutionEmail(message, responseNote, req.user);
    }
  }
  
  const updatedMessage = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  )
    .populate('organization', 'name slug logo')
    .populate('assignedTo', 'name email avatar')
    .populate('respondedBy', 'name email');
  
  res.json({
    success: true,
    data: updatedMessage,
    message: 'Message updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}/respond:
 *   post:
 *     summary: Send response to contact message
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               closeTicket:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Response sent successfully
 */
router.post("/:id/respond", protect, authorizeRoles('admin', 'team_lead'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { response, closeTicket = true } = req.body;
  
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin' && req.organization) {
    filter.organization = req.organization._id;
  }
  
  const message = await ContactMessage.findOne(filter);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  // Send response email
  await sendResponseEmail(message, response, req.user);
  
  const updateData = {
    responseNote: response,
    respondedBy: req.user._id,
    respondedAt: new Date()
  };
  
  if (closeTicket) {
    updateData.status = 'resolved';
    updateData.resolvedAt = new Date();
    
    updateData.statusHistory = updateData.statusHistory || [];
    updateData.statusHistory.push({
      status: 'resolved',
      changedBy: req.user._id,
      changedAt: new Date(),
      note: 'Ticket resolved with response'
    });
  } else {
    updateData.status = 'in-progress';
  }
  
  const updatedMessage = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  res.json({
    success: true,
    data: updatedMessage,
    message: 'Response sent successfully'
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   delete:
 *     summary: Delete contact message with organization isolation
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete("/:id", protect, authorizeRoles('admin'), validateOrganizationAccess, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin' && req.organization) {
    filter.organization = req.organization._id;
  }
  
  const message = await ContactMessage.findOneAndDelete(filter);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
}));

// Helper functions
async function getContactStats(filter) {
  const stats = await ContactMessage.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        spam: { $sum: { $cond: [{ $eq: ['$status', 'spam'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        byDepartment: {
          $push: {
            department: '$department',
            count: 1
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        byStatus: {
          new: '$new',
          inProgress: '$inProgress',
          resolved: '$resolved',
          spam: '$spam'
        },
        byPriority: {
          urgent: '$urgent',
          high: '$high',
          normal: { $subtract: ['$total', { $add: ['$urgent', '$high'] }] }
        },
        departments: {
          $arrayToObject: {
            $map: {
              input: '$byDepartment',
              as: 'dept',
              in: {
                k: '$$dept.department',
                v: '$$dept.count'
              }
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    byStatus: { new: 0, inProgress: 0, resolved: 0, spam: 0 },
    byPriority: { urgent: 0, high: 0, normal: 0 },
    departments: {}
  };
}

async function sendContactNotifications(contactMessage, organization) {
  const orgName = organization?.name || 'Assessly Platform';
  
  // Send confirmation to sender
  await sendEmail({
    to: contactMessage.email,
    subject: `We've received your message - ${orgName}`,
    template: 'contact-confirmation',
    context: {
      name: contactMessage.name,
      subject: contactMessage.subject,
      message: contactMessage.message,
      priority: contactMessage.priority,
      estimatedResponseTime: getEstimatedResponseTime(contactMessage.priority),
      organization: orgName,
      supportEmail: organization?.supportEmail || 'support@assessly.com'
    }
  });
  
  // Send notification to admin team
  const adminEmails = await getAdminNotificationEmails(organization);
  
  if (adminEmails.length > 0) {
    await sendEmail({
      to: adminEmails,
      subject: `New Contact Message - ${contactMessage.subject}`,
      template: 'contact-notification',
      context: {
        contactName: contactMessage.name,
        contactEmail: contactMessage.email,
        contactCompany: contactMessage.company,
        subject: contactMessage.subject,
        message: contactMessage.message,
        priority: contactMessage.priority,
        department: contactMessage.department,
        organization: orgName,
        adminUrl: `${process.env.ADMIN_URL}/contact/${contactMessage._id}`
      }
    });
  }
}

async function sendResponseEmail(contactMessage, response, responder) {
  await sendEmail({
    to: contactMessage.email,
    subject: `Re: ${contactMessage.subject}`,
    template: 'contact-response',
    context: {
      name: contactMessage.name,
      originalMessage: contactMessage.message,
      response: response,
      responderName: responder.name,
      responderEmail: responder.email,
      organization: contactMessage.organization?.name || 'Assessly Team'
    }
  });
}

async function sendResolutionEmail(contactMessage, resolutionNote, resolver) {
  await sendEmail({
    to: contactMessage.email,
    subject: `Resolution: ${contactMessage.subject}`,
    template: 'contact-resolution',
    context: {
      name: contactMessage.name,
      resolutionNote: resolutionNote,
      resolverName: resolver.name,
      organization: contactMessage.organization?.name || 'Assessly Team'
    }
  });
}

async function getAdminNotificationEmails(organization) {
  // In a real implementation, fetch admin users from the organization
  // This is a simplified version
  if (organization && organization.notificationEmails) {
    return organization.notificationEmails;
  }
  
  // Fallback to environment variable or default
  return process.env.CONTACT_NOTIFICATION_EMAILS?.split(',') || [];
}

function getEstimatedResponseTime(priority) {
  const responseTimes = {
    urgent: '2-4 hours',
    high: '8-12 hours', 
    normal: '24-48 hours',
    low: '2-3 business days'
  };
  
  return responseTimes[priority] || responseTimes.normal;
}

export default router;
