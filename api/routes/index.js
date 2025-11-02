import express from "express";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import organizationsRouter from "./organizations.js";
import assessmentsRouter from "./assessments.js";
import assessmentResponsesRouter from "./assessmentResponses.js";
import subscriptionsRouter from "./subscriptions.js";
import userActivitiesRouter from "./userActivities.js";
import contactRouter from "./contact.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Invalid or expired token"
 *     NotFoundError:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: "Endpoint not found"
 *               method:
 *                 type: string
 *                 example: "GET"
 *               path:
 *                 type: string
 *                 example: "/api/v1/nonexistent"
 *     HealthCheckSuccess:
 *       description: Service is healthy
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "ok"
 *               service:
 *                 type: string
 *                 example: "Assessly API"
 *               environment:
 *                 type: string
 *                 example: "production"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               version:
 *                 type: string
 *                 example: "1.0.0"
 */

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check and service status endpoints
 */

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current status of the API service
 *     tags: [Health]
 *     responses:
 *       200:
 *         $ref: '#/components/responses/HealthCheckSuccess'
 *       500:
 *         description: Service is unhealthy
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Detailed service status
 *     description: Returns detailed information about the service status and dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service status details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 database:
 *                   type: string
 *                   example: "connected"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: "production"
 */
router.get("/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: "connected", // You can add actual DB connection check here
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Mount all API routes
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/assessment-responses", assessmentResponsesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/user-activities", userActivitiesRouter);
router.use("/contact", contactRouter);

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API root endpoint
 *     description: Returns basic API information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Assessly API v1.0.0"
 *                 documentation:
 *                   type: string
 *                   example: "/api/docs"
 *                 status:
 *                   type: string
 *                   example: "operational"
 */
router.get("/", (req, res) => {
  res.status(200).json({
    message: "Assessly API v1.0.0",
    documentation: "/api/docs",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/v1/features:
 *   get:
 *     summary: Available API features
 *     description: Returns list of available API features and endpoints
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: List of available features
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["authentication", "user-management", "assessments", "organizations"]
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["/auth", "/users", "/assessments", "/organizations"]
 */
router.get("/features", (req, res) => {
  res.status(200).json({
    features: [
      "authentication",
      "user-management", 
      "assessments",
      "organizations",
      "subscriptions",
      "analytics"
    ],
    endpoints: [
      "/auth",
      "/users", 
      "/assessments",
      "/organizations",
      "/subscriptions",
      "/user-activities",
      "/contact"
    ],
    version: "1.0.0"
  });
});

// Custom 404 handler for API routes
/**
 * @swagger
 * components:
 *   responses:
 *     NotFound:
 *       description: The requested resource was not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: "Endpoint not found"
 *               method:
 *                 type: string
 *                 example: "GET"
 *               path:
 *                 type: string
 *                 example: "/api/v1/nonexistent"
 *               suggestion:
 *                 type: string
 *                 example: "Check the API documentation for available routes."
 *               documentation:
 *                 type: string
 *                 example: "/api/docs"
 */
router.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,
    suggestion: "Check the API documentation for available routes.",
    documentation: "/api/docs",
    availableEndpoints: [
      "/auth",
      "/users", 
      "/assessments",
      "/organizations",
      "/subscriptions",
      "/user-activities",
      "/contact",
      "/health",
      "/status",
      "/features"
    ]
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Route Error:', error);
  
  res.status(error.status || 500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

export default router;
