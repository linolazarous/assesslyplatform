/**
 * Enhanced async error handler middleware
 * Wraps async route handlers to automatically catch errors and provide consistent error handling
 */

/**
 * Async handler wrapper with comprehensive error handling
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => async (req, res, next) => {
  try {
    // Add request ID for tracking (if not already present)
    if (!req.id) {
      req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Log request start (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`➡️  [${req.id}] ${req.method} ${req.originalUrl}`);
    }

    // Execute the async function
    await fn(req, res, next);

    // Log successful completion (development only)
    if (process.env.NODE_ENV === 'development' && !res.headersSent) {
      console.log(`✅ [${req.id}] Completed successfully`);
    }

  } catch (error) {
    // Enhanced error logging
    console.error(`❌ [${req.id || 'unknown'}] Error in ${req.method} ${req.originalUrl}:`, {
      message: error.message,
      stack: error.stack,
      user: req.user?.email || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Pass error to Express error handler
    next(error);
  }
};

/**
 * Async handler with custom error mapper
 * @param {Function} fn - Async route handler function
 * @param {Object} errorMap - Map of error types to status codes and messages
 * @returns {Function} Express middleware function
 */
export const asyncHandlerWithMap = (fn, errorMap = {}) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    // Check if this error type is mapped
    const errorConfig = errorMap[error.constructor.name] || errorMap[error.name];
    
    if (errorConfig) {
      error.statusCode = errorConfig.statusCode;
      if (errorConfig.message) {
        error.message = errorConfig.message;
      }
    }

    next(error);
  }
};

/**
 * Async handler with timeout
 * @param {Function} fn - Async route handler function
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Express middleware function
 */
export const asyncHandlerWithTimeout = (fn, timeoutMs = 30000) => async (req, res, next) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    await Promise.race([fn(req, res, next), timeoutPromise]);
  } catch (error) {
    error.statusCode = 408; // Request Timeout
    next(error);
  }
};

/**
 * Batch async handler for processing arrays of items
 * @param {Function} processor - Function to process each item
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const batchAsyncHandler = (processor, options = {}) => {
  const {
    maxConcurrent = 5,
    onProgress = null,
    stopOnError = false
  } = options;

  return asyncHandler(async (req, res, next) => {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      throw new Error('Request body must contain an "items" array');
    }

    const results = [];
    const errors = [];

    // Process items in batches
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (item, index) => {
        try {
          const result = await processor(item, req);
          results.push({ item, result, success: true });
          
          if (onProgress) {
            onProgress(i + index + 1, items.length);
          }
          
          return result;
        } catch (error) {
          errors.push({ item, error: error.message, success: false });
          
          if (stopOnError) {
            throw error;
          }
          
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    req.batchResults = { results, errors };
    next();
  });
};

export default asyncHandler;
