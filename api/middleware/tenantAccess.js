import { asyncHandler } from './asyncHandler.js';
import Organization from '../models/Organization.js';
import { AuthorizationError, NotFoundError } from './errorHandler.js';

/**
 * Comprehensive multitenant access control middleware
 * Provides organization and team-based isolation for all resources
 */

/**
 * Enhanced tenant access middleware with automatic organization resolution
 */
export const tenantAccess = asyncHandler(async (req, res, next) => {
  const userOrg = req.user.organizationId;
  const requestOrg = req.params.orgId || req.body.organizationId || req.query.organizationId;

  if (!requestOrg) {
    throw new AuthorizationError('organizationId is required for tenant access');
  }

  if (String(userOrg) !== String(requestOrg)) {
    throw new AuthorizationError('Unauthorized: cross-organization access denied');
  }

  next();
});

/**
 * Organization resolution middleware
 * Automatically resolves and validates organization context
 */
export const resolveOrganization = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.organizationId || req.body.organization || req.query.organization;
  
  if (!organizationId) {
    throw new AuthorizationError('Organization context is required');
  }

  // Resolve organization
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new NotFoundError('Organization');
  }

  if (!organization.isActive) {
    throw new AuthorizationError('Organization is inactive');
  }

  // Attach organization to request
  req.organization = organization;
  
  console.log(`🏢 [${req.id}] Organization resolved:`, {
    organization: organization.name,
    organizationId: organization._id,
    user: req.user?.email
  });

  next();
});

/**
 * Team resolution within organization
 */
export const resolveTeam = asyncHandler(async (req, res, next) => {
  const teamId = req.params.teamId || req.body.team || req.query.team;
  
  if (!teamId) {
    throw new AuthorizationError('Team context is required');
  }

  if (!req.organization) {
    throw new AuthorizationError('Organization context is required for team resolution');
  }

  // Resolve team within organization
  const organization = await Organization.findById(req.organization._id)
    .populate('teams');
  
  const team = organization.teams.find(t => t._id.toString() === teamId.toString());
  
  if (!team) {
    throw new NotFoundError('Team');
  }

  if (!team.isActive) {
    throw new AuthorizationError('Team is inactive');
  }

  // Attach team to request
  req.team = team;

  console.log(`👥 [${req.id}] Team resolved:`, {
    team: team.name,
    teamId: team._id,
    organization: organization.name
  });

  next();
});

/**
 * Resource ownership validation within tenant context
 */
export const validateTenantResource = (model, options = {}) => {
  const {
    idParam = 'id',
    organizationField = 'organization',
    teamField = 'team',
    ownerField = 'user'
  } = options;

  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[idParam];
    
    if (!resourceId) {
      throw new AuthorizationError('Resource ID is required');
    }

    // Fetch resource
    const resource = await model.findById(resourceId);
    if (!resource) {
      throw new NotFoundError('Resource');
    }

    // Validate organization context
    if (organizationField && resource[organizationField]) {
      const resourceOrgId = resource[organizationField].toString();
      const requestOrgId = req.organization?._id.toString();

      if (resourceOrgId !== requestOrgId) {
        throw new AuthorizationError('Resource does not belong to this organization');
      }
    }

    // Validate team context if provided
    if (teamField && resource[teamField] && req.team) {
      const resourceTeamId = resource[teamField].toString();
      const requestTeamId = req.team._id.toString();

      if (resourceTeamId !== requestTeamId) {
        throw new AuthorizationError('Resource does not belong to this team');
      }
    }

    // Validate ownership if required
    if (ownerField && resource[ownerField]) {
      const resourceOwnerId = resource[ownerField].toString();
      const userId = req.user._id.toString();

      if (resourceOwnerId !== userId) {
        // Check if user has admin/team_lead role in organization
        if (!req.userOrganization || !['admin', 'team_lead'].includes(req.userOrganization.role)) {
          throw new AuthorizationError('You are not the owner of this resource');
        }
      }
    }

    // Attach resource to request for downstream use
    req.resource = resource;

    console.log(`✅ [${req.id}] Tenant resource validated:`, {
      resource: model.modelName,
      resourceId,
      organization: req.organization?.name,
      team: req.team?.name
    });

    next();
  });
};

/**
 * Subscription-based feature access control
 */
export const requireSubscriptionFeature = (feature) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.organization) {
      throw new AuthorizationError('Organization context required for feature access');
    }

    const subscription = req.organization.subscription;
    if (!subscription || !subscription.isActive) {
      throw new AuthorizationError('Active subscription required for this feature');
    }

    // Check if feature is available in current plan
    const plan = subscription.plan;
    if (!plan || !plan.features.includes(feature)) {
      throw new AuthorizationError(`Feature '${feature}' not available in your current plan`);
    }

    console.log(`✨ [${req.id}] Feature access granted:`, {
      feature,
      organization: req.organization.name,
      plan: plan.name
    });

    next();
  });
};

/**
 * Usage quota validation middleware
 */
export const checkUsageQuota = (resourceType) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.organization) {
      throw new AuthorizationError('Organization context required for quota validation');
    }

    const subscription = req.organization.subscription;
    if (!subscription) {
      throw new AuthorizationError('Subscription required for quota validation');
    }

    const plan = subscription.plan;
    if (!plan || !plan.limits) {
      throw new AuthorizationError('Plan limits not configured');
    }

    // Get current usage
    const currentUsage = await getCurrentUsage(req.organization._id, resourceType);
    const quotaLimit = plan.limits[resourceType];

    if (currentUsage >= quotaLimit) {
      throw new AuthorizationError(
        `Quota exceeded for ${resourceType}. Limit: ${quotaLimit}, Used: ${currentUsage}`
      );
    }

    // Attach usage info for potential logging
    req.usage = {
      resourceType,
      current: currentUsage,
      limit: quotaLimit,
      remaining: quotaLimit - currentUsage
    };

    console.log(`📊 [${req.id}] Usage quota checked:`, req.usage);

    next();
  });
};

/**
 * Cross-organization data sharing middleware
 * Allows controlled access between organizations (for partners, etc.)
 */
export const allowCrossOrganization = (allowedOrganizations = []) => {
  return asyncHandler(async (req, res, next) => {
    const userOrgId = req.user.organizationId?.toString();
    const targetOrgId = req.params.organizationId || req.body.organization;

    if (!targetOrgId) {
      throw new AuthorizationError('Target organization required');
    }

    // Allow access if organizations are the same
    if (userOrgId === targetOrgId.toString()) {
      return next();
    }

    // Check if cross-organization access is allowed
    const isAllowed = allowedOrganizations.includes(targetOrgId.toString());
    if (!isAllowed) {
      throw new AuthorizationError('Cross-organization access not allowed');
    }

    // Verify target organization exists and is active
    const targetOrg = await Organization.findById(targetOrgId);
    if (!targetOrg || !targetOrg.isActive) {
      throw new NotFoundError('Target organization');
    }

    req.targetOrganization = targetOrg;

    console.log(`🌐 [${req.id}] Cross-organization access granted:`, {
      from: userOrgId,
      to: targetOrgId,
      user: req.user.email
    });

    next();
  });
};

// Helper functions

async function getCurrentUsage(organizationId, resourceType) {
  // This would typically query your usage tracking system
  // For now, return a mock value
  const usageMap = {
    assessments: await mongoose.model('Assessment').countDocuments({ organization: organizationId }),
    users: await mongoose.model('User').countDocuments({ 'organizations.organization': organizationId }),
    storage: 0 // Would calculate actual storage usage
  };

  return usageMap[resourceType] || 0;
}

/**
 * Tenant context attachment middleware
 * Ensures all requests have proper tenant context
 */
export const attachTenantContext = asyncHandler(async (req, res, next) => {
  // If user is authenticated, ensure they have organization context
  if (req.user && req.user.organizations.length > 0) {
    // Use first organization as default if not specified
    if (!req.organization && !req.query.organization && !req.body.organization) {
      const defaultOrg = req.user.organizations[0]?.organization;
      if (defaultOrg) {
        req.organization = await Organization.findById(defaultOrg._id);
      }
    }
  }

  // Add tenant context to response locals
  res.locals.tenant = {
    organization: req.organization?._id,
    team: req.team?._id,
    user: req.user?._id
  };

  next();
});

export default {
  tenantAccess,
  resolveOrganization,
  resolveTeam,
  validateTenantResource,
  requireSubscriptionFeature,
  checkUsageQuota,
  allowCrossOrganization,
  attachTenantContext
};
