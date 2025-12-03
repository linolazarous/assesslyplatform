// api/routes/assessmentResponses.js
import express from 'express';
import mongoose from 'mongoose';
import { body, param } from 'express-validator'; // ← ADD THIS LINE

import AssessmentResponse from '../models/AssessmentResponse.js';
import Assessment from '../models/Assessment.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { 
  protect, 
  authorize, 
  requireOrganizationAccess 
} from '../middleware/auth.js';
// UPDATE THIS LINE - change validateRequest.js to validation.js
import { 
  handleValidationErrors,
  registerValidators,
  userUpdateValidators,
  organizationValidators,
  assessmentValidators,
  paginationValidators,
  searchValidators,
  commonValidators 
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication and organization access to all routes
router.use(protect);
router.use(requireOrganizationAccess);

/**
 * @swagger
 * tags:
 *   name: Assessment Responses
 *   description: Assessment response management and evaluation endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AssessmentResponse:
 *       type: object
 *       required:
 *         - assessment
 *         - candidate
 *         - organization
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the response
 *         assessment:
 *           type: string
 *           description: Reference to Assessment ID
 *         candidate:
 *           type: string
 *           description: Reference to User ID (candidate)
 *         organization:
 *           type: string
 *           description: Reference to Organization ID
 *         answers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Answer'
 *         status:
 *           type: string
 *           enum: [not-started, in-progress, submitted, under-review, completed, expired, abandoned]
 *           default: not-started
 *         score:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         percentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           default: 0
 *         passed:
 *           type: boolean
 *           default: null
 *         timeSpent:
 *           type: number
 *           description: Total time spent in seconds
 *           default: 0
 *         startedAt:
 *           type: string
 *           format: date-time
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         reviewedBy:
 *           type: string
 *           description: Reference to User ID (reviewer)
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         feedback:
 *           $ref: '#/components/schemas/Feedback'
 *         metadata:
 *           type: object
 *           description: Security and proctoring metadata
 * 
 *     Answer:
 *       type: object
 *       required:
 *         - questionId
 *         - questionType
 *       properties:
 *         questionId:
 *           type: string
 *         questionType:
 *           type: string
 *           enum: [multiple-choice, single-choice, true-false, short-answer, essay, code, file-upload]
 *         answer:
 *           type: mixed
 *         pointsAwarded:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         maxPoints:
 *           type: number
 *           minimum: 0
 *         timeSpent:
 *           type: number
 *           description: Time spent on this question in seconds
 *         isCorrect:
 *           type: boolean
 *           default: null
 *         files:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FileAttachment'
 * 
 *     Feedback:
 *       type: object
 *       properties:
 *         general:
 *           type: string
 *           maxLength: 5000
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 500
 *         improvements:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 500
 *         overallRating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 * 
 *     FileAttachment:
 *       type: object
 *       required:
 *         - filename
 *         - url
 *         - mimetype
 *         - size
 *       properties:
 *         filename:
 *           type: string
 *         originalName:
 *           type: string
 *         url:
 *           type: string
 *         mimetype:
 *           type: string
 *         size:
 *           type: number
 *           minimum: 0
 */

/**
 * @swagger
 * /api/v1/assessment-responses:
 *   get:
 *     summary: Get paginated assessment responses
 *     description: Retrieve assessment responses with advanced filtering, sorting, and pagination. Supports role-based access control.
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
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of responses per page
 *       - in: query
 *         name: assessment
 *         schema:
 *           type: string
 *         description: Filter by assessment ID
 *       - in: query
 *         name: candidate
 *         schema:
 *           type: string
 *         description: Filter by candidate ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not-started, in-progress, submitted, under-review, completed, expired, abandoned]
 *         description: Filter by response status
 *       - in: query
 *         name: reviewedBy
 *         schema:
 *           type: string
 *         description: Filter by reviewer ID
 *       - in: query
 *         name: passed
 *         schema:
 *           type: boolean
 *         description: Filter by pass/fail status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, submittedAt, score, percentage, timeSpent]
 *           default: submittedAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in candidate name or email
 *     responses:
 *       200:
 *         description: Responses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     responses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AssessmentResponse'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', 
  authorize('org_admin', 'manager', 'assessor', 'viewer'),
  [...paginationValidators, ...searchValidators, handleValidationErrors],
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      assessment,
      candidate,
      status,
      reviewedBy,
      passed,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const organizationId = req.user.organization;
    const skip = (page - 1) * limit;

    // Build filter with organization context
    const filter = { organization: organizationId };

    // Role-based filtering
    if (req.user.role === 'assessor') {
      // Assessors can only see responses for assessments they created
      const myAssessments = await Assessment.find({
        organization: organizationId,
        createdBy: req.user.id
      }).select('_id');
      
      filter.assessment = { 
        $in: myAssessments.map(a => a._id) 
      };
    }

    // Apply filters
    if (assessment) filter.assessment = assessment;
    if (candidate) filter.candidate = candidate;
    if (status) filter.status = status;
    if (reviewedBy) filter.reviewedBy = reviewedBy;
    if (passed !== undefined) filter.passed = passed === 'true';

    // Search filter
    if (search) {
      const candidateUsers = await User.find({
        organization: organizationId,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      filter.candidate = { $in: candidateUsers.map(u => u._id) };
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [responses, total, stats] = await Promise.all([
      AssessmentResponse.find(filter)
        .populate('candidate', 'name email avatar profile.position profile.company')
        .populate('assessment', 'title category totalPoints passingScore settings')
        .populate('reviewedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),

      AssessmentResponse.countDocuments(filter),

      // Get response statistics
      AssessmentResponse.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' },
            avgTime: { $avg: '$timeSpent' }
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        responses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgScore: Math.round(stat.avgScore || 0),
            avgTime: Math.round(stat.avgTime || 0)
          };
          return acc;
        }, {})
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}:
 *   get:
 *     summary: Get assessment response by ID
 *     description: Retrieve a specific assessment response with detailed information. Access control based on user role.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: Assessment Response ID
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       $ref: '#/components/schemas/AssessmentResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/:id',
  [commonValidators.objectId('id'), handleValidationErrors],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const response = await AssessmentResponse.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('candidate', 'name email avatar profile')
      .populate('assessment', 'title description category totalPoints passingScore settings questions')
      .populate('reviewedBy', 'name email avatar')
      .populate('organization', 'name slug');

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    // Authorization checks
    if (req.user.role === 'candidate') {
      // Candidates can only view their own responses
      if (!response.candidate._id.equals(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this assessment response'
        });
      }
    } else if (req.user.role === 'assessor') {
      // Assessors can only view responses for assessments they created
      const assessment = await Assessment.findOne({
        _id: response.assessment._id,
        createdBy: req.user.id
      });
      
      if (!assessment) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this assessment response'
        });
      }
    }

    res.json({
      success: true,
      data: {
        response
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses:
 *   post:
 *     summary: Start a new assessment response
 *     description: Create a new assessment response and begin the assessment. Validates assessment accessibility and attempt limits.
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
 *             properties:
 *               assessment:
 *                 type: string
 *                 description: Assessment ID
 *               attemptNumber:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Attempt number for assessments with multiple attempts
 *     responses:
 *       201:
 *         description: Assessment response started successfully
 *       400:
 *         description: Invalid request or assessment not accessible
 *       409:
 *         description: Maximum attempts reached or assessment already in progress
 */
router.post('/',
  authorize('candidate'),
  [
    body('assessment').isMongoId().withMessage('Invalid assessment ID'),
    body('attemptNumber').optional().isInt({ min: 1 }).withMessage('Attempt number must be at least 1'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { assessment: assessmentId, attemptNumber = 1 } = req.body;
    const organizationId = req.user.organization;
    const candidateId = req.user.id;

    // Validate assessment exists and is accessible
    const assessment = await Assessment.findOne({
      _id: assessmentId,
      organization: organizationId,
      status: { $in: ['active', 'published'] }
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found or not available'
      });
    }

    // Check if candidate has access to this assessment
    if (!assessment.canBeAccessedBy(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this assessment'
      });
    }

    // Check attempt limits
    const existingResponses = await AssessmentResponse.find({
      assessment: assessmentId,
      candidate: candidateId,
      organization: organizationId
    });

    const maxAttempts = assessment.settings?.attempts || 1;
    if (existingResponses.length >= maxAttempts) {
      return res.status(409).json({
        success: false,
        message: `Maximum attempts (${maxAttempts}) reached for this assessment`
      });
    }

    // Check if there's an existing in-progress response
    const inProgressResponse = existingResponses.find(r => 
      r.status === 'in-progress'
    );

    if (inProgressResponse) {
      return res.status(409).json({
        success: false,
        message: 'You have an assessment in progress. Please complete it first.',
        data: {
          existingResponseId: inProgressResponse._id
        }
      });
    }

    // Create new response
    const response = new AssessmentResponse({
      assessment: assessmentId,
      candidate: candidateId,
      organization: organizationId,
      attempt: {
        number: attemptNumber,
        maxAttempts
      },
      status: 'in-progress',
      timeLimit: assessment.settings?.duration ? assessment.settings.duration * 60 : null, // Convert to seconds
      startedAt: new Date()
    });

    await response.startAttempt();
    await response.populate('assessment', 'title description settings totalPoints');

    res.status(201).json({
      success: true,
      message: 'Assessment started successfully',
      data: {
        response: response.toJSON(),
        assessment: {
          title: assessment.title,
          description: assessment.description,
          totalPoints: assessment.totalPoints,
          settings: assessment.settings
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}/submit-answer:
 *   post:
 *     summary: Submit answer for a question
 *     description: Submit or update an answer for a specific question in an assessment response.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment Response ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - questionIndex
 *               - questionType
 *               - answer
 *             properties:
 *               questionId:
 *                 type: string
 *               questionIndex:
 *                 type: integer
 *                 minimum: 0
 *               questionType:
 *                 type: string
 *                 enum: [multiple-choice, single-choice, true-false, short-answer, essay, code, file-upload]
 *               answer:
 *                 type: mixed
 *               selectedOptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     optionId:
 *                       type: string
 *                     text:
 *                       type: string
 *               files:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/FileAttachment'
 *               timeSpent:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *     responses:
 *       200:
 *         description: Answer submitted successfully
 *       404:
 *         description: Response not found
 *       403:
 *         description: Access denied or response not in progress
 */
router.post('/:id/submit-answer',
  authorize('candidate'),
  [
    commonValidators.objectId('id'),
    body('questionId').isMongoId().withMessage('Invalid question ID'),
    body('questionIndex').isInt({ min: 0 }).withMessage('Question index must be at least 0'),
    body('questionType').isIn(['multiple-choice', 'single-choice', 'true-false', 'short-answer', 'essay', 'code', 'file-upload']).withMessage('Invalid question type'),
    body('timeSpent').optional().isFloat({ min: 0 }).withMessage('Time spent must be a positive number'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const {
      questionId,
      questionIndex,
      questionType,
      answer,
      selectedOptions = [],
      files = [],
      timeSpent = 0
    } = req.body;

    const response = await AssessmentResponse.findOne({
      _id: id,
      organization: organizationId,
      candidate: req.user.id
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    // Validate response status
    if (response.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit answer - assessment is not in progress'
      });
    }

    // Validate time limit
    if (response.isTimedOut) {
      response.status = 'expired';
      await response.save();
      
      return res.status(400).json({
        success: false,
        message: 'Assessment time has expired'
      });
    }

    // Get question details for validation
    const assessment = await Assessment.findById(response.assessment);
    const question = assessment.questions.id(questionId);
    
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID'
      });
    }

    // Submit answer
    await response.submitAnswer(questionId, {
      questionIndex,
      questionType,
      answer,
      selectedOptions,
      files,
      timeSpent,
      maxPoints: question.points,
      metadata: {
        startedAt: new Date(Date.now() - (timeSpent * 1000))
      }
    });

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        responseId: response._id,
        questionId,
        completionPercentage: response.completionPercentage,
        timeRemaining: response.timeRemaining
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}/submit:
 *   post:
 *     summary: Submit completed assessment
 *     description: Finalize and submit a completed assessment response for evaluation.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment Response ID
 *     responses:
 *       200:
 *         description: Assessment submitted successfully
 *       404:
 *         description: Response not found
 *       400:
 *         description: Invalid submission (already submitted, not in progress, etc.)
 */
router.post('/:id/submit',
  authorize('candidate'),
  [commonValidators.objectId('id'), handleValidationErrors],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const response = await AssessmentResponse.findOne({
      _id: id,
      organization: organizationId,
      candidate: req.user.id
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    // Validate response can be submitted
    if (response.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: `Assessment response is already ${response.status}`
      });
    }

    // Calculate score and update status
    await response.calculateScore();
    response.status = 'submitted';
    response.submittedAt = new Date();
    await response.save();

    await response.populate('assessment', 'title category passingScore');

    res.json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        response: response.toJSON(),
        score: {
          obtained: response.score,
          total: response.totalPoints,
          percentage: response.percentage,
          passed: response.passed
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}/review:
 *   post:
 *     summary: Start review of assessment response
 *     description: Mark an assessment response as under review and assign a reviewer.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment Response ID
 *     responses:
 *       200:
 *         description: Review started successfully
 *       404:
 *         description: Response not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/review',
  authorize('org_admin', 'manager', 'assessor'),
  [commonValidators.objectId('id'), handleValidationErrors],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const response = await AssessmentResponse.findOne({
      _id: id,
      organization: organizationId
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    // Start review
    await response.startReview(req.user.id);

    res.json({
      success: true,
      message: 'Assessment review started',
      data: {
        response: response.toJSON()
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}/evaluate:
 *   put:
 *     summary: Evaluate and grade assessment response
 *     description: Provide evaluation, feedback, and scoring for an assessment response. Supports manual grading overrides.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment Response ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     pointsAwarded:
 *                       type: number
 *                       minimum: 0
 *                     feedback:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *               overallFeedback:
 *                 $ref: '#/components/schemas/Feedback'
 *               finalScore:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [completed, needs-clarification]
 *                 default: completed
 *     responses:
 *       200:
 *         description: Assessment evaluated successfully
 *       404:
 *         description: Response not found
 */
router.put('/:id/evaluate',
  authorize('org_admin', 'manager', 'assessor'),
  [
    commonValidators.objectId('id'),
    body('status').optional().isIn(['completed', 'needs-clarification']).withMessage('Invalid status'),
    body('finalScore').optional().isFloat({ min: 0 }).withMessage('Final score must be a positive number'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;
    const {
      answers = [],
      overallFeedback,
      finalScore,
      status = 'completed'
    } = req.body;

    const response = await AssessmentResponse.findOne({
      _id: id,
      organization: organizationId
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    // Apply manual grading overrides
    for (const answerData of answers) {
      const answer = response.answers.id(answerData.questionId);
      if (answer && answerData.pointsAwarded !== undefined) {
        answer.manualOverride = {
          points: answerData.pointsAwarded,
          reason: answerData.feedback || 'Manual grading',
          overriddenBy: req.user.id,
          overriddenAt: new Date()
        };
        answer.pointsAwarded = answerData.pointsAwarded;
        
        if (answerData.isCorrect !== undefined) {
          answer.isCorrect = answerData.isCorrect;
        }
      }
    }

    // Apply overall feedback
    if (overallFeedback) {
      response.feedback = overallFeedback;
    }

    // Apply final score override
    if (finalScore !== undefined) {
      response.score = finalScore;
      if (response.totalPoints > 0) {
        response.percentage = Math.round((finalScore / response.totalPoints) * 100);
      }
    }

    // Recalculate if no final score override
    if (finalScore === undefined) {
      await response.calculateScore();
    }

    // Update status
    response.status = status;
    response.reviewedBy = req.user.id;
    response.reviewedAt = new Date();

    await response.save();
    await response.populate('candidate', 'name email');

    res.json({
      success: true,
      message: 'Assessment evaluated successfully',
      data: {
        response: response.toJSON()
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/assessment-responses/{id}:
 *   delete:
 *     summary: Delete assessment response
 *     description: Permanently delete an assessment response. Restricted to organization admins.
 *     tags: [Assessment Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment Response ID
 *     responses:
 *       200:
 *         description: Response deleted successfully
 *       404:
 *         description: Response not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id',
  authorize('org_admin'),
  [commonValidators.objectId('id'), handleValidationErrors],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user.organization;

    const response = await AssessmentResponse.findOneAndDelete({
      _id: id,
      organization: organizationId
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Assessment response not found'
      });
    }

    res.json({
      success: true,
      message: 'Assessment response deleted successfully'
    });
  })
);

export default router;
