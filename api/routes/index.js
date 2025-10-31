// api/routes/index.js
import express from 'express';
import usersRouter from './users.js';
import organizationsRouter from './organizations.js';
import assessmentsRouter from './assessments.js';
import assessmentResponsesRouter from './assessmentResponses.js';
import subscriptionsRouter from './subscriptions.js';
import userActivitiesRouter from './userActivities.js';
import authRouter from './auth.js'; // ✅ Added
// (later you can add contactRouter too)

const router = express.Router();

// Mount all your existing routes
router.use('/auth', authRouter); // ✅ Proper authentication routes
router.use('/users', usersRouter);
router.use('/organizations', organizationsRouter);
router.use('/assessments', assessmentsRouter);
router.use('/assessment-responses', assessmentResponsesRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/user-activities', userActivitiesRouter);

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export default router;
