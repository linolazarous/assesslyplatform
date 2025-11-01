// api/routes/index.js
import express from 'express';

// Import all route modules
import authRouter from './auth.js';
import usersRouter from './users.js';
import organizationsRouter from './organizations.js';
import assessmentsRouter from './assessments.js';
import assessmentResponsesRouter from './assessmentResponses.js';
import subscriptionsRouter from './subscriptions.js';
import userActivitiesRouter from './userActivities.js';
import contactRouter from './contact.js'; // ✅ Added for frontend contact form

const router = express.Router();

/* ─────────────────────────────────────────────
   📦 Route Registration
───────────────────────────────────────────── */
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/organizations', organizationsRouter);
router.use('/assessments', assessmentsRouter);
router.use('/assessment-responses', assessmentResponsesRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/user-activities', userActivitiesRouter);
router.use('/contact', contactRouter); // ✅ Connect contact form API

/* ─────────────────────────────────────────────
   🩺 Health Check (for route debugging)
───────────────────────────────────────────── */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    message: 'Assessly API routes operational',
  });
});

/* ─────────────────────────────────────────────
   ⚠️ Fallback for undefined routes
───────────────────────────────────────────── */
router.use('*', (req, res) => {
  res.status(404).json({
    message: 'API route not found',
    path: req.originalUrl,
  });
});

export default router;
