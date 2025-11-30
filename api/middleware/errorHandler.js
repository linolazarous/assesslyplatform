import { asyncHandler } from './asyncHandler.js';

/**
 * Comprehensive error handling middleware with multitenant context
 */

// Error classification and mapping
const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  EXTERNAL_SERVICE: 'external_service',
  DATABASE: 'database',
  INTERNAL: 'internal'
};

// Enhanced error mapping with multitenant context
const ERROR_MAP = {
  // Mongoose errors
  'ValidationError': { 
    statusCode: 422, 
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Validation failed' 
  },
  'CastError': { 
    statusCode: 400, 
    category: ERROR_CATEGORIES.VALIDATION,
    message: 'Invalid resource ID' 
  },
  'DocumentNotFoundError': { 
    statusCode: 404, 
    category: ERROR_CATEGORIES.NOT_FOUND,
    message: 'Resource not found' 
  },
  
  // JWT errors
  'JsonWebTokenError': { 
    statusCode: 401, 
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Invalid authentication token' 
  },
  'TokenExpiredError': { 
    statusCode: 401, 
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Authentication token has expired' 
  },
  'TokenRevokedError': { 
    statusCode: 401, 
    category: ERROR_CATEGORIES.AUTHENTICATION,
    message: 'Token has been revoked' 
  },
  
  // MongoDB errors
  'MongoError': { 
    statusCode: 500, 
    category: ERROR_CATEGORIES.DATABASE,
    message: 'Database operation failed' 
  },
  'MongoServerError': { 
    statusCode: 500, 
    category: ERROR_CATEGORIES.DATABASE,
    message: 'Database server error' 
  },
  
  // Custom business logic errors
  'OrganizationAccessError': { 
    statusCode: 403, 
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Access denied to organization' 
  },
  'TeamAccessError': { 
    statusCode: 403, 
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Access denied to team' 
  },
  'SubscriptionError': { 
    statusCode: 403, 
    category: ERROR_CATEGORIES.AUTHORIZATION,
    message: 'Subscription required' 
  }
};

/**
 * Enhanced error handler middleware with comprehensive logging and multitenant context
 */
export const errorHandler = (err, req, res, next) => {
  // Determine error configuration
  const errorConfig = ERROR_MAP[err.name] || { 
    statusCode: err.statusCode || 500, 
    category: ERROR_CATEGORIES.INTERNAL,
    message: err.message || 'Internal Server Error'
  };

  const statusCode = errorConfig.statusCode;
  const category = errorConfig.category;
  let message = errorConfig.message;

  // Enhance error with context
  const errorContext = {
    requestId: req.id,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.email || 'anonymous',
    userId: req.user?._id,
    organization: req.organization?._id || 'none',
    organizationName: req.organization?.name,
    category,
    code: err.code || err.name
  };

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      message = enhanceValidationError(err, message);
      break;
      
    case 'MongoError':
      if (err.code === 11000) {
        statusCode = 409;
        message = handleDuplicateKeyError(err);
        errorContext.category = ERROR_CATEGORIES.CONFLICT;
      }
      break;
      
    case 'RateLimitError':
      statusCode = 429;
      message = 'Too many requests. Please try again later.';
      errorContext.category = ERROR_CATEGORIES.RATE_LIMIT;
      break;
  }

  // Construct error response
  const errorResponse = {
    success: false,
    message,
    code: err.code || err.name,
    category,
    timestamp: errorContext.timestamp,
    path: errorContext.path,
    requestId: errorContext.requestId
  };

  // Add field-specific validation errors
  if (err.name === 'ValidationError' && err.errors) {
    errorResponse.errors = extractValidationErrors(err.errors);
  }

  // Add retry information for certain errors
  if (category === ERROR_CATEGORIES.EXTERNAL_SERVICE && err.retryAfter) {
    errorResponse.retryAfter = err.retryAfter;
  }

  // Include stack trace and details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.message;
    
    if (err.details) {
      errorResponse.context = err.details;
    }
  }

  // Log error with appropriate level
  logError(err, errorContext, statusCode);

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes with multitenant context
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.name = 'NotFoundError';
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  
  // Provide helpful suggestions based on the request
  const suggestions = getRouteSuggestions(req);
  if (suggestions.length > 0) {
    error.details = { suggestions };
  }
  
  next(error);
};

/**
 * Async error handler wrapper for consistent error handling
 */
export const asyncErrorHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global unhandled rejection and uncaught exception handlers
 */
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise,
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Exit process in production for safety
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
};

// Helper functions

function enhanceValidationError(err, baseMessage) {
  const fields = Object.keys(err.errors);
  if (fields.length === 1) {
    return `${baseMessage}: ${fields[0]}`;
  }
  return `${baseMessage} (${fields.length} fields)`;
}

function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue || {})[0];
  if (field) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }
  return 'Resource already exists.';
}

function extractValidationErrors(errors) {
  return Object.keys(errors).reduce((acc, key) => {
    acc[key] = {
      message: errors[key].message,
      value: errors[key].value,
      kind: errors[key].kind
    };
    return acc;
  }, {});
}

function logError(error, context, statusCode) {
  const logData = {
    ...context,
    statusCode,
    errorMessage: error.message,
    errorStack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  };

  if (statusCode >= 500) {
    // Server errors - log as error
    console.error('🚨 Server Error:', logData);
  } else if (statusCode >= 400) {
    // Client errors - log as warning
    console.warn('⚠️ Client Error:', logData);
  } else {
    // Other errors - log as info
    console.log('ℹ️ Other Error:', logData);
  }
}

function getRouteSuggestions(req) {
  const suggestions = [];
  const path = req.originalUrl;
  
  // Common route pattern suggestions
  if (path.includes('/api/v1/')) {
    suggestions.push('Check the API version - current is v1');
  }
  
  if (path.includes('/organizations/')) {
    suggestions.push('Ensure organization ID is valid and you have access');
  }
  
  if (path.includes('/assessments/')) {
    suggestions.push('Check assessment ID and organization permissions');
  }
  
  // Method-specific suggestions
  if (req.method === 'GET') {
    suggestions.push('Verify the resource exists and you have permission to view it');
  } else if (req.method === 'POST') {
    suggestions.push('Check request body format and required fields');
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    suggestions.push('Verify resource exists and you have permission to modify it');
  } else if (req.method === 'DELETE') {
    suggestions.push('Confirm resource exists and you have permission to delete it');
  }
  
  return suggestions;
}

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

export default {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  setupGlobalErrorHandlers,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};
