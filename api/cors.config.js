// api/config/cors.js
/**
 * Enhanced CORS configuration for Assessly Platform
 * Provides secure cross-origin resource sharing with multitenant support
 */

// Environment-based configuration
const ENV_CONFIG = {
  development: {
    strictOrigin: false,
    logViolations: true,
    allowLocalhost: true,
    allowAllOrigins: false
  },
  production: {
    strictOrigin: true,
    logViolations: true,
    allowLocalhost: false,
    allowAllOrigins: false
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
const config = ENV_CONFIG[currentEnv];

// Primary allowed origins
const PRIMARY_ORIGINS = [
  'https://assessly-gedp.onrender.com',
  'https://www.assessly.com',
  'https://app.assessly.com'
];

// Development origins
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173', // Vite
  'http://localhost:8080'  // Alternative port
];

// Partner and integration origins
const PARTNER_ORIGINS = [
  'https://partners.assessly.com',
  'https://integrations.assessly.com'
];

// Build complete origin list based on environment
const getAllowedOrigins = () => {
  const origins = [...PRIMARY_ORIGINS, ...PARTNER_ORIGINS];
  
  if (config.allowLocalhost) {
    origins.push(...DEVELOPMENT_ORIGINS);
  }
  
  // Add custom origins from environment
  const customOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  origins.push(...customOrigins.filter(origin => origin.trim()));
  
  return [...new Set(origins)]; // Remove duplicates
};

const allowedOrigins = getAllowedOrigins();

// CORS violation tracking
const corsViolations = new Map();
const MAX_VIOLATIONS_PER_IP = 10;
const VIOLATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Enhanced origin validation with security features
 */
const validateOrigin = (origin, ip) => {
  // Allow requests with no origin (mobile apps, server-to-server, curl)
  if (!origin) {
    return { allowed: true, reason: 'no_origin' };
  }
  
  // Check against allowed origins
  if (allowedOrigins.includes(origin)) {
    return { allowed: true, reason: 'allowed_origin' };
  }
  
  // Environment-specific overrides
  if (currentEnv === 'development' && config.allowAllOrigins) {
    console.warn(`⚠️  Development mode: Allowing origin ${origin}`);
    return { allowed: true, reason: 'development_override' };
  }
  
  // Track violation for security monitoring
  trackViolation(ip, origin);
  
  return { allowed: false, reason: 'origin_not_allowed' };
};

/**
 * Track CORS violations for security monitoring
 */
const trackViolation = (ip, origin) => {
  const now = Date.now();
  const violations = corsViolations.get(ip) || [];
  
  // Clean old violations
  const recentViolations = violations.filter(time => now - time < VIOLATION_WINDOW_MS);
  recentViolations.push(now);
  
  corsViolations.set(ip, recentViolations);
  
  // Log violation
  if (config.logViolations) {
    console.warn(`🚫 CORS Violation:`, {
      ip,
      origin,
      violationCount: recentViolations.length,
      timestamp: new Date().toISOString()
    });
    
    // Alert on excessive violations
    if (recentViolations.length >= MAX_VIOLATIONS_PER_IP) {
      console.error(`🚨 Excessive CORS violations from IP: ${ip}`, {
        count: recentViolations.length,
        origins: Array.from(new Set(violations.map(v => v.origin))),
        action: 'Consider IP blocking'
      });
    }
  }
};

/**
 * Get CORS statistics for monitoring
 */
export const getCorsStats = () => ({
  totalAllowedOrigins: allowedOrigins.length,
  violations: corsViolations.size,
  environment: currentEnv,
  strictMode: config.strictOrigin,
  allowedOrigins: currentEnv === 'development' ? allowedOrigins : undefined // Hide in production
});

/**
 * Enhanced CORS options configuration
 */
const corsOptions = {
  /**
   * Origin validation function
   */
  origin: function (origin, callback) {
    const clientIp = this.req?.ip || this.req?.connection?.remoteAddress || 'unknown';
    const validation = validateOrigin(origin, clientIp);
    
    if (validation.allowed) {
      callback(null, true);
      
      // Log allowed requests in development
      if (currentEnv === 'development' && origin) {
        console.log(`✅ CORS Allowed: ${origin}`, {
          ip: clientIp,
          reason: validation.reason
        });
      }
    } else {
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`), false);
    }
  },
  
  /**
   * Credentials configuration
   */
  credentials: true,
  
  /**
   * HTTP methods allowed
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  
  /**
   * Allowed headers
   */
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Organization-ID',
    'X-Client-Version',
    'X-Device-ID',
    'Cache-Control',
    'Pragma',
    'If-Modified-Since',
    'If-None-Match'
  ],
  
  /**
   * Exposed headers
   */
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-API-Version',
    'X-Organization-ID',
    'X-Total-Count',
    'X-Page-Count'
  ],
  
  /**
   * Preflight continuation
   */
  preflightContinue: false,
  
  /**
   * Success status for OPTIONS requests
   */
  optionsSuccessStatus: 204,
  
  /**
   * Max age for preflight requests (24 hours)
   */
  maxAge: 86400,
  
  /**
   * Custom CORS middleware to add security headers
   */
  preflight: (req, res, next) => {
    // Add security headers to CORS responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // CORS-specific headers
    res.setHeader('X-CORS-Policy', 'assessly-strict');
    res.setHeader('X-Allowed-Origins', allowedOrigins.length);
    
    next();
  }
};

/**
 * Dynamic CORS configuration for specific routes
 */
export const createRouteSpecificCORS = (options = {}) => {
  const routeOptions = {
    ...corsOptions,
    ...options
  };
  
  // Apply route-specific origin restrictions if provided
  if (options.allowedOrigins) {
    const routeOrigins = Array.isArray(options.allowedOrigins) 
      ? options.allowedOrigins 
      : [options.allowedOrigins];
    
    routeOptions.origin = function (origin, callback) {
      if (!origin || routeOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin not allowed for this route`), false);
      }
    };
  }
  
  return routeOptions;
};

/**
 * CORS configurations for specific use cases
 */
export const CORS_CONFIGS = {
  // Public API endpoints (less restrictive)
  PUBLIC_API: createRouteSpecificCORS({
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }),
  
  // Authentication endpoints (more restrictive)
  AUTH: createRouteSpecificCORS({
    allowedOrigins: PRIMARY_ORIGINS,
    maxAge: 3600, // 1 hour for auth endpoints
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Version']
  }),
  
  // Webhook endpoints (partner-specific)
  WEBHOOKS: createRouteSpecificCORS({
    credentials: false,
    methods: ['POST', 'HEAD'],
    allowedHeaders: ['Content-Type', 'X-Webhook-Secret', 'User-Agent']
  }),
  
  // Admin endpoints (most restrictive)
  ADMIN: createRouteSpecificCORS({
    allowedOrigins: PRIMARY_ORIGINS.filter(origin => 
      origin.includes('assessly.com') && !origin.includes('app.')
    ),
    maxAge: 7200 // 2 hours for admin endpoints
  })
};

/**
 * Middleware to log CORS requests (development only)
 */
export const corsLogger = (req, res, next) => {
  if (currentEnv === 'development' && req.method === 'OPTIONS') {
    console.log('🛫 CORS Preflight Request:', {
      origin: req.headers.origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers'],
      ip: req.ip
    });
  }
  next();
};

/**
 * Security middleware to enhance CORS protection
 */
export const corsSecurity = (req, res, next) => {
  // Add security headers to all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS-specific security headers
  res.setHeader('X-CORS-Policy', 'assessly-strict');
  res.setHeader('X-Allowed-Methods', corsOptions.methods.join(', '));
  
  next();
};

// Export for monitoring and management
export { allowedOrigins, corsViolations, validateOrigin };

export default corsOptions;
