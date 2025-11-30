import express from 'express';
import Assessment from '../models/Assessment.js';
import Organization from '../models/Organization.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Assessments
 *   description: Multitenant assessment management endpoints
 */

// Middleware to validate organization access
const validateOrganizationAccess = asyncHandler(async (req, res, next) => {
  // Get organization from query, body, or params
  let organizationId = req.query.organization || req.body.organization || req.params.organization;
  
  // If no organization specified, use user's default organization
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
  
  // Check if user belongs to this organization
  const userOrganization = req.user.organizations.find(
    org => org.organization.toString() === organizationId.toString()
  );
  
  if (!userOrganization && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this organization'
    });
  }
  
  req.organization = organization;
  req.userOrganization = userOrganization;
  next();
});

/**
 * @swagger
 * /api/v1/assessments:
 *   get:
 *     summary: Get assessments with multitenant isolation
 *     description: Retrieve assessments for specific organization with pagination and filtering
 *     tags: [Assessments]
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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of assessments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by tags
 *     responses:
 *       200:
 *         description: Assessments retrieved successfully
 */
router.get('/', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    search, 
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build multitenant filter
  const filter = {
    organization: req.organization._id
  };
  
  // Status filter
  if (status) filter.status = status;
  
  // Search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Tags filter
  if (tags) {
    const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
    filter.tags = { $in: tagsArray };
  }
  
  // Role-based access control
  const userRoleInOrg = req.userOrganization?.role;
  
  // Candidates can only see active assessments assigned to them
  if (userRoleInOrg === 'candidate') {
    filter.status = 'active';
    filter._id = { $in: req.user.assignedAssessments || [] };
  }
  
  // Assessors can only see assessments they created or have access to
  if (userRoleInOrg === 'assessor') {
    filter.$or = [
      { createdBy: req.user._id },
      { assessors: req.user._id }
    ];
  }
  
  // Team members can only see assessments shared with their team
  if (userRoleInOrg === 'team_member') {
    filter.$or = [
      { visibility: 'organization' },
      { visibility: 'team', teams: { $in: req.userOrganization.teams || [] } },
      { createdBy: req.user._id }
    ];
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .populate('createdBy', 'name email avatar')
      .populate('organization', 'name slug logo')
      .populate('teams', 'name description')
      .populate('assessors', 'name email avatar')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Assessment.countDocuments(filter)
  ]);
  
  // Add permissions for each assessment based on user role
  const assessmentsWithPermissions = assessments.map(assessment => ({
    ...assessment,
    permissions: getAssessmentPermissions(assessment, req.user, userRoleInOrg)
  }));
  
  res.json({
    success: true,
    data: assessmentsWithPermissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    organization: {
      _id: req.organization._id,
      name: req.organization.name,
      slug: req.organization.slug
    }
  });
}));

/**
 * @swagger
 * /api/v1/assessments/{id}:
 *   get:
 *     summary: Get assessment by ID with multitenant isolation
 *     tags: [Assessments]
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
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Assessment retrieved successfully
 */
router.get('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    organization: req.organization._id
  })
    .populate('createdBy', 'name email avatar')
    .populate('organization', 'name slug logo')
    .populate('teams', 'name description')
    .populate('assessors', 'name email avatar')
    .populate('candidates.user', 'name email avatar');
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found in this organization'
    });
  }
  
  // Check assessment-specific permissions
  const userRoleInOrg = req.userOrganization?.role;
  if (!hasAssessmentAccess(assessment, req.user, userRoleInOrg)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this assessment'
    });
  }
  
  const assessmentWithPermissions = {
    ...assessment.toObject(),
    permissions: getAssessmentPermissions(assessment, req.user, userRoleInOrg)
  };
  
  res.json({
    success: true,
    data: assessmentWithPermissions
  });
}));

/**
 * @swagger
 * /api/v1/assessments:
 *   post:
 *     summary: Create assessment in organization
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
 *               - organization
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               organization:
 *                 type: string
 *                 description: Organization ID
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
 *               visibility:
 *                 type: string
 *                 enum: [private, team, organization]
 *                 default: private
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Team IDs that can access this assessment
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowRetakes:
 *                     type: boolean
 *                   shuffleQuestions:
 *                     type: boolean
 *                   showResults:
 *                     type: boolean
 *                   passingScore:
 *                     type: number
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post('/', validateOrganizationAccess, authorizeRoles('admin', 'assessor', 'team_lead'), asyncHandler(async (req, res) => {
  const userRoleInOrg = req.userOrganization?.role;
  
  // Team leads can only create assessments for their teams
  if (userRoleInOrg === 'team_lead') {
    if (!req.body.teams || req.body.teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Team leads must assign assessments to teams'
      });
    }
    
    // Verify teams belong to user's organization
    const userTeams = req.userOrganization.teams || [];
    const invalidTeams = req.body.teams.filter(teamId => 
      !userTeams.includes(teamId.toString())
    );
    
    if (invalidTeams.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to assign to these teams'
      });
    }
    
    req.body.visibility = 'team';
  }
  
  const assessment = new Assessment({
    ...req.body,
    organization: req.organization._id,
    createdBy: req.user._id
  });
  
  await assessment.save();
  await assessment.populate('createdBy', 'name email avatar');
  await assessment.populate('organization', 'name slug logo');
  await assessment.populate('teams', 'name description');
  
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
 *     summary: Update assessment with multitenant isolation
 *     tags: [Assessments]
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
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment updated successfully
 */
router.put('/:id', validateOrganizationAccess, authorizeRoles('admin', 'assessor', 'team_lead'), asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    organization: req.organization._id
  });
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found in this organization'
    });
  }
  
  const userRoleInOrg = req.userOrganization?.role;
  
  // Check update permissions
  if (!canUpdateAssessment(assessment, req.user, userRoleInOrg)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to update this assessment'
    });
  }
  
  // Team leads can only update assessments in their teams
  if (userRoleInOrg === 'team_lead') {
    const userTeams = req.userOrganization.teams || [];
    const assessmentTeams = assessment.teams.map(team => team.toString());
    const hasTeamAccess = assessmentTeams.some(teamId => userTeams.includes(teamId));
    
    if (!hasTeamAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update this assessment'
      });
    }
    
    // Team leads cannot change organization or createdBy
    delete req.body.organization;
    delete req.body.createdBy;
  }
  
  // Assessors can only update their own assessments
  if (userRoleInOrg === 'assessor' && assessment.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to update this assessment'
    });
  }
  
  const updatedAssessment = await Assessment.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'name email avatar')
    .populate('organization', 'name slug logo')
    .populate('teams', 'name description')
    .populate('assessors', 'name email avatar');
  
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
 *     summary: Delete assessment with multitenant isolation
 *     tags: [Assessments]
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
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment deleted successfully
 */
router.delete('/:id', validateOrganizationAccess, authorizeRoles('admin', 'assessor', 'team_lead'), asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    organization: req.organization._id
  });
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found in this organization'
    });
  }
  
  const userRoleInOrg = req.userOrganization?.role;
  
  // Check delete permissions
  if (!canDeleteAssessment(assessment, req.user, userRoleInOrg)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to delete this assessment'
    });
  }
  
  // Team leads can only delete assessments in their teams
  if (userRoleInOrg === 'team_lead') {
    const userTeams = req.userOrganization.teams || [];
    const assessmentTeams = assessment.teams.map(team => team.toString());
    const hasTeamAccess = assessmentTeams.some(teamId => userTeams.includes(teamId));
    
    if (!hasTeamAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to delete this assessment'
      });
    }
  }
  
  // Assessors can only delete their own assessments
  if (userRoleInOrg === 'assessor' && assessment.createdBy.toString() !== req.user._id.toString()) {
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

/**
 * @swagger
 * /api/v1/assessments/{id}/assign:
 *   post:
 *     summary: Assign assessment to candidates
 *     tags: [Assessments]
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
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - candidateIds
 *             properties:
 *               candidateIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               instructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assessment assigned successfully
 */
router.post('/:id/assign', validateOrganizationAccess, authorizeRoles('admin', 'assessor', 'team_lead'), asyncHandler(async (req, res) => {
  const assessment = await Assessment.findOne({
    _id: req.params.id,
    organization: req.organization._id
  });
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'Assessment not found in this organization'
    });
  }
  
  // Check assignment permissions
  const userRoleInOrg = req.userOrganization?.role;
  if (!canAssignAssessment(assessment, req.user, userRoleInOrg)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to assign this assessment'
    });
  }
  
  const { candidateIds, dueDate, instructions } = req.body;
  
  // Add candidates to assessment
  assessment.candidates.push(...candidateIds.map(candidateId => ({
    user: candidateId,
    assignedBy: req.user._id,
    dueDate: dueDate ? new Date(dueDate) : null,
    instructions: instructions || ''
  })));
  
  await assessment.save();
  
  res.json({
    success: true,
    message: 'Assessment assigned to candidates successfully',
    data: {
      assignedCount: candidateIds.length
    }
  });
}));

// Helper functions for permission checks
function hasAssessmentAccess(assessment, user, userRoleInOrg) {
  if (user.role === 'superadmin') return true;
  
  switch (userRoleInOrg) {
    case 'admin':
      return true;
      
    case 'team_lead':
      const userTeams = user.organizations?.find(org => 
        org.organization.toString() === assessment.organization.toString()
      )?.teams || [];
      const assessmentTeams = assessment.teams.map(team => team.toString());
      return assessmentTeams.some(teamId => userTeams.includes(teamId));
      
    case 'assessor':
      return assessment.createdBy.toString() === user._id.toString() || 
             assessment.assessors.some(assessor => assessor.toString() === user._id.toString());
      
    case 'team_member':
      return assessment.visibility === 'organization' ||
             (assessment.visibility === 'team' && 
              assessment.teams.some(team => 
                user.organizations?.find(org => 
                  org.organization.toString() === assessment.organization.toString()
                )?.teams?.includes(team.toString())
              ));
      
    case 'candidate':
      return assessment.status === 'active' && 
             assessment.candidates.some(candidate => 
               candidate.user.toString() === user._id.toString()
             );
      
    default:
      return false;
  }
}

function getAssessmentPermissions(assessment, user, userRoleInOrg) {
  const permissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canTake: false
  };
  
  if (user.role === 'superadmin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canTake: false
    };
  }
  
  const hasAccess = hasAssessmentAccess(assessment, user, userRoleInOrg);
  if (!hasAccess) return permissions;
  
  permissions.canView = true;
  
  switch (userRoleInOrg) {
    case 'admin':
      permissions.canEdit = true;
      permissions.canDelete = true;
      permissions.canAssign = true;
      break;
      
    case 'team_lead':
      const userTeams = user.organizations?.find(org => 
        org.organization.toString() === assessment.organization.toString()
      )?.teams || [];
      const assessmentTeams = assessment.teams.map(team => team.toString());
      const hasTeamAccess = assessmentTeams.some(teamId => userTeams.includes(teamId));
      
      permissions.canEdit = hasTeamAccess;
      permissions.canDelete = hasTeamAccess;
      permissions.canAssign = hasTeamAccess;
      break;
      
    case 'assessor':
      const isCreator = assessment.createdBy.toString() === user._id.toString();
      const isAssessor = assessment.assessors.some(assessor => assessor.toString() === user._id.toString());
      
      permissions.canEdit = isCreator;
      permissions.canDelete = isCreator;
      permissions.canAssign = isCreator || isAssessor;
      break;
      
    case 'candidate':
      permissions.canTake = assessment.status === 'active' && 
                           assessment.candidates.some(candidate => 
                             candidate.user.toString() === user._id.toString()
                           );
      break;
  }
  
  return permissions;
}

function canUpdateAssessment(assessment, user, userRoleInOrg) {
  if (user.role === 'superadmin') return true;
  if (userRoleInOrg === 'admin') return true;
  
  if (userRoleInOrg === 'team_lead') {
    const userTeams = user.organizations?.find(org => 
      org.organization.toString() === assessment.organization.toString()
    )?.teams || [];
    const assessmentTeams = assessment.teams.map(team => team.toString());
    return assessmentTeams.some(teamId => userTeams.includes(teamId));
  }
  
  if (userRoleInOrg === 'assessor') {
    return assessment.createdBy.toString() === user._id.toString();
  }
  
  return false;
}

function canDeleteAssessment(assessment, user, userRoleInOrg) {
  return canUpdateAssessment(assessment, user, userRoleInOrg);
}

function canAssignAssessment(assessment, user, userRoleInOrg) {
  if (user.role === 'superadmin') return true;
  if (userRoleInOrg === 'admin') return true;
  
  if (userRoleInOrg === 'team_lead') {
    const userTeams = user.organizations?.find(org => 
      org.organization.toString() === assessment.organization.toString()
    )?.teams || [];
    const assessmentTeams = assessment.teams.map(team => team.toString());
    return assessmentTeams.some(teamId => userTeams.includes(teamId));
  }
  
  if (userRoleInOrg === 'assessor') {
    return assessment.createdBy.toString() === user._id.toString() || 
           assessment.assessors.some(assessor => assessor.toString() === user._id.toString());
  }
  
  return false;
}

export default router;
