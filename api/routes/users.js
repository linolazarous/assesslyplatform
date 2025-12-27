// api/routes/users.js
import express from 'express';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Team from '../models/Team.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Apply authentication to all user routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated MongoDB ID of the user
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (unique)
 *         password:
 *           type: string
 *           format: password
 *           description: Hashed password (never returned in responses)
 *         role:
 *           type: string
 *           enum: [superadmin, admin, team_lead, assessor, team_member, candidate]
 *           description: User role in the system
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether the user's email is verified
 *         avatar:
 *           type: string
 *           description: URL to user's avatar image
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         organizations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               organization:
 *                 type: string
 *               role:
 *                 type: string
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: User last update timestamp
 *       example:
 *         _id: 507f1f77bcf86cd799439011
 *         name: John Doe
 *         email: john.doe@example.com
 *         role: candidate
 *         isActive: true
 *         isEmailVerified: true
 *         avatar: "https://example.com/avatar.jpg"
 *         lastLoginAt: "2025-01-15T10:30:00.000Z"
 *         organizations: []
 *         createdAt: "2025-01-15T10:30:00.000Z"
 *         updatedAt: "2025-01-15T10:30:00.000Z"
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Multitenant user management endpoints
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
 * /api/v1/users:
 *   get:
 *     summary: Get users with multitenant isolation
 *     description: Retrieve users based on organization context and user permissions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID to filter users
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, team_lead, assessor, team_member, candidate]
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name or email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    team,
    search,
    isActive = true,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build multitenant filter
  let userFilter = {};
  
  // Super admin can see all users, others see only organization members
  if (req.user.role !== 'superadmin') {
    // Get all user IDs in this organization
    const organization = await Organization.findById(req.organizationId)
      .populate('members.user', '_id');
    
    const memberIds = organization.members.map(member => member.user._id);
    userFilter._id = { $in: memberIds };
  }
  
  // Additional filters
  if (isActive !== undefined) userFilter.isActive = isActive === 'true';
  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Role filter (within organization context)
  let organizationRoleFilter = {};
  if (role) {
    organizationRoleFilter['organizations.role'] = role;
    organizationRoleFilter['organizations.organization'] = req.organizationId;
  }
  
  // Team filter
  if (team) {
    organizationRoleFilter['organizations.teams'] = team;
    organizationRoleFilter['organizations.organization'] = req.organizationId;
  }
  
  // Combine filters
  const finalFilter = { ...userFilter };
  if (Object.keys(organizationRoleFilter).length > 0) {
    finalFilter.$and = [userFilter, organizationRoleFilter];
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [users, total, stats] = await Promise.all([
    User.find(finalFilter)
      .select('-password')
      .populate({
        path: 'organizations.organization',
        select: 'name slug logo',
        match: { _id: req.organizationId }
      })
      .populate('organizations.teams', 'name description')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(finalFilter),
    getUserStats(req.organizationId, userFilter)
  ]);
  
  // Filter organizations to only show the requested one
  const usersWithFilteredOrgs = users.map(user => ({
    ...user,
    organizations: user.organizations.filter(org => 
      org.organization && org.organization._id.toString() === req.organizationId.toString()
    )
  }));
  
  res.json({
    success: true,
    data: usersWithFilteredOrgs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats,
    organization: {
      id: req.organization._id,
      name: req.organization.name
    }
  });
}));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID with organization context
 *     tags: [Users]
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
 *         description: User retrieved successfully
 */
router.get('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate({
      path: 'organizations.organization',
      select: 'name slug logo'
    })
    .populate('organizations.teams', 'name description');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'superadmin') {
    const isSelf = req.params.id === req.user._id.toString();
    const isInSameOrganization = user.organizations.some(org => 
      org.organization._id.toString() === req.organizationId.toString()
    );
    
    if (!isSelf && !isInSameOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to view this user'
      });
    }
    
    // Non-admin users can only view their own profile
    if (!isSelf && !['admin', 'team_lead'].includes(req.userOrganization?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to view other users'
      });
    }
  }
  
  // Filter organizations if specific organization requested
  if (req.organizationId) {
    user.organizations = user.organizations.filter(org => 
      org.organization._id.toString() === req.organizationId.toString()
    );
  }
  
  res.json({
    success: true,
    data: user
  });
}));

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create user with organization assignment
 *     tags: [Users]
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
 *               - email
 *               - password
 *               - role
 *               - organization
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, team_lead, assessor, team_member, candidate]
 *               organization:
 *                 type: string
 *                 description: Organization ID to assign user to
 *               organizationRole:
 *                 type: string
 *                 enum: [admin, team_lead, assessor, team_member, candidate]
 *                 description: Role within the organization (defaults to main role)
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Team IDs to assign user to
 *               sendWelcomeEmail:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    role, 
    organization: orgId,
    organizationRole,
    teams = [],
    sendWelcomeEmail = true
  } = req.body;
  
  // Check permissions for creating users with this role
  if (!canCreateUserWithRole(req.userOrganization?.role, role)) {
    return res.status(403).json({
      success: false,
      message: `You cannot create users with role: ${role}`
    });
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    // Check if user is already in this organization
    const alreadyInOrganization = existingUser.organizations.some(org => 
      org.organization.toString() === orgId.toString()
    );
    
    if (alreadyInOrganization) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists in this organization'
      });
    }
    
    // Add existing user to organization
    existingUser.organizations.push({
      organization: orgId,
      role: organizationRole || role,
      teams: teams,
      joinedAt: new Date()
    });
    
    await existingUser.save();
    await existingUser.populate({
      path: 'organizations.organization',
      select: 'name slug logo'
    });
    
    if (sendWelcomeEmail) {
      await sendOrganizationWelcomeEmail(existingUser, req.organization, organizationRole || role);
    }
    
    const userResponse = existingUser.toObject();
    delete userResponse.password;
    
    return res.status(200).json({
      success: true,
      data: userResponse,
      message: 'User added to organization successfully'
    });
  }
  
  // Create new user
  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
    organizations: [{
      organization: orgId,
      role: organizationRole || role,
      teams: teams,
      joinedAt: new Date()
    }]
  });
  
  await user.save();
  
  // Add user to organization's members list
  await Organization.findByIdAndUpdate(orgId, {
    $push: {
      members: {
        user: user._id,
        role: organizationRole || role,
        teams: teams,
        joinedAt: new Date(),
        addedBy: req.user._id
      }
    }
  });
  
  if (sendWelcomeEmail) {
    await sendWelcomeEmail(user, req.organization, organizationRole || role);
  }
  
  const userResponse = user.toObject();
  delete userResponse.password;
  
  res.status(201).json({
    success: true,
    data: userResponse,
    message: 'User created successfully'
  });
}));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user with organization context
 *     tags: [Users]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               avatar:
 *                 type: string
 *               organizationRole:
 *                 type: string
 *                 description: Role within the specified organization
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  let { organizationRole, teams, ...userData } = req.body;
  
  // Authorization check
  const isSelf = req.params.id === req.user._id.toString();
  
  if (!isSelf && req.user.role !== 'superadmin') {
    if (!['admin', 'team_lead'].includes(req.userOrganization?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update other users'
      });
    }
    
    // Check if target user is in the same organization
    const targetUser = await User.findById(req.params.id);
    const targetInOrganization = targetUser.organizations.some(org => 
      org.organization.toString() === req.organizationId.toString()
    );
    
    if (!targetInOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update this user'
      });
    }
    
    // Check permission to update role
    if (organizationRole && !canUpdateUserRole(req.userOrganization?.role, organizationRole)) {
      return res.status(403).json({
        success: false,
        message: `You cannot assign role: ${organizationRole}`
      });
    }
  }
  
  // Non-admin users cannot change certain fields
  if (req.user.role !== 'superadmin' && !['admin', 'team_lead'].includes(req.userOrganization?.role)) {
    // Remove restricted fields from userData
    const restrictedFields = ['role', 'isActive'];
    restrictedFields.forEach(field => {
      delete userData[field];
    });
    
    // Don't allow non-admin users to change organizationRole or teams
    organizationRole = undefined;
    teams = undefined;
  }
  
  const updateData = { ...userData };
  
  // Update organization-specific data if provided
  if (organizationRole || teams) {
    const user = await User.findById(req.params.id);
    const orgIndex = user.organizations.findIndex(org => 
      org.organization.toString() === req.organizationId.toString()
    );
    
    if (orgIndex !== -1) {
      if (organizationRole) user.organizations[orgIndex].role = organizationRole;
      if (teams) user.organizations[orgIndex].teams = teams;
      
      await user.save();
    }
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id, 
    updateData, 
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate({
      path: 'organizations.organization',
      select: 'name slug logo'
    })
    .populate('organizations.teams', 'name description');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user,
    message: 'User updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/users/{id}/organizations/{organizationId}:
 *   delete:
 *     summary: Remove user from organization
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User removed from organization successfully
 */
router.delete('/:id/organizations/:organizationId', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { id, organizationId } = req.params;
  
  // Cannot remove yourself
  if (id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove yourself from organization'
    });
  }
  
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if user is in the organization
  const orgMembership = user.organizations.find(org => 
    org.organization.toString() === organizationId.toString()
  );
  
  if (!orgMembership) {
    return res.status(404).json({
      success: false,
      message: 'User is not a member of this organization'
    });
  }
  
  // Check permission to remove this user based on their role
  if (!canRemoveUserFromOrganization(req.userOrganization?.role, orgMembership.role)) {
    return res.status(403).json({
      success: false,
      message: `You cannot remove users with role: ${orgMembership.role}`
    });
  }
  
  // Remove from user's organizations
  user.organizations = user.organizations.filter(org => 
    org.organization.toString() !== organizationId.toString()
  );
  
  // Remove from organization's members
  await Organization.findByIdAndUpdate(organizationId, {
    $pull: {
      members: { user: id }
    }
  });
  
  await user.save();
  
  res.json({
    success: true,
    message: 'User removed from organization successfully'
  });
}));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Deactivate user (Admin only)
 *     tags: [Users]
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
 *         description: User deactivated successfully
 */
router.delete('/:id', authorizeRoles('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, deactivatedAt: new Date() },
    { new: true }
  ).select('-password');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user,
    message: 'User deactivated successfully'
  });
}));

// Helper functions
async function getUserStats(organizationId, baseFilter) {
  const stats = await User.aggregate([
    { $match: baseFilter },
    { $unwind: '$organizations' },
    { $match: { 'organizations.organization': organizationId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        byRole: {
          $push: {
            role: '$organizations.role',
            count: 1
          }
        },
        verified: { $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] } }
      }
    },
    {
      $project: {
        total: 1,
        active: 1,
        verified: 1,
        byRole: {
          $arrayToObject: {
            $map: {
              input: '$byRole',
              as: 'role',
              in: {
                k: '$$role.role',
                v: '$$role.count'
              }
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    active: 0,
    verified: 0,
    byRole: {}
  };
}

function canCreateUserWithRole(userRole, targetRole) {
  const allowedRoles = {
    superadmin: ['admin', 'team_lead', 'assessor', 'team_member', 'candidate'],
    admin: ['team_lead', 'assessor', 'team_member', 'candidate'],
    team_lead: ['assessor', 'team_member', 'candidate'],
    assessor: ['candidate'],
    team_member: [],
    candidate: []
  };
  
  return allowedRoles[userRole]?.includes(targetRole) || false;
}

function canUpdateUserRole(userRole, targetRole) {
  return canCreateUserWithRole(userRole, targetRole);
}

function canRemoveUserFromOrganization(userRole, targetRole) {
  // Can only remove users with equal or lower role
  const roleLevels = {
    superadmin: 5,
    admin: 4,
    team_lead: 3,
    assessor: 2,
    team_member: 1,
    candidate: 0
  };
  
  return roleLevels[userRole] > roleLevels[targetRole];
}

async function sendWelcomeEmail(user, organization, role) {
  await sendEmail({
    to: user.email,
    subject: `Welcome to ${organization.name}!`,
    template: 'user-welcome',
    context: {
      name: user.name,
      organizationName: organization.name,
      role: role,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      supportEmail: 'support@assessly.com'
    }
  });
}

async function sendOrganizationWelcomeEmail(user, organization, role) {
  await sendEmail({
    to: user.email,
    subject: `You've been added to ${organization.name}`,
    template: 'organization-addition',
    context: {
      name: user.name,
      organizationName: organization.name,
      role: role,
      loginUrl: `${process.env.FRONTEND_URL}/login`
    }
  });
}

export default router;
