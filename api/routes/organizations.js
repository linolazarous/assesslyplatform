// api/routes/organizations.js
import express from 'express';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Invitation from '../models/Invitation.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Multitenant organization management endpoints
 */

// Middleware to validate organization access
const validateOrganizationAccess = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.id || req.body.organization;
  
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
  }
  
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Super admin has access to all organizations
  if (req.user.role === 'superadmin') {
    req.organization = organization;
    return next();
  }
  
  // Check if user belongs to this organization
  const userOrganization = req.user.organizations.find(
    org => org.organization.toString() === organizationId.toString()
  );
  
  if (!userOrganization) {
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
 * /api/v1/organizations:
 *   get:
 *     summary: Get user's organizations with multitenant isolation
 *     description: Retrieve organizations the user belongs to with pagination
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in organization name or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, inactive]
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search,
    status = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build filter based on user role and organizations
  let filter = {};
  
  // Super admin can see all organizations
  if (req.user.role !== 'superadmin') {
    const userOrganizationIds = req.user.organizations.map(org => org.organization);
    filter = { _id: { $in: userOrganizationIds } };
  }
  
  // Additional filters
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [organizations, total, stats] = await Promise.all([
    Organization.find(filter)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar role')
      .populate('teams', 'name description')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Organization.countDocuments(filter),
    getOrganizationStats(req.user)
  ]);
  
  // Add user's role in each organization
  const organizationsWithUserRole = organizations.map(org => {
    const userMembership = req.user.organizations.find(
      userOrg => userOrg.organization.toString() === org._id.toString()
    );
    
    return {
      ...org,
      userRole: userMembership?.role || null,
      userPermissions: getUserOrganizationPermissions(org, req.user, userMembership?.role)
    };
  });
  
  res.json({
    success: true,
    data: organizationsWithUserRole,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}:
 *   get:
 *     summary: Get organization by ID with multitenant isolation
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
router.get('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar role joinedAt')
    .populate('teams', 'name description memberCount')
    .populate('subscription', 'plan status currentPeriodEnd');
  
  const organizationWithPermissions = {
    ...organization.toObject(),
    userRole: req.userOrganization?.role,
    permissions: getUserOrganizationPermissions(organization, req.user, req.userOrganization?.role)
  };
  
  res.json({
    success: true,
    data: organizationWithPermissions
  });
}));

/**
 * @swagger
 * /api/v1/organizations:
 *   post:
 *     summary: Create organization with multitenant setup
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
 *               industry:
 *                 type: string
 *               size:
 *                 type: string
 *                 enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowPublicSignup:
 *                     type: boolean
 *                   requireEmailVerification:
 *                     type: boolean
 *                   defaultUserRole:
 *                     type: string
 *                     enum: [team_member, assessor, candidate]
 *     responses:
 *       201:
 *         description: Organization created successfully
 */
router.post('/', authorizeRoles('superadmin', 'admin'), asyncHandler(async (req, res) => {
  const { settings = {}, ...organizationData } = req.body;
  
  // Generate unique slug
  const baseSlug = organizationData.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  // Ensure slug is unique
  while (await Organization.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  const organization = new Organization({
    ...organizationData,
    slug,
    owner: req.user._id,
    settings: {
      allowPublicSignup: false,
      requireEmailVerification: true,
      defaultUserRole: 'team_member',
      ...settings
    },
    // Add creator as admin member
    members: [{
      user: req.user._id,
      role: 'admin',
      joinedAt: new Date(),
      addedBy: req.user._id
    }]
  });
  
  await organization.save();
  
  // Update user's organizations array
  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      organizations: {
        organization: organization._id,
        role: 'admin',
        joinedAt: new Date()
      }
    }
  });
  
  await organization.populate('owner', 'name email avatar');
  await organization.populate('members.user', 'name email avatar role');
  
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
 *     summary: Update organization with multitenant permissions
 *     tags: [Organizations]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               website:
 *                 type: string
 *               logo:
 *                 type: string
 *               industry:
 *                 type: string
 *               size:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Organization updated successfully
 */
router.put('/:id', validateOrganizationAccess, asyncHandler(async (req, res) => {
  // Check update permissions
  if (!canUpdateOrganization(req.organization, req.user, req.userOrganization?.role)) {
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
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar role')
    .populate('teams', 'name description');
  
  res.json({
    success: true,
    data: updatedOrganization,
    message: 'Organization updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}/members:
 *   get:
 *     summary: Get organization members
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 */
router.get('/:id/members', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  
  const organization = await Organization.findById(req.params.id)
    .populate({
      path: 'members.user',
      select: 'name email avatar role isActive lastLoginAt',
      match: search ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      } : {}
    });
  
  // Filter by role if specified
  let members = organization.members;
  if (role) {
    members = members.filter(member => member.role === role);
  }
  
  // Remove null users (from search filtering)
  members = members.filter(member => member.user);
  
  res.json({
    success: true,
    data: members,
    total: members.length
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}/members:
 *   post:
 *     summary: Add member to organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, team_lead, assessor, team_member, candidate]
 *               teams:
 *                 type: array
 *                 items:
 *                   type: string
 *               sendInvitation:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Member added/invited successfully
 */
router.post('/:id/members', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { email, role, teams = [], sendInvitation = true } = req.body;
  
  // Check if user has permission to add members with this role
  if (!canManageMembersWithRole(req.userOrganization?.role, role)) {
    return res.status(403).json({
      success: false,
      message: `You cannot add members with role: ${role}`
    });
  }
  
  // Find existing user
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  
  if (existingUser) {
    // Check if user is already a member
    const alreadyMember = req.organization.members.some(member => 
      member.user.toString() === existingUser._id.toString()
    );
    
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this organization'
      });
    }
    
    // Add user to organization
    req.organization.members.push({
      user: existingUser._id,
      role,
      teams,
      joinedAt: new Date(),
      addedBy: req.user._id
    });
    
    // Update user's organizations array
    existingUser.organizations.push({
      organization: req.organization._id,
      role,
      teams,
      joinedAt: new Date()
    });
    
    await Promise.all([req.organization.save(), existingUser.save()]);
    
    if (sendInvitation) {
      await sendMemberWelcomeEmail(existingUser, req.organization, role, req.user);
    }
    
    return res.json({
      success: true,
      message: 'Member added to organization successfully',
      data: { userId: existingUser._id, existingUser: true }
    });
  } else {
    // Create invitation for new user
    const invitation = new Invitation({
      organization: req.organization._id,
      email: email.toLowerCase(),
      role,
      teams,
      invitedBy: req.user._id,
      token: require('crypto').randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    await invitation.save();
    
    if (sendInvitation) {
      await sendOrganizationInvitation(email, req.organization, role, req.user, invitation.token);
    }
    
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: { email, existingUser: false, invitationId: invitation._id }
    });
  }
}));

/**
 * @swagger
 * /api/v1/organizations/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/:id/members/:userId', validateOrganizationAccess, authorizeRoles('admin', 'team_lead'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Cannot remove yourself
  if (userId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove yourself from organization'
    });
  }
  
  // Check if target user exists and get their role
  const targetMember = req.organization.members.find(member => 
    member.user.toString() === userId
  );
  
  if (!targetMember) {
    return res.status(404).json({
      success: false,
      message: 'Member not found in this organization'
    });
  }
  
  // Check permission to remove this member
  if (!canRemoveMember(req.userOrganization?.role, targetMember.role)) {
    return res.status(403).json({
      success: false,
      message: `You cannot remove members with role: ${targetMember.role}`
    });
  }
  
  // Remove from organization
  req.organization.members = req.organization.members.filter(
    member => member.user.toString() !== userId
  );
  
  // Remove from user's organizations
  await User.findByIdAndUpdate(userId, {
    $pull: {
      organizations: { organization: req.organization._id }
    }
  });
  
  await req.organization.save();
  
  res.json({
    success: true,
    message: 'Member removed from organization successfully'
  });
}));

/**
 * @swagger
 * /api/v1/organizations/{id}/stats:
 *   get:
 *     summary: Get organization statistics
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
 *         description: Statistics retrieved successfully
 */
router.get('/:id/stats', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const stats = await getDetailedOrganizationStats(req.organization._id);
  
  res.json({
    success: true,
    data: stats
  });
}));

// Helper functions
async function getOrganizationStats(user) {
  if (user.role === 'superadmin') {
    return await Organization.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          bySize: {
            $push: {
              size: '$size',
              count: 1
            }
          }
        }
      }
    ]).then(result => result[0] || { total: 0, active: 0, suspended: 0, bySize: [] });
  }
  
  return {
    total: user.organizations.length,
    active: user.organizations.length, // Assuming all are active for now
    suspended: 0
  };
}

async function getDetailedOrganizationStats(organizationId) {
  const stats = await Organization.aggregate([
    { $match: { _id: organizationId } },
    {
      $lookup: {
        from: 'users',
        localField: 'members.user',
        foreignField: '_id',
        as: 'memberDetails'
      }
    },
    {
      $project: {
        totalMembers: { $size: '$members' },
        membersByRole: {
          $arrayToObject: {
            $map: {
              input: '$members',
              as: 'member',
              in: {
                k: '$$member.role',
                v: { $sum: 1 }
              }
            }
          }
        },
        activeMembers: {
          $size: {
            $filter: {
              input: '$memberDetails',
              as: 'user',
              cond: { $eq: ['$$user.isActive', true] }
            }
          }
        },
        teamsCount: { $size: '$teams' },
        createdAt: 1
      }
    }
  ]);
  
  return stats[0] || {
    totalMembers: 0,
    membersByRole: {},
    activeMembers: 0,
    teamsCount: 0
  };
}

function getUserOrganizationPermissions(organization, user, userRole) {
  const permissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canManageTeams: false,
    canManageSettings: false
  };
  
  if (user.role === 'superadmin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
      canManageTeams: true,
      canManageSettings: true
    };
  }
  
  const isOwner = organization.owner.toString() === user._id.toString();
  const isMember = organization.members.some(member => 
    member.user._id?.toString() === user._id.toString()
  );
  
  if (!isMember && !isOwner) return permissions;
  
  permissions.canView = true;
  
  switch (userRole) {
    case 'admin':
      permissions.canEdit = true;
      permissions.canDelete = isOwner;
      permissions.canManageMembers = true;
      permissions.canManageTeams = true;
      permissions.canManageSettings = true;
      break;
      
    case 'team_lead':
      permissions.canEdit = true;
      permissions.canManageMembers = true;
      permissions.canManageTeams = true;
      break;
      
    case 'assessor':
      permissions.canEdit = true;
      break;
  }
  
  return permissions;
}

function canUpdateOrganization(organization, user, userRole) {
  if (user.role === 'superadmin') return true;
  if (userRole === 'admin') return true;
  if (organization.owner.toString() === user._id.toString()) return true;
  return false;
}

function canManageMembersWithRole(userRole, targetRole) {
  const roleHierarchy = {
    superadmin: ['admin', 'team_lead', 'assessor', 'team_member', 'candidate'],
    admin: ['team_lead', 'assessor', 'team_member', 'candidate'],
    team_lead: ['assessor', 'team_member', 'candidate'],
    assessor: ['candidate'],
    team_member: [],
    candidate: []
  };
  
  return roleHierarchy[userRole]?.includes(targetRole) || false;
}

function canRemoveMember(userRole, targetRole) {
  // Can only remove members with equal or lower role
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

async function sendMemberWelcomeEmail(user, organization, role, inviter) {
  await sendEmail({
    to: user.email,
    subject: `Welcome to ${organization.name}!`,
    template: 'organization-welcome',
    context: {
      name: user.name,
      organizationName: organization.name,
      role: role,
      inviterName: inviter.name,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
      organizationUrl: `${process.env.FRONTEND_URL}/organizations/${organization._id}`
    }
  });
}

async function sendOrganizationInvitation(email, organization, role, inviter, token) {
  const invitationUrl = `${process.env.FRONTEND_URL}/invitation/accept?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organization.name}`,
    template: 'organization-invitation',
    context: {
      organizationName: organization.name,
      role: role,
      inviterName: inviter.name,
      inviterEmail: inviter.email,
      invitationUrl,
      expiresIn: '7 days'
    }
  });
}

export default router;
