// api/routes/index.js
import express from "express";

// ✅ Import route modules
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import organizationsRouter from "./organizations.js";
import assessmentsRouter from "./assessments.js";
import assessmentResponsesRouter from "./assessmentResponses.js";
import subscriptionsRouter from "./subscriptions.js";
import userActivitiesRouter from "./userActivities.js";
import contactRouter from "./contact.js";

const router = express.Router();

// ============================================================
// ✅ API Versioning - all main routes under /v1
// ============================================================
router.use("/v1/auth", authRouter);
router.use("/v1/users", usersRouter);
router.use("/v1/organizations", organizationsRouter);
router.use("/v1/assessments", assessmentsRouter);
router.use("/v1/assessment-responses", assessmentResponsesRouter);
router.use("/v1/subscriptions", subscriptionsRouter);
router.use("/v1/user-activities", userActivitiesRouter);
router.use("/v1/contact", contactRouter);

// ============================================================
// ✅ Health Check (for Render, UptimeRobot, or AWS Load Balancer)
// ============================================================
/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check for the API service
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Returns service health info
 */
router.get("/v1/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    frontend: process.env.FRONTEND_URL,
    backend: process.env.BACKEND_URL,
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// ✅ Root Info Endpoint
// ============================================================
router.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Assessly Platform API",
    docs: "/api/docs",
    health: "/api/v1/health",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================================
// ⚠️ 404 Fallback Handler
// ============================================================
router.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    method: req.method,
    path: req.originalUrl,
    suggestion: "Refer to /api/docs for available endpoints and usage.",
  });
});

export default router;
