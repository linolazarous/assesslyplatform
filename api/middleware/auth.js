import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import RefreshToken from "../models/RefreshToken.js";
import { asyncHandler } from "./asyncHandler.js";

// Enhanced configuration with environment validation
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'dev-secret-change-in-production';
  })(),
  refreshSecret: process.env.REFRESH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REFRESH_SECRET is required in production');
    }
    return 'dev-refresh-secret-change-in-production';
  })(),
  accessTokenExpiry: process.env.JWT_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_EXPIRY || "7d",
  issuer: 'assessly-platform',
  algorithms: ['HS256']
};

// Enhanced token blacklist with TTL
class TokenBlacklist {
  constructor() {
    this.blacklist = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
  }

  add(token, expiresAt) {
    this.blacklist.set(token, {
      expiresAt: expiresAt || Date.now() + 24 * 60 * 60 * 1000, // Default 24 hours
      addedAt: Date.now()
    });
  }

  has(token) {
    const entry = this.blacklist.get(token);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.blacklist.delete(token);
      return false;
    }
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [token, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(token);
      }
    }
  }

  size() {
    return this.blacklist.size;
  }
}

const tokenBlacklist = new TokenBlacklist();

/**
 * Enhanced security headers middleware with CSP
 */
export const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.assessly.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));

  // Custom headers for API
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Content-Security-Policy', "default-src 'self'");
  
  next();
};

/**
 * Enhanced JWT token generator with multitenant support
 */
export const generateToken = (payload, options = {}) => {
  const {
    expiresIn = JWT_CONFIG.accessTokenExpiry,
    secret = JWT_CONFIG.secret,
    issuer = JWT_CONFIG.issuer,
    subject = 'access'
  } = options;

  // Add multitenant context to payload
  const enhancedPayload = {
    ...payload,
    iss: issuer,
    sub: subject,
    iat: Math.floor(Date.now() / 1000),
    context: {
      environment: process.env.NODE_ENV,
      version: process.env.API_VERSION
    }
  };

  return jwt.sign(enhancedPayload, secret, {
    expiresIn,
    issuer,
    subject,
    algorithm: 'HS256'
  });
};

/**
 * Enhanced refresh token generator with database storage
 */
export const generateRefreshToken = async (payload) => {
  const token = jwt.sign(payload, JWT_CONFIG.refreshSecret, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer,
    subject: 'refresh',
    algorithm: 'HS256'
  });

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({
    token,
    user: payload.userId,
    expiresAt,
    userAgent: payload.userAgent,
    ipAddress: payload.ipAddress
  });

  return token;
};

/**
 * Enhanced JWT verification with comprehensive error handling and multitenant context
 */
export const verifyToken = (token, options = {}) => {
  const {
    secret = JWT_CONFIG.secret,
    ignoreExpiration = false
  } = options;

  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      const error = new Error('Token has been revoked');
      error.name = 'TokenRevokedError';
      throw error;
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: JWT_CONFIG.algorithms,
      ignoreExpiration
    });

    // Validate token structure
    if (decoded.iss !== JWT_CONFIG.issuer) {
      const error = new Error('Invalid token issuer');
      error.name = 'InvalidIssuerError';
      throw error;
    }

    return decoded;
  } catch (error) {
    // Enhanced error mapping
    const errorMap = {
      'TokenExpiredError': { message: 'Token has expired', code: 'TOKEN_EXPIRED' },
      'JsonWebTokenError': { message: 'Invalid token', code: 'INVALID_TOKEN' },
      'NotBeforeError': { message: 'Token not active', code: 'TOKEN_INACTIVE' },
      'TokenRevokedError': { message: 'Token has been revoked', code: 'TOKEN_REVOKED' },
      'InvalidIssuerError': { message: 'Invalid token issuer', code: 'INVALID_ISSUER' }
    };

    const errorConfig = errorMap[error.name] || { message: 'Token verification failed', code: 'TOKEN_VERIFICATION_FAILED' };
    error.message = errorConfig.message;
    error.code = errorConfig.code;
    throw error;
  }
};

/**
 * Enhanced authentication middleware with multitenant support
 */
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check for Authorization header
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No authorization token provided.",
      code: "MISSING_TOKEN",
      documentation: "/api/docs#authentication"
    });
  }

  // Validate Authorization header format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format. Expected 'Bearer <token>'.",
      code: "INVALID_FORMAT",
      example: "Authorization: Bearer your.jwt.token"
    });
  }

  const token = authHeader.split(" ")[1];
  
  // Validate token presence
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is missing.",
      code: "EMPTY_TOKEN"
    });
  }

  // Verify token
  const decoded = verifyToken(token);
  
  // Check if user still exists and is active with multitenant context
  const user = await User.findById(decoded.userId)
    .select('-password')
    .populate({
      path: 'organizations.organization',
      select: 'name slug logo isActive subscription',
      match: { isActive: true }
    });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User account no longer exists.",
      code: "USER_NOT_FOUND"
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account has been deactivated. Please contact support.",
      code: "ACCOUNT_DEACTIVATED",
      supportEmail: "assesslyinc@gmail.com"
    });
  }

  // Check if password was changed after token was issued
  if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return res.status(401).json({
      success: false,
      message: "Password was recently changed. Please login again.",
      code: "PASSWORD_CHANGED"
    });
  }

  // Attach user and multitenant context to request
  req.user = user;
  req.auth = {
    token,
    tokenType: 'access',
    issuedAt: new Date(decoded.iat * 1000),
    expiresAt: new Date(decoded.exp * 1000)
  };
  
  // Log authentication success
  console.log(`🔐 [${req.id}] Authenticated: ${user.email} (${user.role})`, {
    userId: user._id,
    organizations: user.organizations.length,
    ip: req.ip
  });

  next();
});

/**
 * Enhanced role-based access control with multitenant hierarchy
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required for role-based access.",
        code: "UNAUTHENTICATED"
      });
    }

    // Super admin bypasses all role checks
    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`🚫 [${req.id}] Unauthorized access attempt:`, {
        user: req.user.email,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}.`,
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: roles,
        userRole: req.user.role,
        documentation: "/api/docs#roles-permissions"
      });
    }

    console.log(`👮 [${req.id}] Role authorization passed:`, {
      user: req.user.email,
      role: req.user.role,
      allowed: roles
    });

    next();
  };
};

/**
 * Enhanced organization-based authorization with multitenant isolation
 */
export const authorizeOrganization = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.organizationId || req.body.organization || req.query.organization;
  
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required.",
      code: "MISSING_ORG_ID",
      suggestion: "Provide organization ID in path, body, or query parameters"
    });
  }

  // Validate organization ID format
  if (!require('mongoose').Types.ObjectId.isValid(organizationId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid organization ID format.",
      code: "INVALID_ORG_ID"
    });
  }

  // Super admin has access to all organizations
  if (req.user.role === 'superadmin') {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
        code: "ORGANIZATION_NOT_FOUND"
      });
    }
    if (!organization.isActive) {
      return res.status(403).json({
        success: false,
        message: "Organization is inactive.",
        code: "ORGANIZATION_INACTIVE"
      });
    }
    req.organization = organization;
    return next();
  }

  // Check if user belongs to the organization
  const userOrganization = req.user.organizations.find(
    org => org.organization._id.toString() === organizationId.toString()
  );

  if (!userOrganization) {
    console.warn(`🚫 [${req.id}] Organization access denied:`, {
      user: req.user.email,
      organizationId,
      userOrganizations: req.user.organizations.map(org => org.organization._id)
    });

    return res.status(403).json({
      success: false,
      message: "Access denied. You are not a member of this organization.",
      code: "NOT_ORG_MEMBER",
      organizationId
    });
  }

  // Get full organization details
  const organization = await Organization.findById(organizationId);
  if (!organization || !organization.isActive) {
    return res.status(404).json({
      success: false,
      message: "Organization not found or inactive.",
      code: "ORGANIZATION_INACTIVE"
    });
  }

  // Attach organization context to request
  req.organization = organization;
  req.userOrganization = userOrganization;

  console.log(`🏢 [${req.id}] Organization authorization passed:`, {
    user: req.user.email,
    organization: organization.name,
    userRole: userOrganization.role,
    organizationId: organization._id
  });

  next();
});

/**
 * Enhanced team-based authorization within organizations
 */
export const authorizeTeam = asyncHandler(async (req, res, next) => {
  const teamId = req.params.teamId || req.body.team || req.query.team;
  
  if (!teamId) {
    return res.status(400).json({
      success: false,
      message: "Team ID is required.",
      code: "MISSING_TEAM_ID"
    });
  }

  if (!req.organization) {
    return res.status(400).json({
      success: false,
      message: "Organization context is required for team authorization.",
      code: "MISSING_ORG_CONTEXT"
    });
  }

  // Check if team exists in organization
  const organization = await Organization.findById(req.organization._id)
    .populate('teams');
  
  const team = organization.teams.find(t => t._id.toString() === teamId.toString());
  
  if (!team) {
    return res.status(404).json({
      success: false,
      message: "Team not found in this organization.",
      code: "TEAM_NOT_FOUND"
    });
  }

  // Super admin and organization admin have access to all teams
  if (req.user.role === 'superadmin' || req.userOrganization.role === 'admin') {
    req.team = team;
    return next();
  }

  // Team leads have access to their teams
  if (req.userOrganization.role === 'team_lead') {
    const userTeams = req.userOrganization.teams || [];
    if (userTeams.includes(teamId.toString())) {
      req.team = team;
      return next();
    }
  }

  // Regular users need to be members of the team
  const userTeams = req.userOrganization.teams || [];
  if (!userTeams.includes(teamId.toString())) {
    return res.status(403).json({
      success: false,
      message: "Access denied to this team.",
      code: "TEAM_ACCESS_DENIED",
      teamId
    });
  }

  req.team = team;

  console.log(`👥 [${req.id}] Team authorization passed:`, {
    user: req.user.email,
    team: team.name,
    organization: organization.name
  });

  next();
});

/**
 * Resource ownership check with multitenant context
 */
export const authorizeOwner = (model, idParam = 'id', ownerField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[idParam];
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: "Resource ID is required.",
        code: "MISSING_RESOURCE_ID"
      });
    }

    // Super admin can access any resource
    if (req.user.role === 'superadmin') {
      return next();
    }

    const resource = await model.findById(resourceId);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
        code: "RESOURCE_NOT_FOUND"
      });
    }

    // Check organization context if resource has organization field
    if (resource.organization && req.organization) {
      if (resource.organization.toString() !== req.organization._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Resource does not belong to this organization.",
          code: "RESOURCE_ORG_MISMATCH"
        });
      }
    }

    // Check ownership
    const ownerId = resource[ownerField]?.toString();
    const userId = req.user._id.toString();

    if (ownerId !== userId) {
      // Check if user has admin role in organization
      if (req.userOrganization && ['admin', 'team_lead'].includes(req.userOrganization.role)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the owner of this resource.",
        code: "NOT_OWNER"
      });
    }

    next();
  });
};

/**
 * Enhanced refresh token verification with database check
 */
export const verifyRefreshToken = async (token, ipAddress = null) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret);
    
    // Check if refresh token exists in database and is active
    const refreshToken = await RefreshToken.findOne({
      token,
      user: decoded.userId,
      revokedAt: null
    }).populate('user');

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    if (refreshToken.isExpired) {
      throw new Error('Refresh token has expired');
    }

    // Update last used timestamp and IP
    refreshToken.lastUsedAt = new Date();
    refreshToken.lastUsedIp = ipAddress;
    refreshToken.usageCount += 1;
    await refreshToken.save();

    return { decoded, refreshToken };
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    
    // Map JWT errors to consistent format
    if (error.name === 'TokenExpiredError') {
      error.code = 'REFRESH_TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      error.code = 'INVALID_REFRESH_TOKEN';
    } else {
      error.code = 'REFRESH_TOKEN_VERIFICATION_FAILED';
    }
    
    throw error;
  }
};

/**
 * Enhanced token revocation with multitenant awareness
 */
export const revokeToken = async (token, reason = 'logout', revokedBy = null, ipAddress = null) => {
  try {
    // Add to in-memory blacklist for immediate effect
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      tokenBlacklist.add(token, decoded.exp * 1000);
    } else {
      tokenBlacklist.add(token);
    }
    
    // Mark refresh token as revoked in database
    await RefreshToken.findOneAndUpdate(
      { token },
      {
        revokedAt: new Date(),
        reasonRevoked: reason,
        revokedBy,
        revokedByIp: ipAddress
      }
    );

    console.log(`🔒 Token revoked:`, { reason, revokedBy, ipAddress });
  } catch (error) {
    console.error('Token revocation failed:', error);
    throw error;
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId)
        .select('-password')
        .populate({
          path: 'organizations.organization',
          select: 'name slug logo isActive',
          match: { isActive: true }
        });

      if (user && user.isActive) {
        req.user = user;
        console.log(`🔓 [${req.id}] Optional auth - user attached:`, user.email);
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log(`🔓 [${req.id}] Optional auth - invalid token:`, error.message);
    }
  }

  next();
});

// Export configuration for external use
export { JWT_CONFIG, tokenBlacklist };

export default {
  securityHeaders,
  protect,
  authorizeRoles,
  authorizeOrganization,
  authorizeTeam,
  authorizeOwner,
  verifyToken,
  verifyRefreshToken,
  generateToken,
  generateRefreshToken,
  revokeToken,
  optionalAuth,
  JWT_CONFIG
};
