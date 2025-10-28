// api/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Assuming you have a User model

// Token blacklist for logout functionality (in production, use Redis)
const tokenBlacklist = new Set();

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Check if token is blacklisted (logged out)
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ 
        error: 'Token has been invalidated',
        code: 'TOKEN_INVALIDATED'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        error: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Add user info to request object
    req.user = {
      userId: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    };

    // Update last activity (optional, for tracking)
    user.lastActivity = new Date();
    await user.save({ validateBeforeSave: false });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Authentication failed' 
      : error.message;

    return res.status(500).json({ 
      error: message,
      code: 'AUTHENTICATION_FAILED'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Specific role helpers for common use cases
export const requireAdmin = requireRole(['admin']);
export const requireAssessor = requireRole(['admin', 'assessor']);
export const requireCandidate = requireRole(['admin', 'assessor', 'candidate']);

// Optional: Check ownership or specific permissions
export const requireOwnership = (resourceOwnerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Allow admins to access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // For non-admins, check if they own the resource
    const resourceOwnerId = req.params[resourceOwnerField] || req.body[resourceOwnerField];
    
    if (!resourceOwnerId) {
      return res.status(400).json({ 
        error: 'Resource ownership could not be determined',
        code: 'OWNERSHIP_UNDETERMINED'
      });
    }

    if (resourceOwnerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ 
        error: 'Access denied to this resource',
        code: 'RESOURCE_ACCESS_DENIED'
      });
    }

    next();
  };
};

// Token invalidation for logout
export const invalidateToken = (token) => {
  tokenBlacklist.add(token);
  
  // Optional: Clean up old tokens periodically
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000); // Remove after 24 hours
};

// Rate limiting helper (compatible with express-rate-limit)
export const getRateLimitKey = (req) => {
  return req.user ? req.user.userId : req.ip;
};

// Security headers for authenticated routes
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Export for testing purposes
export const _testExports = {
  tokenBlacklist
};
