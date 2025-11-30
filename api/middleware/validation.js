import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { asyncHandler } from './asyncHandler.js';

/**
 * Enhanced validation middleware with custom validators and sanitizers
 */

/**
 * Handle validation errors
 */
export const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 422;
    error.code = 'VALIDATION_ERROR';
    error.details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
      location: err.location
    }));
    
    // Log validation errors
    console.warn(`❌ [${req.id}] Validation failed:`, error.details);
    
    throw error;
  }

  next();
});

/**
 * Custom validators
 */
export const customValidators = {
  // Validate MongoDB ObjectId
  isObjectId: (value) => {
    if (!value) return true; // Skip if optional
    return mongoose.Types.ObjectId.isValid(value);
  },

  // Validate email domain
  isAllowedDomain: (domains = []) => (value) => {
    if (!value) return true;
    const domain = value.split('@')[1];
    return domains.includes(domain);
  },

  // Validate strong password
  isStrongPassword: (value) => {
    if (!value) return true;
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(value);
  },

  // Validate phone number
  isPhoneNumber: (value) => {
    if (!value) return true;
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  },

  // Validate URL
  isURL: (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Validate array of ObjectIds
  isObjectIdArray: (value) => {
    if (!value) return true;
    if (!Array.isArray(value)) return false;
    return value.every(id => mongoose.Types.ObjectId.isValid(id));
  }
};

/**
 * Custom sanitizers
 */
export const customSanitizers = {
  // Trim and lowercase email
  normalizeEmail: (value) => {
    return value ? value.trim().toLowerCase() : value;
  },

  // Trim string
  trim: (value) => {
    return typeof value === 'string' ? value.trim() : value;
  },

  // Convert to number
  toInt: (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  },

  // Convert to float
  toFloat: (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  },

  // Convert to boolean
  toBoolean: (value) => {
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return value;
  },

  // Escape HTML
  escapeHTML: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
};

/**
 * Common validation chains
 */
export const commonValidators = {
  // ObjectId validation
  objectId: (field = 'id') => param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),

  // Email validation
  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  // Password validation
  password: (field = 'password') => body(field)
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .custom(customValidators.isStrongPassword)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Name validation
  name: (field = 'name') => body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  // URL validation
  url: (field = 'url') => body(field)
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),

  // Phone validation
  phone: (field = 'phone') => body(field)
    .optional()
    .custom(customValidators.isPhoneNumber)
    .withMessage('Please provide a valid phone number'),

  // Array of ObjectIds validation
  objectIdArray: (field = 'ids') => body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`)
    .custom(customValidators.isObjectIdArray)
    .withMessage(`All items in ${field} must be valid IDs`)
};

/**
 * Pagination validation
 */
export const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SortBy must be between 1 and 50 characters'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('SortOrder must be asc, desc, 1, or -1')
];

/**
 * Search validation
 */
export const searchValidators = [
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .customSanitizer(customSanitizers.escapeHTML)
];

/**
 * Date range validation
 */
export const dateRangeValidators = [
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('DateFrom must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('DateTo must be a valid ISO 8601 date')
    .custom((dateTo, { req }) => {
      if (req.query.dateFrom && new Date(dateTo) < new Date(req.query.dateFrom)) {
        throw new Error('DateTo must be after DateFrom');
      }
      return true;
    })
];

/**
 * User registration validation
 */
export const registerValidators = [
  commonValidators.name('name'),
  commonValidators.email('email'),
  commonValidators.password('password'),
  body('role')
    .isIn(['admin', 'team_lead', 'assessor', 'team_member', 'candidate'])
    .withMessage('Invalid role specified'),
  body('organization')
    .optional()
    .isMongoId()
    .withMessage('Invalid organization ID'),
  body('organizationName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters')
    .trim()
];

/**
 * User update validation
 */
export const userUpdateValidators = [
  commonValidators.name('name').optional(),
  commonValidators.email('email').optional(),
  body('role')
    .optional()
    .isIn(['admin', 'team_lead', 'assessor', 'team_member', 'candidate'])
    .withMessage('Invalid role specified'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean()
];

/**
 * Organization validation
 */
export const organizationValidators = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('industry')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Industry must not exceed 50 characters')
    .trim(),
  body('size')
    .optional()
    .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
    .withMessage('Invalid organization size')
];

/**
 * Assessment validation
 */
export const assessmentValidators = [
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
    .trim(),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('Assessment must have at least one question'),
  body('questions.*.question')
    .isLength({ min: 5, max: 500 })
    .withMessage('Each question must be between 5 and 500 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes')
    .toInt(),
  body('status')
    .isIn(['draft', 'active', 'archived'])
    .withMessage('Invalid status'),
  body('visibility')
    .isIn(['private', 'team', 'organization'])
    .withMessage('Invalid visibility setting')
];

/**
 * Export all validators
 */
export default {
  handleValidationErrors,
  customValidators,
  customSanitizers,
  commonValidators,
  paginationValidators,
  searchValidators,
  dateRangeValidators,
  registerValidators,
  userUpdateValidators,
  organizationValidators,
  assessmentValidators
};
