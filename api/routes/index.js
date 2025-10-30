import express from 'express';
import usersRouter from './users.js';
import organizationsRouter from './organizations.js';
import assessmentsRouter from './assessments.js';
import assessmentResponsesRouter from './assessmentResponses.js';
import subscriptionsRouter from './subscriptions.js';
import userActivitiesRouter from './userActivities.js';

const router = express.Router();

router.use('/users', usersRouter);
router.use('/organizations', organizationsRouter);
router.use('/assessments', assessmentsRouter);
router.use('/assessment-responses', assessmentResponsesRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/user-activities', userActivitiesRouter);

export default router;
