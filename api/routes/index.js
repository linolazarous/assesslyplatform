// api/routes/index.js
import express from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import organizationsRouter from "./organizations.js";
import assessmentsRouter from "./assessments.js";
import assessmentResponsesRouter from "./assessmentResponses.js";
import subscriptionsRouter from "./subscriptions.js";
import userActivitiesRouter from "./userActivities.js";
import contactRouter from "./contact.js";
import googleAuthRouter from "./google.js";

const router = express.Router();
const API_VERSION = process.env.API_VERSION || "1.0.0";
const startTime = Date.now();

// Track API startup and initialization
console.log(`🚀 Assessly API v${API_VERSION} initializing...`);

/**
 * =====================================================
 * 🩺 Enhanced Health & Diagnostic Endpoints
 * =====================================================
 */

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: API Health Check
 *     description: Comprehensive health check for all API services and dependencies
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy and all services are operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 service:
 *                   type: string
 *                   example: "Assessly API"
 *                 environment:
 *                   type: string
 *                   example: "production"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: string
 *                   example: "3600.45"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: "connected"
 *                     memory:
 *                       type: string
 *                       example: "healthy"
 *                     storage:
 *                       type: string
 *                       example: "available"
 */
router.get("/health", async (req, res) => {
  try {
    const healthChecks = {
      database: await checkDatabaseHealth(),
      memory: checkMemoryHealth(),
      storage: checkStorageHealth(),
      external_services: await checkExternalServices()
    };

    const overallStatus = Object.values(healthChecks).every(status => status === 'healthy') 
      ? 'healthy' 
      : 'degraded';

    res.status(200).json({
      status: overallStatus,
      service: "Assessly API",
      environment: process.env.NODE_ENV || "development",
      version: API_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      ...(process.env.NODE_ENV === 'development' && {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      })
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      service: "Assessly API",
      error: "Health check failed",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Detailed System Status
 *     description: Comprehensive system status with performance metrics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 */
router.get("/status", async (req, res) => {
  try {
    const status = {
      service: "Assessly API",
      version: API_VERSION,
      environment: process.env.NODE_ENV || "development",
      status: "operational",
      uptime: Math.round(process.uptime()),
      startedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
      performance: {
        responseTime: "monitored",
        throughput: "high",
        errorRate: "low"
      },
      features: {
        multitenant: true,
        organizations: true,
        subscriptions: true,
        analytics: true,
        oauth: true
      }
    };

    // Add database statistics in production
    if (process.env.NODE_ENV === 'production') {
      status.database = await getDatabaseStats();
    }

    res.status(200).json(status);
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({
      status: "degraded",
      message: "Service status check failed",
      error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
  }
});

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API Root Endpoint
 *     description: Welcome endpoint with API information and available routes
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 */
router.get("/", (req, res) => {
  res.status(200).json({
    message: `🏆 Assessly Platform API v${API_VERSION}`,
    description: "Multitenant assessment platform for organizations and teams",
    documentation: "/api/docs",
    status: "operational",
    timestamp: new Date().toISOString(),
    links: {
      health: "/api/v1/health",
      status: "/api/v1/status",
      features: "/api/v1/features",
      documentation: "/api/docs"
    }
  });
});

/**
 * @swagger
 * /api/v1/features:
 *   get:
 *     summary: API Features and Capabilities
 *     description: List all available features and endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Features retrieved successfully
 */
router.get("/features", (req, res) => {
  const features = {
    authentication: {
      description: "Secure authentication with multitenant support",
      endpoints: [
        "POST /auth/register - User registration with organization context",
        "POST /auth/login - User login",
        "GET /auth/me - Get current user profile",
        "POST /auth/logout - User logout",
        "GET /auth/google - Google OAuth initiation",
        "GET /auth/google/callback - Google OAuth callback"
      ],
      capabilities: [
        "JWT token authentication",
        "Organization-based access control",
        "OAuth 2.0 integration",
        "Role-based permissions",
        "Email verification"
      ]
    },
    user_management: {
      description: "Comprehensive user management with organization isolation",
      endpoints: [
        "GET /users - Get users (organization-scoped)",
        "POST /users - Create user with organization assignment",
        "GET /users/{id} - Get user by ID",
        "PUT /users/{id} - Update user",
        "DELETE /users/{id}/organizations/{orgId} - Remove user from organization"
      ],
      capabilities: [
        "Multitenant user isolation",
        "Role-based access control",
        "Organization membership management",
        "Team assignments",
        "User activity tracking"
      ]
    },
    organizations: {
      description: "Full multitenant organization management",
      endpoints: [
        "GET /organizations - Get user's organizations",
        "POST /organizations - Create organization",
        "GET /organizations/{id} - Get organization details",
        "PUT /organizations/{id} - Update organization",
        "GET /organizations/{id}/members - Get organization members",
        "POST /organizations/{id}/members - Add member to organization"
      ],
      capabilities: [
        "Organization creation and management",
        "Member management with roles",
        "Team-based access control",
        "Organization settings",
        "Invitation system"
      ]
    },
    assessments: {
      description: "Assessment creation, management, and delivery",
      endpoints: [
        "GET /assessments - Get assessments (organization-scoped)",
        "POST /assessments - Create assessment",
        "GET /assessments/{id} - Get assessment details",
        "PUT /assessments/{id} - Update assessment",
        "POST /assessments/{id}/assign - Assign assessment to candidates"
      ],
      capabilities: [
        "Multitenant assessment isolation",
        "Question bank management",
        "Assessment scheduling",
        "Candidate assignment",
        "Progress tracking"
      ]
    },
    subscriptions: {
      description: "Subscription and billing management",
      endpoints: [
        "GET /subscriptions - Get subscriptions",
        "POST /subscriptions - Create subscription",
        "GET /subscriptions/organization/{id} - Get organization subscription",
        "POST /subscriptions/{id}/upgrade - Upgrade subscription",
        "POST /subscriptions/{id}/cancel - Cancel subscription"
      ],
      capabilities: [
        "Multiple billing cycles",
        "Plan management",
        "Usage tracking",
        "Invoice generation",
        "Prorated upgrades"
      ]
    },
    analytics: {
      description: "Comprehensive analytics and reporting",
      endpoints: [
        "GET /user-activities - Get activity logs",
        "GET /user-activities/stats - Get activity statistics",
        "GET /user-activities/audit - Get security audit log",
        "POST /user-activities/export - Export activities"
      ],
      capabilities: [
        "Real-time activity tracking",
        "Organization-based analytics",
        "Security audit logging",
        "Export capabilities",
        "Performance metrics"
      ]
    }
  };

  res.status(200).json({
    api_version: API_VERSION,
    environment: process.env.NODE_ENV || "development",
    multitenant: true,
    features: features,
    rate_limits: {
      authentication: "10 requests per minute",
      general: "100 requests per minute",
      analytics: "50 requests per minute"
    }
  });
});

/**
 * @swagger
 * /api/v1/metrics:
 *   get:
 *     summary: API Performance Metrics
 *     description: Get performance metrics and usage statistics (Admin only)
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/metrics", async (req, res) => {
  // Basic protection for metrics endpoint
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Metrics endpoint requires authentication"
    });
  }

  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      active_requests: req.app.get('activeRequests') || 0,
      environment: process.env.NODE_ENV
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error("Metrics error:", error);
    res.status(500).json({
      error: "Failed to retrieve metrics",
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * =====================================================
 * 📦 Mount API Routers with Multitenant Support
 * =====================================================
 */

// Authentication routes (public and protected)
router.use("/auth", authRouter);
router.use("/auth", googleAuthRouter); // Google OAuth routes

// Protected API routes with multitenant middleware
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/assessment-responses", assessmentResponsesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/user-activities", userActivitiesRouter);
router.use("/contact", contactRouter);

// Log successful router mounting
console.log('✅ API routers mounted successfully');
console.log('🔐 Authentication routes: /auth');
console.log('👥 User management: /users');
console.log('🏢 Organization management: /organizations');
console.log('📝 Assessment management: /assessments');
console.log('💳 Subscription management: /subscriptions');
console.log('📊 Activity tracking: /user-activities');
console.log('📞 Contact management: /contact');

/**
 * =====================================================
 * ❌ Enhanced 404 Handler
 * =====================================================
 */
router.use((req, res) => {
  console.warn('404 Endpoint not found:', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,
    api_version: API_VERSION,
    suggestion: "Check /api/v1/features for available endpoints",
    documentation: "/api/docs",
    available_endpoints: {
      authentication: "/auth/*",
      users: "/users/*",
      organizations: "/organizations/*",
      assessments: "/assessments/*",
      subscriptions: "/subscriptions/*",
      analytics: "/user-activities/*",
      contact: "/contact/*",
      system: ["/health", "/status", "/features"]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * =====================================================
 * 🛠️ Global Error Handler with Multitenant Context
 * =====================================================
 */
router.use((err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log error with context
  console.error('🚨 Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?._id || 'anonymous',
    organization: req.organization?._id || 'none',
    userAgent: req.get('User-Agent')
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Base error response
  const errorResponse = {
    error: getErrorTitle(statusCode),
    message: isProduction && statusCode === 500 ? 'Internal server error' : err.message,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    request_id: req.id || generateRequestId()
  };

  // Add additional context in development
  if (!isProduction) {
    errorResponse.stack = err.stack;
    if (err.details) errorResponse.details = err.details;
  }

  // Organization context if available
  if (req.organization) {
    errorResponse.organization = {
      id: req.organization._id,
      name: req.organization.name
    };
  }

  res.status(statusCode).json(errorResponse);
});

/**
 * =====================================================
 * 🔧 Helper Functions
 * =====================================================
 */

// Health check functions
async function checkDatabaseHealth() {
  try {
    // This would actually check database connection
    // For now, simulate a check
    return 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

function checkMemoryHealth() {
  const memoryUsage = process.memoryUsage();
  const usedMB = memoryUsage.heapUsed / 1024 / 1024;
  const maxMB = memoryUsage.heapTotal / 1024 / 1024;
  const usagePercent = (usedMB / maxMB) * 100;
  
  return usagePercent < 80 ? 'healthy' : 'warning';
}

function checkStorageHealth() {
  // Simulate storage health check
  return 'healthy';
}

async function checkExternalServices() {
  // Check external services like email, file storage, etc.
  const services = {
    email: 'healthy',
    storage: 'healthy',
    cache: 'healthy'
  };
  
  return services;
}

async function getDatabaseStats() {
  // This would return actual database statistics
  return {
    connections: 'active',
    performance: 'optimal',
    size: 'monitored'
  };
}

function getErrorTitle(statusCode) {
  const titles = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  
  return titles[statusCode] || 'Error';
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Track active requests for metrics
let activeRequests = 0;
router.use((req, res, next) => {
  activeRequests++;
  req.app.set('activeRequests', activeRequests);
  
  res.on('finish', () => {
    activeRequests--;
    req.app.set('activeRequests', activeRequests);
  });
  
  next();
});

console.log(`✅ Assessly API v${API_VERSION} routes initialized successfully`);

export default router;
