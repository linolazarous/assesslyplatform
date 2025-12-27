import RefreshToken from '../models/RefreshToken.js';
import UserActivity from '../models/UserActivity.js';
import ContactMessage from '../models/ContactMessage.js';

/**
 * Comprehensive cleanup utility for expired and stale data
 */

class CleanupManager {
  constructor() {
    this.stats = {
      tokens: 0,
      activities: 0,
      messages: 0,
      errors: 0
    };
  }

  /**
   * Remove expired refresh tokens
   */
  async removeExpiredTokens() {
    try {
      const result = await RefreshToken.deleteMany({
        $or: [
          { expires: { $lt: new Date() } },
          { revokedAt: { $ne: null } }
        ]
      });

      this.stats.tokens = result.deletedCount;
      
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} expired/revoked refresh tokens`);
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Failed to cleanup expired tokens:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup old user activities
   */
  async cleanupOldActivities(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await UserActivity.deleteMany({
        createdAt: { $lt: cutoffDate },
        severity: { $ne: 'critical' } // Keep critical logs forever
      });

      this.stats.activities = result.deletedCount;
      
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} user activities older than ${daysToKeep} days`);
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Failed to cleanup old activities:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup resolved contact messages
   */
  async cleanupResolvedMessages(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await ContactMessage.deleteMany({
        status: { $in: ['resolved', 'spam'] },
        updatedAt: { $lt: cutoffDate }
      });

      this.stats.messages = result.deletedCount;
      
      if (result.deletedCount > 0) {
        console.log(`✅ Removed ${result.deletedCount} resolved/spam messages older than ${daysToKeep} days`);
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Failed to cleanup resolved messages:', error.message);
      throw error;
    }
  }

  /**
   * Archive old data instead of deleting (optional)
   */
  async archiveOldAssessments(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // This would typically move data to an archive collection
      // For now, we just mark as archived
      const result = await Assessment.updateMany(
        {
          status: 'completed',
          updatedAt: { $lt: cutoffDate }
        },
        {
          $set: { status: 'archived' }
        }
      );

      console.log(`✅ Archived ${result.modifiedCount} old assessments`);
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Failed to archive old assessments:', error.message);
      throw error;
    }
  }

  /**
   * Comprehensive cleanup routine
   */
  async runCleanup(options = {}) {
    const startTime = Date.now();
    
    const {
      cleanupTokens = true,
      cleanupActivities = true,
      cleanupMessages = true,
      archiveAssessments = false,
      activityDays = 90,
      messageDays = 30,
      assessmentDays = 365
    } = options;

    console.log('🧹 Starting comprehensive data cleanup...');

    try {
      // Run cleanup tasks in sequence
      if (cleanupTokens) {
        await this.removeExpiredTokens();
      }

      if (cleanupActivities) {
        await this.cleanupOldActivities(activityDays);
      }

      if (cleanupMessages) {
        await this.cleanupResolvedMessages(messageDays);
      }

      if (archiveAssessments) {
        await this.archiveOldAssessments(assessmentDays);
      }

      const duration = Date.now() - startTime;

      console.log('🎉 Cleanup completed successfully!');
      console.log('📊 Cleanup Statistics:');
      console.log(`   🔑 Tokens removed: ${this.stats.tokens}`);
      console.log(`   📊 Activities removed: ${this.stats.activities}`);
      console.log(`   📧 Messages removed: ${this.stats.messages}`);
      console.log(`   ❌ Errors: ${this.stats.errors}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);

      return {
        success: true,
        stats: { ...this.stats },
        duration
      };

    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return {
        success: false,
        error: error.message,
        stats: { ...this.stats }
      };
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      tokens: 0,
      activities: 0,
      messages: 0,
      errors: 0
    };
  }
}

// Create singleton instance
const cleanupManager = new CleanupManager();

/**
 * Enhanced error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error with context
  console.error('🚨 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.email || 'anonymous',
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determine status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  // Map common errors to appropriate status codes and messages
  const errorMap = {
    'ValidationError': { statusCode: 400, code: 'VALIDATION_ERROR' },
    'CastError': { statusCode: 400, code: 'INVALID_ID' },
    'JsonWebTokenError': { statusCode: 401, code: 'INVALID_TOKEN' },
    'TokenExpiredError': { statusCode: 401, code: 'TOKEN_EXPIRED' },
    'MongoError': { statusCode: 400, code: 'DATABASE_ERROR' },
    'MongoServerError': { statusCode: 400, code: 'DATABASE_ERROR' }
  };

  const errorConfig = errorMap[err.name];
  if (errorConfig) {
    statusCode = errorConfig.statusCode;
    code = errorConfig.code;
    
    // Provide more user-friendly messages for certain errors
    if (err.name === 'ValidationError') {
      message = 'Validation failed. Please check your input.';
    } else if (err.name === 'CastError') {
      message = 'Invalid resource ID provided.';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid authentication token.';
    } else if (err.name === 'TokenExpiredError') {
      message = 'Authentication token has expired.';
    }
  }

  // Duplicate key error (MongoDB)
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists.';
    code = 'DUPLICATE_RESOURCE';
    
    // Extract field name from error message
    const field = Object.keys(err.keyValue || {})[0];
    if (field) {
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    }
  }

  // Construct error response
  const errorResponse = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Include field-specific validation errors
  if (err.name === 'ValidationError' && err.errors) {
    errorResponse.errors = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.message;
  }

  // Include request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

/**
 * Async error handler for unhandled promise rejections
 */
export const asyncErrorHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Legacy functions for backward compatibility
export const removeExpiredTokens = () => cleanupManager.removeExpiredTokens();
export const runCleanup = (options) => cleanupManager.runCleanup(options);

export default {
  cleanupManager,
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  removeExpiredTokens,
  runCleanup
};
