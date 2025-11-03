import express from 'express';
import UserActivity from '../models/UserActivity.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: User Activities
 *   description: User activity tracking and analytics
 */

/**
 * @swagger
 * /api/v1/user-activities:
 *   get:
 *     summary: Get user activities
 *     description: Retrieve user activities with pagination and filtering
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Filter by action type
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
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 */
router.get('/', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  if (req.query.user) filter.user = req.query.user;
  if (req.query.action) filter.action = req.query.action;
  
  // Date range filter
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) {
      filter.createdAt.$gte = new Date(req.query.dateFrom);
    }
    if (req.query.dateTo) {
      filter.createdAt.$lte = new Date(req.query.dateTo);
    }
  }
  
  const [activities, total] = await Promise.all([
    UserActivity.find(filter)
      .populate('user', 'name email role')
      .populate('organization', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    UserActivity.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @swagger
 * /api/v1/user-activities/{id}:
 *   get:
 *     summary: Get activity by ID
 *     tags: [User Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity retrieved successfully
 */
router.get('/:id', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const activity = await UserActivity.findById(req.params.id)
    .populate('user', 'name email role')
    .populate('organization', 'name slug');
  
  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found'
    });
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
 *     summary: Log user activity (Internal use)
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
 *             properties:
 *               action:
 *                 type: string
 *               description:
 *                 type: string
 *               resourceType:
 *                 type: string
 *               resourceId:
 *                 type: string
 *               organization:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Activity logged successfully
 */
router.post('/', asyncHandler(async (req, res) => {
  const { action, description, resourceType, resourceId, organization, metadata } = req.body;
  
  const activity = new UserActivity({
    user: req.user._id,
    action,
    description,
    resourceType,
    resourceId,
    organization,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  await activity.save();
  
  res.status(201).json({
    success: true,
    data: { id: activity._id },
    message: 'Activity logged successfully'
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
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const activity = await UserActivity.findByIdAndDelete(req.params.id);
  
  if (!activity) {
    return res.status(404).json({
      success: false,
      message: 'Activity not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Activity deleted successfully'
  });
}));

export default router;
