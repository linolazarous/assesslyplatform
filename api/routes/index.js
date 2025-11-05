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
const startTime = Date.now();

// Centralized API version
const API_VERSION = process.env.npm_package_version || "1.0.0";

/**
 * =====================================================
 * 🩺 Health & Diagnostic Endpoints
 * =====================================================
 */

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Basic health check
 *     description: Confirms the API is running and healthy
 *     tags: [Health]
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Detailed service status
 *     tags: [Health]
 */
router.get("/status", async (req, res) => {
  try {
    // Future improvement: perform actual DB ping
    const databaseStatus = "connected";

    res.status(200).json({
      status: "ok",
      service: "Assessly API",
      database: databaseStatus,
      environment: process.env.NODE_ENV || "development",
      version: API_VERSION,
      uptime: `${Math.round(process.uptime())}s`,
      startedAt: new Date(startTime).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health Check Error:", err);
    res.status(500).json({
      status: "error",
      message: "Service degraded",
      error: err.message,
    });
  }
});

/**
 * @swagger
 * /api/v1:
 *   get:
 *     summary: API root
 *     tags: [Health]
 */
router.get("/", (req, res) => {
  res.status(200).json({
    message: `Assessly API v${API_VERSION}`,
    documentation: "/api/docs",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/v1/features:
 *   get:
 *     summary: List available API modules
 *     tags: [Health]
 */
router.get("/features", (req, res) => {
  res.status(200).json({
    features: [
      "authentication",
      "user-management",
      "assessments",
      "organizations",
      "subscriptions",
      "analytics",
      "user-activities",
      "contact",
    ],
    endpoints: [
      "/auth",
      "/users",
      "/assessments",
      "/organizations",
      "/subscriptions",
      "/user-activities",
      "/contact",
      "/health",
      "/status",
      "/features",
    ],
    version: API_VERSION,
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * =====================================================
 * 📦 Mount API Routers
 * =====================================================
 */
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/assessment-responses", assessmentResponsesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/user-activities", userActivitiesRouter);
router.use("/contact", contactRouter);

/**
 * =====================================================
 * ❌ Custom 404 Handler
 * =====================================================
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
      "/features",
    ],
  });
});

/**
 * =====================================================
 * 🛠️ Global Error Handler
 * =====================================================
 */
router.use((error, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  console.error("🚨 Route Error:", {
    message: error.message,
    stack: isProd ? undefined : error.stack,
    path: req.originalUrl,
  });

  res.status(error.status || 500).json({
    error: "Internal server error",
    message: isProd ? "Something went wrong" : error.message,
    ...(isProd ? {} : { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
});

export default router;
