import express from 'express';
import Subscription from '../models/Subscription.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management endpoints
 */

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Get subscriptions
 *     description: Retrieve subscriptions with pagination
 *     tags: [Subscriptions]
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
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, canceled, expired]
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 */
router.get('/', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  
  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('organization', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscription.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: subscriptions,
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
 * /api/v1/subscriptions/{id}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Subscriptions]
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
 *         description: Subscription retrieved successfully
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate('organization', 'name slug');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to view subscriptions'
    });
  }
  
  res.json({
    success: true,
    data: subscription
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create subscription (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization
 *               - plan
 *               - billingCycle
 *             properties:
 *               organization:
 *                 type: string
 *               plan:
 *                 type: string
 *                 enum: [basic, professional, enterprise]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Subscription created successfully
 */
router.post('/', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const subscription = new Subscription(req.body);
  
  await subscription.save();
  await subscription.populate('organization', 'name slug');
  
  res.status(201).json({
    success: true,
    data: subscription,
    message: 'Subscription created successfully'
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   put:
 *     summary: Update subscription (Admin only)
 *     tags: [Subscriptions]
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
 *         description: Subscription updated successfully
 */
router.put('/:id', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('organization', 'name slug');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  res.json({
    success: true,
    data: subscription,
    message: 'Subscription updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   delete:
 *     summary: Cancel subscription (Admin only)
 *     tags: [Subscriptions]
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
 *         description: Subscription canceled successfully
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { status: 'canceled', canceledAt: new Date() },
    { new: true }
  );
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  res.json({
    success: true,
    data: subscription,
    message: 'Subscription canceled successfully'
  });
}));

export default router;
