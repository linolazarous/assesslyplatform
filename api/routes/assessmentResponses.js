import express from 'express';
import AssessmentResponse from '../models/AssessmentResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Assessment Responses
 *   description: Assessment response management endpoints
 */

/**
 * @swagger
 * /api/v1/assessment-responses:
 *   get:
 *     summary: Get assessment responses
 *     description: Retrieve assessment responses with pagination and filtering
 *     tags: [Assessment Responses]
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
 *         description: Number of responses per page
 *       - in: query
 *         name: candidate
 *         schema:
 *           type: string
 *         description: Filter by candidate ID
 *       - in: query
 *         name: assessment
 *         schema:
 *           type: string
 *         description: Filter by assessment ID
 *     responses:
 *       200:
 *         description: Responses retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  if (req.query.candidate) filter.candidate = req.query.candidate;
  if (req.query.assessment) filter.assessment = req.query.assessment;
  
  // Assessors can only see responses for their assessments
  if (req.user.role === 'assessor') {
    filter.assessment = { $in: req.user.assessments || [] };
  }
  
  const [responses, total] = await Promise.all([
    AssessmentResponse.find(filter)
      .populate('candidate', 'name email')
      .populate('assessment', 'title description')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit),
    AssessmentResponse.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: responses,
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
 * /api/v1/assessment-responses/{id}:
 *   get:
 *     summary: Get response by ID
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Response ID
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *       404:
 *         description: Response not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const response = await AssessmentResponse.findById(req.params.id)
    .populate('candidate', 'name email')
    .populate('assessment', 'title description');
  
  if (!response) {
    return res.status(404).json({
      success: false,
      message: 'Response not found'
    });
  }
  
  // Authorization check
  if (req.user.role === 'assessor' && !req.user.assessments?.includes(response.assessment._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this response'
    });
  }
  
  if (req.user.role === 'candidate' && response.candidate._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this response'
    });
  }
  
  res.json({
    success: true,
    data: response
  });
}));

/**
 * @swagger
 * /api/v1/assessment-responses:
 *   post:
 *     summary: Submit assessment response
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assessment
 *               - answers
 *             properties:
 *               assessment:
 *                 type: string
 *                 description: Assessment ID
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Response submitted successfully
 */
router.post('/', authorizeRoles('candidate'), asyncHandler(async (req, res) => {
  const { assessment, answers } = req.body;
  
  // Check if response already exists for this candidate and assessment
  const existingResponse = await AssessmentResponse.findOne({
    assessment,
    candidate: req.user._id
  });
  
  if (existingResponse) {
    return res.status(409).json({
      success: false,
      message: 'You have already submitted a response for this assessment'
    });
  }
  
  const response = new AssessmentResponse({
    assessment,
    candidate: req.user._id,
    answers,
    submittedAt: new Date()
  });
  
  await response.save();
  await response.populate('assessment', 'title description');
  
  res.status(201).json({
    success: true,
    data: response,
    message: 'Assessment response submitted successfully'
  });
}));

/**
 * @swagger
 * /api/v1/assessment-responses/{id}:
 *   put:
 *     summary: Update response (Admin/Assessor only)
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *               feedback:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, completed]
 *     responses:
 *       200:
 *         description: Response updated successfully
 */
router.put('/:id', authorizeRoles('admin', 'assessor'), asyncHandler(async (req, res) => {
  const { score, feedback, status } = req.body;
  
  const response = await AssessmentResponse.findByIdAndUpdate(
    req.params.id,
    { score, feedback, status, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true, runValidators: true }
  ).populate('candidate', 'name email').populate('assessment', 'title description');
  
  if (!response) {
    return res.status(404).json({
      success: false,
      message: 'Response not found'
    });
  }
  
  res.json({
    success: true,
    data: response,
    message: 'Response updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/assessment-responses/{id}:
 *   delete:
 *     summary: Delete response (Admin only)
 *     tags: [Assessment Responses]
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
 *         description: Response deleted successfully
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const response = await AssessmentResponse.findByIdAndDelete(req.params.id);
  
  if (!response) {
    return res.status(404).json({
      success: false,
      message: 'Response not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Response deleted successfully'
  });
}));

export default router;
