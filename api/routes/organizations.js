import express from 'express';
import Organization from '../models/Organization.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management endpoints
 */

/**
 * @swagger
 * /api/v1/organizations:
 *   get:
 *     summary: Get organizations
 *     description: Retrieve organizations with pagination
 *     tags: [Organizations]
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
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Build filter based on user role
  let filter = {};
  
  // Regular users can only see organizations they are members of
  if (req.user.role !== 'admin') {
    filter = {
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id },
        { isPublic: true }
      ]
    };
  }
  
  const [organizations, total] = await Promise.all([
    Organization.find(filter)
      .populate('owner', 'name email')
      .populate('members.user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Organization.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: organizations,
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
 * /api/v1/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
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
 *         description: Organization retrieved successfully
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('members.user', 'name email role');
  
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Authorization check
  const isMember = organization.members.some(member => 
    member.user._id.toString() === req.user._id.toString()
  );
  const isOwner = organization.owner._id.toString() === req.user._id.toString();
  
  if (req.user.role !== 'admin' && !isOwner && !isMember && !organization.isPublic) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this organization'
    });
  }
  
  res.json({
    success: true,
    data: organization
  });
}));

/**
 * @swagger
 * /api/v1/organizations:
 *   post:
 *     summary: Create organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Organization created successfully
 */
router.post('/', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const organization = new Organization({
    ...req.body,
    owner: req.user._id,
    // Add creator as first member
    members: [{
      user: req.user._id,
      role: 'admin',
      joinedAt: new Date()
    }]
  });
  
  await organization.save();
  await organization.populate('owner', 'name email');
  await organization.populate('members.user', 'name email role');
  
  res.status(201).json({
    success: true,
    data: organization,
    message: 'Organization created successfully'
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   put:
 *     summary: Update organization
 *     tags: [Organizations]
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
 *         description: Organization updated successfully
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id);
  
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Authorization check - only owner or admin can update
  const isOwner = organization.owner.toString() === req.user._id.toString();
  
  if (req.user.role !== 'admin' && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to update this organization'
    });
  }
  
  const updatedOrganization = await Organization.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('owner', 'name email')
    .populate('members.user', 'name email role');
  
  res.json({
    success: true,
    data: updatedOrganization,
    message: 'Organization updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   delete:
 *     summary: Delete organization
 *     tags: [Organizations]
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
 *         description: Organization deleted successfully
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id);
  
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Authorization check - only owner or admin can delete
  const isOwner = organization.owner.toString() === req.user._id.toString();
  
  if (req.user.role !== 'admin' && !isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to delete this organization'
    });
  }
  
  await Organization.findByIdAndDelete(req.params.id);
  
  res.json({
    success: true,
    message: 'Organization deleted successfully'
  });
}));

export default router;
