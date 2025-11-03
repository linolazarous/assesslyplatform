import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

// Configuration with environment fallbacks
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || "your-super-secure-jwt-secret-key-change-in-production",
  refreshSecret: process.env.REFRESH_SECRET || "your-super-secure-refresh-secret-key-change-in-production",
  accessTokenExpiry: process.env.JWT_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_EXPIRY || "7d"
};

// Token blacklist for immediate revocation
const tokenBlacklist = new Set();

/**
 * Enhanced security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Security headers beyond what Helmet provides
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Custom headers for API
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Content-Security-Policy', "default-src 'self'");
  
  next();
};

/**
 * JWT token generator with enhanced options
 */
export const generateToken = (payload, options = {}) => {
  const {
    expiresIn = JWT_CONFIG.accessTokenExpiry,
    secret = JWT_CONFIG.secret,
    issuer = 'assessly-platform',
    subject = 'access'
  } = options;

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer,
    subject,
    algorithm: 'HS256'
  });
};

/**
 * Refresh token generator
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_CONFIG.refreshSecret, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: 'assessly-platform',
    subject: 'refresh',
    algorithm: 'HS256'
  });
};

/**
 * Enhanced JWT verification with comprehensive error handling
 */
export const verifyToken = (token, options = {}) => {
  const {
    secret = JWT_CONFIG.secret,
    ignoreExpiration = false
  } = options;

  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
      ignoreExpiration
    });
  } catch (error) {
    // Enhanced error mapping
    const errorMap = {
      'TokenExpiredError': 'Token has expired',
      'JsonWebTokenError': 'Invalid token',
      'NotBeforeError': 'Token not active'
    };

    const message = errorMap[error.name] || 'Token verification failed';
    error.message = message;
    throw error;
  }
};

/**
 * Enhanced authentication middleware with comprehensive security checks
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check for Authorization header
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authorization token provided.",
        code: "MISSING_TOKEN"
      });
    }

    // Validate Authorization header format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format. Expected 'Bearer <token>'.",
        code: "INVALID_FORMAT"
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
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('organization', 'name slug subscription.plan');

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
        message: "Account has been deactivated.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password was recently changed. Please login again.",
        code: "PASSWORD_CHANGED"
      });
    }

    // Attach user to request
    req.user = user;
    
    // Log authentication success (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Authenticated: ${user.email} (${user.role})`);
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    const errorResponse = {
      success: false,
      message: "Authentication failed.",
      code: "AUTH_FAILED"
    };

    // Provide specific error messages in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
    }

    return res.status(401).json(errorResponse);
  }
};

/**
 * Enhanced role-based access control
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

    if (!roles.includes(req.user.role)) {
      console.warn(`🚫 Unauthorized access attempt: ${req.user.email} (${req.user.role}) tried to access ${req.method} ${req.originalUrl}`);
      
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}.`,
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Organization-based authorization
 */
export const authorizeOrganization = (organizationIdPath = 'params.organizationId') => {
  return async (req, res, next) => {
    try {
      const organizationId = getNestedValue(req, organizationIdPath);
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required.",
          code: "MISSING_ORG_ID"
        });
      }

      // Admin users have access to all organizations
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user belongs to the organization
      const isMember = await User.findOne({
        _id: req.user._id,
        organization: organizationId
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this organization.",
          code: "NOT_ORG_MEMBER"
        });
      }

      next();
    } catch (error) {
      console.error('Organization authorization error:', error);
      next(error);
    }
  };
};

/**
 * Resource ownership check middleware
 */
export const authorizeOwner = (model, idParam = 'id', ownerField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: "Resource ID is required.",
          code: "MISSING_RESOURCE_ID"
        });
      }

      // Admin users can access any resource
      if (req.user.role === 'admin') {
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

      // Check ownership
      const ownerId = resource[ownerField]?.toString();
      const userId = req.user._id.toString();

      if (ownerId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not the owner of this resource.",
          code: "NOT_OWNER"
        });
      }

      next();
    } catch (error) {
      console.error('Ownership authorization error:', error);
      next(error);
    }
  };
};

/**
 * Enhanced refresh token verification
 */
export const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret);
    
    // Check if refresh token exists in database and is active
    const refreshToken = await RefreshToken.findOne({
      token,
      user: decoded.userId,
      revokedAt: null
    });

    if (!refreshToken || refreshToken.isExpired) {
      throw new Error('Refresh token is invalid or expired');
    }

    // Update last used timestamp
    refreshToken.lastUsedAt = new Date();
    refreshToken.usageCount += 1;
    await refreshToken.save();

    return { decoded, refreshToken };
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    throw error;
  }
};

/**
 * Token revocation utility
 */
export const revokeToken = async (token, reason = 'logout', revokedByIp = null) => {
  try {
    // Add to in-memory blacklist for immediate effect
    tokenBlacklist.add(token);
    
    // Also mark in database if it's a refresh token
    await RefreshToken.findOneAndUpdate(
      { token },
      {
        revokedAt: new Date(),
        reasonRevoked: reason,
        revokedByIp
      }
    );

    // Clean up old blacklisted tokens periodically
    if (tokenBlacklist.size > 1000) {
      // Simple cleanup: remove oldest entries
      const tokens = Array.from(tokenBlacklist);
      tokenBlacklist.clear();
      tokens.slice(-500).forEach(t => tokenBlacklist.add(t)); // Keep recent 500
    }
  } catch (error) {
    console.error('Token revocation failed:', error);
    throw error;
  }
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMITED"
  },
  skipSuccessfulRequests: true
};

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Default export for backward compatibility
export default {
  securityHeaders,
  protect,
  authorizeRoles,
  authorizeOrganization,
  authorizeOwner,
  verifyToken,
  verifyRefreshToken,
  generateToken,
  generateRefreshToken,
  revokeToken,
  authRateLimit
};
