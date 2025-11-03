import express from 'express';
import Assessment from '../models/Assessment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Assessments
 *   description: Assessment management endpoints
 */

/**
 * @swagger
 * /api/v1/assessments:
 *   get:
 *     summary: Get assessments
 *     description: Retrieve assessments with pagination and filtering
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of assessments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Assessments retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Build filter based on user role
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  
  // Candidates can only see active assessments assigned to them
  if (req.user.role === 'candidate') {
    filter.status = 'active';
    filter._id = { $in: req.user.assignedAssessments || [] };
  }
  
  // Assessors can only see their created assessments
  if (req.user.role === 'assessor') {
    filter.createdBy = req.user._id;
  }
  
  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Assessment.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: assessments,
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
 * /api/v1/assessments/{id}:
 *   get:
 *     summary: Get assessment by ID
 *     tags: [Assessments]
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
 *         description: Assessment retrieved successfully
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate('createdBy', 'name email');
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }
  
  // Authorization check
  if (req.user.role === 'candidate' && 
      (!req.user.assignedAssessments?.includes(assessment._id.toString()) || assessment.status !== 'active')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this assessment'
    });
  }
  
  if (req.user.role === 'assessor' && assessment.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this assessment'
    });
  }
  
  res.json({
    success: true,
    data: assessment
  });
}));

/**
 * @swagger
 * /api/v1/assessments:
 *   post:
 *     summary: Create assessment
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               duration:
 *                 type: number
 *                 description: Duration in minutes
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post('/', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const assessment = new Assessment({
    ...req.body,
    createdBy: req.user._id
  });
  
  await assessment.save();
  await assessment.populate('createdBy', 'name email');
  
  res.status(201).json({
    success: true,
    data: assessment,
    message: 'Assessment created successfully'
  });
}));

/**
 * @swagger
 * /api/v1/assessments/{id}:
 *   put:
 *     summary: Update assessment
 *     tags: [Assessments]
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
 *         description: Assessment updated successfully
 */
router.put('/:id', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }
  
  // Assessors can only update their own assessments
  if (req.user.role === 'assessor' && assessment.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to update this assessment'
    });
  }
  
  const updatedAssessment = await Assessment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');
  
  res.json({
    success: true,
    data: updatedAssessment,
    message: 'Assessment updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/assessments/{id}:
 *   delete:
 *     summary: Delete assessment
 *     tags: [Assessments]
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
 *         description: Assessment deleted successfully
 */
router.delete('/:id', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found'
    });
  }
  
  // Assessors can only delete their own assessments
  if (req.user.role === 'assessor' && assessment.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to delete this assessment'
    });
  }
  
  await Assessment.findByIdAndDelete(req.params.id);
  
  res.json({
    success: true,
    message: 'Assessment deleted successfully'
  });
}));

export default router;
