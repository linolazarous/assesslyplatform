import express from "express";

// ✅ Import all route modules
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import organizationsRouter from "./organizations.js";
import assessmentsRouter from "./assessments.js";
import assessmentResponsesRouter from "./assessmentResponses.js";
import subscriptionsRouter from "./subscriptions.js";
import userActivitiesRouter from "./userActivities.js";
import contactRouter from "./contact.js"; // ✅ Contact route added

const router = express.Router();

// ─────────────────────────────────────────────
// ✅ API Route Mounting
// ─────────────────────────────────────────────
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/assessment-responses", assessmentResponsesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/user-activities", userActivitiesRouter);
router.use("/contact", contactRouter); // ✅ Contact form endpoint

// ─────────────────────────────────────────────
// ✅ Health Check Route (for Render / uptime monitor)
// ─────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assessly API",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// ✅ Default Fallback (404 for undefined routes)
// ─────────────────────────────────────────────
router.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

export default router;
