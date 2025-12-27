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
      console.log(`➡️  [${req.id}] ${req.method} ${req.originalUrl}`, {
        user: req.user?.email || 'anonymous',
        organization: req.organization?._id || 'none',
        ip: req.ip
      });
    }

    // Execute the async function
    await fn(req, res, next);

    // Log successful completion (development only)
    if (process.env.NODE_ENV === 'development' && !res.headersSent) {
      console.log(`✅ [${req.id}] Completed successfully`);
    }

  } catch (error) {
    // Enhanced error logging with multitenant context
    console.error(`❌ [${req.id || 'unknown'}] Error in ${req.method} ${req.originalUrl}:`, {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      user: req.user?.email || 'anonymous',
      userId: req.user?._id,
      organization: req.organization?._id || 'none',
      organizationName: req.organization?.name,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
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
      const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
      timeoutError.statusCode = 408;
      timeoutError.code = 'REQUEST_TIMEOUT';
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    await Promise.race([fn(req, res, next), timeoutPromise]);
  } catch (error) {
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
      const error = new Error('Request body must contain an "items" array');
      error.statusCode = 400;
      error.code = 'INVALID_BATCH_DATA';
      throw error;
    }

    // Validate batch size limits
    const maxBatchSize = process.env.MAX_BATCH_SIZE || 1000;
    if (items.length > maxBatchSize) {
      const error = new Error(`Batch size exceeds maximum limit of ${maxBatchSize}`);
      error.statusCode = 413;
      error.code = 'BATCH_SIZE_EXCEEDED';
      throw error;
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
          const errorInfo = {
            item,
            error: error.message,
            code: error.code,
            success: false,
            timestamp: new Date().toISOString()
          };
          errors.push(errorInfo);
          
          if (stopOnError) {
            throw error;
          }
          
          return null;
        }
      });

      await Promise.all(batchPromises);

      // Check if we should stop due to too many errors
      if (errors.length > 0 && stopOnError) {
        break;
      }
    }

    req.batchResults = { 
      results, 
      errors,
      summary: {
        total: items.length,
        successful: results.length,
        failed: errors.length,
        successRate: (results.length / items.length * 100).toFixed(2) + '%'
      }
    };
    next();
  });
};

/**
 * Async handler with retry logic for transient failures
 * @param {Function} fn - Async route handler function
 * @param {Object} options - Retry options
 * @returns {Function} Express middleware function
 */
export const asyncHandlerWithRetry = (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = (error) => error.statusCode >= 500
  } = options;

  return asyncHandler(async (req, res, next) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        await fn(req, res, next);
        return; // Success, exit the loop
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt <= maxRetries && retryCondition(error)) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
          const jitter = delay * 0.1 * Math.random();
          const totalDelay = delay + jitter;
          
          console.warn(`🔄 [${req.id}] Retry attempt ${attempt}/${maxRetries} after ${totalDelay}ms:`, error.message);
          
          await new Promise(resolve => setTimeout(resolve, totalDelay));
          continue;
        }
        
        break; // Don't retry or no more retries
      }
    }
    
    throw lastError;
  });
};

/**
 * Async handler with performance monitoring
 * @param {Function} fn - Async route handler function
 * @param {string} operationName - Name for performance tracking
 * @returns {Function} Express middleware function
 */
export const asyncHandlerWithMetrics = (fn, operationName = 'unknown') => async (req, res, next) => {
  const startTime = process.hrtime();
  
  try {
    await fn(req, res, next);
    
    // Calculate duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    // Log performance metrics
    if (process.env.NODE_ENV === 'development' || duration > 1000) {
      console.log(`📊 [${req.id}] ${operationName} completed in ${duration.toFixed(2)}ms`);
    }
    
    // Store metrics for aggregation
    req.performanceMetrics = req.performanceMetrics || [];
    req.performanceMetrics.push({
      operation: operationName,
      duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Calculate duration even for errors
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    console.error(`📊 [${req.id}] ${operationName} failed after ${duration.toFixed(2)}ms:`, error.message);
    throw error;
  }
};

export default asyncHandler;
