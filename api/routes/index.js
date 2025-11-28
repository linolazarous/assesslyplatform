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

const router = express.Router();
const API_VERSION = process.env.npm_package_version || "1.0.0";
const startTime = Date.now();

/**
 * =====================================================
 * 🩺 Health & Diagnostic Endpoints
 * =====================================================
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    version: API_VERSION,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/status", async (req, res) => {
  try {
    const databaseStatus = "connected"; // can implement DB ping here

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

router.get("/", (req, res) => {
  res.status(200).json({
    message: `Assessly API v${API_VERSION}`,
    documentation: "/api/docs",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

router.get("/features", (req, res) => {
  const modules = [
    "authentication",
    "user-management", 
    "assessments",
    "organizations",
    "subscriptions",
    "analytics",
    "user-activities",
    "contact",
  ];

  const endpoints = [
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
  ];

  res.status(200).json({
    features: modules,
    endpoints,
    version: API_VERSION,
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * =====================================================
 * 📦 Mount API Routers
 * =====================================================
 */
router.use("/auth", authRouter); // This includes both email/password AND Google OAuth

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
    suggestion: "Check /api/docs for available routes.",
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
router.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  console.error("🚨 Route Error:", {
    message: err.message,
    stack: isProd ? undefined : err.stack,
    path: req.originalUrl,
  });

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: isProd ? "Something went wrong" : err.message,
    ...(isProd ? {} : { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

export default router;
