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
// ✅ Route Mounting
// ============================================================
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/assessment-responses", assessmentResponsesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/user-activities", userActivitiesRouter);
router.use("/contact", contactRouter);

// ============================================================
// ✅ Health Check (Render / UptimeRobot / AWS ALB)
// ============================================================
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
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
    suggestion: "Check the API documentation for available routes.",
  });
});

export default router;
