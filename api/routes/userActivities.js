// api/routes/userActivities.js
import express from 'express';
import UserActivity from '../models/UserActivity.js';
import Organization from '../models/Organization.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: User Activities
 *   description: Multitenant user activity tracking and analytics
 */

// Middleware to validate organization access
const validateOrganizationAccess = asyncHandler(async (req, res, next) => {
  const organizationId = req.query.organization || req.body.organization;
  
  // Super admin doesn't need organization context for global operations
  if (req.user.role === 'superadmin' && !organizationId) {
    return next();
  }
  
  if (!organizationId && req.user.organizations?.length > 0) {
    req.organizationId = req.user.organizations[0].organization;
  } else if (organizationId) {
    req.organizationId = organizationId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
  }
  
  // Verify organization exists and user has access
  const organization = await Organization.findById(req.organizationId);
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === req.organizationId.toString()
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this organization'
      });
    }
    
    req.userOrganization = userOrganization;
  }
  
  req.organization = organization;
  next();
});

/**
 * @swagger
 * /api/v1/user-activities:
 *   get:
 *     summary: Get user activities with multitenant isolation
 *     description: Retrieve user activities based on organization context and permissions
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID to filter activities
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
 *           maximum: 200
 *           default: 50
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [login, logout, assessment_started, assessment_completed, assessment_created, user_created, user_updated, organization_updated, subscription_updated, payment_processed]
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *           enum: [assessment, user, organization, subscription, payment, team]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, security]
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team ID
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 */
router.get('/', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    user, 
    action,
    resourceType,
    severity,
    team,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build multitenant filter
  const filter = {};
  
  // Organization isolation
  if (req.user.role !== 'superadmin') {
    filter.organization = req.organizationId;
  } else if (req.organizationId) {
    // Super admin filtering by specific organization
    filter.organization = req.organizationId;
  }
  
  // Additional filters
  if (user) filter.user = user;
  if (action) filter.action = action;
  if (resourceType) filter.resourceType = resourceType;
  if (severity) filter.severity = severity;
  
  // Team filter (for team leads)
  if (team && req.userOrganization?.role === 'team_lead') {
    filter['metadata.team'] = team;
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
  }
  
  // Role-based access restrictions
  if (req.user.role !== 'superadmin' && !['admin', 'team_lead'].includes(req.userOrganization?.role)) {
    // Regular users can only see their own activities
    filter.user = req.user._id;
  } else if (req.userOrganization?.role === 'team_lead') {
    // Team leads can see activities of users in their teams
    const userTeams = req.userOrganization.teams || [];
    if (userTeams.length > 0) {
      filter['metadata.team'] = { $in: userTeams };
    }
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [activities, total, stats] = await Promise.all([
    UserActivity.find(filter)
      .populate('user', 'name email avatar role')
      .populate('organization', 'name slug logo')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    UserActivity.countDocuments(filter),
    getActivityStats(filter)
  ]);
  
  res.json({
    success: true,
    data: activities,
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
 * /api/v1/user-activities/stats:
 *   get:
 *     summary: Get activity statistics
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, yesterday, week, month, quarter, year]
 *           default: week
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query;
  
  const dateRange = getDateRange(period);
  const filter = {
    organization: req.organizationId,
    createdAt: { $gte: dateRange.start, $lte: dateRange.end }
  };
  
  const stats = await getDetailedActivityStats(filter, period);
  
  res.json({
    success: true,
    data: stats,
    period: {
      type: period,
      start: dateRange.start,
      end: dateRange.end
    }
  });
}));

/**
 * @swagger
 * /api/v1/user-activities/audit:
 *   get:
 *     summary: Get security audit log
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Audit log retrieved successfully
 */
router.get('/audit', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const filter = {
    organization: req.organizationId,
    severity: { $in: ['security', 'error'] }
  };
  
  const [activities, total] = await Promise.all([
    UserActivity.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    UserActivity.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: activities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * @swagger
 * /api/v1/user-activities/{id}:
 *   get:
 *     summary: Get activity by ID with organization context
 *     tags: [User Activities]
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
 *         description: Activity retrieved successfully
 */
router.get('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin') {
    filter.organization = req.organizationId;
  } else if (req.organizationId) {
    filter.organization = req.organizationId;
  }
  
  const activity = await UserActivity.findOne(filter)
    .populate('user', 'name email avatar role')
    .populate('organization', 'name slug logo');
  
  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found'
    });
  }
  
  // Additional authorization check for team leads
  if (req.userOrganization?.role === 'team_lead') {
    const userTeams = req.userOrganization.teams || [];
    const activityTeam = activity.metadata?.team;
    
    if (activityTeam && !userTeams.includes(activityTeam.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this activity'
      });
    }
  }
  
  res.json({
    success: true,
    data: activity
  });
}));

/**
 * @swagger
 * /api/v1/user-activities:
 *   post:
 *     summary: Log user activity with organization context
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - organization
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [login, logout, assessment_started, assessment_completed, assessment_created, user_created, user_updated, organization_updated, subscription_updated, payment_processed, team_created, team_updated, invitation_sent, invitation_accepted]
 *               description:
 *                 type: string
 *               resourceType:
 *                 type: string
 *                 enum: [assessment, user, organization, subscription, payment, team, invitation]
 *               resourceId:
 *                 type: string
 *               organization:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [info, warning, error, security]
 *                 default: info
 *               metadata:
 *                 type: object
 *                 properties:
 *                   team:
 *                     type: string
 *                   assessment:
 *                     type: string
 *                   ipAddress:
 *                     type: string
 *                   userAgent:
 *                     type: string
 *                   duration:
 *                     type: number
 *                   score:
 *                     type: number
 *                   changes:
 *                     type: object
 *     responses:
 *       201:
 *         description: Activity logged successfully
 */
router.post('/', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { 
    action, 
    description, 
    resourceType, 
    resourceId, 
    organization,
    severity = 'info',
    metadata = {}
  } = req.body;
  
  const activity = new UserActivity({
    user: req.user._id,
    action,
    description,
    resourceType,
    resourceId,
    organization: organization || req.organizationId,
    severity,
    metadata: {
      ...metadata,
      userRole: req.user.role,
      userOrganizationRole: req.userOrganization?.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });
  
  await activity.save();
  
  // Real-time notifications for important activities
  if (['error', 'security', 'warning'].includes(severity)) {
    await sendActivityAlert(activity, req.organization);
  }
  
  res.status(201).json({
    success: true,
    data: { id: activity._id },
    message: 'Activity logged successfully'
  });
}));

/**
 * @swagger
 * /api/v1/user-activities/export:
 *   post:
 *     summary: Export activities to CSV
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *               format:
 *                 type: string
 *                 enum: [csv, json]
 *                 default: csv
 *     responses:
 *       200:
 *         description: Export generated successfully
 */
router.post('/export', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, format = 'csv' } = req.body;
  
  const filter = { organization: req.organizationId };
  
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
  }
  
  const activities = await UserActivity.find(filter)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(10000); // Limit for safety
  
  const exportData = generateExportData(activities, format);
  
  res.json({
    success: true,
    data: {
      recordCount: activities.length,
      downloadUrl: await generateDownloadUrl(exportData, format),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    message: `Export generated with ${activities.length} records`
  });
}));

/**
 * @swagger
 * /api/v1/user-activities/{id}:
 *   delete:
 *     summary: Delete activity (Admin only)
 *     tags: [User Activities]
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
 *         description: Activity deleted successfully
 */
router.delete('/:id', validateOrganizationAccess, authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  
  // Organization isolation
  if (req.user.role !== 'superadmin') {
    filter.organization = req.organizationId;
  }
  
  const activity = await UserActivity.findOneAndDelete(filter);
  
  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found'
    });
  }
  
  // Log the deletion activity
  await UserActivity.create({
    user: req.user._id,
    action: 'activity_deleted',
    description: `Activity record ${req.params.id} was deleted`,
    organization: req.organizationId,
    severity: 'warning',
    metadata: {
      deletedActivityId: req.params.id,
      deletedBy: req.user._id,
      ipAddress: req.ip
    }
  });
  
  res.json({
    success: true,
    message: 'Activity deleted successfully'
  });
}));

// Helper functions
async function getActivityStats(filter) {
  const stats = await UserActivity.aggregate([
    { $match: filter },
    {
      $facet: {
        byAction: [
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        bySeverity: [
          {
            $group: {
              _id: '$severity',
              count: { $sum: 1 }
            }
          }
        ],
        byUser: [
          {
            $group: {
              _id: '$user',
              count: { $sum: 1 },
              lastActivity: { $max: '$createdAt' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ],
        timeline: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $limit: 30 }
        ]
      }
    }
  ]);
  
  return stats[0] || {
    byAction: [],
    bySeverity: [],
    byUser: [],
    timeline: []
  };
}

async function getDetailedActivityStats(filter, period) {
  const dateFormat = getDateFormatForPeriod(period);
  
  const stats = await UserActivity.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          action: '$action'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalActivities: { $sum: '$count' },
        uniqueUsers: { $sum: { $size: '$uniqueUsers' } }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return {
    timeline: stats,
    summary: {
      totalActivities: stats.reduce((sum, day) => sum + day.totalActivities, 0),
      totalUniqueUsers: await UserActivity.distinct('user', filter).then(users => users.length),
      mostActiveAction: await getMostActiveAction(filter)
    }
  };
}

async function getMostActiveAction(filter) {
  const result = await UserActivity.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  
  return result[0] || null;
}

function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 7);
  }
  
  return { start, end: now };
}

function getDateFormatForPeriod(period) {
  switch (period) {
    case 'today':
    case 'yesterday':
      return '%H:00';
    case 'week':
      return '%Y-%m-%d';
    case 'month':
      return '%Y-%m-%d';
    case 'quarter':
      return '%Y-%m-%W';
    case 'year':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
}

function generateExportData(activities, format) {
  if (format === 'json') {
    return activities.map(activity => ({
      timestamp: activity.createdAt,
      user: activity.user?.name || activity.user?.email || 'Unknown',
      action: activity.action,
      description: activity.description,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      severity: activity.severity,
      ipAddress: activity.metadata?.ipAddress,
      userAgent: activity.metadata?.userAgent
    }));
  }
  
  // CSV format
  const headers = ['Timestamp', 'User', 'Action', 'Description', 'Resource Type', 'Resource ID', 'Severity', 'IP Address'];
  const rows = activities.map(activity => [
    activity.createdAt.toISOString(),
    activity.user?.name || activity.user?.email || 'Unknown',
    activity.action,
    activity.description,
    activity.resourceType,
    activity.resourceId,
    activity.severity,
    activity.metadata?.ipAddress
  ]);
  
  return [headers, ...rows];
}

async function generateDownloadUrl(data, format) {
  // In a real implementation, this would upload to cloud storage
  // and return a signed URL. For now, return a placeholder.
  const filename = `activities-${Date.now()}.${format}`;
  return `${process.env.API_URL}/downloads/${filename}`;
}

async function sendActivityAlert(activity, organization) {
  // In a real implementation, this would send notifications
  // to relevant admins based on activity severity and type
  console.log('🔔 Activity Alert:', {
    organization: organization.name,
    activity: activity.action,
    severity: activity.severity,
    user: activity.user
  });
}

export default router;
